# Architecture

## Principles

1. **Analysis, not a sportsbook.** No odds ticker, no bet placement, no urgency UX.
2. **Skeptical by default.** Every leg gets a bull case and a bear case. The engine is allowed to disagree with the user.
3. **Honest data.** Mock data is labelled as such everywhere. The LLM layer explains numbers the engine produced; it never invents them.
4. **Swappable edges.** Sports data, OCR, and the LLM sit behind interfaces so vendors can change without touching UI.

## Layers

```
UI (app/, components/)
   │ renders
   ▼
ParlayAnalysis / PickAnalysis  (lib/types/analysis.ts)
   ▲ produced by
lib/analysis
   ├─ context/      buildPickContext → PickContext   (DATA COLLECTION)
   ├─ scoring/      factors → scorePick → 0–10       (SCORING)
   ├─ correlation/  rules → cohesion 0–100
   ├─ gameScript/   narrative + helped/hurt legs
   └─ parlay/       analyzeParlay aggregates it all
   ▲ reads through
lib/sports  SportsDataProvider  (mock today; real APIs later)
```

A later phase adds **AI explanation** on top: the LLM receives the structured
`ParlayAnalysis` and rewrites explanations in the analyst's voice. It cannot
change scores and must disclose `missingData`.

## Sports data

`SportsDataProvider` (`src/lib/sports/provider.ts`) is the only read path.
`getSportsDataProvider()` picks the implementation from `SPORTS_DATA_PROVIDER`:

- `espn` — `EspnSportsDataProvider`: live NFL schedule, teams, rosters, injuries,
  game logs and team stats from ESPN's public site API (no key). Player props come
  from `TheOddsApi` when `ODDS_API_KEY` is set. Mapping lives in `espn/map.ts`
  (pure, unit-tested); all HTTP goes through `http.ts` (TTL cache, de-dup, timeout,
  stale-on-error).
- `mock` — labelled demo slate for tests and offline work.

Every provider exposes `info.isMock`; `<MockDataBadge>` renders when it's true.
Markets without a sportsbook quote are "unpriced" (`MarketLine.priced === false`):
the user supplies the line, and the line-value factor is skipped and disclosed.

To add a provider: implement the interface in `src/lib/sports/<vendor>/`, map vendor
payloads to `src/lib/types/sports.ts`, add a case in `index.ts`.

## Scoring engine

- A **factor** (`ScoringFactor`) returns a `FactorResult` with a 0–1 score,
  a weight, an impact and a plain-English explanation — or `null` if it lacks data.
- `scorePick` renormalizes weights over the factors that ran, maps the weighted
  mean to 0–10 via `calibrate`, derives tier/verdict/bull/bear, and records
  which factors were skipped in `missingData`.
- Factors live in `scoring/factors/` and are registered in `factors/index.ts`.
  Each is independently testable.
- `projection.ts` produces a simple blended projection + distribution for charts.
  It is explicitly a placeholder for a real model; UI only depends on its shape.

Score tiers: 8.5+ Strong · 7.5–8.4 Good · 6.0–7.4 Risky · <6 Avoid.
The score is *analyst confidence in pick quality*, never a win probability.

## Correlation and cohesion

`CorrelationRule`s inspect pairs of `PickContext`s. `computeCohesion` sums
signed strengths, penalizes multi-game dilution, and returns 0–100 with findings.
Add rules in `correlation/rules.ts`.

## Game script

`buildGameScript` is rule-based (spread, total, pass rate). It outputs narrative
beats and which pick IDs are helped/hurt. An LLM may reword beats but should
not change the helped/hurt sets.

## Supabase

- Schema: `supabase/migrations/`. Hand-maintained types: `src/lib/supabase/database.types.ts`.
- `server.ts` reads cookies → must be used behind `<Suspense>` (Cache Components).
- `admin.ts` is `server-only` and uses the service role for jobs.
- `src/proxy.ts` refreshes sessions on every request.
- RLS everywhere; `user_id` defaults to `auth.uid()` and is never accepted from the client.

## Design system

Tokens in `src/app/globals.css`: near-black background, layered surfaces,
mint `--brand`, semantic `--positive/--caution/--negative`. Utilities `.surface`,
`.surface-elevated`, `.surface-brand` are the card primitives. Animations are
short and respect `prefers-reduced-motion`.

## Conventions

- Server components by default; `"use client"` only for interactivity.
- No `any`. Domain types come from `src/lib/types`.
- Product copy and naming go through `src/config/brand.ts`.
- Never render mock data as live. Never phrase output as a guarantee.
