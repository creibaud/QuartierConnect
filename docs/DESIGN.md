# DESIGN.md — QuartierConnect

> Source de vérité pour toutes les décisions design front-end (web client + web admin + desktop themes).
> Inférée du code existant le 4 mai 2026 par /plan-design-review.
> **Refonte esthétique 2026-05-11 : direction "Civic Editorial" (noir éditorial + vert communauté + Newsreader/Inter).**
> Toute nouvelle UI doit s'aligner sur ce document. Si une décision n'y figure pas, c'est qu'elle reste à prendre — flagger et discuter.

---

## 0. Direction esthétique — Civic Editorial

**Vibe :** *Le Monde × Linear*. Presse civique : sérieux, lisible, ancré, mais moderne et chaleureux. Adapté à un produit qui manipule incidents municipaux, contrats signés, identité vérifiée et données RGPD.

**Mots-clés :** editorial, civic, accessible, trustworthy, neutral, warm-when-needed.

**Anti-patterns explicites :**
- Gradients violet/indigo (cf. §11)
- Tout ce qui ressemble à un template Vercel/shadcn par défaut (Geist + blue-violet primary)
- Ornements décoratifs sans fonction (blobs, dividers ondulés, glow)
- Couleurs saturées multiples — **un seul accent saturé (vert)**, tout le reste en gris/noir.

**Référence WCAG :** AA minimum, AAA visé sur les surfaces texte principales.

---

## 1. Pile design

| Couche | Technologie | Notes |
|---|---|---|
| Framework UI | shadcn/ui (style `radix-nova`) | 56 components installés, voir `packages/ui/src/components/` |
| Engine | Base UI (`@base-ui/react`) + radix-ui | Migration Base UI active (post-Radix) |
| CSS | Tailwind CSS v4 | Tailwind 4 = `@theme inline`, oklch native |
| Animations | `tw-animate-css` + `framer-motion` (à ajouter pour swipe events) | |
| Icons | **HugeIcons** (`@hugeicons/react` + `@hugeicons/core-free-icons`) | À évaluer : leur stroke moderne peut clasher avec Newsreader serif. Si on garde HugeIcons, utiliser uniquement les variantes "stroke" (pas "duotone"). |
| Font heading | **Newsreader Variable** (`@fontsource-variable/newsreader`) | Serif éditoriale optimisée écran (Google Fonts) — variable weight 200-800 |
| Font body | **Inter Variable** (`@fontsource-variable/inter`) | Sans-serif neutre, supérieur à Geist en densité texte longue |
| Forms | TanStack Form + Zod + react-hook-form | Voir `packages/ui/src/lib/form.ts` |
| Toasts | Sonner (`sonner.tsx`) | Notifications app-wide |
| Charts (web) | Recharts via shadcn `chart.tsx` | Palette monochrome verte (cf. §2) |
| Charts (desktop) | JavaFX BarChart/LineChart/PieChart | StatisticsView (DD4 décide refresh manuel bouton) |

---

## 2. Palette de couleurs — Civic Editorial

> Format **oklch** (Tailwind 4 native). Toutes les couleurs sont des CSS vars dans `packages/ui/src/styles/globals.css`.
> Philosophie : **noir + blanc cassé + un seul accent saturé (vert communauté)**. Tout le reste est gris neutre.

### Light mode (`:root`)

