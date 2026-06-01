# QuartierConnect — Redesign Plan

Applies `DESIGN.md` patterns to every page. Both apps already share the new blue
palette, the sidebar-07 layout, and unhead titles. This plan is the per-page
work to make pages "plus belles et adaptées". Priorities: **P1** = visible/structural,
**P2** = polish, **P3** = nice-to-have.

## Phase 0 — Foundations (do first, unblocks everything)

- [ ] **F1 (P1)** — Client accent nuance. Add `apps/client/src/client.css` overriding
  `--primary`/`--ring`/`--sidebar-primary`/`--sidebar-ring` to teal/sky (DESIGN.md §2),
  import it in `apps/client/src/main.tsx` after `globals.css`. Admin keeps base blue.
- [ ] **F2 (P1)** — Reusable building blocks in each app's `src/components/`:
  `PageHeader` (title + subtitle + actions slot), `StatCard` (label + value + trend),
  `DataState` wrapper (loading→`Skeleton` / empty→`Empty` / error→`Alert`+retry).
  These encode §5/§7 so pages stay consistent and short.
- [ ] **F3 (P2)** — Confirm `Empty`, `Skeleton`, `Alert`, `Badge`, `Table`, `Field`
  are present in `packages/ui` (most are). Add any missing via `pnpm dlx shadcn add`.

## Archetypes (the 3 patterns every page reduces to)

1. **Dashboard** — PageHeader + KPI `StatCard` row + quick-access/`Card` grid.
2. **Table page** — PageHeader + Toolbar (search/filter/`Select`) + `Table` with
   `Badge` status, `tabular-nums`, sticky header, `DataState`, pagination.
3. **Map page** — PageHeader + `Tabs`/`ToggleGroup` (list ↔ map) + Leaflet map with
   reserved min-height + side list; `DataState` for the list.

Plus secondary: **Form/dialog** (Field groups), **Chat** (messages), **Editor** (DSL).

## Admin (blue, dense)

| Page | Archetype | Key changes | Priority |
|------|-----------|-------------|----------|
| `dashboard` | Dashboard | KPI cards: value `text-3xl tabular-nums`, subtle trend, clickable to section; tighten quick-access grid; drop redundant copy | P1 |
| `users` | Table | PageHeader + search/role `Select` filter; role→`Badge` (§8); compact rows; `DataState` (skeleton/empty/error); ban via `AlertDialog`; `aria-sort` | P1 |
| `incidents` | Map | `ToggleGroup` list/map/calendar; map min-height + reserved space; status `Badge`; neighborhood `Select`; `DataState`; sync map↔list selection | P1 |
| `events` | Table/Cards | PageHeader + view toggle; event cards or table with date `tabular-nums`; empty state with "Créer un événement" CTA | P2 |
| `neighborhoods` | Map+Table | list + map of polygons; create/edit in `Dialog` with `Field` form; empty state | P2 |
| `community-votes` | Table/Cards | vote cards with progress (`Progress`) + result `Badge`; clear open/closed state | P2 |
| `services` | Table/Cards | directory cards grid; category filter (`ToggleGroup`); empty state | P2 |
| `dsl` | Editor | two-pane: query editor + results; monospaced input; run button primary; error `Alert`; empty "Écrivez une requête" | P3 |

## Client (teal/sky, airy, `max-w-5xl` centered)

| Page | Archetype | Key changes | Priority |
|------|-----------|-------------|----------|
| `dashboard` | Dashboard | profile + points `Card`, neighborhood map prominent, quick links; SSO token in `Dialog`; airier spacing | P1 |
| `incidents` (`/`, `$id`) | Map + detail | list/map toggle; report CTA primary; detail page with status timeline + `Badge`; `DataState` | P1 |
| `messages` | Chat | already full-height; polish: conversation list `Item` styling, empty thread state (done), message bubbles spacing, send `InputGroup` | P2 |
| `events` | Cards | event cards with date/place, RSVP action; calendar/list toggle; empty state | P2 |
| `contracts` | Table/Cards | contract cards/list with status `Badge`; empty state | P2 |
| `services` | Cards | directory cards + category filter; empty state | P2 |
| `votes` | Cards | vote cards with `Progress` + your-vote indicator; open/closed `Badge` | P2 |

## Dimensions coverage (per DESIGN.md, applied via archetypes)

- **Hierarchy/layout** — PageHeader pattern + one primary CTA per page (§5).
- **States** — every data view wraps in `DataState` (§7); empty states are warm + actionable.
- **Coherence/density** — shared components (F2) + admin-dense/client-airy rules (§4).
- **Responsive/a11y** — checklist §9 per page; tables collapse < 768px; focus rings kept.

## Implementation order

1. Phase 0 (F1–F3).
2. Both dashboards (P1) → validate the look on the most-seen page.
3. Table + Map archetypes (admin users/incidents, client incidents) (P1).
4. Remaining P2 pages by archetype reuse.
5. P3 (DSL editor).

## NOT in scope

- New features/flows (redesign only reskins/restructures existing pages).
- Dark-mode-specific art direction beyond the token pairs already defined.
- Mockups (blocked: no OpenAI key for the gstack designer; revisit if wanted).

## Open decisions

- Client teal exact value (`oklch(0.58 0.13 215)` proposed) — tune on first page.
- Admin/client density specifics — calibrate on the two dashboards, then lock.
