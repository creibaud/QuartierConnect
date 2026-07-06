# Checklist avant démonstration — QuartierConnect

> À dérouler **la veille** puis **le jour J**, avant la soutenance.
> Script détaillé : [DEMO_SCRIPT.md](DEMO_SCRIPT.md).

## La veille

- [ ] `git pull` sur `main` + `make install` (api, web, dsl)
- [ ] `make validate` : lint + typecheck + tests + build tous verts
- [ ] `make build-desktop` : JAR présent dans `desktop-app/target/`
- [ ] `make docker-up-build` puis `make status` : 9 services `Up (healthy)`
- [ ] `DEMO_TOTP_SECRET` renseigné dans `.env` (obligatoire : le seed échoue sans lui,
      et `make totp` doit utiliser le même secret)
- [ ] `make seed` : comptes démo + graphe Neo4j peuplés
- [ ] `curl http://localhost/api/health` → `status:"ok"` (mongo, postgres, neo4j up)
- [ ] `./scripts/smoke-test.sh http://localhost` : tout vert
- [ ] Connexion testée sur les 3 comptes (`alice`, `bob`, `admin`) avec `make totp`
- [ ] SSO web → desktop testé une fois de bout en bout
- [ ] Scénario conflit desktop répété une fois (pause/unpause de l'API)

## Le jour J (30 min avant)

### Stack

- [ ] `make docker-up` puis `make status` : tous les services sains
- [ ] Données de démo présentes (sinon `make seed`)
- [ ] JAR desktop lancé une fois pour préchauffer (`java -jar desktop-app/target/quartierconnect-desktop.jar`)

### Comptes et accès

- [ ] `make totp` fonctionne (ou appli Authenticator configurée en secours)
- [ ] Onglets navigateur prêts : http://localhost (Alice),
      fenêtre privée (Bob), http://localhost/admin (admin)
- [ ] Identifiants basic auth des docs sous la main (variables `DOCS_AUTH_*`)
      si l'on montre `/dev` ou `/api/docs`
- [ ] Neo4j Browser ouvert (http://localhost:7474) avec la requête Cypher prête

### Réseau et machine

- [ ] Démo 100 % locale : vérifier que tout fonctionne **sans** Internet
      (seules les tuiles de carte en dépendent — zoomer une fois pour le cache)
- [ ] Horloge système à l'heure (indispensable pour le TOTP)
- [ ] Mode « Ne pas déranger » activé, notifications coupées
- [ ] Chargeur branché, sortie vidéo testée (miroir d'écran)
- [ ] Terminal en police lisible, thème clair/contrasté

### Plan B

- [ ] `make docker-reset` + `make seed` répétés au moins une fois (durée connue)
- [ ] Captures d'écran de secours des parcours clés (login, services,
      messagerie, DSL, desktop) accessibles hors ligne
- [ ] `docs/GUIDE-SOUTENANCE.md` ouvert (questions/réponses, chiffres clés)
- [ ] Archive de rendu `make dist` déjà générée sur clé USB
