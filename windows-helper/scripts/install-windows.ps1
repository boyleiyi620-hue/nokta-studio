$ErrorActionPreference = "Stop"
$helperRoot = Split-Path -Parent $PSScriptRoot | Split-Path -Parent
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) { throw "Node.js 20 veya üzeri bulunamadı. Önce resmi Node.js LTS sürümünü kurun." }
$major = [int]((node --version).TrimStart("v").Split(".")[0])
if ($major -lt 20) { throw "Node.js 20 veya üzeri gerekir. Bulunan sürüm: $(node --version)" }

$workspace = Join-Path $env:USERPROFILE "Documents\NoktaWorkspace"
New-Item -ItemType Directory -Force -Path $workspace | Out-Null
Write-Host "Nokta çalışma klasörü hazır: $workspace"
Write-Host "Yardımcıyı başlatmak için:"
Write-Host "  cd `"$helperRoot`""
Write-Host "  npm start"
Write-Host "İlk başlatmada belirteç ve yapılandırma kullanıcı profilinizde oluşturulur. Bu belirteci kimseyle paylaşmayın."