| Token | Valeur | Équivalent hex | Usage |
|---|---|---|---|
| `--background` | `oklch(0.985 0 0)` | `#FAFAFA` | Fond global — *paper white*, pas pur blanc |
| `--foreground` | `oklch(0.141 0.005 285.823)` | `#0A0A0B` | Texte principal — quasi noir |
| `--card` | `oklch(1 0 0)` | `#FFFFFF` | Surface des cards (légère élévation vs background) |
| `--card-foreground` | identique foreground | — | Texte sur cards |
| `--primary` | `oklch(0.21 0.006 285.885)` | `#18181B` | **Noir éditorial** — boutons CTA, focus ring, navigation active |
| `--primary-foreground` | `oklch(0.985 0 0)` | `#FAFAFA` | Texte blanc sur primary |
| `--secondary` | `oklch(0.967 0.001 286.375)` | `#F4F4F5` | Surfaces secondaires (hover, sub-actions) |
| `--secondary-foreground` | `oklch(0.21 0.006 285.885)` | `#18181B` | Texte sur secondary |
| `--muted` | `oklch(0.967 0.001 286.375)` | `#F4F4F5` | Zones discrètes |
| `--muted-foreground` | `oklch(0.552 0.016 285.938)` | `#71717A` | Texte secondaire, captions |
| `--accent` | `oklch(0.5 0.135 145)` | `#15803D` | **Vert communauté** — uniquement actions positives & success states (vote up, "rejoindre", "valider") |
| `--accent-foreground` | `oklch(0.985 0 0)` | `#FAFAFA` | Texte blanc sur accent |
| `--destructive` | `oklch(0.577 0.245 27.325)` | `#DC2626` | Rouge — actions destructives uniquement |
| `--border` | `oklch(0.92 0.004 286.32)` | `#E4E4E7` | Bordures cards/inputs |
| `--ring` | `oklch(0.21 0.006 285.885)` | `#18181B` | Focus ring (noir, 3-4px d'épaisseur pour WCAG) |
| `--sidebar` | `oklch(0.985 0 0)` | `#FAFAFA` | Sidebar = même teinte que background |
| `--sidebar-primary` | `oklch(0.21 0.006 285.885)` | `#18181B` | Item actif sidebar |

### Dark mode (`.dark`)

Conserve la structure, valeurs adaptées éditoriales (primary devient blanc, accent vert plus clair). Le dark mode est **présent dans le code** mais pas exposé en UI utilisateur (pas de toggle visible). Décision soutenance : ne pas livrer le dark mode pour le rendu — focus single-mode light.

### Charts — palette monochrome verte

5 tokens chart-1 à chart-5 alignés sur l'accent vert et le noir éditorial, plus du gris neutre :

| Token | Valeur | Usage |
|---|---|---|
| `chart-1` | `oklch(0.5 0.135 145)` | Vert primaire (séries principales) |
| `chart-2` | `oklch(0.21 0.006 285.885)` | Noir éditorial (référence/baseline) |
| `chart-3` | `oklch(0.552 0.016 285.938)` | Gris neutre (séries secondaires) |
| `chart-4` | `oklch(0.62 0.13 145)` | Vert clair (variations) |
| `chart-5` | `oklch(0.74 0.11 145)` | Vert très clair (zones, areas) |

Cohérence avec la palette globale = lecture de chart immédiate, pas de "rainbow chart" décoratif.

### Règles d'or palette

- **Un seul accent saturé** : le vert (`--accent`). Réservé aux actions positives, success states, et 1 chart series sur 5.
- **Le primary est noir**, pas une couleur. C'est volontaire — toute autre couleur attire l'œil sur le vert.
- Toujours utiliser les **CSS vars**, jamais des couleurs littérales (pas de `#3b82f6` ad-hoc dans le JSX).
- Pour des hovers/states, utiliser les helpers Tailwind (`hover:bg-secondary`, `focus-visible:ring-ring`).
- **Aucun gradient** sur les surfaces. Les seuls dégradés acceptés : skeleton shimmer (déjà géré par shadcn).

---

## 3. Typographie — Civic Editorial

```
font-heading : "Newsreader Variable", Georgia, "Times New Roman", serif
font-sans    : "Inter Variable", "Inter", system stack, sans-serif
```

Newsreader est une serif éditoriale dessinée pour la lecture longue à l'écran (Google Fonts, variable). Inter est la sans-serif neutre la plus déployée du web — choisi pour sa densité supérieure à Geist sur les UI denses (tables admin, listes d'incidents).

Le binding `h1`–`h6` → `font-heading` est **automatique** via `@layer base` dans `globals.css`. Aucune classe `font-heading` à ajouter sur les headings.

