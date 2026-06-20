# Déploiement Production — QuartierConnect

> Procédure complète pour mettre QuartierConnect en production sur un VPS Linux (Ubuntu 22.04+ / Debian 12). Rejouable from scratch par un tiers.

---

## Table des matières

1. [Prérequis VPS](#1-prérequis-vps)
2. [Préparation du serveur](#2-préparation-du-serveur)
3. [Clonage et configuration](#3-clonage-et-configuration)
4. [Premier démarrage](#4-premier-démarrage)
5. [Seed des comptes démo](#5-seed-des-comptes-démo)
6. [Vérification end-to-end](#6-vérification-end-to-end)
7. [Mises à jour (CI/CD)](#7-mises-à-jour-cicd)
8. [Backups automatiques](#8-backups-automatiques)
9. [Drill de restauration](#9-drill-de-restauration)
10. [Monitoring uptime](#10-monitoring-uptime)
11. [Rollback rapide](#11-rollback-rapide)
12. [Checklist sécurité prod](#12-checklist-sécurité-prod)

> Pour la gestion des **incidents** en production (DB down, certificat expiré, OOM, etc.), voir [`RUNBOOK.md`](RUNBOOK.md).

---

## 1. Prérequis VPS

| Ressource | Minimum recommandé |
|-----------|-------------------|
| CPU | 2 vCPU |
| RAM | 4 Go (8 Go conseillé) |
| Disque | 40 Go SSD |
| OS | Ubuntu 22.04 LTS / Debian 12 |
| Réseau | IP publique fixe, ports **80** et **443** ouverts |
| DNS | Enregistrement A `quartierconnect.fr` → IP du VPS |

---

## 2. Préparation du serveur

### En tant que root (one-shot)

```bash
ssh root@<IP_VPS>

# 1. Mise à jour
apt update && apt upgrade -y

# 2. Créer un user dédié non-root
adduser --gecos "" deploy
usermod -aG sudo deploy

# 3. Désactiver le login root SSH
sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl restart sshd

# 4. Installer Docker + Docker Compose v2
curl -fsSL https://get.docker.com | sh
usermod -aG docker deploy

# 5. Outils utiles
apt install -y git make jq curl wget unzip awscli
```

### Firewall + fail2ban

```bash
# Côté repo on a tout ce qu'il faut :
git clone https://github.com/creibaud/QuartierConnect.git /opt/qc-bootstrap
cd /opt/qc-bootstrap

# UFW
sudo bash ops/ufw-rules.sh

# fail2ban
apt install -y fail2ban
cp ops/fail2ban-jail.local /etc/fail2ban/jail.local
cp ops/fail2ban-filter-caddy-auth.conf /etc/fail2ban/filter.d/caddy-auth.conf
systemctl enable --now fail2ban

# Cron quotidien
cp ops/cron.d/quartierconnect /etc/cron.d/quartierconnect
chmod 644 /etc/cron.d/quartierconnect

# Logrotate Caddy
cp ops/logrotate-caddy /etc/logrotate.d/caddy

# Bootstrap fini, on peut nettoyer
rm -rf /opt/qc-bootstrap
```

### Repasser en `deploy`

```bash
exit
ssh deploy@<IP_VPS>
```

---

## 3. Clonage et configuration

```bash
cd ~
git clone https://github.com/creibaud/QuartierConnect.git
cd QuartierConnect

# Copier le template prod
cp docker/.env.prod.example .env
chmod 600 .env

# Générer les secrets avec openssl
nano .env
```

Valeurs à remplir avec `openssl rand -base64 32 | tr -d '/+='` :
- `JWT_SECRET` (≥ 48 chars)
- `MONGO_ROOT_PASSWORD`
- `POSTGRES_PASSWORD`
- `NEO4J_PASSWORD` (et copier la même valeur dans `NEO4J_AUTH=neo4j/<password>`)

**Vérification** :

```bash
# Aucune valeur ne doit contenir "<generate" ou "<password>"
grep -E '<(generate|password|same|strong)' .env && echo "⚠ Encore des placeholders" || echo "✓"

# Permissions
ls -la .env  # doit afficher -rw-------
```

---

## 4. Premier démarrage

```bash
# Préparer les répertoires logs et backups
sudo mkdir -p /var/log/quartierconnect /var/backups/quartierconnect
sudo chown deploy:deploy /var/log/quartierconnect /var/backups/quartierconnect

# Build et démarrage
docker compose \
  -f docker/docker-compose.yml \
  -f docker/docker-compose.prod.yml \
  up -d --build

# Suivre le démarrage (Caddy met 30-60s à obtenir le certif Let's Encrypt)
docker compose \
  -f docker/docker-compose.yml \
  -f docker/docker-compose.prod.yml \
  logs -f caddy
```

Vérifier que tous les services passent `Up (healthy)` :

```bash
docker compose \
  -f docker/docker-compose.yml \
  -f docker/docker-compose.prod.yml \
  ps
```

---

## 5. Seed des comptes démo

```bash
# Depuis le VPS, depuis le repo
docker exec docker-api-1 sh -c "cd /app && node -r ts-node/register /app/scripts/seed-demo.ts" || \
  API_URL=https://quartierconnect.fr/api \
  PG_CONTAINER=docker-postgres-1 \
  pnpm --filter api exec ts-node scripts/seed-demo.ts
```

---

## 6. Vérification end-to-end

```bash
# Smoke test complet (depuis n'importe où)
./scripts/smoke-test.sh https://quartierconnect.fr
```

Devrait afficher :

```
✓ GET /api/health → 200
✓ GET /api/health retourne status:ok
✓ MongoDB up dans /health
✓ PostgreSQL up dans /health
✓ Neo4j up dans /health
✓ GET / (client) → 200
✓ GET /admin → 200
✓ GET /docs (Scalar) → 200
✓ POST /api/auth/login creds invalides → 401
✓ HSTS header présent
✓ CSP header présent
✓ Pas de header Server
✓ HTTPS valide
✓ WS /api/messaging répond (pas 5xx)
```

Test additionnel SSL Labs (cible : note A+) :

```bash
curl https://api.ssllabs.com/api/v3/analyze?host=quartierconnect.fr
```

---

## 7. Mises à jour (CI/CD)

### Manuel depuis le VPS

```bash
cd ~/QuartierConnect
./scripts/deploy-vps.sh main
```

Le script :
1. Capture le SHA actuel pour rollback
2. `git pull`
3. Rebuild + redémarrage
4. Smoke test
5. Rollback auto si KO

### Automatique via GitHub Actions

Configuration dans GitHub → Settings → **Environments** → **production** :

| Élément | Valeur |
|---------|--------|
| Required reviewers | Claudio (chef de projet) |
| Wait timer | 0 min (ou 5 min en mode prudent) |
| Branch/tag restrictions | `v*.*.*` uniquement |

**Secrets GitHub** (Settings → Secrets → Actions) :

| Secret | Description |
|--------|-------------|
| `VPS_SSH_PRIVATE_KEY` | Clé SSH privée du user `deploy` |
| `VPS_HOST` | IP ou hostname du VPS |
| `VPS_USER` | `deploy` |
| `VPS_DEPLOY_PATH` | `/home/deploy/QuartierConnect` |
| `PROD_DOMAIN` | `quartierconnect.fr` (sans https://) |
| `DISCORD_WEBHOOK` | URL webhook Discord pour notifications |

Génération de la clé SSH dédiée au deploy :

```bash
# Sur ta machine locale (PAS sur le VPS)
ssh-keygen -t ed25519 -C "github-actions-deploy" -f deploy_key -N ""

# Ajouter la pubkey sur le VPS pour le user deploy
ssh-copy-id -i deploy_key.pub deploy@<IP_VPS>

# Coller deploy_key (privée) dans VPS_SSH_PRIVATE_KEY sur GitHub
cat deploy_key

# Détruire la copie locale immédiatement après
shred -u deploy_key
```

Workflow `deploy.yml` se déclenche sur :
- push de tag `v*.*.*`
- `workflow_dispatch` manuel (avec saisie de la branche)

---

## 8. Backups automatiques

Le cron installé en section 2 lance `backup-all.sh` chaque nuit à 2h :

```
0 2 * * *   deploy   cd /home/deploy/QuartierConnect && ./scripts/backup-all.sh
```

Contenu :

| Base | Outil | Rétention locale | Rétention S3 |
|------|-------|------------------|--------------|
| MongoDB | `mongodump --gzip --archive` | 7j | 7j + 4 sem + 12 mois |
| PostgreSQL | `pg_dumpall | gzip` | 7j | 7j + 4 sem + 12 mois |
| Neo4j | `neo4j-admin database dump` (cold, ~30s downtime) | 7j | 7j + 4 sem + 12 mois |
| Caddy certs | `tar.gz` (lundi seulement) | 28j | 12 sem |

Configuration S3 : remplir `BACKUP_S3_*` dans `.env`. Compatible Scaleway, Backblaze B2, AWS S3.

Logs : `/var/log/quartierconnect/backup-summary-YYYY-MM-DD.log`

Notification Discord en cas d'échec (uniquement).

---

## 9. Drill de restauration

> **À effectuer au moins une fois avant la soutenance.** Backup non testé = backup inexistant.

### Scénario 1 — Perte de MongoDB

```bash
# 1. Vérifier qu'un backup récent existe
ls -lh /var/backups/quartierconnect/mongo-*.tar.gz | tail -3

# 2. Simuler une perte (sur un VPS de staging, PAS prod !)
docker exec docker-mongo-1 mongosh --quiet \
  -u root -p "$MONGO_ROOT_PASSWORD" \
  --eval "db.getSiblingDB('quartierconnect').dropDatabase()"

# 3. Vérifier que c'est bien vide
docker exec docker-mongo-1 mongosh --quiet \
  -u root -p "$MONGO_ROOT_PASSWORD" --authenticationDatabase admin \
  --eval "db.getSiblingDB('quartierconnect').neighborhoods.countDocuments()"

# 4. Restaurer
./scripts/restore-mongo.sh /var/backups/quartierconnect/mongo-<DATE>.tar.gz

# 5. Vérifier
docker exec docker-mongo-1 mongosh --quiet \
  -u root -p "$MONGO_ROOT_PASSWORD" --authenticationDatabase admin \
  --eval "db.getSiblingDB('quartierconnect').neighborhoods.countDocuments()"
# → doit afficher > 0
```

### Scénario 2 — Perte de PostgreSQL

```bash
./scripts/restore-postgres.sh /var/backups/quartierconnect/postgres-<DATE>.sql.gz
```

### Scénario 3 — Perte de Neo4j

```bash
./scripts/restore-neo4j.sh /var/backups/quartierconnect/neo4j-<DATE>.tar.gz
```

Après chaque drill, **noter la date + le temps de restauration** dans le RUNBOOK.

---

## 10. Monitoring uptime

### Minimum acceptable — UptimeRobot (gratuit)

1. Créer un compte sur https://uptimerobot.com
2. Ajouter un monitor :
   - Type : HTTPS
   - URL : `https://quartierconnect.fr/api/health`
   - Intervalle : 5 min
   - Keyword monitoring : "ok"
3. Configurer une alerte :
   - Discord webhook → channel `#alerts`
   - Email équipe
   - Déclencheur : 2 fails consécutifs

### Bonus — endpoint `/metrics` Prometheus

Si temps, exposer `/metrics` côté NestJS (`nest-prometheus` ou `prom-client`) et scraper depuis Grafana Cloud (tier gratuit).

---

## 11. Rollback rapide

### Via script

```bash
cd ~/QuartierConnect
git log --oneline -10                    # Identifier le commit cible
./scripts/rollback.sh <git-sha>
```

### Manuel d'urgence

```bash
cd ~/QuartierConnect
git checkout <commit-sha>
docker compose \
  -f docker/docker-compose.yml \
  -f docker/docker-compose.prod.yml \
  up -d --build
```

---

## 12. Checklist sécurité prod

- [ ] `.env` avec `chmod 600`
- [ ] `JWT_SECRET` ≥ 48 caractères, généré aléatoirement
- [ ] Mots de passe DB générés aléatoirement (jamais réutilisés)
- [ ] Ports DB (5432, 27017, 7474, 7687) **non exposés** publiquement (vérifier avec `nmap <IP_VPS>`)
- [ ] `LOGIN_RATE_LIMIT=5` en production
- [ ] `CORS_ORIGINS` ne contient que le domaine HTTPS de prod
- [ ] HSTS actif (`curl -I https://quartierconnect.fr | grep -i strict`)
- [ ] CSP avec `frame-ancestors 'none'`
- [ ] SSL Labs note ≥ A
- [ ] Backup quotidien automatisé via cron
- [ ] **Drill de restauration effectué** (au moins une fois)
- [ ] UFW activé (80/443/22 uniquement)
- [ ] fail2ban actif (jails SSH + caddy-auth)
- [ ] SSH root désactivé
- [ ] SSH password désactivé (clé uniquement)
- [ ] UptimeRobot configuré + alerte testée
- [ ] Mises à jour OS automatiques activées (`unattended-upgrades`)
- [ ] Discord webhook configuré pour deploy + backups + uptime