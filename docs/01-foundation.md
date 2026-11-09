# 01 · Foundation

**Status:** done
**Brief:** groundwork for every must-build item

## Goal
A repo every later feature drops into: Vite + React + TS app, brand tokens,
URL routing for every screen, Vercel config, one test harness, clean git.

## Scope
- **In:** git init + `.gitignore`; `package.json` with scripts; Vite, TS,
  Vitest configs; `index.html` with Inter; `src/styles/tokens.css` + `global.css`
  from `brand.md`; router with a placeholder per route from `flow.md` §1;
  `vercel.json` SPA rewrite; `.env.example`; smoke test.
- **Out:** any real screen UI (02+), Twilio/Recharts deps (added by the feature
  that needs them).

## Dependencies
- runtime: `react`, `react-dom`, `react-router` (v7), `@tabler/icons-react`
- dev: `vite`, `@vitejs/plugin-react`, `typescript`, `@types/react`,
  `@types/react-dom`, `vitest`, `jsdom`, `@testing-library/react`,
  `@testing-library/user-event`, `@testing-library/jest-dom`

## Files
| File | Responsibility |
|------|----------------|
| `.gitignore` | node_modules, dist, `.env*` (keep `.env.example`), mock HTML, PDF, `.vercel`, Python caches, `.claude/` |
| `package.json` | scripts `dev`, `build` (`tsc -p . && vite build`), `test` (`vitest run`), `lint` (`tsc -p .`), `preview`; `noEmit: true` lives in tsconfig |
| `vite.config.ts` | React plugin + Vitest block: jsdom, `tests/**/*.test.{ts,tsx}`, setup file |
| `tsconfig.json` | strict, `jsx: react-jsx`, includes `src`, `tests`, `api` |
| `index.html` | Inter from Google Fonts, `#root` |
| `src/main.tsx` | mounts `<App/>` inside `BrowserRouter` |
| `src/App.tsx` | `<Routes>`: `/` → redirect `/dashboard`; `/dashboard`, `/plan/:tab`, `/calendar`, `/pulse`, `/pulse/:channel`; unknown → `/dashboard` |
| `src/styles/tokens.css` | every token in `brand.md` as `:root` vars |
| `src/styles/global.css` | reset, body font/colour/canvas, `.tnum` utility, focus ring |
| `vercel.json` | rewrite `/((?!api/).*)` to `/index.html` so deep links work and `/api/*` still reaches the functions |
| `.env.example` | names for Twilio + bot vars (values blank) |
| `tests/setup.ts` | jest-dom matchers, cleanup |
| `tests/web/app.test.tsx` | routing smoke test |

## States & edge cases
- Deep link to `/plan/incoming` on first load must work (Vercel rewrite + router).
- `/plan/nonsense` falls back to `/plan/outgoing`.

## Acceptance criteria
- [x] `npm test` green, `npm run build` green, `npm run lint` green
- [x] `npm run dev` renders a placeholder per route at the right URL
- [x] Tokens from `brand.md` exist as CSS variables (spot-check 3 in devtools)
- [x] `git status` shows no mock HTML, PDF, `.env`, `node_modules`

## Tests
| Test file | Covers |
|-----------|--------|
| `tests/web/app.test.tsx` | `/` redirects to `/dashboard`; each route renders its placeholder heading; unknown path → dashboard; bad plan tab → outgoing |

## Review
2026-11-09 · self-review against the PDF ground rules, `flow.md` §1 and `brand.md`.
- `tsc -b` + `--noEmit` is fragile in build mode → plain `tsc -p .` with `noEmit` in tsconfig.
- A blanket SPA rewrite would swallow `/api/*` (Twilio webhooks) → negative-lookahead rewrite.
- No other gaps: React (preferred stack), local data, own code, git hygiene all covered.

## Verification
2026-11-09
- `npm test`: 12/12 pass (8 routes, `/` redirect, unknown path, bad plan tab, bare `/plan`).
- `npm run lint` and `npm run build` are clean (TS 7, Vite 8; 258 kB JS before any screens).
- Chrome: a deep link to `/plan/incoming` renders, `/plan/bogus` lands on `/plan/outgoing`,
  `--brand`/`--fs-md`/`--shell` resolve, body uses Inter on `--canvas`.
- Toolchain note: React Router is v8 (no `react-router-dom`; import from `react-router`).
