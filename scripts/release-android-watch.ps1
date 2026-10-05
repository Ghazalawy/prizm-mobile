[CmdletBinding()]
param(
    # Dedicated clone used only by this watcher. It is hard-reset to origin/main
    # on every run, so never point it at a working copy you edit by hand.
    [string]$ReleaseClone = "C:\prizm-release\prizm-mobile",
    [string]$RepoUrl = "https://github.com/Ghazalawy/prizm-mobile.git",
    [string]$BackendWorkspace = "C:\wamp64\www\prizm331",
    # Started headless when no device with $DeviceSerial is online.
    [string]$AvdName = "",
    [string]$DeviceSerial = "emulator-5554",
    # Public releases-only repository the in-app updater reads.
    [string]$ReleaseRepo = "Ghazalawy/prizm-mobile-releases",
    [string]$IssueRepo = "Ghazalawy/prizm-mobile",
    [string]$StateDirectory = "C:\prizm-release",
    # Re-attempt a commit whose previous release attempt failed.
    [switch]$Retry
)

# Release watcher for the release PC (Windows Task Scheduler, e.g. every 2 h).
#
# Publishes a new APK, with zero GitHub-hosted minutes, whenever origin/main
# carries a version that has no v<version> release yet — typically right after
# the Saturday autosync PR merges. The build itself is
# scripts/release-android-local.ps1 -Publish, which runs every gate (pinned
# backend contracts, deeplink wiring, live API smoke, history checks, signer,
# emulator App Link smoke) and refuses to publish if any fails. A failure is
# reported as a GitHub issue so the next weekly sync (and you) see it.

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

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

function Invoke-Checked {
    param([Parameter(Mandatory = $true)][string]$Label, [Parameter(Mandatory = $true)][scriptblock]$Command)
    Write-Host "==> $Label"
    & $Command
    if ($LASTEXITCODE -ne 0) { throw "$Label failed with exit code $LASTEXITCODE." }
}

function Find-SdkTool {
    param([Parameter(Mandatory = $true)][string]$RelativePath)
    $sdks = @($env:ANDROID_HOME, $env:ANDROID_SDK_ROOT, $(if ($env:LOCALAPPDATA) { Join-Path $env:LOCALAPPDATA "Android\Sdk" })) |
        Where-Object { $_ -and (Test-Path -LiteralPath $_) }
    foreach ($sdk in $sdks) {
        $candidate = Join-Path $sdk $RelativePath
        if (Test-Path -LiteralPath $candidate) { return $candidate }
    }
    throw "Android SDK tool '$RelativePath' not found. Set ANDROID_HOME."
}

