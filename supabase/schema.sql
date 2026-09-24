-- ============================================================
-- Schéma EduTech Bénin
-- À exécuter dans Supabase > SQL Editor
-- ============================================================

-- Écoles
create table if not exists schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text not null,
  created_at timestamptz default now()
);

-- Classes (rattachées à une école)
create table if not exists classes (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  name text not null, -- ex: "CM2 A"
  created_at timestamptz default now()
);

-- Profils utilisateurs (étend auth.users de Supabase)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null check (role in ('parent', 'teacher', 'school', 'structure')),
  school_id uuid references schools(id) on delete set null,
  class_id uuid references classes(id) on delete set null, -- pour parent (enfant) et teacher (sa classe)
  created_at timestamptz default now()
);

-- Publications (le coeur de la plateforme)
create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references profiles(id) on delete cascade,
  scope text not null check (scope in ('class', 'school', 'national')),
  school_id uuid references schools(id) on delete cascade, -- requis si scope = school ou class
  class_id uuid references classes(id) on delete cascade,  -- requis si scope = class
  category text not null check (category in ('devoir', 'examen', 'reunion', 'bourse', 'urgence', 'info')),
  title text not null,
  body text not null,           -- texte simplifié, toujours obligatoire (source pour lecteur d'écran + TTS)
  audio_url text,                -- note vocale humaine optionnelle (langue locale)
  created_at timestamptz default now()
);

-- Liens vers l'écosystème existant (statique pour le MVP, éditable plus tard)
create table if not exists ecosystem_links (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  name text not null,
  description text not null, -- "à qui ça s'adresse", phrase courte
  url text not null,
  sort_order int default 0
);

-- ============================================================
-- Row Level Security
-- ============================================================
alter table schools enable row level security;
alter table classes enable row level security;
alter table profiles enable row level security;
alter table posts enable row level security;
alter table ecosystem_links enable row level security;

-- Lecture publique des écoles/classes (nécessaire à l'inscription)
create policy "schools readable by all" on schools for select using (true);
create policy "classes readable by all" on classes for select using (true);
create policy "ecosystem readable by all" on ecosystem_links for select using (true);

-- Profils : chacun lit/édite le sien ; lecture publique du nom+rôle pour affichage auteur
create policy "profiles readable by all" on profiles for select using (true);
create policy "profiles insert own" on profiles for insert with check (auth.uid() = id);
create policy "profiles update own" on profiles for update using (auth.uid() = id);

-- Posts : lecture publique (le filtrage fin se fait côté appli selon école/classe) ;
-- écriture réservée aux rôles teacher/school/structure sur leur propre périmètre
create policy "posts readable by all" on posts for select using (true);

create policy "posts insert by authorized roles" on posts for insert
  with check (
    auth.uid() = author_id
    and exists (
      select 1 from profiles p
      where p.id = auth.uid()
        and p.role in ('teacher', 'school', 'structure')
    )
  );

create policy "posts delete own" on posts for delete using (auth.uid() = author_id);

-- ============================================================
-- Stockage : bucket pour les notes vocales
-- ============================================================
insert into storage.buckets (id, name, public)
values ('post-audio', 'post-audio', true)
on conflict (id) do nothing;

create policy "audio publicly readable" on storage.objects
  for select using (bucket_id = 'post-audio');

create policy "audio upload by authenticated" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'post-audio');

-- ============================================================
-- Index utiles
-- ============================================================
create index if not exists idx_posts_scope on posts(scope);
create index if not exists idx_posts_school on posts(school_id);
create index if not exists idx_posts_class on posts(class_id);
create index if not exists idx_profiles_school on profiles(school_id);
