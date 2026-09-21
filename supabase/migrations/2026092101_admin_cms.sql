create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'editor' check (role in ('admin', 'editor')),
  full_name text check (full_name is null or char_length(full_name) <= 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.post_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text check (description is null or char_length(description) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 240),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  excerpt text check (excerpt is null or char_length(excerpt) <= 1000),
  content_html text not null default '',
  category_id uuid references public.post_categories(id) on delete set null,
  featured_image text,
  featured_image_alt text check (featured_image_alt is null or char_length(featured_image_alt) <= 240),
  status text not null default 'draft' check (status in ('draft', 'published', 'scheduled', 'archived')),
  author_id uuid references public.profiles(id) on delete set null,
  published_at timestamptz,
  scheduled_at timestamptz,
  seo_title text check (seo_title is null or char_length(seo_title) <= 240),
  seo_description text check (seo_description is null or char_length(seo_description) <= 500),
  seo_keywords text check (seo_keywords is null or char_length(seo_keywords) <= 500),
  canonical_url text check (canonical_url is null or char_length(canonical_url) <= 500),
  og_title text check (og_title is null or char_length(og_title) <= 240),
  og_description text check (og_description is null or char_length(og_description) <= 500),
  og_image text check (og_image is null or char_length(og_image) <= 1000),
  robots_index boolean not null default true,
  robots_follow boolean not null default true,
  featured boolean not null default false,
  reading_time integer check (reading_time is null or reading_time between 1 and 600),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint posts_publish_dates check (
    (status <> 'published' or published_at is not null)
    and (status <> 'scheduled' or scheduled_at is not null)
  )
);

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  bucket text not null default 'news-media',
  object_path text not null unique,
  public_url text not null unique,
  filename text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 5242880),
  alt_text text check (alt_text is null or char_length(alt_text) <= 240),
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.consultation_leads
  add column if not exists test_type text,
  add column if not exists message text,
  add column if not exists notes text,
  add column if not exists assigned_to uuid references public.profiles(id) on delete set null,
  add column if not exists utm_source text,
  add column if not exists utm_medium text,
  add column if not exists utm_campaign text,
  add column if not exists utm_content text,
  add column if not exists utm_term text,
  add column if not exists updated_at timestamptz not null default now();

update public.consultation_leads set status = 'consulting' where status = 'qualified';
alter table public.consultation_leads drop constraint if exists consultation_leads_status_check;
alter table public.consultation_leads
  add constraint consultation_leads_status_check
  check (status in ('new', 'contacted', 'consulting', 'converted', 'closed'));

create table if not exists public.lead_notes (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.consultation_leads(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 4000),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists posts_status_idx on public.posts(status);
create index if not exists posts_published_at_idx on public.posts(published_at desc);
create index if not exists posts_category_id_idx on public.posts(category_id);
create index if not exists consultation_leads_created_at_idx on public.consultation_leads(created_at desc);
create index if not exists consultation_leads_status_idx on public.consultation_leads(status);
create index if not exists consultation_leads_source_idx on public.consultation_leads(source);
create index if not exists lead_notes_lead_id_idx on public.lead_notes(lead_id, created_at desc);
create index if not exists media_assets_created_at_idx on public.media_assets(created_at desc);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists post_categories_set_updated_at on public.post_categories;
create trigger post_categories_set_updated_at before update on public.post_categories
for each row execute function public.set_updated_at();

drop trigger if exists posts_set_updated_at on public.posts;
create trigger posts_set_updated_at before update on public.posts
for each row execute function public.set_updated_at();

drop trigger if exists consultation_leads_set_updated_at on public.consultation_leads;
create trigger consultation_leads_set_updated_at before update on public.consultation_leads
for each row execute function public.set_updated_at();

create or replace function public.is_ukea_staff(required_roles text[] default array['admin', 'editor'])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = any(required_roles)
  );
$$;

revoke all on function public.is_ukea_staff(text[]) from public;
grant execute on function public.is_ukea_staff(text[]) to authenticated;

create or replace function public.publish_due_posts()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  changed integer;
begin
  update public.posts
  set status = 'published',
      published_at = coalesce(published_at, scheduled_at, now()),
      scheduled_at = null
  where status = 'scheduled'
    and scheduled_at is not null
    and scheduled_at <= now();
  get diagnostics changed = row_count;
  return changed;
end;
$$;

