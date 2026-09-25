-- ============================================================
-- Migration "Kèlê-lite" : suivi de présence/notes + alertes automatiques
-- À exécuter APRÈS schema.sql et seed.sql, dans le SQL Editor Supabase
-- ============================================================

-- ---- Présences ----
create table if not exists attendance (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles(id) on delete cascade, -- profil "parent" = représente l'élève pour ce MVP
  class_id uuid not null references classes(id) on delete cascade,
  date date not null default current_date,
  present boolean not null,
  recorded_by uuid not null references profiles(id),
  created_at timestamptz default now(),
  unique (student_id, date)
);

-- ---- Notes ----
create table if not exists grades (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles(id) on delete cascade,
  class_id uuid not null references classes(id) on delete cascade,
  subject text not null,
  score numeric not null,
  max_score numeric not null default 20,
  evaluated_at date not null default current_date,
  recorded_by uuid not null references profiles(id),
  created_at timestamptz default now()
);

-- ---- Alertes générées automatiquement ----
create table if not exists alerts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles(id) on delete cascade,
  class_id uuid not null references classes(id) on delete cascade,
  type text not null check (type in ('absenteisme', 'chute_notes')),
  message text not null,
  details jsonb, -- ex: {"taux_absence": 0.32, "periode_jours": 15}
  created_at timestamptz default now(),
  acknowledged boolean not null default false
);

-- ============================================================
-- Sécurité (RLS)
-- ============================================================
alter table attendance enable row level security;
alter table grades enable row level security;
alter table alerts enable row level security;

-- Un enseignant lit/écrit les présences/notes de SA classe uniquement
create policy "attendance write by class teacher" on attendance
  for insert with check (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role = 'teacher' and p.class_id = attendance.class_id
    )
  );

create policy "attendance read own child or own class" on attendance
  for select using (
    student_id = auth.uid()
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

create policy "grades write by class teacher" on grades
  for insert with check (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role = 'teacher' and p.class_id = grades.class_id
    )
  );

create policy "grades read own child or own class" on grades
  for select using (
    student_id = auth.uid()
    or exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role in ('teacher', 'school') and p.class_id = grades.class_id
    )
  );

-- Les alertes : le parent concerné + l'enseignant/école de la classe les lisent
create policy "alerts read own child or own class" on alerts
  for select using (
    student_id = auth.uid()
    or exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role in ('teacher', 'school') and p.class_id = alerts.class_id
    )
  );

-- Les alertes ne sont créées QUE par le système (trigger ci-dessous), jamais directement par un utilisateur
-- => aucune policy "insert" pour un rôle utilisateur normal ; le trigger tourne en SECURITY DEFINER.

-- ============================================================
-- Algorithme de détection des signaux faibles
-- ============================================================

-- Seuils (ajustables ici, en un seul endroit)
-- - Absentéisme : > 25 % d'absences sur les 15 derniers jours calendaires
-- - Chute de notes : baisse de 30 % ou plus entre les deux dernières notes d'une même matière

create or replace function check_absenteeism(p_student_id uuid, p_class_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_total int;
  v_absent int;
  v_rate numeric;
  v_recent_alert boolean;
begin
  select count(*), count(*) filter (where present = false)
    into v_total, v_absent
  from attendance
  where student_id = p_student_id
    and date >= current_date - interval '15 days';

  if v_total < 3 then
    return; -- pas assez de données pour juger
  end if;

  v_rate := v_absent::numeric / v_total;

  if v_rate > 0.25 then
    select exists(
      select 1 from alerts
      where student_id = p_student_id
        and type = 'absenteisme'
        and created_at > now() - interval '7 days'
    ) into v_recent_alert;

    if not v_recent_alert then
      insert into alerts (student_id, class_id, type, message, details)
      values (
        p_student_id,
        p_class_id,
        'absenteisme',
        format('Taux d''absence élevé : %s%% sur les 15 derniers jours.', round(v_rate * 100)),
        jsonb_build_object('taux_absence', v_rate, 'periode_jours', 15, 'total_jours', v_total, 'jours_absents', v_absent)
      );
    end if;
  end if;
end;
$$;

create or replace function check_grade_drop(p_student_id uuid, p_class_id uuid, p_subject text)
returns void
language plpgsql
security definer
as $$
declare
  v_last numeric;
  v_last_max numeric;
  v_prev numeric;
  v_prev_max numeric;
  v_drop_ratio numeric;
begin
  select score, max_score into v_last, v_last_max
  from grades
  where student_id = p_student_id and subject = p_subject
  order by evaluated_at desc, created_at desc
  limit 1;

  select score, max_score into v_prev, v_prev_max
  from grades
  where student_id = p_student_id and subject = p_subject
  order by evaluated_at desc, created_at desc
  offset 1 limit 1;

  if v_last is null or v_prev is null then
    return; -- pas assez d'historique
  end if;

  v_drop_ratio := ((v_prev / v_prev_max) - (v_last / v_last_max)) / nullif(v_prev / v_prev_max, 0);

  if v_drop_ratio >= 0.3 then
    insert into alerts (student_id, class_id, type, message, details)
    values (
      p_student_id,
      p_class_id,
      'chute_notes',
      format('Chute de note en %s : %s/%s (précédemment %s/%s).', p_subject, v_last, v_last_max, v_prev, v_prev_max),
      jsonb_build_object('matiere', p_subject, 'note_actuelle', v_last, 'note_precedente', v_prev, 'baisse_ratio', v_drop_ratio)
    );
  end if;
end;
$$;

-- ---- Déclenchement automatique ----
create or replace function trg_attendance_check()
returns trigger
language plpgsql
security definer
as $$
begin
  perform check_absenteeism(new.student_id, new.class_id);
  return new;
end;
$$;

drop trigger if exists after_attendance_insert on attendance;
create trigger after_attendance_insert
  after insert on attendance
  for each row execute function trg_attendance_check();

create or replace function trg_grade_check()
returns trigger
language plpgsql
security definer
as $$
begin
  perform check_grade_drop(new.student_id, new.class_id, new.subject);
  return new;
end;
$$;

drop trigger if exists after_grade_insert on grades;
create trigger after_grade_insert
  after insert on grades
  for each row execute function trg_grade_check();

-- ============================================================
-- Index utiles
-- ============================================================
create index if not exists idx_attendance_student on attendance(student_id);
create index if not exists idx_grades_student_subject on grades(student_id, subject);
create index if not exists idx_alerts_student on alerts(student_id);
create index if not exists idx_alerts_class on alerts(class_id);
