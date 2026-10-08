# Implementation plan

Status legend: ✅ done · 🔧 in progress · ⬜ not started

## Phase 1 — Foundation ✅
- Repository audit (empty folder → fresh Next.js 16 scaffold)
- Design tokens, fonts, dark-first theme, card primitives
- Branding config, navigation (bottom bar + sidebar), app shell
- Domain types, `SportsDataProvider` + mock NFL slate (DAL/TB, ATL/NO, KC/DEN)
- Scoring engine (8 factors), projection, correlation rules, game script, parlay aggregator, tests
- Supabase clients, proxy session refresh, initial migration with RLS
- Home screen with hero, CTAs and upcoming games

## Phase 2 — Games & pick builder ✅
- `/games` list and `/games/[gameId]` builder: matchup header, injury report, players with their markets
- Pick composer: over/under or yes/no, line stepper, alternate-line chips, comparison to the market line, optional odds (auto-filled only when the market lists that line)
- Draft parlay store (`src/lib/parlay`): pure reducer + localStorage persistence for guests, cross-tab sync, 12-leg cap
- Parlay dock: compact bar above the tab bar on mobile, floating card on desktop; full slip sheet with remove, clear and "Analyze parlay"
- `/build` entry flow; kickoff times render in the viewer's timezone
- `/analyze` is a placeholder until Phase 3

## Phase 3 — Parlay analysis UI ⬜
- `/analyze` hero screen: ParlayScore ring, cohesion, risk, legs, combined odds
- PickCard (expandable), WeakestLegCard, GameScriptCard, CohesionMeter
- Server action `analyzeParlay` + loading/empty/error states

## Phase 4 — Pick breakdown ⬜
- `/analyze/[pickId]`: PlayerHeader, tabs, key factors, projection chart, recent games, bull/bear, verdict

## Phase 5 — Improve my parlay ⬜
- Suggestion engine: safer / balanced / aggressive with per-change reasoning
- Replace-leg recommendations from the same game

## Phase 6 — Auth & My Bets ⬜
- Supabase Auth (email, Google), guest → account upgrade
- Save analyzed parlays; statuses; manual result entry

## Phase 7 — Analyst chat ⬜
- Structured context (PickContext + ParlayAnalysis) → Claude; suggested prompts; thread persistence

## Phase 8 — Betslip scanning ⬜
- `BetSlipParser` interface, vision adapter (Claude), mocked adapter, editable review UI

## Phase 9 — Insights, bankroll, autopsy ⬜
- Insights dashboard, bankroll exposure warnings, process review categories

## Phase 10 — Real sports data ⬜
- First real `SportsDataProvider`, caching, live scores, automated settlement

## Open decisions (need input)
1. Supabase project URL + publishable key + service role key (blocks Phase 6+).
2. Anthropic API key for the analyst chat and betslip vision (Phase 7–8).
3. Preferred sports data vendor for Phase 10 (affects which markets we can support).
4. Product name — `SlipLab` is a placeholder in `src/config/brand.ts`.
