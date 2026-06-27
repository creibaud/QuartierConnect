# DESIGN.md — QuartierConnect

> Source of truth for all front-end design decisions (web client + web admin + desktop themes).
> Inferred from the existing code on 4 May 2026.
> **Aesthetic redesign 2026-05-11: "Civic Editorial" direction (editorial black + community green + Newsreader/Inter).**
> Any new UI must align with this document. If a decision is not covered here, it means it has yet to be made — flag it and discuss.

---

## 0. Aesthetic direction — Civic Editorial

**Vibe:** *Le Monde × Linear*. Civic press: serious, legible, grounded, yet modern and warm. Suited to a product that handles municipal incidents, signed contracts, verified identity, and GDPR data.

**Keywords:** editorial, civic, accessible, trustworthy, neutral, warm-when-needed.

**Explicit anti-patterns:**
- Purple/indigo gradients (see §11)
- Anything resembling a default Vercel/shadcn template (Geist + blue-violet primary)
- Decorative ornaments with no function (blobs, wavy dividers, glow)
- Multiple saturated colors — **a single saturated accent (green)**, everything else in gray/black.

**WCAG reference:** AA minimum, AAA targeted on the main text surfaces.

---

## 1. Design stack

| Layer | Technology | Notes |
|---|---|---|
| UI framework | shadcn/ui (style `radix-nova`) | 56 components installed, see `packages/ui/src/components/` |
| Engine | Base UI (`@base-ui/react`) + radix-ui | Active Base UI migration (post-Radix) |
| CSS | Tailwind CSS v4 | Tailwind 4 = `@theme inline`, native oklch |
| Animations | `tw-animate-css` + `framer-motion` (to be added for swipe events) | |
| Icons | **HugeIcons** (`@hugeicons/react` + `@hugeicons/core-free-icons`) | To evaluate: their modern stroke may clash with the Newsreader serif. If we keep HugeIcons, use only the "stroke" variants (not "duotone"). |
| Heading font | **Newsreader Variable** (`@fontsource-variable/newsreader`) | Editorial serif optimized for screen (Google Fonts) — variable weight 200-800 |
| Body font | **Inter Variable** (`@fontsource-variable/inter`) | Neutral sans-serif, superior to Geist for dense long-form text |
| Forms | TanStack Form + Zod + react-hook-form | See `packages/ui/src/lib/form.ts` |
| Toasts | Sonner (`sonner.tsx`) | App-wide notifications |
| Charts (web) | Recharts via shadcn `chart.tsx` | Monochrome green palette (see §2) |
| Charts (desktop) | JavaFX BarChart/LineChart/PieChart | StatisticsView (DD4 decides manual refresh button) |

---

## 2. Color palette — Civic Editorial

> **oklch** format (Tailwind 4 native). All colors are CSS vars in `packages/ui/src/styles/globals.css`.
> Philosophy: **black + off-white + a single saturated accent (community green)**. Everything else is neutral gray.

### Light mode (`:root`)

| Token | Value | Hex equivalent | Usage |
|---|---|---|---|
| `--background` | `oklch(0.985 0 0)` | `#FAFAFA` | Global background — *paper white*, not pure white |
| `--foreground` | `oklch(0.141 0.005 285.823)` | `#0A0A0B` | Main text — near black |
| `--card` | `oklch(1 0 0)` | `#FFFFFF` | Card surface (slight elevation vs background) |
| `--card-foreground` | same as foreground | — | Text on cards |
| `--primary` | `oklch(0.21 0.006 285.885)` | `#18181B` | **Editorial black** — CTA buttons, focus ring, active navigation |
| `--primary-foreground` | `oklch(0.985 0 0)` | `#FAFAFA` | White text on primary |
| `--secondary` | `oklch(0.967 0.001 286.375)` | `#F4F4F5` | Secondary surfaces (hover, sub-actions) |
| `--secondary-foreground` | `oklch(0.21 0.006 285.885)` | `#18181B` | Text on secondary |
| `--muted` | `oklch(0.967 0.001 286.375)` | `#F4F4F5` | Discreet areas |
| `--muted-foreground` | `oklch(0.552 0.016 285.938)` | `#71717A` | Secondary text, captions |
| `--accent` | `oklch(0.5 0.135 145)` | `#15803D` | **Community green** — only positive actions & success states (vote up, "join", "validate") |
| `--accent-foreground` | `oklch(0.985 0 0)` | `#FAFAFA` | White text on accent |
| `--destructive` | `oklch(0.577 0.245 27.325)` | `#DC2626` | Red — destructive actions only |
| `--border` | `oklch(0.92 0.004 286.32)` | `#E4E4E7` | Card/input borders |
| `--ring` | `oklch(0.21 0.006 285.885)` | `#18181B` | Focus ring (black, 3-4px thick for WCAG) |
| `--sidebar` | `oklch(0.985 0 0)` | `#FAFAFA` | Sidebar = same shade as background |
| `--sidebar-primary` | `oklch(0.21 0.006 285.885)` | `#18181B` | Active sidebar item |

