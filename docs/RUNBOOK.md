# RUNBOOK — Incidents Production QuartierConnect

> Procédures de résolution d'incidents en production. Distinct de [`DEPLOYMENT.md`](DEPLOYMENT.md) (setup) — ce fichier couvre **ce qui casse une fois en prod**.

**Réflexe avant tout** : lancer le diagnostic global.

```bash
cd ~/QuartierConnect
docker compose -f docker/docker-compose.yml -f docker/docker-compose.prod.yml ps
./scripts/smoke-test.sh https://quartierconnect.fr
```

---

## Table des incidents

| # | Symptôme | Section |
|---|----------|---------|
| 1 | MongoDB down / API renvoie 500 | [§1](#1--mongodb-down) |
| 2 | Certificat Let's Encrypt expiré / HTTPS cassé | [§2](#2--certificat-lets-encrypt-expiré) |
| 3 | Disque plein | [§3](#3--disque-plein) |
| 4 | Neo4j OOM (Out Of Memory) | [§4](#4--neo4j-oom) |
| 5 | Deploy bloqué (healthcheck rouge en boucle) | [§5](#5--deploy-bloqué) |
| 6 | Restauration d'urgence depuis backup | [§6](#6--restauration-durgence) |

---

## 1 — MongoDB down

### Symptômes
- `/api/health` renvoie `"mongo":"down"`
- L'API log `MongoServerError` ou `MongoNetworkError`
- Les pages services / événements / messagerie sont vides

### Diagnostic

```bash
docker compose -f docker/docker-compose.yml -f docker/docker-compose.prod.yml ps mongo
docker compose -f docker/docker-compose.yml -f docker/docker-compose.prod.yml logs mongo --tail=100
```

### Causes fréquentes et résolution

**A. Conteneur arrêté / crashé**

```bash
docker compose -f docker/docker-compose.yml -f docker/docker-compose.prod.yml restart mongo
# Attendre healthy
watch -n2 'docker compose -f docker/docker-compose.yml -f docker/docker-compose.prod.yml ps mongo'
```

**B. Corruption de données (mongo refuse de démarrer en boucle)**

Vérifier les logs pour `Detected unclean shutdown`. Tenter une réparation :

```bash
docker compose -f docker/docker-compose.yml -f docker/docker-compose.prod.yml stop mongo
docker run --rm -v quartierconnect_mongo_data:/data/db mongo:7 mongod --repair --dbpath /data/db
docker compose -f docker/docker-compose.yml -f docker/docker-compose.prod.yml start mongo
```

Si la réparation échoue → [§6 restauration](#6--restauration-durgence).

**C. Authentification refusée**

Vérifier que `MONGO_ROOT_PASSWORD` dans `.env` correspond à celui avec lequel le volume a été initialisé. Si le mot de passe a été changé après le premier `up`, MongoDB garde l'ancien (le password n'est appliqué qu'à l'init du volume vierge).

### Après résolution
```bash
./scripts/smoke-test.sh https://quartierconnect.fr
```

---

## 2 — Certificat Let's Encrypt expiré

### Symptômes
- Navigateur affiche `NET::ERR_CERT_DATE_INVALID`
- `curl https://quartierconnect.fr` → `certificate has expired`

> Caddy renouvelle automatiquement ~30j avant expiration. Un certif expiré = le renew automatique est bloqué depuis longtemps.

### Diagnostic

```bash
docker compose -f docker/docker-compose.yml -f docker/docker-compose.prod.yml logs caddy | grep -i acme | tail -30
# Date d'expiration actuelle
echo | openssl s_client -connect quartierconnect.fr:443 2>/dev/null | openssl x509 -noout -dates
```

### Causes fréquentes et résolution

**A. Port 80 bloqué** (challenge HTTP-01 impossible)

Let's Encrypt valide via le port 80. Vérifier :

```bash
sudo ufw status | grep 80
# Doit être ALLOW. Sinon :
sudo ufw allow 80/tcp
```

**B. Rate limit Let's Encrypt atteint** (trop de tentatives)

Let's Encrypt limite à 5 échecs/heure par domaine. Attendre 1h, ou basculer temporairement sur le staging pour debugger :

```bash
# Ajouter dans le bloc global du Caddyfile.prod, TEMPORAIREMENT :
#   acme_ca https://acme-staging-v02.api.letsencrypt.org/directory
# puis recharger, vérifier, puis retirer et recharger
docker compose -f docker/docker-compose.yml -f docker/docker-compose.prod.yml restart caddy
```

**C. DNS mal configuré** (A record ne pointe plus vers le VPS)

```bash
dig +short quartierconnect.fr
# Doit retourner l'IP du VPS
```

**D. Forcer un renouvellement manuel**

```bash
docker exec docker-caddy-1 caddy reload --config /etc/caddy/Caddyfile
# Si toujours KO, supprimer le cache ACME (Caddy redemandera un certif)
docker compose -f docker/docker-compose.yml -f docker/docker-compose.prod.yml stop caddy
docker volume rm quartierconnect_caddy_data  # ⚠ supprime tous les certifs
docker compose -f docker/docker-compose.yml -f docker/docker-compose.prod.yml up -d caddy
```

> On a un backup hebdo des certifs Caddy (cf. backup-all.sh) — restaurable si besoin.

---

## 3 — Disque plein

### Symptômes
- API et DB plantent avec `No space left on device`
- `docker compose up` échoue

### Diagnostic

```bash
df -h /
docker system df            # Usage Docker détaillé
du -sh /var/lib/docker/* | sort -h | tail
du -sh /var/backups/quartierconnect/
du -sh /var/log/quartierconnect/
```

### Résolution (par ordre de sécurité)

**A. Nettoyer les ressources Docker inutilisées (sûr)**

```bash
docker image prune -af              # Images sans conteneur
docker builder prune -af            # Cache de build
docker system prune -af --filter "until=168h"  # Tout ce qui date > 7j
```

**B. Purger les vieux backups locaux (si déjà sur S3)**

```bash
# Vérifier d'abord qu'ils sont sur S3
aws s3 ls "s3://$BACKUP_BUCKET/mongo/" --endpoint-url "https://$BACKUP_S3_ENDPOINT"
# Puis purger > 3j en local
find /var/backups/quartierconnect -name '*.tar.gz' -o -name '*.sql.gz' -mtime +3 -delete
```

**C. Purger les logs**

```bash
find /var/log/quartierconnect -name '*.log' -mtime +7 -delete
sudo journalctl --vacuum-time=3d
```

**D. ⚠ JAMAIS** supprimer les volumes `*_data` sans backup vérifié.

### Prévention
Le cron hebdo (`docker system prune`) + la rotation backups/logs devraient éviter ça. Si ça arrive quand même, augmenter le disque du VPS.

---

## 4 — Neo4j OOM

### Symptômes
- Neo4j redémarre en boucle
- Logs : `java.lang.OutOfMemoryError: Java heap space`
- `/api/health` renvoie `"neo4j":"down"`, recommandations cassées

### Diagnostic

```bash
docker compose -f docker/docker-compose.yml -f docker/docker-compose.prod.yml logs neo4j --tail=100 | grep -i memory
docker stats --no-stream docker-neo4j-1
```

### Résolution

**A. Vérifier les limites configurées**

Le `docker-compose.prod.yml` cappe déjà la heap à 1G. Si le VPS a plus de RAM (8 Go+), augmenter :

```yaml
# docker-compose.prod.yml → service neo4j → environment
NEO4J_server_memory_heap_max__size: "2G"
NEO4J_server_memory_pagecache_size: "512m"
```

Puis :

```bash
docker compose -f docker/docker-compose.yml -f docker/docker-compose.prod.yml up -d neo4j
```

**B. Limite mémoire conteneur trop basse**

Vérifier `deploy.resources.limits.memory` (2G par défaut). L'augmenter si le VPS le permet.

**C. Requête Cypher non bornée**

Si l'OOM coïncide avec une feature précise (recommandations), chercher une requête sans `LIMIT` dans `api/src/social/`. Signaler à Claudio (back-end).

---

## 5 — Deploy bloqué

### Symptômes
- `deploy.yml` échoue au smoke test
- Healthcheck d'un service reste rouge
- Le rollback automatique s'est (ou ne s'est pas) déclenché

### Diagnostic

```bash
docker compose -f docker/docker-compose.yml -f docker/docker-compose.prod.yml ps
# Identifier le service unhealthy
docker compose -f docker/docker-compose.yml -f docker/docker-compose.prod.yml logs <service> --tail=200
```

### Résolution

**A. Le rollback auto a fonctionné** → l'ancienne version tourne. Investiguer le commit fautif en local avant de redéployer.

**B. Le rollback a échoué aussi** (les deux versions KO)

Cause probable : une migration de données ou un changement de `.env` incompatible. Restaurer manuellement :

```bash
cd ~/QuartierConnect
git log --oneline -10
./scripts/rollback.sh <dernier-sha-stable-connu>
```

**C. API démarre avant les DB**

Le `depends_on: condition: service_healthy` doit empêcher ça. Si ça arrive, vérifier que les healthchecks DB passent bien :

```bash
docker inspect docker-postgres-1 --format '{{.State.Health.Status}}'
docker inspect docker-mongo-1 --format '{{.State.Health.Status}}'
docker inspect docker-neo4j-1 --format '{{.State.Health.Status}}'
```

**D. Forcer un redémarrage propre**

```bash
docker compose -f docker/docker-compose.yml -f docker/docker-compose.prod.yml down
docker compose -f docker/docker-compose.yml -f docker/docker-compose.prod.yml up -d --build
```

---

## 6 — Restauration d'urgence

> Quand une base est irrécupérable. Les scripts demandent une confirmation `oui` avant d'écraser.

### Choisir le backup

```bash
ls -lht /var/backups/quartierconnect/ | head -20
# Ou depuis S3 si le local est perdu :
aws s3 ls "s3://$BACKUP_BUCKET/mongo/" --endpoint-url "https://$BACKUP_S3_ENDPOINT"
aws s3 cp "s3://$BACKUP_BUCKET/mongo/mongo-<DATE>.tar.gz" /var/backups/quartierconnect/ \
  --endpoint-url "https://$BACKUP_S3_ENDPOINT"
```

### Restaurer

```bash
# MongoDB
./scripts/restore-mongo.sh /var/backups/quartierconnect/mongo-<DATE>.tar.gz

# PostgreSQL
./scripts/restore-postgres.sh /var/backups/quartierconnect/postgres-<DATE>.sql.gz

# Neo4j
./scripts/restore-neo4j.sh /var/backups/quartierconnect/neo4j-<DATE>.tar.gz
```

### Vérifier

```bash
./scripts/smoke-test.sh https://quartierconnect.fr
```

---

## Journal des drills de restauration

> À remplir après chaque test de restauration (cf. DEPLOYMENT.md §9).

| Date | Base testée | Temps de restauration | Résultat | Opérateur |
|------|-------------|----------------------|----------|-----------|
| _à remplir_ | MongoDB | _ex: 3 min_ | ✅ / ❌ | Mouhamadou |
| | PostgreSQL | | | |
| | Neo4j | | | |

---

## Contacts escalade

| Domaine | Responsable |
|---------|-------------|
| Infra / DevOps / déploiement | Mouhamadou |
| Back-end NestJS / API / DB | Claudio (chef de projet) |
| Desktop Java / DSL | Claudio |
| Tests / doc | Andras |