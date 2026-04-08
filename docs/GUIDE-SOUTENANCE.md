# Guide de Soutenance — QuartierConnect

> **Date** : 19 juillet 2026 · **Enseignant** : Frédéric SANANES · **Durée** : ~30 minutes

---

## Table des matières

1. [Checklist pré-soutenance](#1-checklist-pré-soutenance)
2. [Démarrage de la démo](#2-démarrage-de-la-démo)
3. [Scénarios de démonstration](#3-scénarios-de-démonstration)
4. [Questions probables et réponses](#4-questions-probables-et-réponses)
5. [Chiffres à connaître par cœur](#5-chiffres-à-connaître-par-cœur)

---

## 1. Checklist pré-soutenance

### La veille

```bash
# 1. Mettre à jour les dépendances
make install

# 2. Valider tout
make validate

# 3. Démarrer l'environnement
make docker-up

# 4. Attendre 30s que tous les services démarrent
sleep 30

# 5. Seeder les données démo
make seed

# 6. Vérifier les accès
curl http://localhost/api/health
# → {"status":"ok","timestamp":"2026-07-19T...","version":"0.1.3"}

# 7. Vérifier Neo4j
# Aller sur http://localhost:7474 → MATCH (n) RETURN count(n)
# Doit afficher > 0 nœuds

# 8. Générer le code TOTP de démo
make totp
```

### Le jour J

- [ ] Docker lancé (`make docker-up`)
- [ ] Données seeded (`make seed`)
- [ ] Code TOTP à portée (`make totp`)
- [ ] Navigateur avec 3 onglets : client/:3000, admin/:3001, Scalar/docs
- [ ] oathtool installé ou Authenticator sur smartphone
- [ ] JAR desktop téléchargeable ou lancé (`java -jar target/quartierconnect-desktop.jar`)

---

## 2. Démarrage de la démo

### Accès rapides

| Surface         | URL                       | Compte         | Rôle     |
| --------------- | ------------------------- | -------------- | -------- |
| Client habitant | http://localhost          | alice@demo.fr  | resident |
| Admin           | http://localhost/admin    | admin@demo.fr  | admin    |
| API docs Scalar | http://localhost/api/docs | —              | —        |
| Neo4j Browser   | http://localhost:7474     | neo4j/password | —        |

**Mot de passe** : `Demo1234!` pour tous les comptes
**Code TOTP** : `oathtool --totp --base32 JBSWY3DPEHPK3PXP`

---

## 3. Scénarios de démonstration

### Scénario 1 — Inscription et connexion MFA (3 min)

1. Ouvrir http://localhost
2. Cliquer "S'inscrire" → saisir email + mot de passe
3. **Montrer le QR code TOTP** — expliquer RFC 6238
4. Scanner avec Google Authenticator → confirmer le code
5. Se déconnecter → se reconnecter avec le code TOTP

**Points à souligner :**
- Argon2id pour les mots de passe (pas bcrypt)
- JWT access 15min + refresh 7 jours avec rotation
- Anti-replay TOTP (même code deux fois = refusé)

### Scénario 2 — Création d'un quartier (2 min)

1. Se connecter en tant qu'admin (http://localhost/admin)
2. Aller dans "Quartiers" → "Créer un quartier"
3. Dessiner un polygone GeoJSON sur la carte
4. Essayer de créer un quartier qui chevauche → voir le message d'erreur 409
5. **Ouvrir Neo4j Browser** → MATCH (n:Neighborhood) RETURN n → voir le nœud créé

**Points à souligner :**
- Index 2dsphere MongoDB pour `$geoIntersects`
- Sync fire-and-forget vers Neo4j (ne bloque jamais l'API)

### Scénario 3 — Transfert de points (2 min)

1. Se connecter en tant qu'alice
2. Aller dans "Points" → solde actuel
3. Transférer 10 points à bob
4. Vérifier que le solde de bob a augmenté
5. **Ouvrir PgAdmin ou expliquer** la transaction `FOR UPDATE` + ACID

**Points à souligner :**
- `SELECT FOR UPDATE` — verrou exclusif
- Transaction PostgreSQL — rollback automatique si erreur
- Solde minimum -10 (découvert limité)

### Scénario 4 — Signature d'un contrat (3 min)

1. Créer un contrat avec alice comme créateur, bob comme signataire
2. Se connecter en tant que bob → signer avec code TOTP
3. **Montrer le hash SHA-256** dans la réponse
4. Se connecter en tant qu'alice → signer aussi
5. Statut passe à "signed"

**Points à souligner :**
- SHA-256 du contenu à la création → intégrité
- TOTP obligatoire pour signer → non-répudiation
- Hash unique par signature (contenu + userId + timestamp)

### Scénario 5 — Messagerie temps réel (2 min)

1. Ouvrir deux onglets : alice et bob connectés
2. Créer une conversation alice ↔ bob
3. Envoyer un message depuis alice → apparaît immédiatement chez bob
4. **Expliquer** Socket.io namespace /messaging, rooms `conversation:{id}`

**Points à souligner :**
- JWT vérifié à la connexion WebSocket
- `isParticipant` vérifié avant `join_conversation`
- `server.to(room).emit()` — broadcast aux participants

### Scénario 6 — Recommandations Neo4j (2 min)

1. Se connecter en tant qu'alice
2. Afficher les recommandations
3. **Ouvrir Neo4j Browser** → exécuter la requête Cypher du rapport
4. Expliquer le graphe `LIVES_IN`, `LOCATED_IN`, `HELD_IN`

**Points à souligner :**
- Sync temps réel à la création des entités
- Cypher UNION — services + événements dans le même voisinage

### Scénario 7 — DSL (2 min)

1. Aller dans "DSL" dans React Admin
2. Taper : `FIND incidents WHERE status = 'open' LIMIT 5`
3. Appuyer sur Ctrl+Enter → résultats s'affichent
4. Taper : `FIND passwords` → erreur "Unknown collection"
5. Taper : `FIND incidents WHERE status = 'open' OR status = 'in_progress'`

**Points à souligner :**
- PLY lexer/parser LALR(1)
- Whitelist de sécurité
- Bridge pythonia NestJS → Python

### Scénario 8 — Desktop offline (3 min)

1. Lancer le JAR : `java -jar target/quartierconnect-desktop.jar`
2. Faire l'échange SSO depuis l'admin web (http://localhost:3001) → se connecter dans le desktop
3. **Couper le réseau** (ou `docker pause api`)
4. Créer un incident dans le desktop → il apparaît en local
5. Relancer le réseau → incident synchronisé vers l'API

**Points à souligner :**
- Persistance SQLite de la session → pas besoin de se reconnecter
- `is_dirty` flag pour la sync LWW
- `isReachable()` avec timeout 3 secondes

### Scénario 9 — Tests (1 min)

```bash
# Dans un terminal visible
make test
# → 236 tests passent en ~8s

make test-desktop
# → 63 tests JUnit passent

cd dsl && uv run pytest
# → 21 tests pytest passent
```

---

## 4. Questions probables et réponses

**"Pourquoi trois bases de données ? C'est trop complexe."**
> PostgreSQL pour les données qui nécessitent des transactions ACID (points, auth) — on ne peut pas se permettre une double dépense ou une authentification partielle. MongoDB pour les documents flexibles avec GeoJSON natif (quartiers avec polygones) — PostgreSQL ne supporte pas `$geoIntersects` de cette façon. Neo4j uniquement pour les recommandations — les traversals de graphe sont son point fort. Chaque base fait une chose et la fait bien.

**"Argon2id vs bcrypt — pourquoi ?"**
> bcrypt est limité à 72 octets d'entrée (mots de passe longs tronqués silencieusement) et n'a pas de paramètre mémoire. Argon2id a gagné le Password Hashing Competition 2015 — son coût mémoire de 64 MB rend les attaques GPU impraticables car on ne peut pas paralléliser des milliers de threads avec 64 MB chacun.

**"Le fire-and-forget Neo4j, c'est un problème si Neo4j tombe ?"**
> En production, Neo4j est une fonctionnalité de recommandation — une panne Neo4j ne doit pas empêcher la création d'un quartier. On accepte que les recommandations soient temporairement absentes. Si Neo4j était une fonctionnalité critique, on utiliserait une queue (Bull/RabbitMQ) avec retry automatique. C'est un choix architectural délibéré.

**"Votre DSL est limité, pourquoi pas MongoDB directement ?"**
> L'API MongoDB complète permet des opérations destructives (`$where` avec exécution de code, `deleteMany`, etc.). Notre DSL est une surface contrôlée : FIND et COUNT uniquement, 5 collections autorisées, pas d'opérations d'écriture depuis l'admin. C'est une décision de sécurité.

**"Replay attack sur TOTP — si quelqu'un intercepte le code ?"**
> Le code est mémorisé en mémoire pendant 90 secondes (couvre la fenêtre ±1 de 30s). Un second envoi du même code dans cette fenêtre retourne `false` immédiatement. Après 90s, le code est de toute façon expiré (fenêtre RFC 6238 fermée).

**"Comment gérez-vous la déconnexion forcée d'un utilisateur banni ?"**
> Le rôle est vérifié à chaque refresh de token. Si un admin bannit alice, son access token courant reste valide 15 minutes max. Lors du prochain refresh, `role === 'banned'` est détecté et `401 ACCOUNT_BANNED` est retourné. Le refresh token est also révoqué. 15 minutes est acceptable — sinon il faudrait une liste noire en cache Redis.

**"Vos tests E2E, ils testent quoi exactement ?"**
> Les tests E2E Supertest utilisent les vraies bases de données (MongoDB et PostgreSQL de test) sans mock. `beforeAll` seed via l'API pour partir d'un état connu. On teste des scénarios bout-en-bout : inscription → login → création → mise à jour → suppression avec vérification des codes HTTP et des réponses JSON réelles.

---

## 5. Chiffres à connaître par cœur

| Chiffre                         | Valeur                                                                                                               |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Tests unitaires API             | 236                                                                                                                  |
| Tests Web shared hooks (Vitest) | 73                                                                                                                   |
| Tests E2E API                   | 148                                                                                                                  |
| Tests JUnit Java                | 63                                                                                                                   |
| Tests pytest DSL                | 21                                                                                                                   |
| Tests Playwright                | 79                                                                                                                   |
| **Total tests**                 | **620**                                                                                                              |
| Coverage statements API         | 95.7%                                                                                                                |
| Coverage branches API           | 86.1%                                                                                                                |
| Durée access token JWT          | 15 minutes                                                                                                           |
| Durée refresh token JWT         | 7 jours                                                                                                              |
| TTL token SSO                   | 5 minutes (300s)                                                                                                     |
| Solde minimum points            | -10                                                                                                                  |
| TTL anti-replay TOTP            | 90 secondes                                                                                                          |
| Rate limiting                   | 100 req / 15 min / IP                                                                                                |
| Collections DSL autorisées      | 5                                                                                                                    |
| Conteneurs Docker               | 7                                                                                                                    |
| Bases de données                | 3 (PostgreSQL, MongoDB, Neo4j) + 1 local (SQLite)                                                                    |
| Tables PostgreSQL               | 4 (users, incidents, points_balances, points_transactions)                                                           |
| Collections MongoDB             | 9 (neighborhoods, services, events, contracts, conversations, messages, votes, communityVotes, documents, ssoTokens) |
| Modules NestJS                  | 15                                                                                                                   |
| Taille du JAR desktop           | ~25 MB                                                                                                               |
