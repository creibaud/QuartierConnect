# Checklist avant démonstration — QuartierConnect (prod OVH)

> La démonstration se fait sur la **production en ligne** :
> **https://quartierconnect.duckdns.org** (hébergée sur OVH).
> À dérouler **la veille** puis **le jour J**. Scénario : [DEMO_SCRIPT.md](DEMO_SCRIPT.md).

## Accès de référence

| Surface | URL |
|---|---|
| Application résident | https://quartierconnect.duckdns.org |
| Back-office admin | https://quartierconnect.duckdns.org/admin |
| Aide utilisateur | https://quartierconnect.duckdns.org/aide |
| Doc technique (protégée) | https://quartierconnect.duckdns.org/dev |
| Référence API Scalar (protégée) | https://quartierconnect.duckdns.org/api/docs |
| Santé API | https://quartierconnect.duckdns.org/api/health |
| Dépôt GitHub | https://github.com/creibaud/QuartierConnect |

Comptes de démonstration — mot de passe `Demo1234!`, code TOTP à 6 chiffres via
l'application d'authentification (voir « TOTP » ci-dessous) :

| Compte | Rôle |
|---|---|
| `alice@demo.fr` | Résident |
| `bob@demo.fr` | Modérateur |
| `admin@demo.fr` | Administrateur |

## La veille

### Prod en ligne

- [ ] `https://quartierconnect.duckdns.org/api/health` → `{"status":"ok"}`
- [ ] Page d'accueil résident, `/admin` et `/aide` se chargent sans erreur
- [ ] Données de démo présentes (services, incidents, votes, événements) — sinon
      re-seed en SSH (voir plus bas)
- [ ] Version affichée à jour (health `version`) = dernier déploiement `main`

### TOTP prod — secret partagé prod ⇄ local (déjà configuré)

> Le secret TOTP d'origine (public) a été rotationné à l'audit. Un **nouveau
> secret privé** a été généré et **appliqué aux 3 comptes démo en prod** ; il est
> aussi dans le `.env` local (variable `DEMO_TOTP_SECRET`, non versionnée), donc
> `make totp` produit le **même code que celui attendu en prod**.

- [ ] Générer un code : `make totp` (lit `DEMO_TOTP_SECRET` du `.env`)
- [ ] **Enrôler le secret dans une application d'authentification** (téléphone)
      avant le jour J — scanner le QR d'enrôlement ou saisir l'otpauth :
      ```bash
      # affiche l'URL otpauth à enrôler (secret lu depuis .env)
      S=$(grep '^DEMO_TOTP_SECRET=' .env | cut -d= -f2-); \
        echo "otpauth://totp/QuartierConnect:demo?secret=$S&issuer=QuartierConnect"
      ```
- [ ] Vérifier la connexion des 3 comptes en prod avec un code de `make totp`

> Après un **re-seed** de la prod, ré-appliquer le secret aux comptes :
> ```bash
> S=$(grep '^DEMO_TOTP_SECRET=' .env | cut -d= -f2-)
> ssh ubuntu@quartierconnect.duckdns.org "for U in alice bob admin; do \
>   docker exec docker-postgres-1 psql -U qc -d quartierconnect \
>   -c \"UPDATE users SET totp_secret='$S' WHERE email='\$U@demo.fr'\"; done"
> ```

### Client lourd desktop

- [ ] Récupérer l'installeur de la **dernière release** (`v1.0.3`) :
      https://github.com/creibaud/QuartierConnect/releases (deb / dmg / msi + JAR)
- [ ] Installer/lancer une fois pour préchauffer et vérifier la connexion SSO
      vers l'admin en ligne
- [ ] Vérifier le SHA-256 de l'installeur contre `SHA256SUMS` de la release

### Preuves de qualité

- [ ] Onglet **Actions** GitHub ouvert : dernier workflow **CI** et **E2E**
      complet au vert (à montrer en direct plutôt que de relancer les tests)
- [ ] Dernier déploiement `deploy.yml` au vert (prod = `main`)

## Le jour J (30 min avant)

### Comptes et onglets

- [ ] Application d'authentification prête, horloge du poste **à l'heure**
      (indispensable pour le TOTP)
- [ ] Onglets navigateur prêts : résident (`alice`), fenêtre privée (`bob`),
      `/admin` (`admin`)
- [ ] Identifiants basic auth des docs sous la main (pour montrer `/dev` ou
      `/api/docs`)
- [ ] Client desktop installé et lancé une fois

### Réseau et machine

- [ ] **Connexion Internet fiable** : la démo dépend de la prod OVH
      (prévoir un partage de connexion mobile en secours)
- [ ] Pour la démo **hors-ligne du desktop** : on coupera le **Wi-Fi du poste**
      (pas la prod) — tester une fois la coupure/reconnexion
- [ ] Mode « Ne pas déranger », notifications coupées, chargeur branché,
      sortie vidéo testée
- [ ] Terminal en police lisible pour la partie SSH / preuves

### Plan B

- [ ] Captures d'écran de secours des parcours clés (login, services,
      messagerie, DSL, desktop) accessibles hors ligne
- [ ] Vidéo de secours du parcours desktop (hors-ligne + conflit)
- [ ] Jeu de données de rechargement prêt (`livrables/jeux-essais/`) si un
      re-seed prod est nécessaire

## Re-seed de la prod (si besoin)

En SSH sur le serveur, dans `/home/ubuntu/QuartierConnect` :

```bash
# API en ligne, bases up : réinjecter les comptes + données de démo
API_URL=https://quartierconnect.duckdns.org/api \
  pnpm exec tsx scripts/seed-demo.ts
```

> Le seed est idempotent (comptes « already exists », crédit de bienvenue non
> dupliqué). Après re-seed, refaire l'étape **TOTP prod** ci-dessus.