### Échelle

| Token Tailwind | Taille | Famille | Usage |
|---|---|---|---|
| `text-xs` | 12px | sans | Captions, métadonnées (timestamps, badges) |
| `text-sm` | 14px | sans | UI dense (tables, sidebar items, footers) |
| `text-base` | 16px | sans | **Texte par défaut** — body, formulaires |
| `text-lg` | 18px | sans | Sub-headings UI, lead paragraphs |
| `text-xl` | 20px | **serif** | Section headings (h3) |
| `text-2xl` | 24px | **serif** | Page headings (h2) |
| `text-3xl` | 30px | **serif** | Hero headings (h1, dashboard) |
| `text-4xl` | 36px | **serif** | Hero éditorial (rare — landing-like) |

### Weights

- `font-normal` (400) : body — Inter et Newsreader supportent tous deux 400-700+.
- `font-medium` (500) : labels, sub-headings sans-serif.
- `font-semibold` (600) : headings serif **par défaut**.
- `font-bold` (700) : CTA prominent uniquement (jamais sur du texte body).

### OpenType features

Activées globalement via `@layer base body { font-feature-settings: ... }` :
- **Inter body** : `"cv11"` (single-storey a), `"ss01"`, `"ss03"` (variantes optiques)
- **Newsreader headings** : `"ss01"`, `"ss02"` (alternates éditoriaux)
- `letter-spacing: -0.015em` sur headings pour resserrer optiquement le serif sur écran

### Règles

- **Jamais de stack système** (`system-ui`, `Arial`, `Helvetica`) — toujours Inter via `font-sans` ou Newsreader via `font-heading`.
- Headings : serif Newsreader **par défaut**, `font-semibold`. Ne jamais forcer `font-sans` sur un h1-h6 sauf cas exceptionnel.
- Body : Inter, `font-normal` (400).
- Texte body **minimum 16px** (a11y AA — DD6).
- Contraste **4.5:1 minimum** sur tout texte (a11y AA), 7:1 visé (AAA) sur les surfaces principales.
- Line-height : `leading-normal` (1.5) par défaut sur body, `leading-tight` (1.25) sur les headings.
- **Tabular nums** (`tabular-nums`) sur tous les chiffres dans tables, soldes de points, timers — évite les sauts de mise en page.

---

## 4. Espacement

### Échelle (basée sur Tailwind, multiples de 4)

```
4 / 8 / 16 / 24 / 32 / 48 / 64
```

Correspondance Tailwind : `gap-1` (4) / `gap-2` (8) / `gap-4` (16) / `gap-6` (24) / `gap-8` (32) / `gap-12` (48) / `gap-16` (64).

### Règles

- **Layout grand** : `gap-8` ou `gap-12` (entre sections de page)
- **Cartes / blocs** : `p-6` (24px padding) ou `p-4` (16px sur mobile)
- **Composants denses** (table rows, sidebar items) : `gap-2` ou `gap-3`
- **Inline** (icon + text) : `gap-2` (8px)
- Marges verticales entre éléments d'une même section : `space-y-4` (16px) ou `space-y-6` (24px)

### Pas d'espace ad-hoc

Pas de `gap-[13px]` ni de `p-[7px]`. Si l'échelle ne suffit pas, c'est un signal de discussion.

---

## 5. Border radius

```
--radius : 0.625rem (10px) base
--radius-sm : 6px
--radius-md : 8px
--radius-lg : 10px
--radius-xl : 14px
--radius-2xl : 18px
--radius-3xl : 22px
--radius-4xl : 26px
```

Utiliser :
- `rounded-md` sur **tous** les boutons, inputs, cards par défaut
- `rounded-lg` sur les dialogs et sheet drawers
- `rounded-full` sur avatars + badges circulaires
- `rounded-none` jamais (sauf dataviz)

Pas de border-radius custom autre que ces tokens.

---

## 6. Composants — patterns approuvés

### 6.1 Boutons (`Button`)

Variants : `default` / `destructive` / `outline` / `secondary` / `ghost` / `link`.

