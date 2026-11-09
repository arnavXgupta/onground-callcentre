# On-Ground Call Centre App

Rebuild of On-Ground.ai's call-centre agent app for an engineering hiring
assignment. The brief is `OnGround_Engineering_Assignment.pdf`, the reference
UI is `OnGround_CallCentre_App_Mock.html` (both local only, never committed).

**The one hard requirement: real telephone calling, with a demo.** Human-to-human
(browser softphone → real phone) and AI-to-human (AI agent phones a real number).
Everything else is scored on top of that.

## Read first

| File | What it holds |
|------|---------------|
| `docs/00-roadmap.md` | Feature list, build order, status. Start here. |
| `decisions.md` | Every non-obvious choice and why. Append, never rewrite history. |
| `flow.md` | Screen map, call lifecycle, system/data flow. |
| `brand.md` | Tokens, type scale, component rules. The look lives here. |
| `docs/NN-*.md` | One plan per feature. |

## Layout

```
src/          React app (Vite + TS). src/data/*.json = sample data.
api/          Vercel serverless functions (Twilio token, TwiML, AI-call trigger)
bot/          Pipecat voice bot (Python) for AI-to-human calls, deployed separately
tests/        ALL tests: tests/web, tests/api (Vitest), tests/bot (pytest)
docs/         Feature plans
```

## Commands

```
npm run dev        # Vite dev server
npm test           # Vitest, all JS/TS tests under tests/
npm run build      # typecheck + production build
npm run lint       # tsc --noEmit
```

## Workflow: every feature goes through all six steps

1. **Plan**: write `docs/NN-feature.md` from `docs/_template.md`. Scope, data,
   components, states, acceptance criteria, test list.
2. **Review**: check the plan against the PDF, the mock and `flow.md`. For
   calling/backend features, also get an independent reviewer subagent read.
   Fix the plan before writing code. Record the review outcome in the plan.
3. **Implement**: smallest code that meets the acceptance criteria.
4. **Test**: write the tests listed in the plan under `tests/`.
5. **Verify**: `npm test` + `npm run build` green, then look at it in Chrome at
   1440px and 390px. Compare with the mock screen side by side.
6. **Iterate**: fix what verification found, update the plan's status,
   `decisions.md` and `flow.md` if anything changed, then commit.

## Git

- **Commit after each feature passes step 5** (the user authorised this for this
  repo as an exception to their global rule, because the assignment reviewers
  read the history). One focused commit per feature, conventional message.
- **Never push, tag, branch, force or reset --hard** without asking in that message.
- Never commit `.env*` (except `.env.example`), the mock HTML or the PDF.

## Rules

- **Own code only.** Never copy markup, CSS or JS from the mock. Read it for
  behaviour and sample data, then write it fresh. The reviewers diff for this.
- Sample data lives in `src/data/*.json`, typed in `src/data/types.ts`.
- Type sizes and colours come from `brand.md` tokens. No ad-hoc px font sizes.
- Must work in the latest Chrome on a laptop. Phone width (390px) is a bonus we
  are doing, so don't break it.
- Secrets only in `.env.local` / Vercel env. `.env.example` lists the names.
- Every AI tool used goes in the README's "AI tools" section.
