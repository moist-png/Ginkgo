-- ============================================================================
--  Migration: split Trees out into their own table, linked to Reports
--
--  Run this in Supabase: Project -> SQL Editor -> New query -> paste -> Run.
--
--  WARNING: this wipes existing sites/reports/photos test data (confirmed
--  safe to do — there's no real data in there yet). Jobs, quotes, daily
--  risks, chlorophyll readings, and team data are untouched.
-- ============================================================================

truncate table public.photos;
truncate table public.reports;
truncate table public.sites cascade;

-- ----------------------------------------------------------------------------
-- 1. Trees: one row per tree, always belongs to exactly one site.
-- ----------------------------------------------------------------------------
create table if not exists public.trees (
  id                        uuid primary key default gen_random_uuid(),
  site_id                   uuid not null references public.sites(id) on delete cascade,
  tree_number               text not null default '',
  species                   text not null default '',
  common_name               text not null default '',
  dbh                       numeric not null default 0,
  height                    numeric not null default 0,
  canopy_spread_ns          numeric not null default 0,
  canopy_spread_ew          numeric not null default 0,
  tree_health               text not null default 'Good',
  extension_growth          numeric not null default 0,
  structure                 text not null default 'Good',
  wound_wood_development    text not null default 'Good',
  canopy_cover              numeric not null default 0,
  location                  text not null default '',
  lat                       numeric,
  lng                       numeric,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  deleted_at                timestamptz
);

-- ----------------------------------------------------------------------------
-- 2. Reports: drop the embedded tree_data blob, require a site.
-- ----------------------------------------------------------------------------
alter table public.reports drop column if exists tree_data;

alter table public.reports drop constraint if exists reports_site_id_fkey;
alter table public.reports alter column site_id set not null;
alter table public.reports add constraint reports_site_id_fkey
  foreign key (site_id) references public.sites(id) on delete cascade;

-- ----------------------------------------------------------------------------
-- 3. report_trees: many-to-many link. A report can hold several trees; a tree
--    can appear in several reports over time (e.g. yearly inspections).
-- ----------------------------------------------------------------------------
create table if not exists public.report_trees (
  id          uuid primary key default gen_random_uuid(),
  report_id   uuid not null references public.reports(id) on delete cascade,
  tree_id     uuid not null references public.trees(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (report_id, tree_id)
);

create index if not exists idx_trees_site_id on public.trees(site_id);
create index if not exists idx_report_trees_report_id on public.report_trees(report_id);
create index if not exists idx_report_trees_tree_id on public.report_trees(tree_id);

-- ----------------------------------------------------------------------------
-- 4. Row Level Security — same pattern as every other table in this project.
-- ----------------------------------------------------------------------------
alter table public.trees        enable row level security;
alter table public.report_trees enable row level security;

drop policy if exists "staff_all" on public.trees;
create policy "staff_all" on public.trees for all to authenticated using (true) with check (true);

drop policy if exists "staff_all" on public.report_trees;
create policy "staff_all" on public.report_trees for all to authenticated using (true) with check (true);

-- Public client portal (anonymous) read access, scoped to portal-enabled sites
drop policy if exists "portal_read_trees" on public.trees;
create policy "portal_read_trees" on public.trees for select to anon
  using (site_id in (select id from public.sites where portal_enabled = true));

drop policy if exists "portal_read_report_trees" on public.report_trees;
create policy "portal_read_report_trees" on public.report_trees for select to anon
  using (report_id in (
    select r.id from public.reports r
    join public.sites s on s.id = r.site_id
    where s.portal_enabled = true
  ));

-- ============================================================================
--  Done. Your Trees and Reports are now separate — see the app for the new
--  Reports tab and the real Tree Registry under each Site.
-- ============================================================================
