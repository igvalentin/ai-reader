-- Seed script for the shared data layer.
--
-- Runs against a fresh database via `supabase db reset`. It is
-- idempotent: safe to re-run. All user-owned tables enforce RLS
-- and require an `auth.users` row, so we do not seed personal data
-- here — accounts are created via Supabase Auth at runtime and the
-- `handle_new_user` trigger populates `public.profiles`.
--
-- Extend this file with catalog/reference data (never user data).

BEGIN;

-- Example: reference table seed would look like:
--   INSERT INTO public.<reference_table> (key, label)
--   VALUES ('example', 'Example')
--   ON CONFLICT (key) DO UPDATE SET label = EXCLUDED.label;

COMMIT;
