# SlipLab — AI sports betting analyst

> Before you place your bet, have an analyst review it.

SlipLab is **not a sportsbook**. Users never place bets here. It evaluates the
picks and parlays a user is already considering: per-leg scores, bull/bear
cases, correlation, expected game script, the weakest leg, and ways to improve
the slip. The product name is temporary and lives in `src/config/brand.ts`.

## Stack

- Next.js 16 (App Router, Cache Components, Turbopack) · React 19 · TypeScript
- Tailwind CSS v4 · shadcn/ui (Radix) · lucide icons · Geist
- Supabase (Postgres, Auth, RLS) via `@supabase/ssr`
- Vitest for the analysis engine
- Zod for env/input validation

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in Supabase keys when you have them
npm run dev
```

Without Supabase keys the app runs in demo mode: everything that doesn't need
an account works, and all sports data comes from the mock provider (labelled
"Demo data" in the UI).

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run typecheck` | Generates route types, then `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm test` | Vitest (analysis engine) |

## Project layout

```
src/
  app/                 Routes. (app)/ shares the responsive shell.
  components/          UI. ui/ is shadcn; the rest is product components.
  config/              brand.ts (naming/copy), nav.ts
  lib/
    types/             Domain types (sports, picks, analysis, bets)
    sports/            SportsDataProvider interface + mock implementation
    analysis/          Scoring engine, correlation, game script, parlay aggregator
    supabase/          Browser/server/admin clients, proxy session refresh
    odds.ts            American odds math
supabase/
  migrations/          SQL schema with RLS
docs/
  ARCHITECTURE.md      How the pieces fit and how to extend them
  PLAN.md              Phased implementation plan and status
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) before adding a data provider,
a scoring factor or a correlation rule.
