-- Starter Kit demo app: a generic catalog of resources ("items").
-- Apply after 202610180000_platform.sql. Requires public.has_role(uuid, app_role).
begin;
create table public.items (
 id uuid primary key default gen_random_uuid(),
 title text not null check (char_length(title) between 3 and 200),
 slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
 summary text not null default '' check (char_length(summary) <= 500),
 content text not null default '',
 category text not null default 'resurse' check (category in ('instrumente','resurse','ghiduri')),
 tags text[] not null default '{}',
 status text not null default 'draft' check (status in ('draft','published')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index items_status_created on public.items (status, created_at desc);
create index items_category on public.items (category) where status = 'published';

-- Public reads see published rows only; writes are admin-only via has_role().
grant select on public.items to anon, authenticated;
grant insert, update, delete on public.items to authenticated;
grant all on public.items to service_role;
alter table public.items enable row level security;

create policy items_public_read on public.items
 for select to anon, authenticated
 using (status = 'published' or public.has_role(auth.uid(), 'admin'));
create policy items_admin_insert on public.items
 for insert to authenticated
 with check (public.has_role(auth.uid(), 'admin'));
create policy items_admin_update on public.items
 for update to authenticated
 using (public.has_role(auth.uid(), 'admin'))
 with check (public.has_role(auth.uid(), 'admin'));
create policy items_admin_delete on public.items
 for delete to authenticated
 using (public.has_role(auth.uid(), 'admin'));

-- Demo seed: fully fictional, generic entries. Replace or delete freely.
insert into public.items (title, slug, summary, content, category, tags, status) values
 ('Ghid de pornire rapidă', 'ghid-de-pornire-rapida',
  'Pașii minimi pentru a porni un proiect nou pe această fundație: configurare, migrații și primul modul.',
  'Acest ghid demonstrativ descrie fluxul recomandat: configurezi variabilele de mediu, rulezi migrațiile de pornire, creezi primul cont de administrator și apoi adaugi propriul modul de date. Conținutul este fictiv și servește doar ca exemplu de resursă publicată.',
  'ghiduri', array['pornire','configurare'], 'published'),
 ('Instrument de organizare a sarcinilor', 'instrument-organizare-sarcini',
  'Un exemplu de resursă de tip instrument: o abordare simplă pentru prioritizarea sarcinilor zilnice.',
  'Această intrare demonstrativă ilustrează cum arată o resursă de tip instrument în catalog: titlu, rezumat, conținut liber și etichete. Folosește-o ca model pentru propriile resurse. Conținutul este fictiv.',
  'instrumente', array['productivitate','demo'], 'published'),
 ('Resurse pentru documentație tehnică', 'resurse-documentatie-tehnica',
  'Colecție fictivă de bune practici pentru scrierea documentației unui proiect software.',
  'Documentația bună răspunde la trei întrebări: ce face proiectul, cum se pornește și cum se extinde. Această resursă demonstrativă arată cum poți structura astfel de materiale în catalog. Conținutul este fictiv.',
  'resurse', array['documentatie','demo'], 'published'),
 ('Ghid de administrare a rolurilor', 'ghid-administrare-roluri',
  'Cum funcționează rolurile de utilizator și cum acorzi acces de administrator în mod explicit.',
  'Rolurile se păstrează în tabela user_roles și se verifică server-side prin funcția has_role(). Primul administrator se atribuie explicit, manual, niciodată automat la înregistrare. Conținutul este fictiv și demonstrativ.',
  'ghiduri', array['administrare','roluri'], 'published');
commit;
