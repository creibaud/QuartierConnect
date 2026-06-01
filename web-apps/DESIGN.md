# QuartierConnect — Design System

Source of truth for the visual redesign of both web apps (`apps/admin`, `apps/client`).
Both share `packages/ui` (shadcn/ui, style `radix-nova`, base color neutral) and
`hugeicons`. Keep that stack. This file defines the patterns; pages apply them.

## 1. Direction

**Civic Trust.** Sober, institutional, readable. Flat design (no decorative
gradients/shadows beyond shadcn defaults). The product is a neighborhood public
service, so the feel is calm and trustworthy, not playful.

- **Admin** = blue, dense, data-first (a console).
- **Client** = same system, accent shifted toward teal/sky, more airy (a resident space).

## 2. Color tokens

Defined as OKLCH CSS variables in `packages/ui/src/styles/globals.css` (`:root` + `.dark`).
Never hardcode hex/oklch in components — always semantic tokens (`bg-primary`,
`text-muted-foreground`, `border-border`, …).

Shared base (already applied — shadcn "Blue" preset `b1PzeK`):

| Token | Light | Role |
|-------|-------|------|
| `--primary` | `oklch(0.488 0.243 264.376)` (blue) | primary actions, active nav |
| `--ring` | blue | focus ring |
| `--sidebar-primary` | `oklch(0.546 0.245 262.881)` | sidebar brand mark |
| `--chart-1..5` | blue / teal / cyan / amber / orange | data viz spectrum |
| `--destructive` | red | destructive only |
| neutrals | pure gray scale | surfaces, text, borders |

### Accent nuance (per app)

Implemented as a **per-app override** layered after `globals.css` (admin: `admin.css`;
client: new `client.css` imported in `main.tsx`). Override only `--primary`, `--ring`,
`--sidebar-primary`, `--sidebar-ring` in both `:root` and `.dark`.

- **Admin** — keep base blue (no override needed).
- **Client** — teal/sky:
  - light `--primary: oklch(0.58 0.13 215)`, `--ring: oklch(0.58 0.13 215)`,
    `--sidebar-primary: oklch(0.6 0.13 210)`
  - dark `--primary: oklch(0.68 0.12 210)` (+ matching ring/sidebar-primary)

Rule: primary differs by app; everything else (neutrals, destructive, charts) stays shared.

## 3. Typography

- Body + UI: **Inter** (`Inter Variable`, already imported). Headings: `--font-heading`
  (Inter, `ss01`/`ss02`, `letter-spacing: -0.015em` — already set in `globals.css`).
- Serif (`Newsreader`) is available but reserve it for editorial/long-form only; do not
  use for UI.
- Scale (Tailwind): page title `text-2xl font-semibold`, section `text-lg font-medium`,
  card title `text-base font-medium`, body `text-sm`, meta `text-xs text-muted-foreground`.
- Numbers in tables/stats: `tabular-nums` to prevent column jitter.

## 4. Spacing, radius, density

- 4/8px rhythm. Page padding `p-6` (admin) / `p-6 md:p-8` (client, airier).
- Section gap `gap-6`; intra-card `gap-3`/`gap-4`. Radius from `--radius` (0.625rem).
- **Density:** admin tables compact (`py-2` rows), client cards roomier (`p-6`, larger gaps).
- Content width: admin full-bleed inside `SidebarInset`; client centered `mx-auto max-w-5xl`.

## 5. Page structure pattern (every page)

```
<page p-6>
  <PageHeader>            title (text-2xl font-semibold) + optional subtitle (muted) + primary action (right)
  <Toolbar?>             filters / search / tabs — only if the page needs them
  <Content>             table | cards grid | map | form | chat
</page>
```

- The app `_app` layout already provides sidebar + breadcrumb top bar; pages must NOT
  repeat a logo/header or a logout button.
- One **primary** CTA per page (filled `Button`); everything else `variant="outline"`/`ghost`.

## 6. Component mapping (use these, not custom markup)

| Need | Component | Notes |
|------|-----------|-------|
| Page title block | plain header + `Button` | not a Card |
| KPI stat | `Card` (`CardHeader`/`CardContent`) | label = `text-sm text-muted-foreground`, value = `text-3xl font-bold tabular-nums` |
| Status / role | `Badge` variants | map status→variant (see §8), never colored text |
| Data list | `Table` | sticky header, `tabular-nums`, row hover, `Skeleton` while loading |
| Filters | `Select` / `ToggleGroup` / `Tabs` | `ToggleGroup` for 2–5 exclusive views |
| Forms | `Field`/`FieldGroup` + controls | never raw `div` + `space-y`; validation via `data-invalid`/`aria-invalid` |
| Empty state | `Empty` / `empty-state` | icon + title + one-line + primary action |
| Loading | `Skeleton` | match final layout; no spinners > 1s |
| Errors | `Alert` (`destructive`) | message + retry action |
| Confirm destructive | `AlertDialog` | for ban / delete |
| Overlays | `Dialog` (modal), `Sheet` (side), `Drawer` (mobile) | always a Title |
| Toasts | `sonner` `toast()` | success/error feedback |
| Icons | `hugeicons` via `HugeiconsIcon` | no size classes inside buttons (component handles it) |

## 7. Interaction states (mandatory per data view)

Every list/table/map/dashboard specifies all four:

| State | Pattern |
|-------|---------|
| Loading | `Skeleton` rows/cards matching final layout |
| Empty | `Empty`: hugeicon + warm title ("Aucun incident pour l'instant") + context + primary action |
| Error | `Alert variant="destructive"` + cause + retry button |
| Success/partial | inline `Badge`/count; mutations confirmed via `toast` |

## 8. Status → Badge mapping (consistency)

- Roles: resident=`secondary`, moderator=`default`, admin=`default` (blue), banned=`destructive`.
- Incident status: open/new=`default`, in-progress=`secondary`, resolved=`outline`, rejected=`destructive`.
- Use icon + text in the badge where status is critical (color-not-only, WCAG).

## 9. Accessibility + responsive (checklist, applies everywhere)

- Body text ≥ 14px (`text-sm`), never below; contrast ≥ 4.5:1 (semantic tokens already pass).
- Visible focus rings (shadcn default `--ring`) — never remove.
- Icon-only buttons get `aria-label` / `sr-only` text.
- Touch targets ≥ 44px on interactive controls.
- Tables: `aria-sort` on sortable headers; provide horizontal scroll container on mobile,
  or collapse to stacked cards < 768px.
- Sidebar already responsive (sheet on mobile). Map pages: ensure controls reachable, min height.
- Respect `prefers-reduced-motion`; transitions 150–250ms ease.

## 10. Anti-slop guardrails

No purple/indigo gradients, no 3-column icon-in-circle hero, no centered-everything, no
emoji icons, no colored left-borders on cards, no decorative blobs. Cards must earn their
place (a card = a real grouping or an interaction, not decoration).

## 11. Mockups

Visual mockups deferred: the gstack designer needs an OpenAI API key (not configured).
This doc + the per-page plan drive implementation. Add a key (`~/.gstack/openai.json`)
to generate mockups later if desired.
