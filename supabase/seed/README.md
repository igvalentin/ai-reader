# supabase/seed

Target folder for generated **reference / admin configuration** data dumps used when
recreating the database in an external Supabase project.

Generate with the `pg_dump` command in `docs/migration/DATABASE_MIGRATION.md` §C:

```
supabase/seed/reference_data.sql   # admission programs, high schools, vocational, tax, pension, site settings
```

Rules:

- Only reference and admin-configuration data belongs here.
- **Never** commit user data (`profiles`, `user_roles`, `saved_calculations`, `history`, `favorites`,
  `premium_subscriptions`, `donations`, `email_log`) or anything from the `auth` schema.
- **Never** commit keys, passwords, tokens or OAuth secrets.
