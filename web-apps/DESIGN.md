# QuartierConnect — "Voisinage" design system (v2)

Warm community palette: terracotta + civic green + warm neutrals. Contrasts
calibrated to WCAG AA. A single token source for both the client AND the
admin: `packages/ui/src/styles/voisinage.css`, imported right after
`@workspace/ui/globals.css` in each app's `main.tsx`. Never hardcode
hex/oklch in components — always use the semantic tokens (`bg-primary`,
`text-muted-foreground`, `border-border`, …).

## 1. Tokens

### Light (default)

| Token | Value | Usage |
|---|---|---|
| `--background` | `oklch(0.99 0.006 80)` | Warm cream background |
| `--foreground` | `oklch(0.26 0.02 60)` | Main text, dark brown |
| `--card` / `--popover` | `oklch(0.995 0.004 80)` | Surfaces |
| `--primary` | `oklch(0.5 0.14 42)` | Terracotta — CTA ONLY (never status) |
| `--primary-foreground` | `oklch(0.99 0.012 75)` | Text on terracotta |
| `--secondary` | `oklch(0.95 0.012 75)` | Secondary actions, "in progress" status |
| `--muted` / `--muted-foreground` | `oklch(0.96 0.008 75)` / `oklch(0.47 0.02 60)` | Quiet backgrounds / meta |
| `--accent` | `oklch(0.94 0.03 150)` | Sage green — success, resolved, signed, active item |
| `--accent-foreground` | `oklch(0.35 0.06 150)` | Text on sage green |
| `--destructive` | `oklch(0.55 0.21 27)` | Reserved for irreversible actions (in a menu, not inline) |
| `--border` / `--input` | `oklch(0.9 0.012 75)` | Warm borders |
| `--ring` | `oklch(0.5 0.14 42)` | Focus ring (terracotta) |
| `--radius` | `0.75rem` | Everywhere (cards, buttons, inputs, dialogs) |
| `--sidebar` | `oklch(0.975 0.008 80)` | + `sidebar-primary`/`sidebar-accent` = primary/accent |
| `--chart-1..5` | `0.58/42 · 0.6/155 · 0.75/75 · 0.55/240 · 0.55/330` (oklch) | Dataviz |

### Dark

Full block in `voisinage.css` — key values:
`--background oklch(0.2 0.012 60)` · `--card oklch(0.24 0.014 60)` ·
`--primary oklch(0.68 0.14 45)` · `--accent oklch(0.3 0.04 150)` ·
`--border oklch(1 0 0 / 12%)` · `--sidebar oklch(0.18 0.012 60)`.
Any palette change goes into `voisinage.css` (light + dark together), never
into an app.

## 2. Typography

- **Display / headings**: `"Fraunces Variable"` (`@fontsource-variable/fraunces`,
  imported by `voisinage.css`), Georgia fallback. Carried by `--font-heading`
  (declared in the `@theme` of `globals.css` and in `voisinage.css`) and
  applied to `h1–h6` by `globals.css`. Dialog titles: enlarged (pattern from
  commits 73c39d7/cc3e8e0), not the default 16px.
- **Body / UI**: `"Inter Variable"`. Never serif in body copy.
- **Numbers**: `tabular-nums` on points, counters, amounts, table dates.
- Scale: page title `text-2xl font-semibold` (PageHeader), section
  `text-lg font-medium`, card title `text-base font-medium`, body
  `text-sm`, meta `text-xs text-muted-foreground`.
- Banned: Newsreader (the package's old default, dropped for Fraunces).

## 3. Color — usage rules

1. **Solid terracotta = primary action.** ONE per view/card.
2. **Statuses = dot + text, never `primary`** — through `<StatusBadge>`
   (`packages/ui/src/components/status-badge.tsx`):
   open/pending = amber · in progress = `secondary` · resolved/signed/success =
   sage green (`accent`) · rejected/error = `destructive` (text, not a solid fill).
3. **Destructive: never inline in a list** — put it in a `DropdownMenu` +
   confirmation `AlertDialog`.
4. **Sage green (`accent`) = the official secondary**: active sidebar item,
   success badges.

## 4. Structural patterns

- **PageHeader** (`packages/ui/src/components/page-header.tsx`): Fraunces
  title + muted subtitle (punctuation: full stop everywhere) + actions on the
  right. Required on every page, Messages included.
- **4 states** (through `<DataState>`): loading (skeleton matching the final
  layout — never terminal: timeout → error), empty (icon + sentence + CTA),
  error (message + "Réessayer"), success. Mutations confirmed by `toast`.
- **Tabs**: default = first non-empty tab; after an action, open the tab
  holding the result (`?tab=…`).
- **Item list rows**: avatar/status dot + title + meta (separator `·`, empty
  segments filtered out) — pattern from commits cc3e8e0/73c39d7.
- **BrandLogo** (`packages/ui/src/components/brand-logo.tsx`): "three houses"
  lockup on a terracotta tile (`bg-primary`) — sidebar + AuthLayout, client
  AND admin.
- **AuthLayout** (`packages/ui/src/components/auth-layout.tsx`): radial
  `primary/10` halo, lockup + Fraunces wordmark, entrance motion (respects
  `prefers-reduced-motion`); one subtitle per app (client: espace résident,
  admin: espace administrateur).
- **KPI**: `<StatCard>` (muted label, value `text-3xl font-bold
  tabular-nums`, optional hint).
- **A11y**: touch targets ≥ 44px; `--ring` focus ring visible (never removed);
  icon buttons with `aria-label`; AA contrast; never color alone for a status
  (dot + text).
- **Mobile**: MapLibre map ≤ 40vh; admin tables → secondary columns hidden
  (`hidden md:table-cell`) + actions in a kebab menu, or cards below `md`.

## 5. Content

- 100% French, including whatever the API generates (contracts,
  recommendation reasons, transaction labels). Dates through `Intl` fr-FR,
  calendars in the fr locale.
- Never a UUID, an ISO timestamp, an internal score, or a "(s)" on screen.
- Addresses: shared "street + arrondissement" helper, never the raw geocoder
  string.
- i18n: strict key parity between `fr.ts` and `en.ts`
  (`packages/shared/src/lib/i18n/`).

## 6. Admin = same family, back-office density

Same tokens, same BrandLogo, same status badges; dense views (`py-2` tables,
DSL editor, full-bleed layout in `SidebarInset`) stay dense. What sets the
admin apart is density, not the palette. The client stays airier
(`p-6 md:p-8`, centered content `max-w-5xl`).

## 7. Visual guardrails

No purple/indigo gradients, no "3 columns of icon-in-a-circle" hero, no
everything-centered, no emoji icons, no colored left borders on cards, no
decorative blobs. A card has to earn its place (a real grouping or an
interaction, not decoration).
