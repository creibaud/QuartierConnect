#!/usr/bin/env bash
#
# Builds a native installer for the QuartierConnect desktop app on the host OS
# using jpackage. jpackage only produces a package for the OS it runs on, so the
# release CI runs this on each platform (Linux -> .deb, macOS -> .dmg). On an OS
# without native packaging tooling, pass "app-image" to get a portable folder.
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

ARGS=(
  --type "$TYPE"
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
  if [ "$TYPE" != "app-image" ]; then
    ARGS+=(
      --linux-package-name "$LINUX_PACKAGE_NAME"
      --linux-shortcut
      --linux-menu-group "Utility"
      --linux-app-category "utils"
    )
  fi
fi

echo "==> jpackage --type ${TYPE}"
jpackage "${ARGS[@]}"

echo "==> Installer ready in ${DEST}:"
ls -lh "$DEST"
