-- Run this once in Supabase Dashboard > SQL Editor for project oscawhjvlnpmvhtckecb.
create extension if not exists pgcrypto;

create table if not exists public.consultation_leads (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(full_name) between 1 and 120),
  phone text not null check (char_length(phone) between 8 and 30),
  email text check (email is null or char_length(email) <= 160),
  interest text not null default 'Chưa xác định' check (char_length(interest) <= 120),
  source text not null default 'website' check (char_length(source) <= 80),
  page_url text check (page_url is null or char_length(page_url) <= 500),
  consent boolean not null default false check (consent = true),
  status text not null default 'new' check (status in ('new', 'contacted', 'qualified', 'closed')),
  created_at timestamptz not null default now()
);

alter table public.consultation_leads enable row level security;

revoke all on table public.consultation_leads from anon;
grant insert on table public.consultation_leads to anon;

drop policy if exists "Public can submit consultation leads" on public.consultation_leads;
create policy "Public can submit consultation leads"
  on public.consultation_leads
  for insert
  to anon
  with check (consent = true);

comment on table public.consultation_leads is 'Consultation requests submitted from the UKEA website.';