| Variant | Usage |
|---|---|
| `default` | CTA principal d'une page (1 max par écran) |
| `outline` | CTA secondaire, retour, annuler |
| `ghost` | Actions tertiaires, dans tables, dans toolbars |
| `destructive` | Suppression, ban, désactivation |
| `link` | Liens textuels uniquement |
| `secondary` | rare, à éviter sauf cas spécifiques |

Sizes : `default` (h-9) / `sm` (h-8) / `lg` (h-10) / `icon` (carré).

### 6.2 Cards (`Card`)

```tsx
<Card>
  <CardHeader>
    <CardTitle>Titre</CardTitle>
    <CardDescription>Sous-titre</CardDescription>
  </CardHeader>
  <CardContent>...</CardContent>
  <CardFooter>...</CardFooter>
</Card>
```

Règles :
- Une carte = **une chose**. Si on hésite à mettre 2 sujets, c'est 2 cartes.
- Pas de bordures colorées à gauche (`border-l-4 border-primary`) — pattern AI slop.
- Pas de gradients de fond. Background = `bg-card`.

### 6.3 Sidebar (`Sidebar` shadcn)

Le component `sidebar.tsx` existe déjà. **Utiliser pour `/messages` (DD2)** :

```
┌─────────────┬──────────────────────────┐
│  Sidebar    │  Thread principal        │
│  (320px)    │  (fluid)                 │
│             │                          │
│  [Search]   │  [Header conversation]   │
│  Conv 1 ●   │                          │
│  Conv 2     │  [Messages scroll]       │
│  Conv 3     │                          │
│             │  [Composer]              │
└─────────────┴──────────────────────────┘
```

Mobile : sidebar derrière `<Sheet>` (drawer), trigger via icône menu en top-bar.

### 6.4 États (DD4) — framework obligatoire

| État | Pattern |
|---|---|
| **LOADING** | `<Skeleton>` shadcn, jamais de `<Spinner>` natif, jamais de "Chargement..." en clair. |
| **EMPTY** | Icon HugeIcons 48px (`text-muted-foreground`) + titre `text-lg font-semibold` + 1 ligne `text-sm text-muted-foreground` + 1 CTA `<Button variant="default">`. |
| **ERROR** | `toast.error()` Sonner avec message clair + bouton "Réessayer" si retry possible. Inline `<Alert variant="destructive">` pour erreurs de formulaire. |
| **SUCCESS** | `toast.success()` Sonner auto-dismiss 3s. Pas de modal. |
| **PARTIAL** | `<Skeleton>` pour les sections en chargement, contenu réel pour ce qui est prêt. |

#### Empty state — exemple page `/messages`

```tsx
<div className="flex flex-col items-center justify-center gap-4 p-8">
  <Icon icon={MessageOff} size={48} className="text-muted-foreground" />
  <div className="space-y-1 text-center">
    <h3 className="text-lg font-semibold">Aucune conversation</h3>
    <p className="text-sm text-muted-foreground">
      Trouve un voisin pour démarrer une conversation.
    </p>
  </div>
  <Button asChild>
    <Link to="/services">Voir les services</Link>
  </Button>
</div>
```

#### Erreur upload

```tsx
toast.error("Photo non envoyée", {
  description: "Le serveur ne répond pas. Vérifiez votre connexion.",
  action: { label: "Réessayer", onClick: retryUpload }
});
```

### 6.5 Toasts (Sonner)

- `toast.success()` : auto-dismiss 3s
- `toast.error()` : reste affiché jusqu'à dismiss manuel ou action retry
- `toast.info()` : 4s
- `toast.warning()` : 5s
- Pas plus de **3 toasts simultanés** — Sonner stack par défaut, OK.

### 6.6 Forms

```tsx
<Form {...form}>
  <form onSubmit={form.handleSubmit(onSubmit)}>
    <FormField control={form.control} name="email" render={({ field }) => (
      <FormItem>
        <FormLabel>Email</FormLabel>
        <FormControl><Input type="email" {...field} /></FormControl>
        <FormMessage />
      </FormItem>
    )}/>
  </form>
</Form>
```

