# Livrable — Démonstration du client web QuartierConnect

**Réunions de présentation :** 01/07 (groupe 3AL1) · 02/07 (groupe 3AL2)
**Objectif de la séance :** démonstration du client web et **≥ 95 % de l'application totale réalisée**.

Ce document finalise le **dossier fonctionnel et technique complet** en intégrant les
modifications réalisées depuis la séance précédente.

---

## 1. Objet du livrable

| Attendu | Statut |
|---|---|
| Démonstration du client web, ≥ 95 % de l'application réalisée | ✅ |
| Dossiers (fonctionnel + technique) repris avec les modifications de la séance précédente | ✅ |
| État d'avancement (Trello) | ✅ (§ 7) |
| Client Web React **administration terminée** | ✅ (§ 5.2) |
| Micro-langage d'interrogation sur documents MongoDB | ✅ (§ 6) |

---

## 2. État d'avancement global

> Estimation globale : **~96 %**.

| Module | Avancement | Détail |
|---|---:|---|
| API (NestJS) | 100 % | Auth, points, événements, services, votes, incidents, messagerie, contrats, documents, quartiers, social, DSL |
| Client web — Résident | 95 % | Refonte complète ; reste l'harmonisation de quelques écrans secondaires |
| Client web — Administration | 100 % | Tous les modules de gestion + console DSL |
| Application desktop (JavaFX) | 90 % | Connexion via SSO, fonctions principales |
| Micro-langage (DSL MongoDB) | 100 % | Lexer/parser/compiler + tests + console admin |
| Base de données & migrations | 100 % | Postgres (Drizzle), MongoDB, Neo4j ; migrations versionnées |
| CI/CD | 100 % | Lint, typecheck, build, tests, E2E (PR + nightly) |
| Sécurité & RGPD | 100 % | JWT+rotation, TOTP, argon2id, export/suppression de compte |

---

## 3. Dossier fonctionnel

Application de quartier connecté : entraide, vie locale et gouvernance participative.
Trois rôles : **Résident**, **Modérateur**, **Administrateur**.

