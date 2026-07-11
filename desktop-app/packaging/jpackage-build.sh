#!/usr/bin/env bash
#
# Builds a native installer for the QuartierConnect desktop app on the host OS
# using jpackage. jpackage only produces a package for the OS it runs on, so the
# release CI runs this on each platform (Linux -> .deb/.rpm, macOS -> .dmg). On an
# OS without native packaging tooling, pass "app-image" to get a portable folder.
# "tar.gz" builds that portable folder and archives it (jpackage has no tar target).
#
# Usage: APP_VERSION=1.0.0 packaging/jpackage-build.sh [type]
set -euo pipefail

APP_NAME="QuartierConnect"
APP_VERSION="${APP_VERSION:-1.0.0}"
VENDOR="QuartierConnect"
MAIN_JAR="quartierconnect-desktop.jar"
MAIN_CLASS="fr.quartierconnect.desktopapp.Launcher"
LINUX_PACKAGE_NAME="quartierconnect"
RUNTIME_MODULES="java.base,java.desktop,java.net.http,jdk.httpserver,java.sql,java.prefs,java.naming,java.logging,java.management,jdk.crypto.ec,jdk.crypto.cryptoki,jdk.unsupported,java.scripting"

cd "$(dirname "$0")/.."

# Bake the deployed server URL into the fat JAR when provided (see ServerConfig).
packaging/write-server-properties.sh

echo "==> Building fat JAR"
./mvnw -B -q clean package -DskipTests

DIST="target/dist"
DEST="target/installer"
rm -rf "$DIST" "$DEST"
mkdir -p "$DIST"
cp "target/${MAIN_JAR}" "$DIST/"

OS="$(uname -s)"
case "$OS" in
  Linux)  DEFAULT_TYPE="deb" ;;
  Darwin) DEFAULT_TYPE="dmg" ;;
  *)      DEFAULT_TYPE="app-image" ;;
esac
TYPE="${1:-$DEFAULT_TYPE}"

# jpackage has no tar.gz target: build the portable app-image, then archive it.
if [ "$TYPE" = "tar.gz" ]; then
  BUILD_TYPE="app-image"
else
  BUILD_TYPE="$TYPE"
fi

ARGS=(
  --type "$BUILD_TYPE"
  --name "$APP_NAME"
  --app-version "$APP_VERSION"
  --vendor "$VENDOR"
  --input "$DIST"
  --main-jar "$MAIN_JAR"
  --main-class "$MAIN_CLASS"
  --dest "$DEST"
  --add-modules "$RUNTIME_MODULES"
)

if [ "$OS" = "Linux" ]; then
  ARGS+=(--icon src/main/resources/images/logo.png)
  if [ "$BUILD_TYPE" != "app-image" ]; then
    ARGS+=(
      --linux-package-name "$LINUX_PACKAGE_NAME"
      --linux-shortcut
      --linux-menu-group "Utility"
      --linux-app-category "utils"
    )
  fi
fi

# Cible une instance déployée : l'app installée pointe vers ce serveur sans
# configuration (ServerConfig lit ces propriétés en priorité). Sinon, localhost.
if [ -n "${QC_SERVER_URL:-}" ]; then
  URL="${QC_SERVER_URL%/}"
  ARGS+=(--java-options "-Dapi.url=${URL}/api" --java-options "-Dweb.url=${URL}/admin")
  echo "==> Serveur ciblé : ${URL}"
fi

echo "==> jpackage --type ${BUILD_TYPE}"
jpackage "${ARGS[@]}"

if [ "$TYPE" = "tar.gz" ]; then
  echo "==> Archivage tar.gz"
  tar -czf "${DEST}/${APP_NAME}.tar.gz" -C "$DEST" "$APP_NAME"
fi

echo "==> Installer ready in ${DEST}:"
ls -lh "$DEST"
