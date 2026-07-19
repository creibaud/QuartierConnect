#!/usr/bin/env bash
# UFW firewall rules: open SSH + HTTP + HTTPS only.
#
#   Usage (as root on the VPS): sudo bash ops/ufw-rules.sh
#
# Database ports (5432/27017/7474/7687) are already bound to 127.0.0.1 in
# docker-compose.yml, so they are never publicly exposed.
set -euo pipefail

[ "$(id -u)" -eq 0 ] || { echo "Run as root (sudo)." >&2; exit 1; }

apt-get update -y
apt-get install -y ufw

ufw --force reset
ufw default deny incoming
ufw default allow outgoing

ufw allow 22/tcp   comment 'SSH'
ufw allow 80/tcp   comment 'HTTP (ACME challenge + redirect)'
ufw allow 443/tcp  comment 'HTTPS'

ufw --force enable
ufw status verbose
