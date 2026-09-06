$ErrorActionPreference = 'Stop'
$branchRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$branchManifest = Get-Content -LiteralPath (Join-Path $branchRoot 'manifest.json') -Raw | ConvertFrom-Json
$branchVersion = $branchManifest.version
if ($branchVersion -notmatch '^\d+\.\d+\.\d+$') { throw 'Invalid release version' }
$branchOutput = Join-Path $branchRoot 'packages'
New-Item -ItemType Directory -Path $branchOutput -Force | Out-Null
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
function Write-BranchArchive([string]$Destination, [object[]]$Entries) {
  $branchStream = [IO.File]::Open($Destination, [IO.FileMode]::Create)
  $branchZip = [IO.Compression.ZipArchive]::new($branchStream, [IO.Compression.ZipArchiveMode]::Create)
  try {
    foreach ($entry in $Entries) {
      [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($branchZip, $entry.Source, $entry.Name, [IO.Compression.CompressionLevel]::Optimal) | Out-Null
    }
  } finally { $branchZip.Dispose(); $branchStream.Dispose() }
}
$branchInstallEntries = @('main.js','manifest.json','styles.css') | ForEach-Object {
  $branchSource = Join-Path $branchRoot "dist/$_"
  if (!(Test-Path -LiteralPath $branchSource -PathType Leaf)) { throw "Missing build file: $_" }
  @{Source=$branchSource;Name=$_}
}
Write-BranchArchive (Join-Path $branchOutput "branch-note-$branchVersion.zip") $branchInstallEntries
$branchSourceFiles = @('package.json','package-lock.json','manifest.json','versions.json','tsconfig.json','eslint.config.mjs','esbuild.config.mjs','styles.css','README.md','LICENSE','PUBLISHING.md','COMPATIBILITY.md','VALIDATION.md','CHANGELOG.md','RELEASE_NOTES.md','.gitignore','.gitattributes') | ForEach-Object {Get-Item -LiteralPath (Join-Path $branchRoot $_)}
$branchSourceFiles += @('src','tests','scripts','.github') | ForEach-Object {Get-ChildItem -LiteralPath (Join-Path $branchRoot $_) -File -Recurse}
$branchSourceEntries = $branchSourceFiles | ForEach-Object {
  @{Source=$_.FullName;Name=$_.FullName.Substring($branchRoot.Length+1).Replace('\','/')}
}
Write-BranchArchive (Join-Path $branchOutput "branch-note-$branchVersion-source.zip") $branchSourceEntries
$branchHashLines = @("branch-note-$branchVersion.zip","branch-note-$branchVersion-source.zip") | ForEach-Object {
  $branchHash = Get-FileHash -LiteralPath (Join-Path $branchOutput $_) -Algorithm SHA256
  "$($branchHash.Hash.ToLowerInvariant())  $_"
}
$branchHashLines | Set-Content -LiteralPath (Join-Path $branchOutput 'SHA256SUMS.txt') -Encoding utf8
Get-ChildItem -LiteralPath $branchOutput -File | Select-Object Name,Length