### 3.1 Résident
- **Tableau de bord** : solde de points, votes en cours, prochains événements, services du quartier, recommandations.
- **Événements** : consulter, créer, indiquer sa participation.
- **Services / entraide** : annuaire, proposer un service, réactions (j'aime), carte du quartier.
- **Points de participation** : solde, historique, transfert de points entre voisins.
- **Votes / sondages** : créer, répondre (un seul vote par personne et par sondage).
- **Messagerie** : conversations 1-à-1, pièces jointes (fichiers/images).
- **Contrats** : suivi des engagements.
- **Mon compte (RGPD)** : modification du profil (nom, prénom, **photo de profil**), changement de mot de passe (avec **indicateur de force**), statut 2FA, **export de mes données**, **suppression de compte**.

### 3.2 Modérateur
- Tout ce que fait le résident **+ signalement et gestion des incidents**.

### 3.3 Administrateur (back-office web)
- Gestion des **utilisateurs** (rôles), **quartiers**, **services**, **événements**, **incidents**, **votes communautaires**.
- **Console DSL** : interrogation des documents MongoDB en langage métier (§ 6).

---

## 4. Dossier technique

### 4.1 Architecture (monorepo)
```
api/          NestJS 11 — REST + WebSocket (messagerie temps réel)
web-apps/     Turborepo
  apps/client     React 19 — espace résident/modérateur
  apps/admin      React 19 — back-office d'administration
  packages/shared API client, hooks, types, i18n (FR/EN)
  packages/ui     Design system (shadcn/ui, Tailwind v4)
desktop-app/  JavaFX — client lourd (connexion par SSO)
dsl/          Python (PLY) — micro-langage d'interrogation MongoDB
docker/       Stack de dev/prod (Caddy, Postgres, MongoDB, Neo4j)
```

### 4.2 Stack
- **Back** : NestJS 11, Drizzle ORM (PostgreSQL), Mongoose (MongoDB), Neo4j (recommandations/graphe social), GridFS (fichiers), Swagger.
- **Front** : React 19, TanStack Router/Query/Form, shadcn/ui, Tailwind v4 (tokens oklch, dark mode), Framer Motion, i18n FR/EN.
- **Données** : PostgreSQL (utilisateurs, points, incidents), MongoDB (événements, services, votes, conversations, messages, quartiers, contrats, documents), Neo4j (graphe social).

### 4.3 Sécurité & RGPD
- **Authentification** : JWT access (15 min) + refresh (7 j) avec **rotation**, mots de passe **argon2id**, **TOTP** (2FA) obligatoire.
- **SSO** : jeton à usage unique pour le client desktop Java (TTL 5 min).
- **Rôles** : resident / moderator / admin / banned (+ état « deleted »).
- **RGPD** : export complet des données (profil, points, incidents…), suppression de compte (anonymisation, confirmée par TOTP), consentement et transparence dans « Mon compte ».
- **Force des mots de passe** : estimation **zxcvbn** (entropie, dictionnaires, motifs) côté client.

### 4.4 CI/CD
- **`ci.yml`** (push main/develop + PR) : lint, typecheck, build (api / web / desktop / dsl) + validation.
- **`e2e.yml`** : Playwright en **nightly** complet + **smoke E2E** sur les PR.

---

## 5. Client Web React

### 5.1 Espace résident — refonte (modifications de la séance)
Refonte **visuelle et UX** complète (thème « Voisinage » : terracotta / vert communautaire / crème,
typographies Fraunces + Inter, radius 0.75rem, dark mode) :
- Écrans **Connexion / Inscription** repensés (logo encadré, animations sobres).
- **Tableau de bord** transformé en *feed* vivant (points, votes, événements, services, recommandations) avec états vides/chargement soignés.
- **Shell** : sidebar filtrée **par rôle**, en-tête sticky (fil d'Ariane, compteur de points, notifications).
- **Nom & prénom** demandés à l'inscription → « Bonjour {prénom} » (tableau de bord + sidebar) ; **noms affichés à la place des emails** (historique de points, conversations).
- **Mon compte** : profil éditable + **photo de profil (stockée en GridFS)**, changement de mot de passe avec **indicateur de force zxcvbn**, statut 2FA, export RGPD, suppression de compte.
- **Architecture *feature*** côté front (`features/<domaine>/{pages, components, lib}`), routes fines.

### 5.2 Administration — **terminée**
Back-office React couvrant l'ensemble des entités :
- **Utilisateurs** (gestion des rôles), **Quartiers**, **Services**, **Événements**, **Incidents**, **Votes communautaires**.
- **Console DSL** intégrée (§ 6).
- Tableau de bord d'administration.

---

## 6. Micro-langage d'interrogation sur documents MongoDB (DSL)

Micro-langage métier (implémenté en **Python / PLY** : `lexer.py`, `parser.py`, `compiler.py`)
qui **compile une requête lisible en requête MongoDB**, exposé via une **console dans l'administration**.

### 6.1 Grammaire
```
FIND  <collection> [ WHERE <conditions> ] [ LIMIT <n> ]
COUNT <collection> [ WHERE <conditions> ]

<conditions> := <condition> [ (AND | OR) <condition> ]*
<condition>  := <champ> <op> <valeur>
<op>         := =  |  !=  |  >  |  <  |  LIKE
```
Les noms de collections sont **validés** (collection inconnue → erreur).

### 6.2 Exemples
| Requête DSL | Requête MongoDB générée |
|---|---|
| `FIND incidents WHERE status = "open"` | `{ status: "open" }` |
| `FIND incidents WHERE status = "open" AND neighborhoodId = "nbh-1"` | `{ status: "open", neighborhoodId: "nbh-1" }` |
| `FIND incidents WHERE status = "open" OR status = "in_progress"` | `{ $or: [ { status: "open" }, { status: "in_progress" } ] }` |
| `FIND events WHERE capacity > 100` | `{ capacity: { $gt: 100 } }` |
| `FIND users WHERE role != "banned"` | `{ role: { $ne: "banned" } }` |
| `FIND neighborhoods WHERE name LIKE "Paris"` | `{ name: { $regex: "Paris", $options: "i" } }` |
| `FIND services WHERE category = "health" LIMIT 10` | filtre `{ category: "health" }`, limite `10` |
| `COUNT incidents WHERE status = "open"` | comptage avec filtre `{ status: "open" }` |

### 6.3 Qualité
Couvert par des **tests unitaires** (`dsl/tests/`) : lexer et compilateur (filtres, opérateurs, AND/OR, LIMIT, erreurs de syntaxe et collections inconnues).

---

## 7. État d'avancement — Trello

> Tableau Trello du projet : _<lien à insérer>_. Synthèse des colonnes :

- **Terminé (Done)** : API (tous modules), administration web, DSL + tests, sécurité/RGPD, CI/CD, refonte résident (auth, dashboard, shell, Mon compte), migrations BD.
- **En cours (Doing)** : finitions visuelles des écrans résident secondaires (points, événements, services, votes, messages, contrats), passe responsive mobile.
- **À faire (To do)** : drill de sauvegarde/restauration sur le VPS de démo (§ 8), harmonisation finale, accessibilité.

---

## 8. Reste à faire (~5 %)

- Harmoniser le **redesign** des écrans résident secondaires (même traitement que le tableau de bord).
- **Passe responsive** sur les écrans à carte / vue divisée (services, messagerie).
- **Drill de sauvegarde/restauration** des données sur le VPS de démonstration.
- Notifications (cloche) — déclencheurs serveur.

---

## 9. Déroulé de la démonstration

1. **Connexion** (résident) avec 2FA → tableau de bord (feed).
2. **Parcours résident** : événement, service/entraide, transfert de points, vote.
3. **Messagerie** temps réel.
4. **Mon compte** : modification du profil + **photo**, force du mot de passe, export RGPD.
5. **Administration** : gestion d'une entité (ex. service/quartier) + **console DSL** (requête MongoDB en direct).
6. **Desktop JavaFX** : connexion via **SSO** depuis le web.

### Comptes de démonstration
| Rôle | Email | Mot de passe | TOTP (secret) |
|---|---|---|---|
| Résident | `alice@demo.fr` | `Demo1234!` | `JBSWY3DPEHPK3PXP` |
| Modérateur | `bob@demo.fr` | `Demo1234!` | `JBSWY3DPEHPK3PXP` |
| Administrateur | `admin@demo.fr` | `Demo1234!` | `JBSWY3DPEHPK3PXP` |

> Données de démo : `make seed` (comptes + quartiers Paris + événements, services et vote d'exemple).
