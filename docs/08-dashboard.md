# 08 · Dashboard

**Status:** done
**Brief:** must build ("KPI cards, progress, who is waiting · earnings, tasks and 7-day charts") + bonus ("Charts with a library you like")

## Goal
The first screen of the shift: how I'm doing, who's waiting, what I've
earned, what needs me, and the week at a glance. Everything that can be live
is wired to real state.

## Mock reference
- **Hero** (navy): "Good afternoon 👋", **Arvind Rajan**, "The Sleep Company ·
  Call Centre"; right: green "● On Queue" pill and a "This Week" date filter
  (in the mock it only changes its own label).
- **KPI strip** (4 cards in the hero): 76 OG Score™ ▲13 · 4m 12s Avg handle
  time ▼8% · 94% CSAT today ▲2pt · 2 In queue ● live (jumps to Plan).
- **My progress · today** (green card): 3 Leads created ▲+1 · 2 Leads called ▲+2.
- **Who's waiting** + "Open planner →": Priya Iyer "Likely billing dispute,
  flagged before" 4m 20s (red), Suresh Nair "Plan upgrade enquiry" 1m 50s (amber).
- **My earnings this month**: ₹5,200, "₹1,700 from coached moves", "₹800 to
  ₹6,000 slab", progress bar.
- **My Tasks** (brown card, badge 3): 2 callbacks · next 4:30pm; 2 hot leads ·
  untouched 24h; 1 outcome · to log. Each opens its Pulse thread.
- **Calls handled · last 7 days** bars: Mon 18, Tue 22, Wed 15, Thu 26, Fri 20,
  Sat 12, Today 14 (today darker). **CSAT trend · last 7 days**: 88, 90, 85,
  92, 89, 91, 94% (blue, today darker).

**Real, not decorative:**
- **Queue pill** shows the softphone's state: "On queue" when online for
  inbound, otherwise a "Go online" button (same action as the top bar).
- **Period** (Today / This week / This month) switches AHT, CSAT and the
  progress numbers. The mock's filter only relabels itself.
- **Leads called** adds the lead calls the agent actually made in the app today.
- **My Tasks** = the open Needs-your-input asks from Pulse. Answering one in
  Pulse removes the task and drops the badge. "2 hot leads" opens the Leads
  modal (D12); the other two open their channel.
- **Who's waiting** timers tick live.

**Cleaner:** one hero gradient (brand.md), white cards for everything else,
no emoji in chrome, real charts with value labels and accessible data tables.

## Data
`src/data/dashboard.json`: `kpis` (OG score), `periods.{today,week,month}`
(AHT, CSAT, progress), `queue[]` (name, reason, waitingSec), `earnings`,
`callsHandled[]`, `csat[]`, `tasks[]` (askId, title, detail, to).

## Files
| File | Responsibility |
|------|----------------|
| `src/screens/dashboard/Dashboard.tsx` | layout, period state, hero, KPIs, progress, queue, earnings, tasks |
| `src/screens/dashboard/WeekChart.tsx` | Recharts bar chart + sr-only data table (lazy-loaded) |
| `src/screens/dashboard/Dashboard.module.css` | styles |
| `src/data/dashboard.json` | sample numbers |

## States & edge cases
- All tasks answered → "All caught up" empty state, no badge.
- Queue empty → "Queue is empty right now".
- Charts in jsdom have no size, so tests read the sr-only tables; Chrome verifies the drawing.
- 390px: hero KPIs 2×2, columns stack, charts full width.

## Acceptance criteria
- [x] Greeting by time of day; name and brand line
- [x] KPI strip with the mock's values (Today); period switch changes AHT / CSAT / progress
- [x] Queue pill reflects device status; Go online works from the dashboard
- [x] Who's waiting rows with ticking timers; "Open planner" → `/plan/outgoing`; In queue KPI = queue length
- [x] Earnings with slab progress
- [x] Tasks from open asks; each opens the right place; answering in Pulse removes it
- [x] Two 7-day bar charts with the mock's values, today highlighted
- [x] Leads called counts a lead call made in the app

## Tests
| Test file | Covers |
|-----------|--------|
| `tests/web/dashboard.test.tsx` | greeting by hour, KPI values, period switch, queue pill vs status, queue timers tick, earnings, tasks list + links + Leads modal + removal after answering, chart tables, leads-called increments after a logged lead call |

## Review
2026-11-09 · self-review against the PDF list, the mock dashboard and plans 03, 09 and 10/11.
- Dropped "In queue KPI → /plan/incoming": Incoming is missed calls, In queue is people waiting
  now. The KPI is the queue length, with "Who's waiting" right under it.
- Chart day labels are computed (last six weekdays + "Today"), not the mock's fixed Mon–Sat,
  which is only right on a Sunday.
- The ticking clock is needed by the call dock and the queue, so `useNow` moves to `src/lib`.
- Recharts 3's `responsive` prop replaces `ResponsiveContainer` (no wrapper component).

## Verification
2026-11-09
- `npm test`: 183/183. New: 14 dashboard tests (greeting by hour, last-7 labels, KPI strip,
  period switch changes AHT/CSAT/progress, Go online → On queue, live queue ticks + planner link,
  earnings slab 85%, tasks from asks + links + Leads modal, task removal and all-caught-up,
  live lead calls count, chart data tables).
- Build: Recharts is a lazy 91 kB-gzip chunk (`WeekChart`), off the first paint.
- Chrome 1440px: hero + KPIs, progress, ticking queue, earnings, tasks, both charts with value
  labels and today highlighted. 390px: KPIs 2×2, columns stacked.
- Fixed in the shell at 390px: the top bar was so crowded that "Go online" wrapped onto two
  lines. The section title is hidden on phones (the tab bar names it) and the pill doesn't wrap.
- Test-suite health: tests started timing out once the dashboard lazy-loaded Recharts. userEvent
  now runs with `delay: null` and tests that aren't about the dashboard start on lighter routes.
  The real cause turned up in 13: worker oversubscription (see 13's verification).
