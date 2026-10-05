[CmdletBinding()]
param(
    [string]$ApiUrl = "https://ms.prizm-energy.com",
    [string]$BackendWorkspace = "",
    [string]$DeviceSerial = "",
    # The in-app updater reads the FIRST repository (public, releases only).
    # The source repository is kept second during the move to a private source
    # repo, so installs that still poll it are offered this build once.
    [string[]]$ReleaseRepos = @("Ghazalawy/prizm-mobile-releases", "Ghazalawy/prizm-mobile"),
    # Candidate builds only: run backend gates against the workspace as-is
    # instead of the commit pinned in autosync/state.json.
    [switch]$UseBackendAsIs,
    # Only for the very first publication, when no previous release exists to
    # diff against.
    [switch]$SkipHistoryChecks,
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

# Probe a native command whose failure is an expected answer (missing release,
# missing commit). Windows PowerShell 5.1 turns redirected native stderr into
# terminating errors under $ErrorActionPreference = "Stop" (the keytool trap),
# so the probe runs with Continue and callers read $LASTEXITCODE.
function Invoke-Probe {
    param([Parameter(Mandatory = $true)][scriptblock]$Command)
    $previous = $ErrorActionPreference
    try {
        $ErrorActionPreference = "Continue"
        $output = & $Command 2>&1 | Where-Object { $_ -isnot [System.Management.Automation.ErrorRecord] }
        return (($output | ForEach-Object { "$_" }) -join "`n").Trim()
    }
    finally {
        $ErrorActionPreference = $previous
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
    if ($UseBackendAsIs) {
        throw "-UseBackendAsIs is for candidate builds; a publication is gated against the pinned backend commit."
    }
}

if (-not $BackendWorkspace) {
    $BackendWorkspace = $env:PRIZM_BACKEND_WORKSPACE
}
if (-not $BackendWorkspace) {
    $BackendWorkspace = Join-Path (Split-Path $repoRoot -Parent) "prizm331"
}
$BackendWorkspace = (Resolve-Path $BackendWorkspace).Path

# Gate against exactly the backend commit the app was verified against
# (autosync/state.json), in a throwaway worktree, so local backend work in
# progress can neither break nor falsely pass a release.
$pinnedWorktree = $null
if ($UseBackendAsIs) {
    $gateBackend = $BackendWorkspace
    Write-Host "Backend gates use $BackendWorkspace as-is (candidate build)." -ForegroundColor Yellow
}
else {
    $pin = (Get-Content -Raw "autosync\state.json" | ConvertFrom-Json).backend.syncedSha
    if ($pin -notmatch "^[0-9a-f]{40}$") { throw "autosync/state.json has no valid backend.syncedSha." }
    Invoke-NativeStep "Fetch backend main" { git -C $BackendWorkspace fetch --quiet origin main }
    $null = Invoke-Probe { git -C $BackendWorkspace cat-file -e "$pin^{commit}" }
    if ($LASTEXITCODE -ne 0) {
        Invoke-NativeStep "Fetch pinned backend commit $pin" { git -C $BackendWorkspace fetch --quiet origin $pin }
    }
    $pinnedWorktree = Join-Path ([IO.Path]::GetTempPath()) ("prizm331-pin-" + $pin.Substring(0, 12))
    if (Test-Path -LiteralPath $pinnedWorktree) {
        # Left behind by a run that failed before its cleanup.
        $null = Invoke-Probe { git -C $BackendWorkspace worktree remove --force $pinnedWorktree }
        if (Test-Path -LiteralPath $pinnedWorktree) { Remove-Item -LiteralPath $pinnedWorktree -Recurse -Force }
        $null = Invoke-Probe { git -C $BackendWorkspace worktree prune }
    }
    Invoke-NativeStep "Check out pinned backend $($pin.Substring(0, 9))" { git -C $BackendWorkspace worktree add --detach --quiet $pinnedWorktree $pin }
    $gateBackend = $pinnedWorktree
}
$env:PRIZM_BACKEND_WORKSPACE = $gateBackend
$env:PRIZM331_SOURCE_ROOT = $gateBackend

Invoke-NativeStep "Install locked JavaScript dependencies" {
    npm ci --no-audit --no-fund --legacy-peer-deps
}
Invoke-NativeStep "Validate Expo dependency matrix" { npx expo install --check }
$packageManifestPath = Join-Path $repoRoot "package.json"
$packageLockPath = Join-Path $repoRoot "package-lock.json"
$packageManifestBackup = [IO.File]::ReadAllBytes($packageManifestPath)
$packageLockBackup = [IO.File]::ReadAllBytes($packageLockPath)
try {
    Invoke-NativeStep "Synchronize generated Android metadata" {
        npx expo prebuild --platform android --no-install --clean
    }
}
finally {
    [IO.File]::WriteAllBytes($packageManifestPath, $packageManifestBackup)
    [IO.File]::WriteAllBytes($packageLockPath, $packageLockBackup)
}
$androidSdk = @(
    $env:ANDROID_HOME,
    $env:ANDROID_SDK_ROOT,
    $(if ($env:LOCALAPPDATA) { Join-Path $env:LOCALAPPDATA "Android\Sdk" })
) | Where-Object { $_ -and (Test-Path -LiteralPath $_) } | Select-Object -First 1
if (-not $androidSdk) {
    throw "Android SDK was not found. Set ANDROID_HOME or ANDROID_SDK_ROOT."
}
$androidSdk = (Resolve-Path $androidSdk).Path
$env:ANDROID_HOME = $androidSdk
$env:ANDROID_SDK_ROOT = $androidSdk
$localPropertiesPath = Join-Path $repoRoot "android\local.properties"
$escapedSdkPath = $androidSdk -replace "\\", "\\\\"
[IO.File]::WriteAllText($localPropertiesPath, "sdk.dir=$escapedSdkPath`n", [Text.UTF8Encoding]::new($false))
Invoke-NativeStep "Verify release metadata" { npm run verify:release }
Invoke-NativeStep "TypeScript check" { npx tsc --noEmit -p tsconfig.json }
Invoke-NativeStep "Mobile contract tests" { npm run test:contracts }
Invoke-NativeStep "List contract audit" { npm run test:list-contracts }
Invoke-NativeStep "CRUD contract audit" { npm run test:crud-contracts }
Invoke-NativeStep "Web-menu parity audit" { npm run audit:web-parity }
Invoke-NativeStep "Pinned deeplink regressions" { npm run test:deeplink-regressions }
Invoke-NativeStep "Deeplink wiring (every backend notification/approval link)" { npm run test:deeplinks }
Invoke-NativeStep "Biometric sign-in policy" { npm run test:biometric }

# Read-only live API smoke against production. Fails closed for a publication
# when PRIZM_QA_EMAIL / PRIZM_QA_PASSWORD are not set on this machine.
if ($Publish) {
    Invoke-NativeStep "Live API smoke (read-only)" { node scripts/smoke-live-api.mjs }
}
else {
    Invoke-NativeStep "Live API smoke (read-only, optional for candidates)" { node scripts/smoke-live-api.mjs --allow-missing-credentials }
}

# Everything merged since the last published build must have been released
# properly: user-facing changes bumped the version, and no QC baseline grew
# without a backend pin move (scripts/check-qc-ratchet.mjs).
if ($Publish -and -not $SkipHistoryChecks) {
    $previousSha = $null
    foreach ($repo in $ReleaseRepos) {
        $latestName = Invoke-Probe { gh release view --repo $repo --json name --jq .name }
        if ($LASTEXITCODE -eq 0 -and $latestName -match "\(([0-9a-f]{7,12})\)") { $previousSha = $Matches[1]; break }
    }
    if (-not $previousSha) { throw "No previous release found in $($ReleaseRepos -join ', '). Pass -SkipHistoryChecks only for the very first publication." }
    $null = Invoke-Probe { git cat-file -e "$previousSha^{commit}" }
    if ($LASTEXITCODE -ne 0) { throw "Previous release commit $previousSha is not in this clone; fetch full history." }
    Invoke-NativeStep "Release-bump gate since $previousSha" { node scripts/check-version-bump.mjs $previousSha HEAD }
    Invoke-NativeStep "QC integrity since $previousSha" { node scripts/check-qc-ratchet.mjs $previousSha HEAD }
}

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

    $keystore = Join-Path $repoRoot "android\app\debug.keystore"
    if (-not (Test-Path -LiteralPath $keystore)) {
        throw "Expo prebuild did not produce the expected stable signing keystore."
    }
    $keytoolErrorPreference = $ErrorActionPreference
    try {
        # keytool writes valid certificate warnings to stderr on Windows. Capture
        # them for fingerprint parsing without promoting a successful exit to an
        # ErrorRecord that aborts the guarded release.
        $ErrorActionPreference = "Continue"
        $keytoolOutput = & keytool -list -v -keystore $keystore -storepass android -alias androiddebugkey 2>&1
        $keytoolExitCode = $LASTEXITCODE
    }
    finally {
        $ErrorActionPreference = $keytoolErrorPreference
    }
    if ($keytoolExitCode -ne 0) { throw "keytool could not inspect the generated signing certificate." }
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
        # One release per version, marked latest: lib/updates.ts reads the
        # short SHA in parentheses from the release name, and anyone watching
        # the repository's releases gets a notification for each new version.
        $tag = "v$($package.version)"
        $releaseTitle = "Prizm Mobile v$($package.version) ($shortSha)"
        $notesFile = Join-Path ([IO.Path]::GetTempPath()) "prizm-release-notes-$shortSha.md"
        $notes = @("## $($changelog.releases[0].title)", "")
        $notes += @($changelog.releases[0].highlights | ForEach-Object { "- $_" })
        $notes += @("", "---", "Built on the release PC from main @ $headSha at $buildTime. All local gates, the live API smoke, signer verification and the emulator App Link smoke passed.", "API: $ApiUrl", "APK SHA-256: $apkHash")
        [IO.File]::WriteAllText($notesFile, ($notes -join "`n"), [Text.UTF8Encoding]::new($false))
        foreach ($repo in $ReleaseRepos) {
            $null = Invoke-Probe { gh release view $tag --repo $repo --json tagName }
            if ($LASTEXITCODE -eq 0) {
                Invoke-NativeStep "Replace APK on $repo $tag" { gh release upload $tag $outputApk --repo $repo --clobber }
                Invoke-NativeStep "Update $repo $tag metadata" { gh release edit $tag --repo $repo --title $releaseTitle --notes-file $notesFile --latest }
            }
            elseif ($repo -eq "Ghazalawy/prizm-mobile") {
                Invoke-NativeStep "Create $repo $tag" { gh release create $tag $outputApk --repo $repo --target $headSha --title $releaseTitle --notes-file $notesFile --latest }
            }
            else {
                Invoke-NativeStep "Create $repo $tag" { gh release create $tag $outputApk --repo $repo --title $releaseTitle --notes-file $notesFile --latest }
            }
        }
        Remove-Item -LiteralPath $notesFile -Force -ErrorAction SilentlyContinue
        Write-Host "Published $tag to $($ReleaseRepos -join ', ') without GitHub-hosted build minutes." -ForegroundColor Green
    }
    else {
        Write-Host "Build-only mode: nothing was uploaded. Re-run from synced main with -Publish and -DeviceSerial after final approval." -ForegroundColor Yellow
    }
}
finally {
    if ($pinnedWorktree) {
        $null = Invoke-Probe { git -C $BackendWorkspace worktree remove --force $pinnedWorktree }
        $null = Invoke-Probe { git -C $BackendWorkspace worktree prune }
    }
    [IO.File]::WriteAllBytes($buildInfoPath, $buildInfoBackup)
    if ($hadEnv) {
        [IO.File]::WriteAllBytes($envPath, $envBackup)
    }
    elseif (Test-Path -LiteralPath $envPath) {
        Remove-Item -LiteralPath $envPath -Force
    }
}
