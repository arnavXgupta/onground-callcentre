# Brand & UI system

Hybrid soft UI with one accent (D19, D20). The mock uses 15 font sizes, 8 corner
radii and a gradient on nearly every block. We use 6 sizes, 4 radii and no gradients.

## Principles

1. **Colour means something.** One accent (indigo) for actions, links, nav and
   selection. Green / amber / red for status only. Red means broken, never
   "look here". Brand colour stays off the data: money and scores are ink.
2. **Hybrid soft UI, solid colours only.** No gradients. Surfaces sit one shade
   above the canvas with a 1px hairline **and** a short light/dark shadow pair.
   The border separates; the shadow only softens. **Raised = clickable**,
   **inset = input or information**. State is always also shown by colour or
   text, never by shadow alone (WCAG 1.4.11).
3. **One card style.** `--surface`, `--edge` hairline, `--shadow-card`, 16px radius.
   No coloured card backgrounds; categories show as a tinted icon tile. The only
   dark surface is the floating call dock (and toast).
4. **Size is hierarchy.** KPIs and money are the largest, heaviest text on the
   screen, in tabular figures. Trends are line charts; per-day counts are bars.
5. **Restrained type.** Body is 14px. Nothing over 28px. Labels are 12px, never smaller.
6. **Same shell everywhere.** Sidebar + top bar never move; screens swap inside.

## Colour tokens

`src/styles/tokens.css` holds the values; this is the map.

```css
/* surfaces */
--canvas: #eef1f5;   --surface: #f8f9fb;   --surface-muted: #f1f3f7;
--border / --edge: #e3e7ed;   --border-strong: #d0d6df;

/* text */
--text: #101828;   --text-muted: #475467;   --text-subtle: #667085;

/* accent: actions, links, nav, selection (never status) */
--brand: #3b5bdb;   --brand-strong: #2f49b8;   --brand-tint: #e8edfc;

/* status */
--ok: #18a058 (live, positive, pass)   --warn: #b45309   --danger: #d0362f

/* categories (icon tiles, charts) */
--ai: #7048e8 (Pulse, AvaniBot)   --info: #0e7c9a (CSAT, incoming)
--gold: #b7791f (rank star only)

/* dark: floating call dock + toast */
--ink: #1b2230;
```

## Type

Font: **Inter** (Google Fonts, 400/500/600/700), `font-feature-settings: "tnum"`
on numbers.

| Token | Size / line | Weight | Use |
|-------|-------------|--------|-----|
| `--fs-xs` | 12 / 16 | 500–600 | Labels, captions, badges, chart axes, section eyebrows (uppercase, +0.04em) |
| `--fs-sm` | 13 / 18 | 400–500 | Secondary lines in rows, meta, timestamps |
| `--fs-md` | 14 / 20 | 400–600 | Body, row titles, buttons, inputs |
| `--fs-lg` | 16 / 22 | 600 | Card titles, modal titles |
| `--fs-xl` | 20 / 26 | 700 | Page titles, KPI values |
| `--fs-2xl` | 28 / 32 | 700 | Single hero number per screen (earnings, call timer) |

## Space, radius, elevation

- Spacing on a 4px grid: `4 8 12 16 20 24 32`. Card padding 20, page gutter 24 (16 on phone).
- Radius: `--r-sm 8px` (badges, chips) · `--r-md 12px` (buttons, inputs, rows) · `--r-lg 16px` (cards, modals) · `--r-full 999px` (pills, avatars).
- Shadow (short soft UI pairs): `--shadow-card` (4px, cards), `--shadow-raise` (2px, buttons/rows), `--shadow-press` (inset ring + soft inset, fields/info), `--shadow-pop` for modals/popovers only.
- Card gap 24px: soft shadows need the room.

## Components

| Component | Rule |
|-----------|------|
| **Button** | Raised. Primary: `--brand-strong` bg, white text, 38px tall. Secondary: surface colour + `--edge`. Danger: `--danger`. Icon buttons 36px round. Press = `--shadow-press`. One primary per card. |
| **Pill / badge** | 12px, `--r-full`, tint bg + strong text of the same hue (e.g. `--danger-tint` / `--danger`). Deltas: ▲ green, ▼ red. |
| **Row** | 56–64px, avatar or icon tile (32px, `--r-md`, tint bg) left, title + meta middle, value/action right. Raised when it opens something (chevron signals it), inset when it only informs. |
| **Avatar** | Initials, 32px circle, tint bg from a fixed 6-colour list hashed by name. |
| **Section eyebrow** | 12px uppercase, `--text-subtle`, 0.04em tracking, 8px above its card. |
| **Modal / sheet** | Centered ≤ 440px wide on desktop, bottom sheet on phone. Scrim `rgb(29 42 57 / .4)`. Close on Esc + scrim click. Focus trapped. |
| **Charts** | Recharts bar charts, no gridlines, axis text `--fs-xs --text-subtle`, value labels on top, today's bar in the strong shade. Calls = accent bars (today strong, past days light). CSAT = `--info` line with labelled points. |
| **Icons** | Tabler icons (same family as the mock), 16px inline, 18px in nav. Stroke 1.75. |

## Shell

- Sidebar 240px, `--surface` with a hairline right border. Nav item 40px,
  18px icon; active = accent-tint background, accent text, filled accent icon tile. Plan's sub-items indent 28px and are always visible (as in the mock), so
  every plan tab is one click away.
- Top bar 64px, `--surface` with a hairline under it, raised round controls, brand mark left; notifications, OG score + rank pill,
  avatar right.
- Phone (< 768px): sidebar becomes a bottom tab bar (Dashboard, Plan, Calendar,
  Pulse); Plan sub-items become a segmented control at the top of Plan.

## What we deliberately drop from the mock

Floating DEMO strip, floating dial FAB as a gradient blob (we keep a plain dial
button), every gradient and every coloured card background, per-card gradients (My Tasks brown, progress green), emoji in UI
chrome, 12.5/13.5/14.5/15.5/16.5px half sizes.