revoke all on function public.publish_due_posts() from public, anon, authenticated;
grant execute on function public.publish_due_posts() to service_role;

alter table public.profiles enable row level security;
alter table public.post_categories enable row level security;
alter table public.posts enable row level security;
alter table public.media_assets enable row level security;
alter table public.consultation_leads enable row level security;
alter table public.lead_notes enable row level security;

drop policy if exists "Profiles can read own profile" on public.profiles;
create policy "Profiles can read own profile" on public.profiles
for select to authenticated
using (id = auth.uid() or public.is_ukea_staff());

drop policy if exists "Admins can manage profiles" on public.profiles;
create policy "Admins can manage profiles" on public.profiles
for all to authenticated
using (public.is_ukea_staff(array['admin']))
with check (public.is_ukea_staff(array['admin']));

drop policy if exists "Public can read categories" on public.post_categories;
create policy "Public can read categories" on public.post_categories
for select to anon, authenticated using (true);

drop policy if exists "Staff can manage categories" on public.post_categories;
create policy "Staff can manage categories" on public.post_categories
for all to authenticated
using (public.is_ukea_staff())
with check (public.is_ukea_staff());

drop policy if exists "Public can read published posts" on public.posts;
create policy "Public can read published posts" on public.posts
for select to anon, authenticated
using (status = 'published' and published_at is not null and published_at <= now());

drop policy if exists "Staff can manage posts" on public.posts;
create policy "Staff can manage posts" on public.posts
for all to authenticated
using (public.is_ukea_staff())
with check (public.is_ukea_staff());

drop policy if exists "Staff can manage media metadata" on public.media_assets;
create policy "Staff can manage media metadata" on public.media_assets
for all to authenticated
using (public.is_ukea_staff())
with check (public.is_ukea_staff());

drop policy if exists "Public can submit consultation leads" on public.consultation_leads;
create policy "Public can submit consultation leads" on public.consultation_leads
for insert to anon
with check (consent = true and status = 'new');

drop policy if exists "Staff can read consultation leads" on public.consultation_leads;
create policy "Staff can read consultation leads" on public.consultation_leads
for select to authenticated using (public.is_ukea_staff());

drop policy if exists "Staff can update consultation leads" on public.consultation_leads;
create policy "Staff can update consultation leads" on public.consultation_leads
for update to authenticated
using (public.is_ukea_staff())
with check (public.is_ukea_staff());

drop policy if exists "Staff can manage lead notes" on public.lead_notes;
create policy "Staff can manage lead notes" on public.lead_notes
for all to authenticated
using (public.is_ukea_staff())
with check (public.is_ukea_staff());

grant usage on schema public to anon, authenticated;
grant select on public.post_categories, public.posts to anon;
grant select, insert, update, delete on public.profiles, public.post_categories, public.posts, public.media_assets, public.lead_notes to authenticated;
grant select, update on public.consultation_leads to authenticated;
grant insert on public.consultation_leads to anon;

insert into public.post_categories (name, slug, description)
values
  ('Thông báo', 'thong-bao', 'Thông báo chính thức và cập nhật quan trọng từ UKEA.'),
  ('Hoạt động – Sự kiện', 'hoat-dong-su-kien', 'Tin tức về hoạt động và sự kiện của UKEA.')
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'news-media',
  'news-media',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can view news media" on storage.objects;
create policy "Public can view news media" on storage.objects
for select to public using (bucket_id = 'news-media');

drop policy if exists "Staff can upload news media" on storage.objects;
create policy "Staff can upload news media" on storage.objects
for insert to authenticated
with check (bucket_id = 'news-media' and public.is_ukea_staff());

drop policy if exists "Staff can update news media" on storage.objects;
create policy "Staff can update news media" on storage.objects
for update to authenticated
using (bucket_id = 'news-media' and public.is_ukea_staff())
with check (bucket_id = 'news-media' and public.is_ukea_staff());

drop policy if exists "Staff can delete news media" on storage.objects;
create policy "Staff can delete news media" on storage.objects
for delete to authenticated
using (bucket_id = 'news-media' and public.is_ukea_staff());

comment on table public.profiles is 'Authorized UKEA CMS users and roles.';
comment on table public.posts is 'UKEA news articles and their SEO metadata.';
comment on table public.post_categories is 'Database-managed article categories.';
comment on table public.media_assets is 'Metadata for files stored in the news-media bucket.';
comment on table public.lead_notes is 'Append-only consultation follow-up notes.';
