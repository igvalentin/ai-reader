# Starter Kit migrations — staged, not auto-applied

These migrations target the external Supabase project configured through the
`EXTERNAL_SUPABASE_*` environment pair. Do not run the legacy migration history
under `supabase/migrations/` against a fresh Starter Kit project.

1. Verify the target project (URL + publishable key pair) before applying anything.
2. Apply `202610180000_platform.sql` — profiles, separate `user_roles`,
   expiring-role-aware `has_role()` and the profile-creation trigger.
   No admin is granted automatically; assign the first administrator explicitly:
   `insert into public.user_roles (user_id, role) values ('<user-uuid>', 'admin');`
3. Apply `202610240001_catalog.sql` — the demo catalog (`items` table) with
   public read of published rows, admin-only writes and four fictional seed
   entries. Delete or replace the seed for real projects.
4. Regenerate the database types if you extend the schema.

Every new public table must keep the same structure: explicit `GRANT`s,
`ENABLE ROW LEVEL SECURITY`, and policies scoped to `auth.uid()` /
`public.has_role(...)`.
