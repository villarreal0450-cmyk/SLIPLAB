-- SlipLab initial schema.
-- Applies cleanly to an empty Supabase project. Every user-owned table has RLS
-- enabled and policies keyed on auth.uid(); user_id defaults to auth.uid() so
-- clients never need to (and cannot) supply someone else's id.

create extension if not exists "pgcrypto";

-- ---------- Enums ----------
create type public.bet_status as enum ('draft', 'pending', 'won', 'lost', 'void');
create type public.leg_status as enum ('pending', 'won', 'lost', 'void');
create type public.risk_level as enum ('low', 'medium', 'high');
create type public.pick_direction as enum ('over', 'under', 'yes', 'no');
create type public.process_review as enum ('good_process_bad_result', 'bad_process', 'good_read', 'high_variance_result');
create type public.chat_role as enum ('user', 'assistant', 'system');

-- ---------- updated_at trigger ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------- Profiles ----------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "profiles: read own" on public.profiles for select using (auth.uid() = id);
create policy "profiles: update own" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();

-- Auto-create a profile when a user signs up.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- ---------- Bankroll ----------
create table public.bankroll_settings (
  user_id uuid primary key references public.profiles (id) on delete cascade default auth.uid(),
  bankroll numeric(12, 2),
  unit_size numeric(12, 2),
  currency text not null default 'USD',
  max_exposure_pct numeric(5, 2) not null default 5.00,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.bankroll_settings enable row level security;
create policy "bankroll: all own" on public.bankroll_settings for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger bankroll_updated_at before update on public.bankroll_settings for each row execute function public.set_updated_at();

-- ---------- Bets ----------
create table public.bets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  sport text not null,
  event_id text,
  sportsbook text,
  stake numeric(12, 2),
  odds integer,
  potential_payout numeric(12, 2),
  status public.bet_status not null default 'draft',
  analysis_score numeric(3, 1),
  cohesion_score smallint,
  risk_level public.risk_level,
  notes text,
  settled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index bets_user_created_idx on public.bets (user_id, created_at desc);
create index bets_user_status_idx on public.bets (user_id, status);
alter table public.bets enable row level security;
create policy "bets: all own" on public.bets for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger bets_updated_at before update on public.bets for each row execute function public.set_updated_at();

-- ---------- Bet legs ----------
create table public.bet_legs (
  id uuid primary key default gen_random_uuid(),
  bet_id uuid not null references public.bets (id) on delete cascade,
  player_id text,
  player_name text not null,
  team text not null,
  opponent text not null,
  market text not null,
  direction public.pick_direction not null,
  line numeric(8, 2),
  odds integer,
  status public.leg_status not null default 'pending',
  result_value numeric(8, 2),
  analysis_score numeric(3, 1),
  process_review public.process_review,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now()
);
create index bet_legs_bet_idx on public.bet_legs (bet_id, sort_order);
alter table public.bet_legs enable row level security;
-- Ownership flows through the parent bet.
create policy "bet_legs: all own" on public.bet_legs for all
  using (exists (select 1 from public.bets b where b.id = bet_id and b.user_id = auth.uid()))
  with check (exists (select 1 from public.bets b where b.id = bet_id and b.user_id = auth.uid()));

-- ---------- Pick analysis ----------
create table public.pick_analysis (
  id uuid primary key default gen_random_uuid(),
  bet_leg_id uuid not null references public.bet_legs (id) on delete cascade,
  score numeric(3, 1) not null,
  tier text not null,
  verdict text not null,
  summary text not null,
  bull_case jsonb not null default '[]'::jsonb,
  bear_case jsonb not null default '[]'::jsonb,
  key_factors jsonb not null default '[]'::jsonb,
  risk_factors jsonb not null default '[]'::jsonb,
  projection jsonb,
  created_at timestamptz not null default now()
);
create index pick_analysis_leg_idx on public.pick_analysis (bet_leg_id, created_at desc);
alter table public.pick_analysis enable row level security;
create policy "pick_analysis: all own" on public.pick_analysis for all
  using (exists (select 1 from public.bet_legs l join public.bets b on b.id = l.bet_id where l.id = bet_leg_id and b.user_id = auth.uid()))
  with check (exists (select 1 from public.bet_legs l join public.bets b on b.id = l.bet_id where l.id = bet_leg_id and b.user_id = auth.uid()));

-- ---------- Parlay analysis ----------
create table public.parlay_analysis (
  id uuid primary key default gen_random_uuid(),
  bet_id uuid not null references public.bets (id) on delete cascade,
  score numeric(3, 1) not null,
  tier text not null,
  cohesion_score smallint not null,
  risk_level public.risk_level not null,
  weakest_leg_id uuid references public.bet_legs (id) on delete set null,
  summary text not null,
  game_script jsonb,
  correlations jsonb not null default '[]'::jsonb,
  recommended_changes jsonb not null default '[]'::jsonb,
  data_source jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index parlay_analysis_bet_idx on public.parlay_analysis (bet_id, created_at desc);
alter table public.parlay_analysis enable row level security;
create policy "parlay_analysis: all own" on public.parlay_analysis for all
  using (exists (select 1 from public.bets b where b.id = bet_id and b.user_id = auth.uid()))
  with check (exists (select 1 from public.bets b where b.id = bet_id and b.user_id = auth.uid()));

-- ---------- Analyst chat ----------
create table public.chat_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  bet_id uuid references public.bets (id) on delete set null,
  title text,
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index chat_threads_user_idx on public.chat_threads (user_id, updated_at desc);
alter table public.chat_threads enable row level security;
create policy "chat_threads: all own" on public.chat_threads for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger chat_threads_updated_at before update on public.chat_threads for each row execute function public.set_updated_at();

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.chat_threads (id) on delete cascade,
  role public.chat_role not null,
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index chat_messages_thread_idx on public.chat_messages (thread_id, created_at);
alter table public.chat_messages enable row level security;
create policy "chat_messages: all own" on public.chat_messages for all
  using (exists (select 1 from public.chat_threads t where t.id = thread_id and t.user_id = auth.uid()))
  with check (exists (select 1 from public.chat_threads t where t.id = thread_id and t.user_id = auth.uid()));

-- ---------- Insights (materialized per user by a server job) ----------
create table public.user_insights (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  computed_at timestamptz not null default now(),
  totals jsonb not null default '{}'::jsonb,
  by_sport jsonb not null default '{}'::jsonb,
  by_market jsonb not null default '{}'::jsonb,
  by_leg_count jsonb not null default '{}'::jsonb,
  by_risk jsonb not null default '{}'::jsonb,
  highlights jsonb not null default '[]'::jsonb
);
alter table public.user_insights enable row level security;
create policy "user_insights: read own" on public.user_insights for select using (auth.uid() = user_id);
-- Writes happen with the service role from server jobs only.

-- ---------- Saved games ----------
create table public.saved_games (
  user_id uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  game_id text not null,
  sport text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, game_id)
);
alter table public.saved_games enable row level security;
create policy "saved_games: all own" on public.saved_games for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