Règles :
- Toujours `<FormLabel>` visible, jamais le placeholder comme seul label (a11y).
- Validation Zod au submit.
- Erreurs dans `<FormMessage>` sous le champ, pas en haut du formulaire.

---

## 7. Iconographie

**HugeIcons** (`@hugeicons/react`).

Utilisation :

```tsx
import { Icon } from "@hugeicons/react";
import { Message01Icon, UserGroupIcon, MapPinIcon } from "@hugeicons/core-free-icons";

<Icon icon={Message01Icon} size={20} />
```

### Sizes

- `size={16}` : inline (boutons, badges)
- `size={20}` : navigation, sidebar items
- `size={24}` : section headers
- `size={48}` : empty states, hero illustrations

### Règles

- **Pas de mélange** : tout HugeIcons, pas de Lucide, pas d'emoji comme icône (🎉 = AI slop).
- Toujours associer une icône à un label visible ou un `aria-label`.
- Pas d'icône décorative pure dans les headings (juste pour décorer).

---

## 8. Responsive (DD5)

### Stratégie scope

| Surface | Approche |
|---|---|
| **Web Client** | Mobile-first sur `/dashboard`, `/messages`, `/events` (swipe), `/services`, `/incidents`, `/votes` |
| **Web Client** | Desktop-only sur `/contracts/$id/sign` (PDF drag-drop = mauvais sur touch). Banner "Use desktop" en dessous de 1024px. |
| **Web Admin** | Desktop-only assumé. Banner "Use desktop" en dessous de 1024px. |
| **Desktop JavaFX** | 1280×800 minimum, redimensionnable, pas de support tactile. |

### Breakpoints Tailwind

- `sm:` 640px (small tablet)
- `md:` 768px (tablet)
- `lg:` 1024px (small desktop) — **seuil banner desktop-only**
- `xl:` 1280px (desktop)
- `2xl:` 1536px (large)

### Règles mobile (pages mobile-first)

- Touch target **minimum 44×44px** (a11y AA).
- Pas de hover-only interactions — toujours une équivalence tap.
- Sidebar → `<Sheet>` drawer.
- Tables → cards stackées sur mobile (`md:hidden` table, `md:block` cards).
- Modals → `<Drawer>` shadcn (bottom sheet) sur mobile, `<Dialog>` sur desktop.

### Banner desktop-only

```tsx
<div className="lg:hidden p-6 text-center">
  <Icon icon={DesktopIcon} size={48} className="text-muted-foreground mx-auto mb-4" />
  <h2 className="text-lg font-semibold mb-2">Mode bureau requis</h2>
  <p className="text-sm text-muted-foreground">
    Cette fonctionnalité nécessite un écran d'au moins 1024px de large.
  </p>
</div>
```

---

## 9. Accessibilité (DD6)

### Cible : Level A + AA via axe-core

Validation Phase B semaine 6 (jeu 11/6) avec `pnpm dlx @axe-core/cli https://...`.

### Checklist obligatoire

- [ ] Contraste 4.5:1 sur tout texte body (3:1 sur texte large ≥18px)
- [ ] Touch targets ≥44×44px sur mobile
- [ ] Focus visible (`focus-visible:ring-2 focus-visible:ring-ring`)
- [ ] Tous les boutons ont `aria-label` si icône seule
- [ ] Tous les inputs ont `<FormLabel>` visible (jamais placeholder seul)
- [ ] Modals = `role="dialog"` + `aria-modal="true"` + focus trap (shadcn `Dialog` le fait)
- [ ] Toasts annoncés via `aria-live="polite"` (Sonner par défaut)
- [ ] Navigation clavier complète (Tab, Enter, Escape, Arrow keys dans listes)
- [ ] Pas de communication par couleur seule (statut "open" = rouge mais aussi avec icône `AlertTriangle`)
- [ ] Skip-to-content link en haut du `__root.tsx`
- [ ] `<html lang="fr">` ou `lang="en"` selon la langue active (i18n)

