-- ============================================================
-- Migration "Enseignant multi-classes" : un enseignant peut intervenir
-- dans plusieurs classes, potentiellement dans des écoles différentes
-- (profiles.class_id/school_id ne permettait qu'une seule classe).
-- À exécuter APRÈS migration_children.sql et migration_presence.sql.
-- ============================================================

create table if not exists teacher_classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references profiles(id) on delete cascade,
  school_id uuid not null references schools(id) on delete cascade,
  class_id uuid not null references classes(id) on delete cascade,
  created_at timestamptz default now(),
  unique (teacher_id, class_id)
);

alter table teacher_classes enable row level security;

create policy "teacher_classes readable by owner" on teacher_classes
  for select using (teacher_id = auth.uid());

create policy "teacher_classes insert by owner" on teacher_classes
  for insert with check (teacher_id = auth.uid());

create policy "teacher_classes delete by owner" on teacher_classes
  for delete using (teacher_id = auth.uid());

-- Reprise des comptes enseignants déjà créés avec une seule classe
-- (profiles.class_id) : chacun devient sa première ligne teacher_classes.
insert into teacher_classes (teacher_id, school_id, class_id)
select p.id, p.school_id, p.class_id
from profiles p
where p.role = 'teacher' and p.class_id is not null and p.school_id is not null
on conflict (teacher_id, class_id) do nothing;

-- ------------------------------------------------------------
-- Les policies suivantes vérifiaient l'appartenance d'un enseignant à une
-- classe via profiles.class_id (une seule classe possible). Elles doivent
-- maintenant vérifier l'appartenance via teacher_classes. On corrige au
-- passage l'accès "école" pour grades/alerts, qui ne fonctionnait jamais
-- (comparait p.class_id, toujours nul pour un compte École).
-- ------------------------------------------------------------

drop policy if exists "attendance write by class teacher" on attendance;
create policy "attendance write by class teacher" on attendance
  for insert with check (
    exists (
      select 1 from teacher_classes tc
      where tc.teacher_id = auth.uid() and tc.class_id = attendance.class_id
    )
  );

drop policy if exists "attendance read own child or own class" on attendance;
create policy "attendance read own child or own class" on attendance
  for select using (
    exists (
      select 1 from children c
      where c.id = attendance.student_id and c.parent_id = auth.uid()
    )
    or exists (
      select 1 from teacher_classes tc
      where tc.teacher_id = auth.uid() and tc.class_id = attendance.class_id
    )
    or exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role = 'school' and p.school_id = (
        select school_id from classes c where c.id = attendance.class_id
      )
    )
  );

drop policy if exists "grades write by class teacher" on grades;
create policy "grades write by class teacher" on grades
  for insert with check (
    exists (
      select 1 from teacher_classes tc
      where tc.teacher_id = auth.uid() and tc.class_id = grades.class_id
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
      select 1 from teacher_classes tc
      where tc.teacher_id = auth.uid() and tc.class_id = grades.class_id
    )
    or exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role = 'school' and p.school_id = (
        select school_id from classes c where c.id = grades.class_id
      )
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
      select 1 from teacher_classes tc
      where tc.teacher_id = auth.uid() and tc.class_id = alerts.class_id
    )
    or exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role = 'school' and p.school_id = (
        select school_id from classes c where c.id = alerts.class_id
      )
    )
  );

create index if not exists idx_teacher_classes_teacher on teacher_classes(teacher_id);
create index if not exists idx_teacher_classes_class on teacher_classes(class_id);