### Dark mode (`.dark`)

Keeps the structure, with editorial-adapted values (primary becomes white, green accent lighter). Dark mode is **present in the code** but not exposed in the user UI (no visible toggle). Defense decision: do not ship dark mode for the deliverable — focus on single-mode light.

### Charts — monochrome green palette

5 tokens, chart-1 through chart-5, aligned with the green accent and editorial black, plus neutral gray:

| Token | Value | Usage |
|---|---|---|
| `chart-1` | `oklch(0.5 0.135 145)` | Primary green (main series) |
| `chart-2` | `oklch(0.21 0.006 285.885)` | Editorial black (reference/baseline) |
| `chart-3` | `oklch(0.552 0.016 285.938)` | Neutral gray (secondary series) |
| `chart-4` | `oklch(0.62 0.13 145)` | Light green (variations) |
| `chart-5` | `oklch(0.74 0.11 145)` | Very light green (zones, areas) |

Consistency with the global palette = immediate chart legibility, no decorative "rainbow chart".

### Golden palette rules

- **A single saturated accent**: green (`--accent`). Reserved for positive actions, success states, and 1 chart series out of 5.
- **The primary is black**, not a color. This is intentional — any other color would draw the eye away from the green.
- Always use the **CSS vars**, never literal colors (no ad-hoc `#3b82f6` in the JSX).
- For hovers/states, use the Tailwind helpers (`hover:bg-secondary`, `focus-visible:ring-ring`).
- **No gradients** on surfaces. The only accepted gradients: skeleton shimmer (already handled by shadcn).

---

## 3. Typography — Civic Editorial

```
font-heading : "Newsreader Variable", Georgia, "Times New Roman", serif
font-sans    : "Inter Variable", "Inter", system stack, sans-serif
```

Newsreader is an editorial serif designed for long-form on-screen reading (Google Fonts, variable). Inter is the most widely deployed neutral sans-serif on the web — chosen for its higher density than Geist on dense UIs (admin tables, incident lists).

The `h1`–`h6` → `font-heading` binding is **automatic** via `@layer base` in `globals.css`. No `font-heading` class needs to be added to headings.

### Scale

| Tailwind token | Size | Family | Usage |
|---|---|---|---|
| `text-xs` | 12px | sans | Captions, metadata (timestamps, badges) |
| `text-sm` | 14px | sans | Dense UI (tables, sidebar items, footers) |
| `text-base` | 16px | sans | **Default text** — body, forms |
| `text-lg` | 18px | sans | UI sub-headings, lead paragraphs |
| `text-xl` | 20px | **serif** | Section headings (h3) |
| `text-2xl` | 24px | **serif** | Page headings (h2) |
| `text-3xl` | 30px | **serif** | Hero headings (h1, dashboard) |
| `text-4xl` | 36px | **serif** | Editorial hero (rare — landing-like) |

### Weights

- `font-normal` (400): body — both Inter and Newsreader support 400-700+.
- `font-medium` (500): labels, sans-serif sub-headings.
- `font-semibold` (600): serif headings **by default**.
- `font-bold` (700): prominent CTA only (never on body text).

### OpenType features

Enabled globally via `@layer base body { font-feature-settings: ... }`:
- **Inter body**: `"cv11"` (single-storey a), `"ss01"`, `"ss03"` (optical variants)
- **Newsreader headings**: `"ss01"`, `"ss02"` (editorial alternates)
- `letter-spacing: -0.015em` on headings to optically tighten the serif on screen

