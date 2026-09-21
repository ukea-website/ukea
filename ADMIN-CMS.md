# UKEA Admin CMS

Admin URL: `https://ukea.com.vn/quan-tri`

The admin is served by Vercel Functions and uses Supabase Auth, Postgres, Row Level Security, and Storage. It is intentionally absent from the public header, footer, navigation, and sitemap.

## Required environment variables

The existing Vercel ↔ Supabase integration provides these values. Never expose the service role key through a `NEXT_PUBLIC_*` variable.

- `UKEA_SUPABASE_URL`
- `UKEA_SUPABASE_PUBLISHABLE_KEY` or `UKEA_SUPABASE_ANON_KEY`
- `UKEA_SUPABASE_SERVICE_ROLE_KEY` (server only)
- `UKEA_POSTGRES_URL_NON_POOLING` or `UKEA_POSTGRES_URL` (migration scripts only)

## Apply database changes

```bash
npm run db:setup
```

The command applies `supabase/schema.sql` and the idempotent SQL files in `supabase/migrations/`.

## Create the first admin safely

1. In Supabase Dashboard, open **Authentication → Users**.
2. Create the user with their real email and a strong temporary password. Do not enable public sign-up on the website.
3. Copy the new user's UUID.
4. In Supabase SQL Editor, run the following statement after replacing the UUID and display name:

```sql
insert into public.profiles (id, role, full_name)
values ('AUTH_USER_UUID', 'admin', 'Tên quản trị viên')
on conflict (id) do update
set role = excluded.role,
    full_name = excluded.full_name;
```

5. Sign in at `/quan-tri/dang-nhap`.

To create an editor, use the same process with role `editor`. Do not store passwords in SQL, source control, or environment variables.

## Verification

```bash
npm run build
npm run seo:audit
npm run db:verify
npm run cms:verify
```

`cms:verify` creates isolated temporary test records and a temporary editor account, tests actual RLS behavior, then deletes all test data in the same run.

## Content behavior

- Public news only returns posts with `status = 'published'` and `published_at <= now()`.
- Scheduled posts are promoted by the server-side `publish_due_posts()` function when public news or sitemap endpoints run.
- Draft, scheduled-not-due, archived, preview, and admin URLs never appear in the sitemap.
- Article HTML is sanitized on the server and H1 elements in the body are converted to H2.
- Featured images are stored in the public `news-media` Supabase Storage bucket; upload and deletion require an authorized staff session.
