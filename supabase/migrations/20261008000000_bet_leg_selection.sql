-- Store the full selection a leg was built from (game, team ids, display
-- meta) so saved bets can be re-analyzed. Additive and nullable: safe to run
-- on a database that already has the initial schema.
alter table public.bet_legs add column if not exists selection jsonb;