### Rules

- **Never a system stack** (`system-ui`, `Arial`, `Helvetica`) — always Inter via `font-sans` or Newsreader via `font-heading`.
- Headings: Newsreader serif **by default**, `font-semibold`. Never force `font-sans` on an h1-h6 except in exceptional cases.
- Body: Inter, `font-normal` (400).
- Body text **minimum 16px** (a11y AA — DD6).
- Contrast **4.5:1 minimum** on all text (a11y AA), 7:1 targeted (AAA) on the main surfaces.
- Line-height: `leading-normal` (1.5) by default on body, `leading-tight` (1.25) on headings.
- **Tabular nums** (`tabular-nums`) on all figures in tables, point balances, timers — avoids layout jumps.

---

## 4. Spacing

### Scale (based on Tailwind, multiples of 4)

```
4 / 8 / 16 / 24 / 32 / 48 / 64
```

Tailwind mapping: `gap-1` (4) / `gap-2` (8) / `gap-4` (16) / `gap-6` (24) / `gap-8` (32) / `gap-12` (48) / `gap-16` (64).

### Rules

- **Large layout**: `gap-8` or `gap-12` (between page sections)
- **Cards / blocks**: `p-6` (24px padding) or `p-4` (16px on mobile)
- **Dense components** (table rows, sidebar items): `gap-2` or `gap-3`
- **Inline** (icon + text): `gap-2` (8px)
- Vertical margins between elements within the same section: `space-y-4` (16px) or `space-y-6` (24px)

### No ad-hoc spacing

No `gap-[13px]` or `p-[7px]`. If the scale is not enough, that is a signal to discuss.

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

Use:
- `rounded-md` on **all** buttons, inputs, cards by default
- `rounded-lg` on dialogs and sheet drawers
- `rounded-full` on avatars + circular badges
- `rounded-none` never (except dataviz)

No custom border-radius other than these tokens.

---

## 6. Components — approved patterns

### 6.1 Buttons (`Button`)

Variants: `default` / `destructive` / `outline` / `secondary` / `ghost` / `link`.

| Variant | Usage |
|---|---|
| `default` | Main CTA of a page (1 max per screen) |
| `outline` | Secondary CTA, back, cancel |
| `ghost` | Tertiary actions, in tables, in toolbars |
| `destructive` | Deletion, ban, deactivation |
| `link` | Text links only |
| `secondary` | rare, to be avoided except in specific cases |

Sizes: `default` (h-9) / `sm` (h-8) / `lg` (h-10) / `icon` (square).

### 6.2 Cards (`Card`)

```tsx
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Subtitle</CardDescription>
  </CardHeader>
  <CardContent>...</CardContent>
  <CardFooter>...</CardFooter>
</Card>
```

Rules:
- One card = **one thing**. If you hesitate over putting 2 subjects, that's 2 cards.
- No colored left borders (`border-l-4 border-primary`) — AI slop pattern.
- No background gradients. Background = `bg-card`.

### 6.3 Sidebar (`Sidebar` shadcn)

The `sidebar.tsx` component already exists. **Use it for `/messages` (DD2)**:

```
┌─────────────┬──────────────────────────┐
│  Sidebar    │  Main thread             │
│  (320px)    │  (fluid)                 │
│             │                          │
│  [Search]   │  [Conversation header]   │
│  Conv 1 ●   │                          │
│  Conv 2     │  [Messages scroll]       │
│  Conv 3     │                          │
│             │  [Composer]              │
└─────────────┴──────────────────────────┘
```

Mobile: sidebar behind a `<Sheet>` (drawer), triggered via the menu icon in the top bar.

### 6.4 States (DD4) — mandatory framework

| State | Pattern |
|---|---|
| **LOADING** | shadcn `<Skeleton>`, never a native `<Spinner>`, never a plain-text "Loading...". |
| **EMPTY** | HugeIcons icon 48px (`text-muted-foreground`) + title `text-lg font-semibold` + 1 line `text-sm text-muted-foreground` + 1 CTA `<Button variant="default">`. |
| **ERROR** | Sonner `toast.error()` with a clear message + a "Retry" button if retry is possible. Inline `<Alert variant="destructive">` for form errors. |
| **SUCCESS** | Sonner `toast.success()` auto-dismiss 3s. No modal. |
| **PARTIAL** | `<Skeleton>` for the sections still loading, real content for what is ready. |

