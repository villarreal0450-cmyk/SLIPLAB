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

## Phase 3 — Parlay analysis UI ✅
- `/analyze` runs the engine through a validated server function (`analyzeParlayAction`, zod schema) and re-runs when the slip changes, keeping the last result on screen while it reloads
- Parlay score ring, structure label and summary; cohesion, risk and combined odds tiles
- Weakest-leg card with "Why?" (expands and scrolls to the leg) and "Remove this leg"
- Expandable pick cards: verdict, projection vs line, top-3 bull and bear cases, all factors on demand, missing-data notice, game-script effect
- Game script tab with narrative beats, helped/hurt legs and a "What breaks it" scenario
- Cohesion tab with meter and per-pair findings
- Two-column desktop layout; loading, empty and error states
- Engine copy fixes: suffix-aware names, no contradictory bear-case items, every pick gets a counterpoint

## Phase 4 — Pick breakdown ✅
- `/analyze/[pickId]`: player header, Analysis / Stats / Matchup / News tabs
- Verdict ring, ranked key factors with icons, bull/bear, "how it fits your slip" (game script effect + correlations), final verdict
- Projection distribution chart (bars clearing the user's line in the accent, no percentages) and recent-games column chart against the line; both hover/focus tooltips
- Stats tab: season vs line vs market tiles, game-log table (accessible companion to the charts)
- Matchup tab: opponent defense profile with ranks, game environment, injuries; News tab shows injury reports and says plainly that no news feed is connected
- Analysis moved from Server Actions to Route Handlers (`/api/analysis/parlay`, `/api/analysis/pick`) with a shared server-only service; reads are now parallel and abortable
- Nav and dock read the pathname behind Suspense so dynamic routes prerender

## Phase 5 — Improve my parlay ✅
- Suggestion engine (`src/lib/analysis/suggestions`): a scoring workspace re-scores any variant of a pick without refetching; candidates are every main-line market in the slip's games; line ladders come only from prices the market lists
- Safer / Balanced / More aggressive slips, each with per-change reasons (keep, change line, swap, remove, add), projected score/cohesion/risk/odds, and a rationale composed from the actual changes; one is marked recommended
- Guardrails: no juice beyond -250 on "safer" lines; aggressive step-ups only when the new price beats the user's and the projection clears by 4%; no stacking a second leg on a player already in the slip; weak legs kept for upside are flagged; aggressive carries a variance caution
- `/analyze/improve` screen with sliding profile switcher, suggestion card and current-slip card; "Use this parlay" replaces the slip
- Weakest-leg card: Replace (same-game options) and Make safer (easier lines, or steadier markets for TD legs), each scored inside the whole slip; "Use this" swaps the leg in place
- Weakest leg is only flagged when it grades below Good
- API: `/api/analysis/improve`, `/api/analysis/alternatives`

## Phase 6 — Save bets, My Bets, auth 🔧 (works on device; account sync awaits credentials)
- Saved-bet model (`src/lib/bets/model.ts`): payout math, status derived from legs (any miss loses, voids drop out), settlement time, analysis snapshot with the weakest leg mapped to its saved leg
- `BetRepository` with two implementations: device (localStorage, active now) and account (Supabase, written against the migrations but **not yet run against a live project**)
- Save bet sheet on the analysis screen (placed vs draft, stake, odds, sportsbook, notes, return preview); slip clears on the bet page after saving
- `/bets` with Open / Settled / All filters and record; `/bets/[betId]` with manual leg results, final stat entry, details editor, analyst snapshot, Analyze again and Delete
- Auth: email magic link + Google (`/login`, `/auth/callback` with same-site `next`), optional by design; Profile shows account state, moves device bets into the account after sign-in, and responsible-gambling resources
- Migration `20261008000000_bet_leg_selection.sql` (additive) stores each leg's full selection for re-analysis
- Device-data views render the server skeleton until hydrated (no hydration mismatches)
- **To finish:** add Supabase keys to `.env.local`, apply both migrations, enable Google in Supabase Auth, then test sign-in and sync end to end

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
