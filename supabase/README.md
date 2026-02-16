# Supabase DB setup (F01)

This project already includes the first migration and seed:

- `supabase/migrations/202602130001_initial_schema.sql`
- `supabase/migrations/202602130002_admin_profiles_and_audit_actor.sql`
- `supabase/seed.sql`

These files were intentionally created without applying them to any database yet.

## When DB access is available

Apply migration and seed with Supabase CLI (example flow):

```bash
supabase db reset
```

Or run migration and seed separately with your preferred pipeline.

## Expected validation after apply

- Insert valid user: should succeed.
- Insert duplicated `users.whatsapp`: should fail by unique constraint.
- Insert invalid `subscriptions.status`: should fail by check constraint.

## Admin onboarding (`admin_profiles`)

The app only grants panel access to authenticated users that also exist in
`public.admin_profiles` with `is_active = true`.

Suggested flow:

1. Create admin auth user (Supabase Auth).
2. Insert matching profile row:

```sql
insert into public.admin_profiles (id, email, full_name, role, is_active)
values (
  '<auth_user_uuid>',
  'admin@empresa.com',
  'Admin Principal',
  'owner',
  true
);
```

Without this row, login can succeed at Auth level but app access is denied as unauthorized.

## RLS model

RLS is enabled for all public domain tables:

- `admin_profiles`
- `users`
- `subscriptions`
- `audit_logs`
- `app_settings`

Policy design:

- Access requires authenticated session plus `public.is_active_admin() = true`.
- `admin_profiles` allows authenticated users to read their own row and active admins to read admin rows.
- `audit_logs` allows select/insert for active admins; no update/delete policy.

Implementation lives in:

- `supabase/migrations/202602130002_admin_profiles_and_audit_actor.sql`
