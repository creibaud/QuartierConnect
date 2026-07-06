# QuartierConnect — Design System « Voisinage » (v2)

Palette communautaire chaude : terracotta + vert civique + neutres chauds.
Contrastes calibrés WCAG AA. Une seule source de tokens pour le client ET
l'admin : `packages/ui/src/styles/voisinage.css`, importée juste après
`@workspace/ui/globals.css` dans le `main.tsx` de chaque app. Ne jamais
hardcoder d'hex/oklch dans les composants — toujours les tokens sémantiques
(`bg-primary`, `text-muted-foreground`, `border-border`, …).

## 1. Tokens

### Light (défaut)

| Token | Valeur | Usage |
|---|---|---|
| `--background` | `oklch(0.99 0.006 80)` | Fond crème chaud |
| `--foreground` | `oklch(0.26 0.02 60)` | Texte principal brun sombre |
| `--card` / `--popover` | `oklch(0.995 0.004 80)` | Surfaces |
| `--primary` | `oklch(0.5 0.14 42)` | Terracotta — CTA UNIQUEMENT (jamais statut) |
| `--primary-foreground` | `oklch(0.99 0.012 75)` | Texte sur terracotta |
| `--secondary` | `oklch(0.95 0.012 75)` | Actions secondaires, statut « en cours » |
| `--muted` / `--muted-foreground` | `oklch(0.96 0.008 75)` / `oklch(0.47 0.02 60)` | Fonds discrets / méta |
| `--accent` | `oklch(0.94 0.03 150)` | Vert sauge — succès, résolu, signé, item actif |
| `--accent-foreground` | `oklch(0.35 0.06 150)` | Texte sur vert sauge |
| `--destructive` | `oklch(0.55 0.21 27)` | Réservé aux actions irréversibles (dans un menu, pas inline) |
| `--border` / `--input` | `oklch(0.9 0.012 75)` | Bordures chaudes |
| `--ring` | `oklch(0.5 0.14 42)` | Focus ring (terracotta) |
| `--radius` | `0.75rem` | Partout (cards, boutons, inputs, dialogs) |
| `--sidebar` | `oklch(0.975 0.008 80)` | + `sidebar-primary`/`sidebar-accent` = primary/accent |
| `--chart-1..5` | `0.58/42 · 0.6/155 · 0.75/75 · 0.55/240 · 0.55/330` (oklch) | Dataviz |

### Dark

Bloc complet dans `voisinage.css` — points clés :
`--background oklch(0.2 0.012 60)` · `--card oklch(0.24 0.014 60)` ·
`--primary oklch(0.68 0.14 45)` · `--accent oklch(0.3 0.04 150)` ·
`--border oklch(1 0 0 / 12%)` · `--sidebar oklch(0.18 0.012 60)`.
Toute évolution de palette se fait dans `voisinage.css` (light + dark
ensemble), jamais dans une app.

## 2. Typographie

- **Display / titres** : `"Fraunces Variable"` (`@fontsource-variable/fraunces`,
  importée par `voisinage.css`), fallback Georgia. Portée par `--font-heading`
  (déclaré dans le `@theme` de `globals.css` et dans `voisinage.css`) et
  appliquée aux `h1–h6` par `globals.css`. Titres de dialog : agrandis
  (pattern commits 73c39d7/cc3e8e0), pas les 16px par défaut.
- **Corps / UI** : `"Inter Variable"`. Jamais de serif dans le corps.
- **Chiffres** : `tabular-nums` sur points, compteurs, montants, dates de tables.
- Échelle : titre de page `text-2xl font-semibold` (PageHeader), section
  `text-lg font-medium`, titre de card `text-base font-medium`, corps
  `text-sm`, méta `text-xs text-muted-foreground`.
- Interdit : Newsreader (ancien défaut du package, retiré au profit de Fraunces).

## 3. Couleur — règles d'usage

1. **Terracotta plein = action primaire.** UNE seule par vue/carte.
2. **Statuts = pastille + texte, jamais `primary`** — via `<StatusBadge>`
   (`packages/ui/src/components/status-badge.tsx`) :
   ouvert/attente = ambre · en cours = `secondary` · résolu/signé/succès =
   vert sauge (`accent`) · rejeté/erreur = `destructive` (texte, pas fond plein).
3. **Destructif : jamais inline en liste** — dans un `DropdownMenu` +
   `AlertDialog` de confirmation.
4. **Vert sauge (`accent`) = le secondaire officiel** : item actif de sidebar,
   badges de succès.

## 4. Patterns structurels

- **PageHeader** (`packages/ui/src/components/page-header.tsx`) : titre
  Fraunces + sous-titre muted (ponctuation : point final partout) + actions à
  droite. Obligatoire sur toute page, y compris Messages.
- **4 états** (via `<DataState>`) : loading (skeleton calqué sur le layout
  final — jamais terminal : timeout → erreur), empty (icône + phrase + CTA),
  error (message + « Réessayer »), success. Mutations confirmées par `toast`.
- **Tabs** : défaut = premier onglet non vide ; après une action, ouvrir
  l'onglet qui contient le résultat (`?tab=…`).
- **Item list rows** : avatar/pastille de statut + titre + méta (séparateur
  `·`, segments vides filtrés) — pattern commits cc3e8e0/73c39d7.
- **BrandLogo** (`packages/ui/src/components/brand-logo.tsx`) : lockup
  « trois maisons » sur tuile terracotta (`bg-primary`) — sidebar + AuthLayout,
  client ET admin.
- **AuthLayout** (`packages/ui/src/components/auth-layout.tsx`) : halo radial
  `primary/10`, lockup + wordmark Fraunces, entrance motion (respecte
  `prefers-reduced-motion`) ; sous-titre par app (client : espace résident,
  admin : espace administrateur).
- **KPI** : `<StatCard>` (label muted, valeur `text-3xl font-bold
  tabular-nums`, hint optionnel).
- **A11y** : cibles tactiles ≥ 44px ; focus ring `--ring` visible (jamais
  retiré) ; boutons icône avec `aria-label` ; contrastes AA ; jamais la
  couleur seule pour un statut (pastille + texte).
- **Mobile** : carte MapLibre ≤ 40vh ; tables admin → colonnes secondaires
  masquées (`hidden md:table-cell`) + actions en kebab, ou cards sous `md`.

## 5. Contenu

- 100 % français, y compris ce que génère l'API (contrats, raisons de
  recommandation, libellés de transactions). Dates via `Intl` fr-FR,
  calendriers en locale fr.
- Jamais d'UUID, de timestamp ISO, de score interne, ni de « (s) » à l'écran.
- Adresses : helper partagé « rue + arrondissement », jamais la chaîne brute
  du geocoder.
- i18n : parité stricte des clés entre `fr.ts` et `en.ts`
  (`packages/shared/src/lib/i18n/`).

## 6. Admin = même famille, densité back-office

Mêmes tokens, même BrandLogo, mêmes badges de statut ; les vues denses
(tables `py-2`, éditeur DSL, layout full-bleed dans `SidebarInset`) restent
denses. Ce qui distingue l'admin : la densité, pas la palette. Le client
reste plus aéré (`p-6 md:p-8`, contenus centrés `max-w-5xl`).

## 7. Garde-fous visuels

Pas de dégradés violets/indigo, pas de héros « 3 colonnes icône-dans-cercle »,
pas de tout-centré, pas d'emoji-icônes, pas de bordures gauches colorées sur
les cards, pas de blobs décoratifs. Une card doit mériter sa place (un vrai
regroupement ou une interaction, pas de la décoration).
