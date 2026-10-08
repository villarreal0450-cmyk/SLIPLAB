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

## Phase 6 — Save bets, My Bets, auth ✅
- Saved-bet model (`src/lib/bets/model.ts`): payout math, status derived from legs (any miss loses, voids drop out), settlement time, analysis snapshot with the weakest leg mapped to its saved leg
- `BetRepository` with two implementations: device (localStorage, for guests) and account (Supabase); account sync verified end to end on the live project (2026-10-08)
- Save bet sheet on the analysis screen (placed vs draft, stake, odds, sportsbook, notes, return preview); slip clears on the bet page after saving
- `/bets` with Open / Settled / All filters and record; `/bets/[betId]` with manual leg results, final stat entry, details editor, analyst snapshot, Analyze again and Delete
- Auth: email magic link + Google (`/login`, `/auth/callback` with same-site `next`), optional by design; Profile shows account state, moves device bets into the account after sign-in, and responsible-gambling resources
- Migration `20261008000000_bet_leg_selection.sql` (additive) stores each leg's full selection for re-analysis
- Device-data views render the server skeleton until hydrated (no hydration mismatches)
- Supabase connected, both migrations applied, RLS verified (anonymous reads empty, anonymous writes rejected); email magic-link sign-in live. Google sign-in appears automatically once enabled in Supabase

## Phase 7 — Analyst chat ✅
- `/analyst`: chat about the current slip with suggested prompts, streaming replies, stop, retry; conversation kept per slip in sessionStorage
- Briefing (`src/lib/analyst/briefing.ts`): one engine run collects analysis, rebuilds, replacement options and best-three, so answers match the screens
- Rule-based analyst (`rules.ts`): answers every suggested prompt plus per-player questions in the analyst's voice, using only engine numbers; says plainly what it can't answer; flags demo data
- Claude analyst (`claude.ts`): `claude-opus-5-5`, streaming, effort `medium`, server-side refusal fallback (`fallbacks: "default"`), cached persona prompt + structured slip JSON; never invents stats, never "locks"
- `/api/analyst` picks Claude when `ANTHROPIC_API_KEY` is set, otherwise the rule-based analyst; per-IP rate limit on the AI path
- Claude analyst verified live (answers in the user's language, grounded in slip data)
- **Later:** persist chat threads to Supabase

## Phase 8 — Betslip scanning ✅
- Layers kept separate, as specified: UI (`src/components/scan`) → parser interface `BetSlipParser` (`src/lib/scan/types.ts`) → normalization (`src/lib/scan/normalize.ts`)
- Vision parser: `claude-opus-5-5` with structured outputs (`betaZodOutputFormat`) and the server-side refusal fallback; copies only what's printed, nulls the rest
- Sample parser: the brief's DAL @ TB slip, labelled as a sample everywhere; uploads without a key are refused with a clear message (never fake OCR)
- Normalization: player matching (exact, then unique last name, flagged), market synonyms with a guard against look-alike markets (longest reception, first TD, 1st half…), direction/line/odds handling where every inference is listed as an issue and the leg drops to "Check this"
- `/scan`: drag-and-drop upload, scanning animation, editable review cards (player, prop, side, line, odds, include), "Add N picks and analyze"
- `/api/scan`: validates type/size, rate-limits vision calls
- Verified on a real Draftea (Spanish) screenshot: all 5 legs matched live rosters, using the printed team to resolve ambiguous initials

## Phase 9 — Insights, bankroll, post-game autopsy ✅
- Post-game review (`src/lib/bets/review.ts`): each settled leg judged on its pre-game grade separately from the result — Good read, Good process / bad result, Bad process, High-variance result (volatile markets, near misses within 10%) — with a bet-level headline that names the flagged weakest leg when it's the one that missed; recorded on the leg when it settles
- Insights (`src/lib/insights/compute.ts`): record, bet and leg hit rates, average legs, staked/returned; hit rates by prop type, leg count, analyst grade, risk; process-vs-results counts; highlights (TD legs in losing parlays, best vs worst market, best vs worst leg count, how the analyst's grades held up, weakest-leg flags, variance vs mistakes) only when samples allow; every rate shows its count and small samples are marked
- `/insights` with a clearly labelled sample-data preview when there are no settled bets (never written into the user's bets)
- Bankroll (device): bankroll, unit size, warn-above %; Save bet shows units and share of bankroll, warns above the limit with a suggested exposure by risk (low 1u, medium 0.5u, high 0.25u), and flags stakes creeping up after recent losses; never blocks, never suggests staking more
- **Later:** sync bankroll to `bankroll_settings` and materialize insights in `user_insights` once Supabase is live

## Phase 10 — Real sports data 🔧 (NFL live; props need a key)
- `EspnSportsDataProvider` (`src/lib/sports/espn`): live NFL schedule, all 32 teams with logos, full rosters with headshots, injuries, per-player game logs and season averages, team offense/defense with league ranks computed across all 32 teams, spread/total; no key, cached per endpoint (`src/lib/sports/http.ts`) with stale-on-error
- `TheOddsApi` (`src/lib/sports/odds`): player props (pass/rush/receiving yards, receptions, completions, attempts, pass TDs, anytime TD) and optional alternates, matched to ESPN rosters; one request per game, cached 3h; enabled by `ODDS_API_KEY`
- Every QB/RB/WR/TE is bettable even without a quote: unpriced markets ask for the line from your slip and the analysis skips the market comparison (disclosed)
- Game page: player search, ruled-out players last and dimmed, injury report collapsed by severity
- Fixes found with real data: game-script home-team precedence bug (favorite was reversed when the picks were on the home side), single-leg slips now grade exactly like their leg
- ESPN endpoints are public but undocumented: fine for building and a beta; move to a licensed feed (e.g. SportsDataIO, Sportradar) before a large public launch
- The Odds API is live (key in `.env.local`): ~8 credits per game load, cached 3h per server instance; builds never spend credits (props skipped during prerender). Free tier ≈ 60 game loads/month — move to a paid tier or a shared cache before real traffic
- **Next:** NBA/MLB/NHL/NCAAF via the same ESPN pattern; automatic bet settlement from final box scores

## Open decisions (need input)
1. Supabase project URL + publishable key + service role key (blocks Phase 6+).
2. Anthropic API key — the chat works without it (rule-based); with it, Claude answers free-form questions and betslip scanning becomes possible (Phase 8).
3. Sports data: ESPN (live, no key) + The Odds API for props — add `ODDS_API_KEY` to enable lines.
4. Product name — `SlipLab` is a placeholder in `src/config/brand.ts`.
