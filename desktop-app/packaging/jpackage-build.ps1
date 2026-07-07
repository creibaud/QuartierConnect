# Builds the Windows package for the QuartierConnect desktop app via jpackage.
# Usage:  $env:APP_VERSION="1.0.0"; powershell -File packaging/jpackage-build.ps1 [type]
#   type: "msi" (default, native installer) or "app-image" (portable folder used
#   by the CI smoke-test; built with a console launcher so its output is captured).
param([string]$Type = "msi")
$ErrorActionPreference = "Stop"

$AppName    = "QuartierConnect"
$AppVersion = if ($env:APP_VERSION) { $env:APP_VERSION } else { "1.0.0" }
$Vendor     = "QuartierConnect"
$MainJar    = "quartierconnect-desktop.jar"
$MainClass  = "fr.quartierconnect.desktopapp.Launcher"
$Modules    = "java.base,java.desktop,java.net.http,jdk.httpserver,java.sql,java.prefs,java.naming,java.logging,java.management,jdk.crypto.ec,jdk.crypto.cryptoki,jdk.unsupported,java.scripting"

Set-Location (Join-Path $PSScriptRoot "..")

Write-Host "==> Building fat JAR"
& ./mvnw.cmd -B -q clean package -DskipTests

$Dist = "target/dist"
$Dest = "target/installer"
Remove-Item -Recurse -Force $Dist, $Dest -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force -Path $Dist | Out-Null
Copy-Item "target/$MainJar" $Dist

# Cible une instance déployée : l'app installée pointe vers ce serveur sans
# configuration (ServerConfig lit ces propriétés en priorité). Sinon, localhost.
$JavaOptions = @()
if ($env:QC_SERVER_URL) {
  $Url = $env:QC_SERVER_URL.TrimEnd('/')
  $JavaOptions = @("--java-options", "-Dapi.url=$Url/api", "--java-options", "-Dweb.url=$Url/admin")
  Write-Host "==> Serveur ciblé : $Url"
}

if ($Type -eq "app-image") {
  # Console launcher so the smoke-test can read stdout/stderr.
  $TypeArgs = @("--win-console")
} else {
  $TypeArgs = @("--win-menu", "--win-shortcut", "--win-dir-chooser")
}

Write-Host "==> jpackage --type $Type"
jpackage `
  --type $Type `
  --name $AppName `
  --app-version $AppVersion `
  --vendor $Vendor `
  --input $Dist `
  --main-jar $MainJar `
  --main-class $MainClass `
  --dest $Dest `
  --add-modules $Modules `
  --icon packaging/logo.ico `
  @TypeArgs `
  @JavaOptions

Write-Host "==> Package ready in $Dest"
Get-ChildItem $Dest
