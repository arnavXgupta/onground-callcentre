# 02 · App shell

**Status:** done
**Brief:** must build ("App shell: sidebar and top bar") + bonus phone width

## Goal
The frame an agent keeps open all shift: a sidebar to move between screens and a
top bar with notifications, OG score/rank and the agent menu. Every screen
renders inside it.

## Mock reference
- **Sidebar** (dark green, full height): "On-Ground.ai" wordmark; Dashboard;
  Plan with 4 always-visible sub-items (Calls to make, Incoming, Recent,
  Practise a call); Calendar; Pulse. Active item gets a raised pill; each item
  has a tinted icon tile.
- **Top bar** (dark green, over the content): OG logo + "On-Ground.ai" again
  (duplicate of the sidebar); right side: bell with unread dot → notifications
  overlay; gold pill with OG Score ring "76" + "⭐#3" rank; avatar with ring;
  hamburger → dropdown (name, store, Avatar, Settings, Logout).
- Notifications: 6 items, some with a CTA that jumps to a screen; the dot
  clears once opened.

**Cleaner than the mock:** drop the duplicated brand in the top bar; show the
current section title there instead. One avatar button (no separate
hamburger). Rank pill is a quiet chip, not a gold slab.

## Scope
- **In:** sidebar nav with active states (Plan active on any `/plan/*`, Pulse
  on any `/pulse/*`); top bar with section title, bell + popover list (CTA
  navigates, dot clears on open), OG score/rank chip, avatar menu (name, store,
  role); phone layout (< 768px): nav becomes a fixed bottom tab bar with the 4
  top-level items, sub-items hidden (Plan gets its own segmented tabs in 04).
- **Out:** Avatar picker, Settings panel, OG-score radar and rank-detail
  overlays, Logout (no auth in this app). These aren't in the brief, and an
  inert Logout button would look broken. Notification filters.

## Data
- `src/data/agent.json`: `{ name, initials, role, company, store, ogScore, ogDelta, rank, rankScope }`
- `src/data/notifications.json`: `[{ id, title, time, tone, cta?: { label, to } }]`
- Types in `src/data/types.ts`: `Agent`, `Notification`.

## Files
| File | Responsibility |
|------|----------------|
| `src/components/shell/Shell.tsx` | grid layout: nav, top bar, `<Outlet/>` main |
| `src/components/shell/Nav.tsx` | sidebar (desktop) / bottom tabs (phone): one `<nav>`, CSS switches the layout |
| `src/components/shell/TopBar.tsx` | section title, bell, score chip, avatar menu |
| `src/components/shell/Shell.module.css` | all shell styles |
| `src/data/*.json`, `src/data/types.ts` | sample data + types |
| `src/App.tsx` | wrap routes in a `<Shell/>` layout route |

Menus use the native HTML `popover` attribute (`popovertarget`): light-dismiss
and Esc for free, no positioning library. They're placed `fixed` under the top
bar's right edge.

## States & edge cases
- Section title follows the route (`/plan/recent` → "Plan").
- Bell dot hidden after the first open (session state).
- Notification CTA closes the popover and navigates.
- Phone: bottom bar must not cover content, so main gets bottom padding equal
  to the bar height.
- Keyboard: every item is a real link/button; `aria-current="page"` on active links.

## Acceptance criteria
- [x] All 8 nav targets navigate; active styling matches the route
- [x] Plan is highlighted on all `/plan/*` routes, Pulse on `/pulse/*`
- [x] Bell shows the dot, opening clears it, the list shows 6 items, a CTA navigates
- [x] Avatar menu shows Arvind Rajan, store and role
- [x] 1440px: sidebar 232px + top bar 56px; 390px: bottom tab bar, no horizontal scroll
- [x] Only brand tokens used (no raw hex in CSS modules except via vars)

## Tests
| Test file | Covers |
|-----------|--------|
| `tests/web/shell.test.tsx` | nav hrefs; `aria-current` on the right link; Plan parent active on `/plan/incoming`; clicking a nav link swaps the screen; section title per route; bell dot clears on click; notifications rendered; CTA navigates; avatar menu content |
| `tests/web/app.test.tsx` | unchanged routing tests still pass inside the shell |

## Review
2026-11-09 · self-review against the PDF, mock and `brand.md`.
- `brand.md` said Plan sub-items show only while Plan is active; the mock always
  shows them. Going with the mock and fixing `brand.md` (one click to any plan tab).
- jsdom may not implement the popover API, so tests assert popover content and
  handlers (dot clearing, CTA navigation), and the open/close behaviour is
  checked in Chrome.
- Notification CTAs must target routes that exist: `/pulse/callcentre-team`,
  `/plan/incoming`. No CTA to screens we don't build (Skill Coach).

## Verification
2026-11-09
- `npm test`: 24/24 (12 shell + 12 routing). Lint and build clean.
- Chrome 1440px: sidebar with active Plan + Incoming; notifications popover (6 items,
  CTAs, light-dismiss/Esc); account popover; bell dot clears after opening.
- Chrome at 390px (iframe, since the window was maximised): bottom tab bar,
  logo + section title in the top bar, `scrollWidth == 390` (no horizontal scroll).
- Fixed during verification: the top-bar logo showed on desktop because `.logo`'s
  display won over `.phoneOnly` at equal specificity. Replaced with a scoped
  `.title .logo` rule.
- Fixed in tests: jsdom hides closed `[popover]` content from the a11y tree, so
  popover queries use `hidden: true`.
