# Supabase

Migrations live in `migrations/` and are plain SQL so they can be applied with
either the Supabase CLI or the SQL editor in the dashboard.

## Apply with the CLI

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

## Apply from the dashboard

Open **SQL Editor**, paste the contents of each migration in order, run.

## Regenerate types

```bash
npx supabase gen types typescript --linked > src/lib/supabase/database.types.ts
```

Until the CLI is linked, `src/lib/supabase/database.types.ts` is maintained by hand
and must be kept in sync with the migrations.

## Security model

- Every table has RLS enabled.
- `user_id` columns default to `auth.uid()`; clients never pass a user id.
- Child tables (`bet_legs`, `pick_analysis`, `parlay_analysis`, `chat_messages`)
  derive ownership from their parent row.
- `user_insights` is read-only for users; a server job with the service role
  writes it.
