[CmdletBinding()]
param(
    [string]$ApiUrl = "https://ms.prizm-energy.com",
    [string]$BackendWorkspace = "",
    [string]$DeviceSerial = "",
    [switch]$Publish
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Invoke-NativeStep {
    param(
        [Parameter(Mandatory = $true)][string]$Label,
        [Parameter(Mandatory = $true)][scriptblock]$Command
    )

    Write-Host "`n==> $Label" -ForegroundColor Cyan
    & $Command
    if ($LASTEXITCODE -ne 0) {
        throw "$Label failed with exit code $LASTEXITCODE."
    }
}

function Find-AndroidTool {
    param([Parameter(Mandatory = $true)][string]$Name)

    $sdkCandidates = @(
        $env:ANDROID_HOME,
        $env:ANDROID_SDK_ROOT,
        $(if ($env:LOCALAPPDATA) { Join-Path $env:LOCALAPPDATA "Android\Sdk" })
    ) | Where-Object { $_ -and (Test-Path -LiteralPath $_) } | Select-Object -Unique

    foreach ($sdk in $sdkCandidates) {
        if ($Name -eq "adb") {
            $adb = Join-Path $sdk "platform-tools\adb.exe"
            if (Test-Path -LiteralPath $adb) { return $adb }
            continue
        }

        $buildTools = Join-Path $sdk "build-tools"
        if (-not (Test-Path -LiteralPath $buildTools)) { continue }
        $candidate = Get-ChildItem -LiteralPath $buildTools -Directory |
            Sort-Object { [version]$_.Name } -Descending |
            ForEach-Object { Join-Path $_.FullName "$Name.bat" } |
            Where-Object { Test-Path -LiteralPath $_ } |
            Select-Object -First 1
        if ($candidate) { return $candidate }
    }

    throw "Android SDK tool '$Name' was not found. Set ANDROID_HOME or ANDROID_SDK_ROOT."
}

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $repoRoot

$trackedChanges = @(git status --porcelain --untracked-files=no)
if ($LASTEXITCODE -ne 0) { throw "Unable to inspect the Git worktree." }
if ($trackedChanges.Count -gt 0) {
    throw "Tracked files are not clean. Commit or restore them before a release build."
}

$branch = (git branch --show-current).Trim()
$headSha = (git rev-parse HEAD).Trim()
$shortSha = (git rev-parse --short HEAD).Trim()
if ($LASTEXITCODE -ne 0) { throw "Unable to resolve the release commit." }

if ($Publish) {
    if ($branch -ne "main") {
        throw "Publishing is allowed only from the main branch; current branch is '$branch'."
    }
    Invoke-NativeStep "Refresh origin/main" { git fetch --quiet origin main }
    $originMain = (git rev-parse origin/main).Trim()
    if ($headSha -ne $originMain) {
        throw "Local main must exactly match origin/main before publishing."
    }
    if (-not $DeviceSerial) {
        throw "Publishing requires -DeviceSerial so the exact APK and App Link are smoke-tested first."
    }
}

if (-not $BackendWorkspace) {
    $BackendWorkspace = $env:PRIZM_BACKEND_WORKSPACE
}
if (-not $BackendWorkspace) {
    $BackendWorkspace = Join-Path (Split-Path $repoRoot -Parent) "prizm331"
}
$BackendWorkspace = (Resolve-Path $BackendWorkspace).Path
$env:PRIZM_BACKEND_WORKSPACE = $BackendWorkspace
$env:PRIZM331_SOURCE_ROOT = $BackendWorkspace

Invoke-NativeStep "Install locked JavaScript dependencies" {
    npm ci --no-audit --no-fund --legacy-peer-deps
}
Invoke-NativeStep "Validate Expo dependency matrix" { npx expo install --check }
Invoke-NativeStep "Verify release metadata" { npm run verify:release }
Invoke-NativeStep "TypeScript check" { npx tsc --noEmit -p tsconfig.json }
Invoke-NativeStep "Mobile contract tests" { npm run test:contracts }
Invoke-NativeStep "List contract audit" { npm run test:list-contracts }
Invoke-NativeStep "CRUD contract audit" { npm run test:crud-contracts }
Invoke-NativeStep "Web-menu parity audit" { npm run audit:web-parity }

$assetLinks = Get-Content -Raw "public\.well-known\assetlinks.json" | ConvertFrom-Json
$expectedFingerprint = [string]$assetLinks[0].target.sha256_cert_fingerprints[0]
$expectedFingerprintCompact = ($expectedFingerprint -replace ":", "").ToLowerInvariant()
if ($expectedFingerprintCompact -notmatch "^[0-9a-f]{64}$") {
    throw "assetlinks.json does not contain a valid SHA-256 signing fingerprint."
}

$buildInfoPath = Join-Path $repoRoot "lib\build-info.ts"
$envPath = Join-Path $repoRoot ".env"
$hadEnv = Test-Path -LiteralPath $envPath
$envBackup = if ($hadEnv) { [IO.File]::ReadAllBytes($envPath) } else { $null }
$buildInfoBackup = [IO.File]::ReadAllBytes($buildInfoPath)

try {
    $package = Get-Content -Raw "package.json" | ConvertFrom-Json
    $changelog = Get-Content -Raw "CHANGELOG.json" | ConvertFrom-Json
    $buildTime = [DateTime]::UtcNow.ToString("yyyy-MM-ddTHH:mm:ssZ")
    $buildInfoSource = [Text.Encoding]::UTF8.GetString($buildInfoBackup)
    $flagsMatch = [regex]::Match(
        $buildInfoSource,
        "(?ms)^export const BUILD_FLAGS\s*=.*?^}\s+as const;"
    )
    if (-not $flagsMatch.Success) {
        throw "Could not preserve BUILD_FLAGS from lib/build-info.ts."
    }

    $releaseTitle = ConvertTo-Json ([string]$changelog.releases[0].title) -Compress
    $releaseHighlights = ConvertTo-Json @($changelog.releases[0].highlights) -Compress -Depth 10
    $generatedBuildInfo = @"
// Auto-generated for local release build. The source file is restored afterwards.
export const BUILD_TIME    = "$buildTime";
export const BUILD_SHA     = "$shortSha";
export const BUILD_VERSION = "$($package.version)";

export const RELEASE_NOTES = {
  title: $releaseTitle,
  highlights: $releaseHighlights,
};

$($flagsMatch.Value)
"@

    [IO.File]::WriteAllText($buildInfoPath, $generatedBuildInfo, [Text.UTF8Encoding]::new($false))
    [IO.File]::WriteAllText($envPath, "EXPO_PUBLIC_API_URL=$ApiUrl`n", [Text.UTF8Encoding]::new($false))

    Invoke-NativeStep "Generate Android project" {
        npx expo prebuild --platform android --no-install --clean
    }

    $keystore = Join-Path $repoRoot "android\app\debug.keystore"
    if (-not (Test-Path -LiteralPath $keystore)) {
        throw "Expo prebuild did not produce the expected stable signing keystore."
    }
    $keytoolOutput = & keytool -list -v -keystore $keystore -storepass android -alias androiddebugkey 2>&1
    if ($LASTEXITCODE -ne 0) { throw "keytool could not inspect the generated signing certificate." }
    $keytoolMatch = [regex]::Match(($keytoolOutput -join "`n"), "SHA256:\s*([0-9A-F:]{95})")
    if (-not $keytoolMatch.Success -or $keytoolMatch.Groups[1].Value -ne $expectedFingerprint) {
        throw "Generated keystore fingerprint does not match production assetlinks.json. Build aborted."
    }

    Push-Location "android"
    try {
        Invoke-NativeStep "Build release APK using the local Gradle cache" {
            .\gradlew.bat assembleRelease --build-cache --stacktrace --warning-mode all
        }
    }
    finally {
        Pop-Location
    }

    $sourceApk = Join-Path $repoRoot "android\app\build\outputs\apk\release\app-release.apk"
    if (-not (Test-Path -LiteralPath $sourceApk)) { throw "Gradle completed without producing the release APK." }
    $outputDirectory = Join-Path $repoRoot "out"
    New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null
    $outputApk = Join-Path $outputDirectory "prizm-mobile.apk"
    Copy-Item -LiteralPath $sourceApk -Destination $outputApk -Force

    $apksigner = Find-AndroidTool "apksigner"
    $signerOutput = & $apksigner verify --verbose --print-certs $outputApk 2>&1
    if ($LASTEXITCODE -ne 0) { throw "apksigner rejected the generated APK." }
    $signerMatch = [regex]::Match(($signerOutput -join "`n"), "certificate SHA-256 digest:\s*([0-9a-fA-F]{64})")
    if (-not $signerMatch.Success -or $signerMatch.Groups[1].Value.ToLowerInvariant() -ne $expectedFingerprintCompact) {
        throw "APK signer fingerprint does not match production assetlinks.json. Upload blocked."
    }

    if ($DeviceSerial) {
        $adb = Find-AndroidTool "adb"
        Invoke-NativeStep "Verify Android device '$DeviceSerial'" { & $adb -s $DeviceSerial get-state }
        Invoke-NativeStep "Install exact release APK on '$DeviceSerial'" { & $adb -s $DeviceSerial install -r $outputApk }
        $smokeUrl = "https://ms.prizm-energy.com/MS/przpurchase/Payment_Request/view_payment_request/1211"
        $appLinkOutput = & $adb -s $DeviceSerial shell am start -W -a android.intent.action.VIEW -d $smokeUrl 2>&1
        if ($LASTEXITCODE -ne 0 -or ($appLinkOutput -join "`n") -notmatch "com\.prizmenergy\.mobile") {
            throw "The installed release APK did not claim the production Payment Request App Link."
        }
        Write-Host ($appLinkOutput -join "`n")
    }

    $apkHash = (Get-FileHash -LiteralPath $outputApk -Algorithm SHA256).Hash.ToLowerInvariant()
    $apkSizeMb = [math]::Round((Get-Item -LiteralPath $outputApk).Length / 1MB, 2)
    Write-Host "`nAPK ready: $outputApk" -ForegroundColor Green
    Write-Host "Commit: $headSha"
    Write-Host "Version: $($package.version)"
    Write-Host "Size: $apkSizeMb MB"
    Write-Host "SHA-256: $apkHash"
    Write-Host "Signer: $expectedFingerprint"

    if ($Publish) {
        Invoke-NativeStep "Verify GitHub authentication" { gh auth status }
        Invoke-NativeStep "Upload rolling release APK" {
            gh release upload latest $outputApk --repo Ghazalawy/prizm-mobile --clobber
        }
        $releaseNotes = "Locally built from main @ $headSha`nBuilt at: $buildTime`nAPI: $ApiUrl`nAPK SHA-256: $apkHash"
        Invoke-NativeStep "Update rolling release metadata" {
            gh release edit latest --repo Ghazalawy/prizm-mobile --title "Latest build ($shortSha)" --notes $releaseNotes --latest
        }
        Write-Host "Published without GitHub-hosted build minutes." -ForegroundColor Green
    }
    else {
        Write-Host "Build-only mode: nothing was uploaded. Re-run from synced main with -Publish and -DeviceSerial after final approval." -ForegroundColor Yellow
    }
}
finally {
    [IO.File]::WriteAllBytes($buildInfoPath, $buildInfoBackup)
    if ($hadEnv) {
        [IO.File]::WriteAllBytes($envPath, $envBackup)
    }
    elseif (Test-Path -LiteralPath $envPath) {
        Remove-Item -LiteralPath $envPath -Force
    }
}
