# scripts/merge-i18n.ps1
# Merges per-page i18n TOML fragments (i18n-src/<lang>/*.toml)
# into single files Hugo expects (i18n/<lang>.toml).
#
# Used by: serve.bat (local Windows dev only).

$ErrorActionPreference = "Stop"

$SrcDir = "i18n-src"
$OutDir = "i18n"

if (-not (Test-Path $SrcDir)) {
    Write-Error "Error: $SrcDir not found. Run this from the repo root."
    exit 1
}

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

$langDirs = Get-ChildItem -Path $SrcDir -Directory

foreach ($langDir in $langDirs) {
    $lang = $langDir.Name
    $outFile = Join-Path $OutDir "$lang.toml"

    $lines = @("# AUTO-GENERATED -- do not edit directly. Edit files in $SrcDir/$lang/ instead.")

    $fragmentFiles = Get-ChildItem -Path $langDir.FullName -Filter "*.toml" | Sort-Object Name

    foreach ($f in $fragmentFiles) {
        $lines += ""
        $lines += "# --- from $($f.Name) ---"
        $lines += Get-Content -Path $f.FullName
    }

    # Write UTF-8 without BOM (Hugo's TOML parser can misbehave with a BOM,
    # and Windows PowerShell 5.1's -Encoding UTF8 adds one by default).
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllLines((Join-Path (Resolve-Path $OutDir).Path "$lang.toml"), $lines, $utf8NoBom)

    Write-Host "Merged $($fragmentFiles.Count) file(s) -> $outFile"
}