#### Empty state — `/messages` page example

```tsx
<div className="flex flex-col items-center justify-center gap-4 p-8">
  <Icon icon={MessageOff} size={48} className="text-muted-foreground" />
  <div className="space-y-1 text-center">
    <h3 className="text-lg font-semibold">No conversations</h3>
    <p className="text-sm text-muted-foreground">
      Find a neighbor to start a conversation.
    </p>
  </div>
  <Button asChild>
    <Link to="/services">View services</Link>
  </Button>
</div>
```

#### Upload error

```tsx
toast.error("Photo not sent", {
  description: "The server is not responding. Check your connection.",
  action: { label: "Retry", onClick: retryUpload }
});
```

### 6.5 Toasts (Sonner)

- `toast.success()`: auto-dismiss 3s
- `toast.error()`: stays displayed until manual dismiss or retry action
- `toast.info()`: 4s
- `toast.warning()`: 5s
- No more than **3 simultaneous toasts** — Sonner stacks by default, OK.

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

Rules:
- Always a visible `<FormLabel>`, never the placeholder as the only label (a11y).
- Zod validation on submit.
- Errors in `<FormMessage>` below the field, not at the top of the form.

---

## 7. Iconography

**HugeIcons** (`@hugeicons/react`).

Usage:

```tsx
import { Icon } from "@hugeicons/react";
import { Message01Icon, UserGroupIcon, MapPinIcon } from "@hugeicons/core-free-icons";

<Icon icon={Message01Icon} size={20} />
```

### Sizes

- `size={16}`: inline (buttons, badges)
- `size={20}`: navigation, sidebar items
- `size={24}`: section headers
- `size={48}`: empty states, hero illustrations

### Rules

- **No mixing**: all HugeIcons, no Lucide, no emoji as icons (🎉 = AI slop).
- Always pair an icon with a visible label or an `aria-label`.
- No purely decorative icons in headings (just for decoration).

---

## 8. Responsive (DD5)

### Scope strategy

| Surface | Approach |
|---|---|
| **Web Client** | Mobile-first on `/dashboard`, `/messages`, `/events` (swipe), `/services`, `/incidents`, `/votes` |
| **Web Client** | Desktop-only on `/contracts/$id/sign` (PDF drag-drop = poor on touch). "Use desktop" banner below 1024px. |
| **Web Admin** | Desktop-only by assumption. "Use desktop" banner below 1024px. |
| **Desktop JavaFX** | 1280×800 minimum, resizable, no touch support. |

### Tailwind breakpoints

- `sm:` 640px (small tablet)
- `md:` 768px (tablet)
- `lg:` 1024px (small desktop) — **desktop-only banner threshold**
- `xl:` 1280px (desktop)
- `2xl:` 1536px (large)

### Mobile rules (mobile-first pages)

- Touch target **minimum 44×44px** (a11y AA).
- No hover-only interactions — always a tap equivalent.
- Sidebar → `<Sheet>` drawer.
- Tables → stacked cards on mobile (`md:hidden` table, `md:block` cards).
- Modals → shadcn `<Drawer>` (bottom sheet) on mobile, `<Dialog>` on desktop.

### Desktop-only banner

```tsx
<div className="lg:hidden p-6 text-center">
  <Icon icon={DesktopIcon} size={48} className="text-muted-foreground mx-auto mb-4" />
  <h2 className="text-lg font-semibold mb-2">Desktop mode required</h2>
  <p className="text-sm text-muted-foreground">
    This feature requires a screen at least 1024px wide.
  </p>
</div>
```

---

## 9. Accessibility (DD6)

### Target: Level A + AA via axe-core

Phase B week 6 validation (Thu 11/6) with `pnpm dlx @axe-core/cli https://...`.

### Mandatory checklist

