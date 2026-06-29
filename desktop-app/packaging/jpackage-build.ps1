# Builds the Windows .msi installer for the QuartierConnect desktop app via jpackage.
# Usage:  $env:APP_VERSION="1.0.0"; powershell -File packaging/jpackage-build.ps1
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

Write-Host "==> jpackage --type msi"
jpackage `
  --type msi `
  --name $AppName `
  --app-version $AppVersion `
  --vendor $Vendor `
  --input $Dist `
  --main-jar $MainJar `
  --main-class $MainClass `
  --dest $Dest `
  --add-modules $Modules `
  --win-menu `
  --win-shortcut `
  --win-dir-chooser

Write-Host "==> Installer ready in $Dest"
Get-ChildItem $Dest
