#!/usr/bin/env bash
# Règles pare-feu UFW : n'ouvre que SSH + HTTP + HTTPS.
#
#   Usage (en root sur le VPS) : sudo bash ops/ufw-rules.sh
#
# Les ports des bases (5432/27017/7474/7687) sont déjà bindés sur 127.0.0.1
# dans docker-compose.yml : ils ne sont donc jamais exposés publiquement.
set -euo pipefail

[ "$(id -u)" -eq 0 ] || { echo "À lancer en root (sudo)." >&2; exit 1; }

apt-get update -y
apt-get install -y ufw

ufw --force reset
ufw default deny incoming
ufw default allow outgoing

ufw allow 22/tcp   comment 'SSH'
ufw allow 80/tcp   comment 'HTTP (challenge ACME + redirection)'
ufw allow 443/tcp  comment 'HTTPS'

ufw --force enable
ufw status verbose