- [ ] Contrast 4.5:1 on all body text (3:1 on large text ≥18px)
- [ ] Touch targets ≥44×44px on mobile
- [ ] Visible focus (`focus-visible:ring-2 focus-visible:ring-ring`)
- [ ] All icon-only buttons have an `aria-label`
- [ ] All inputs have a visible `<FormLabel>` (never placeholder alone)
- [ ] Modals = `role="dialog"` + `aria-modal="true"` + focus trap (shadcn `Dialog` does this)
- [ ] Toasts announced via `aria-live="polite"` (Sonner by default)
- [ ] Full keyboard navigation (Tab, Enter, Escape, Arrow keys in lists)
- [ ] No communication by color alone (status "open" = red but also with an `AlertTriangle` icon)
- [ ] Skip-to-content link at the top of `__root.tsx`
- [ ] `<html lang="fr">` or `lang="en"` depending on the active language (i18n)

### shadcn components — already compliant

Base UI / Radix are **compliant A/AA out of the box**. Most axe-core fixes will be on the custom code (not the components).

---

## 10. Animations & motion

### Duration scale

- `duration-100` (100ms): hover micro-interactions
- `duration-200` (200ms): fades, changed states
- `duration-300` (300ms): page transitions, modals
- `duration-500` (500ms): heroic animations (rare)

### Rules

- **Default easing**: `ease-out` (natural feel). `ease-in` reserved for exits.
- Respect `prefers-reduced-motion`: if the user has requested it, disable non-essential animations.
- No infinite animations (except spinners <2s) — distracting.
- Swipe events (Phase A week 2): `framer-motion` `useDrag`, animation +/-180° opacity 0 over 300ms ease-out (DD3).

### Skeleton shimmer

The shadcn `Skeleton` component has its own shimmer. Do not override it.

---

## 11. Slop blacklist (to be avoided at all costs)

These patterns betray AI-generated code and flatten the jury's perception:

1. ❌ Purple/indigo gradient in the background
2. ❌ 3-column grid of "icon-in-circle + bold title + 2-line desc"
3. ❌ Centered everything (`text-align: center` on all cards)
4. ❌ Bubbly border-radius everywhere (`rounded-3xl` on everything)
5. ❌ Decorative SVG blobs, wavy dividers
6. ❌ Emoji in headings (🎉, 🚀)
7. ❌ Colored left border on cards (`border-l-4 border-primary`)
8. ❌ Generic copy ("Welcome to QuartierConnect", "Unlock the power of...")
9. ❌ System font stack (`system-ui`, `Arial`) instead of Inter/Newsreader
10. ❌ Mixing Lucide + HugeIcons + emoji
11. ❌ Sans-serif headings (forcing `font-sans` on h1-h6) — that is the Civic Editorial identity
12. ❌ A saturated color other than the green `--accent` (e.g. blue CTA, orange highlight, purple badge) — a single saturated accent, that's the rule
13. ❌ Geist + blue-violet primary = back to the default Vercel/shadcn template

If a developed page commits 1+ of these patterns, refactor immediately.

---

## 12. Open decisions (to be settled during implementation)

- [ ] Page enter/exit animation (TanStack Router transitions) — none by default. If we add one, fade 200ms.
- [ ] Responsive behavior of the desktop chart (StatisticsView) — JavaFX scale.
- [ ] Incident status badge color (`open`/`in_progress`/`resolved`) — propose in week 1.
- [ ] Drag-drop signature layout: full-page modal or stepper? To be decided in week 2.
- [ ] Dense vs comfortable mode (compact table rows for admin)? Decide in week 4.

---

## 13. How to use this document

- **Before coding a new page**: re-read §6 (components) + §8 (responsive scope) + §9 (a11y).
- **Before generating a mockup**: pass a brief that references this DESIGN.md (palette + typography + components).
- **On every PR**: if a new pattern appears that is not in DESIGN.md, add it in the same PR.
- **Phase B week 6 audit**: apply the §11 slop blacklist and the §6.4 states framework on all existing pages.

---

*Document inferred and calibrated on 4 May 2026 (DD7).*
*Civic Editorial aesthetic redesign applied on 11 May 2026 (palette + typography + slop blacklist).*
*Next review: Phase B week 6 (8-14 June) for a full audit and page-by-page corrections.*
