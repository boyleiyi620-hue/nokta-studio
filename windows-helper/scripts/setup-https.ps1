$ErrorActionPreference = "Stop"
$helperRoot = Split-Path -Parent $PSScriptRoot | Split-Path -Parent
$configDir = Join-Path $env:LOCALAPPDATA "NoktaHelper"
$certDir = Join-Path $configDir "cert"
$workspace = Join-Path $env:USERPROFILE "Documents\NoktaWorkspace"
$pfxPath = Join-Path $certDir "nokta-localhost.pfx"
$configPath = Join-Path $configDir "config.json"
New-Item -ItemType Directory -Force -Path $configDir, $certDir, $workspace | Out-Null

Write-Host "Bu betik yalnızca localhost için bir geliştirme sertifikası oluşturur."
$confirmation = Read-Host "Sertifikayı yalnızca bu Windows kullanıcısının Güvenilen Kök Sertifika Yetkilileri deposuna eklemek istiyor musunuz? (E/H)"
if ($confirmation -notin @("E", "e")) { throw "Güvenilen sertifika olmadan tarayıcı HTTPS yerel yardımcıya bağlanamaz." }

$bytes = New-Object byte[] 32
[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
$passphrase = [Convert]::ToBase64String($bytes)
$securePassphrase = ConvertTo-SecureString -String $passphrase -AsPlainText -Force
$certificate = New-SelfSignedCertificate -DnsName "localhost" -CertStoreLocation "Cert:\CurrentUser\My" -FriendlyName "Nokta Yerel Yardımcı"
Export-PfxCertificate -Cert $certificate -FilePath $pfxPath -Password $securePassphrase | Out-Null
$cerPath = Join-Path $certDir "nokta-localhost.cer"
Export-Certificate -Cert $certificate -FilePath $cerPath | Out-Null
Import-Certificate -FilePath $cerPath -CertStoreLocation "Cert:\CurrentUser\Root" | Out-Null

$config = @{
  version = 2
  workspace = $workspace
  maximumBytes = 5242880
  allowedOrigins = @("https://boyleiyi620-hue.github.io")
  https = @{ pfxPath = $pfxPath; passphrase = $passphrase }
}
$config | ConvertTo-Json -Depth 4 | Set-Content -Path $configPath -Encoding utf8
Write-Host "HTTPS yerel köprü hazır. Çalışma klasörü: $workspace"
Write-Host "Yardımcıyı başlatmak için: cd `"$helperRoot`"; npm start"