### Composants shadcn — déjà conformes

Base UI / Radix sont **conformes A/AA out of the box**. La majorité des fixes axe-core seront sur le code custom (pas les composants).

---

## 10. Animations & motion

### Échelle de durées

- `duration-100` (100ms) : hover micro-interactions
- `duration-200` (200ms) : fades, état changés
- `duration-300` (300ms) : transitions de pages, modals
- `duration-500` (500ms) : animations héroïques (rare)

### Règles

- **Easing par défaut** : `ease-out` (sentiment naturel). `ease-in` réservé aux exits.
- Respect `prefers-reduced-motion` : si l'utilisateur l'a demandé, désactiver les animations non-essentielles.
- Pas d'animations infinies (sauf spinners <2s) — distraction.
- Swipe events (Phase A sem 2) : `framer-motion` `useDrag`, animation +/-180° opacity 0 sur 300ms ease-out (DD3).

### Skeleton shimmer

Le component `Skeleton` shadcn a son propre shimmer. Ne pas surcharger.

---

## 11. Slop blacklist (à éviter absolument)

Ces patterns trahissent du code AI-generated et flatissent la perception du jury :

1. ❌ Gradient violet/indigo en background
2. ❌ Grille 3 colonnes "icon-in-circle + bold title + 2-line desc"
3. ❌ Centered everything (`text-align: center` sur toutes les cards)
4. ❌ Border-radius bubbly partout (`rounded-3xl` sur tout)
5. ❌ Blobs SVG décoratifs, dividers ondulés
6. ❌ Emoji dans les headings (🎉, 🚀)
7. ❌ Border colorée à gauche des cards (`border-l-4 border-primary`)
8. ❌ Copy générique ("Bienvenue sur QuartierConnect", "Débloquez la puissance de...")
9. ❌ Font stack système (`system-ui`, `Arial`) au lieu d'Inter/Newsreader
10. ❌ Mélange Lucide + HugeIcons + emoji
11. ❌ Headings en sans-serif (forcer `font-sans` sur h1-h6) — c'est l'identité du Civic Editorial
12. ❌ Couleur saturée autre que le vert `--accent` (ex: bleu CTA, orange highlight, violet badge) — un seul accent saturé, c'est la règle
13. ❌ Geist + blue-violet primary = retour au template Vercel/shadcn par défaut

Si une page développée commet 1+ de ces patterns, refactor immédiat.

---

## 12. Décisions ouvertes (à trancher en cours d'implémentation)

- [ ] Animation entrée/sortie page (transitions TanStack Router) — par défaut none. Si on en met, fade 200ms.
- [ ] Comportement responsive du chart desktop (StatisticsView) — JavaFX scale.
- [ ] Couleur status badge incidents (`open`/`in_progress`/`resolved`) — proposer en sem 1.
- [ ] Layout signature drag-drop : modal full-page ou stepper ? À décider sem 2.
- [ ] Mode dense vs confortable (table rows compactes pour admin) ? Décider sem 4.

---

## 13. Comment utiliser ce document

- **Avant de coder une nouvelle page** : relire §6 (composants) + §8 (responsive scope) + §9 (a11y).
- **Avant de générer un mockup avec /design-shotgun** : passer le `--brief` qui référence ce DESIGN.md (palette + typo + composants).
- **À chaque PR** : si un nouveau pattern apparaît qui n'est pas dans DESIGN.md, l'ajouter dans la même PR.
- **Audit Phase B sem 6** : appliquer la slop blacklist §11 et le framework états §6.4 sur toutes les pages existantes.

---

*Document inféré et calibré le 4 mai 2026 par /plan-design-review (DD7).*
*Refonte esthétique Civic Editorial appliquée le 11 mai 2026 via /ui-ux-pro-max (palette + typographie + slop blacklist).*
*Prochaine relecture : Phase B semaine 6 (8-14 juin) pour audit complet et corrections page-by-page via `/impeccable polish`.*
