# Brand & UI system

Same identity as the On-Ground mock (deep-green shell, emerald accent, purple
for AI/Pulse, amber for tasks), with the noise taken out. The mock uses 15 font
sizes, 8 corner radii and a gradient on nearly every block. We use 6 sizes, 4
radii and gradients in exactly two places.

## Principles

1. **Calm by default, loud on purpose.** Neutral white cards on a soft grey
   canvas. Colour is reserved for state (live, missed, at stake) and the one
   primary action per card.
2. **One card style.** White, 1px hairline border, 12px radius, faint shadow.
   No per-card gradients, no coloured card backgrounds except the two hero slots.
3. **Numbers are the content.** KPIs, money, timers and scores use tabular
   figures and the heaviest weight on the screen.
4. **Restrained type.** Body is 14px. Nothing over 28px. Labels are 12px, never smaller.
5. **Same shell everywhere.** Sidebar + top bar never move; screens swap inside.

## Colour tokens

```css
/* surfaces */
--canvas:        #f4f5f7;   /* app background */
--surface:       #ffffff;   /* cards, sheets */
--surface-muted: #f8f9fa;   /* inset rows, inputs */
--border:        #e6e8eb;
--border-strong: #d5d9de;

/* shell (sidebar + top bar) */
--shell:         #0b1f17;
--shell-raised:  #132e23;   /* active nav item */
--shell-text:    #c9d6cf;
--shell-text-strong: #ffffff;
--shell-accent:  #6fdcb4;   /* active sub-item / phone tab on the dark shell */
--gold:          #f5c451;   /* rank star only */

/* text */
--text:          #16181b;
--text-muted:    #5f6670;
--text-subtle:   #8b929b;

/* brand / semantic */
--brand:         #1d9e75;   /* primary actions, positive deltas, live */
--brand-strong:  #0f6e56;   /* primary button bg, pressed */
--brand-tint:    #e6f6ef;
--ai:            #7c3aed;   /* Pulse, AvaniBot, AI Assist, lead intent */
--ai-tint:       #f2edff;
--warn:          #b7791f;   /* tasks, needs-input, SLA */
--warn-tint:     #fdf4e3;
--warn-strong:   #8a4b0c;   /* incoming-call dock (white text) */
--danger:        #d64545;   /* missed calls, end call, overdue */
--danger-tint:   #fdeeee;
--info:          #2563eb;   /* CSAT chart, incoming */
--info-tint:     #eaf1fe;
```

The only two gradients: the **dashboard hero** (`#14213d → #1e3a8a`, holds the
greeting + KPI strip) and the **in-call card** (`--shell → --brand-strong`).

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

- Spacing on a 4px grid: `4 8 12 16 20 24 32`. Card padding 16, page gutter 24 (16 on phone).
- Radius: `--r-sm 6px` (badges, chips) · `--r-md 10px` (buttons, inputs, rows) · `--r-lg 14px` (cards, modals) · `--r-full 999px` (pills, avatars).
- Shadow: `--shadow-card: 0 1px 2px rgb(16 24 40 / .05)`; `--shadow-pop: 0 12px 32px rgb(16 24 40 / .18)` for modals/sheets only.

## Components

| Component | Rule |
|-----------|------|
| **Button** | Primary: `--brand-strong` bg, white text, 36px tall. Secondary: white + border. Danger: `--danger`. Icon buttons 32px square. One primary per card. |
| **Pill / badge** | 12px, `--r-full`, tint bg + strong text of the same hue (e.g. `--danger-tint` / `--danger`). Deltas: ▲ green, ▼ red. |
| **Row** | 56–64px, avatar or icon tile (32px, `--r-md`, tint bg) left, title + meta middle, value/action right. Hover: `--surface-muted`. Whole row clickable when it opens something; chevron signals it. |
| **Avatar** | Initials, 32px circle, tint bg from a fixed 6-colour list hashed by name. |
| **Section eyebrow** | 12px uppercase, `--text-subtle`, 0.04em tracking, 8px above its card. |
| **Modal / sheet** | Centered ≤ 440px wide on desktop, bottom sheet on phone. Scrim `rgb(10 15 13 / .45)`. Close on Esc + scrim click. Focus trapped. |
| **Charts** | Recharts bar charts, no gridlines, axis text `--fs-xs --text-subtle`, value labels on top, today's bar in the strong shade. Calls = `--brand`, CSAT = `--info`. |
| **Icons** | Tabler icons (same family as the mock), 16px inline, 18px in nav. Stroke 1.75. |

## Shell

- Sidebar 232px, `--shell`. Nav item 36px, 18px icon, active = `--shell-raised`
  bg + white text. Plan's sub-items indent 28px and are always visible (as in the mock), so
  every plan tab is one click away.
- Top bar 56px, `--shell`, brand mark left; notifications, OG score + rank pill,
  avatar right.
- Phone (< 768px): sidebar becomes a bottom tab bar (Dashboard, Plan, Calendar,
  Pulse); Plan sub-items become a segmented control at the top of Plan.

## What we deliberately drop from the mock

Floating DEMO strip, floating dial FAB as a gradient blob (we keep a plain dial
button), per-card gradients (My Tasks brown, progress green), emoji in UI
chrome, 12.5/13.5/14.5/15.5/16.5px half sizes.