function Publish-BlockedIssue {
    param([string]$Version, [string]$Sha, [string]$Reason, [string]$LogPath)
    $title = "Release blocked on release PC: v$Version"
    $tail = if (Test-Path -LiteralPath $LogPath) { (Get-Content -LiteralPath $LogPath -Tail 60) -join "`n" } else { "(no log)" }
    $body = "The release watcher could not publish **v$Version** from ``main`` @ ``$Sha``.`n`n**Reason:** $Reason`n`nLast log lines:`n`n``````text`n$tail`n```````n`nNo APK was published; staff keep the previous version. The next weekly sync treats this issue as priority 1. The watcher will not retry this commit until it changes (or it is run with -Retry)."
    $bodyFile = Join-Path ([IO.Path]::GetTempPath()) "prizm-release-blocked.md"
    [IO.File]::WriteAllText($bodyFile, $body, [Text.UTF8Encoding]::new($false))
    $existing = Invoke-Probe { gh issue list --repo $IssueRepo --state open --search "`"$title`" in:title" --json number --jq ".[0].number" }
    if ($existing) {
        $null = Invoke-Probe { gh issue comment $existing --repo $IssueRepo --body-file $bodyFile }
    }
    else {
        $null = Invoke-Probe { gh issue create --repo $IssueRepo --title $title --body-file $bodyFile }
    }
    if ($LASTEXITCODE -ne 0) { Write-Warning "Could not file the blocked-release issue (issues disabled or gh not authenticated)." }
}

New-Item -ItemType Directory -Path $StateDirectory -Force | Out-Null
$logDirectory = Join-Path $StateDirectory "logs"
New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null
$statePath = Join-Path $StateDirectory "release-watch-state.json"
$lockPath = Join-Path $StateDirectory "release-watch.lock"

# One watcher at a time: a release takes longer than the schedule interval.
try {
    $lock = [IO.File]::Open($lockPath, [IO.FileMode]::OpenOrCreate, [IO.FileAccess]::ReadWrite, [IO.FileShare]::None)
}
catch {
    Write-Host "Another release watcher is running; exiting."
    exit 0
}

$logPath = Join-Path $logDirectory ("watch-" + (Get-Date -Format "yyyyMMdd-HHmmss") + ".log")
Start-Transcript -Path $logPath | Out-Null
$startedEmulator = $false
$adb = $null
$exitCode = 0
$version = "?"
$headSha = "?"
try {
    if (-not (Test-Path -LiteralPath (Join-Path $ReleaseClone ".git"))) {
        Invoke-Checked "Clone $RepoUrl" { git clone --quiet $RepoUrl $ReleaseClone }
    }
    Invoke-Checked "Fetch origin/main" { git -C $ReleaseClone fetch --quiet origin main }
    $headSha = (git -C $ReleaseClone rev-parse origin/main).Trim()
    $version = ((git -C $ReleaseClone show origin/main:package.json) -join "`n" | ConvertFrom-Json).version
    $tag = "v$version"

    $released = Invoke-Probe { gh release view $tag --repo $ReleaseRepo --json tagName --jq .tagName }
    if ($LASTEXITCODE -eq 0 -and $released -eq $tag) {
        Write-Host "$tag is already published in $ReleaseRepo; nothing to do."
        return
    }

    $state = if (Test-Path -LiteralPath $statePath) { Get-Content -Raw $statePath | ConvertFrom-Json } else { $null }
    if ($state -and $state.lastFailedSha -eq $headSha -and -not $Retry) {
        Write-Host "Release of $headSha already failed and was reported; waiting for a new commit (or -Retry)."
        return
    }

    Write-Host "Releasing $tag from $headSha."
    Invoke-Checked "Reset release clone to origin/main" { git -C $ReleaseClone checkout --quiet --force -B main origin/main }
    Invoke-Checked "Clean release clone" { git -C $ReleaseClone clean -fdq }

    $adb = Find-SdkTool "platform-tools\adb.exe"
    $devices = Invoke-Probe { & $adb devices }
    if ($devices -notmatch [regex]::Escape($DeviceSerial) + "\s+device") {
        if (-not $AvdName) { throw "Device $DeviceSerial is not online and no -AvdName was given to start it." }
        $emulatorExe = Find-SdkTool "emulator\emulator.exe"
        Start-Process -FilePath $emulatorExe -ArgumentList @("-avd", $AvdName, "-no-window", "-no-audio", "-no-boot-anim", "-no-snapshot-save") -WindowStyle Hidden | Out-Null
        $startedEmulator = $true
        Invoke-Checked "Wait for $DeviceSerial" { & $adb -s $DeviceSerial wait-for-device }
        $deadline = (Get-Date).AddMinutes(6)
        while ((Invoke-Probe { & $adb -s $DeviceSerial shell getprop sys.boot_completed }) -ne "1") {
            if ((Get-Date) -gt $deadline) { throw "Emulator $AvdName did not finish booting within 6 minutes." }
            Start-Sleep -Seconds 5
        }
    }

    $hostExe = (Get-Process -Id $PID).Path
    & $hostExe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $ReleaseClone "scripts\release-android-local.ps1") `
        -BackendWorkspace $BackendWorkspace -DeviceSerial $DeviceSerial -Publish
    if ($LASTEXITCODE -ne 0) { throw "release-android-local.ps1 -Publish failed with exit code $LASTEXITCODE." }

    @{ lastPublishedSha = $headSha; lastPublishedVersion = $version; at = (Get-Date).ToUniversalTime().ToString("o") } |
        ConvertTo-Json | Set-Content -LiteralPath $statePath -Encoding UTF8
    $openIssue = Invoke-Probe { gh issue list --repo $IssueRepo --state open --search "`"Release blocked on release PC: v$version`" in:title" --json number --jq ".[0].number" }
    if ($openIssue) { $null = Invoke-Probe { gh issue close $openIssue --repo $IssueRepo --comment "Published v$version from $headSha." } }
    Write-Host "Published v$version."
}
catch {
    $exitCode = 1
    $reason = $_.Exception.Message
    Write-Host "RELEASE BLOCKED: $reason"
    @{ lastFailedSha = $headSha; lastFailedVersion = $version; reason = $reason; at = (Get-Date).ToUniversalTime().ToString("o") } |
        ConvertTo-Json | Set-Content -LiteralPath $statePath -Encoding UTF8
    Stop-Transcript | Out-Null
    Publish-BlockedIssue -Version $version -Sha $headSha -Reason $reason -LogPath $logPath
    Start-Transcript -Path $logPath -Append | Out-Null
}
finally {
    if ($startedEmulator -and $adb) { $null = Invoke-Probe { & $adb -s $DeviceSerial emu kill } }
    Stop-Transcript | Out-Null
    $lock.Dispose()
}
exit $exitCode
