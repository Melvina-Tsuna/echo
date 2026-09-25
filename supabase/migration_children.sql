-- ============================================================
-- Migration "Multi-enfants" : une famille peut avoir plusieurs enfants,
-- potentiellement dans des écoles/classes différentes.
-- À exécuter APRÈS schema.sql (et migration_presence.sql si déjà en place).
-- ============================================================

create table if not exists children (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references profiles(id) on delete cascade,
  full_name text not null,
  school_id uuid references schools(id) on delete set null,
  class_id uuid references classes(id) on delete set null,
  created_at timestamptz default now()
);

alter table children enable row level security;

-- Le parent gère ses propres enfants ; l'enseignant/l'école de la classe
-- ou de l'établissement peuvent les lire (nécessaire pour le suivi et le fil).
create policy "children readable by parent or staff" on children
  for select using (
    parent_id = auth.uid()
    or exists (
      select 1 from profiles p
      where p.id = auth.uid()
        and p.role in ('teacher', 'school')
        and (p.class_id = children.class_id or p.school_id = children.school_id)
    )
  );

create policy "children insert by parent" on children
  for insert with check (parent_id = auth.uid());

create policy "children update by parent" on children
  for update using (parent_id = auth.uid());

create policy "children delete by parent" on children
  for delete using (parent_id = auth.uid());

-- ------------------------------------------------------------
-- Rebranchement du suivi (attendance/grades/alerts) sur les enfants
-- plutôt que sur les profils parents.
--
-- Astuce : avant cette migration, un profil "parent" représentait lui-même
-- l'élève, donc attendance/grades/alerts.student_id pointait déjà vers
-- profiles.id. En créant l'enfant migré avec CE MÊME id, les lignes
-- existantes restent valides sans aucune mise à jour de données.
-- ------------------------------------------------------------

insert into children (id, parent_id, full_name, school_id, class_id)
select p.id, p.id, p.full_name, p.school_id, p.class_id
from profiles p
where p.role = 'parent' and p.class_id is not null
on conflict (id) do nothing;

alter table attendance drop constraint if exists attendance_student_id_fkey;
alter table attendance add constraint attendance_student_id_fkey
  foreign key (student_id) references children(id) on delete cascade;

alter table grades drop constraint if exists grades_student_id_fkey;
alter table grades add constraint grades_student_id_fkey
  foreign key (student_id) references children(id) on delete cascade;

alter table alerts drop constraint if exists alerts_student_id_fkey;
alter table alerts add constraint alerts_student_id_fkey
  foreign key (student_id) references children(id) on delete cascade;

-- Les policies de lecture "own child" comparaient student_id à auth.uid()
-- (vrai quand le parent EST l'élève) ; elles doivent maintenant vérifier
-- que l'enfant appartient bien au parent connecté.
drop policy if exists "attendance read own child or own class" on attendance;
create policy "attendance read own child or own class" on attendance
  for select using (
    exists (
      select 1 from children c
      where c.id = attendance.student_id and c.parent_id = auth.uid()
    )
    or exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role in ('teacher', 'school') and p.class_id = attendance.class_id
    )
    or exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role = 'school' and p.school_id = (
        select school_id from classes c where c.id = attendance.class_id
      )
    )
  );

drop policy if exists "grades read own child or own class" on grades;
create policy "grades read own child or own class" on grades
  for select using (
    exists (
      select 1 from children c
      where c.id = grades.student_id and c.parent_id = auth.uid()
    )
    or exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role in ('teacher', 'school') and p.class_id = grades.class_id
    )
  );

drop policy if exists "alerts read own child or own class" on alerts;
create policy "alerts read own child or own class" on alerts
  for select using (
    exists (
      select 1 from children c
      where c.id = alerts.student_id and c.parent_id = auth.uid()
    )
    or exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role in ('teacher', 'school') and p.class_id = alerts.class_id
    )
  );

-- ============================================================
-- Index utiles
-- ============================================================
create index if not exists idx_children_parent on children(parent_id);
create index if not exists idx_children_class on children(class_id);
create index if not exists idx_children_school on children(school_id);
