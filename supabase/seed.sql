-- ============================================================
-- Données fictives de démo — à exécuter APRÈS schema.sql
-- ============================================================

insert into schools (id, name, city) values
  ('11111111-1111-1111-1111-111111111111', 'EPP Cotonou Centre', 'Cotonou'),
  ('22222222-2222-2222-2222-222222222222', 'Collège Sainte-Rita', 'Cotonou'),
  ('33333333-3333-3333-3333-333333333333', 'EPP Parakou I', 'Parakou');

insert into classes (id, school_id, name) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'CM2 A'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'CM1 B'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '22222222-2222-2222-2222-222222222222', '6ème A'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', '33333333-3333-3333-3333-333333333333', 'CE2 A');

-- Note: les comptes utilisateurs de démo (parent/enseignant/école/structure) doivent être
-- créés via Supabase Auth (email + mot de passe) puis complétés dans "profiles" avec le
-- bon rôle et school_id/class_id. Voir README section "Comptes de démo".

insert into ecosystem_links (category, name, description, url, sort_order) values
  ('Gestion scolaire / examens', 'EducMaster', 'Pour les directeurs et enseignants : inscriptions et examen du CEP.', 'https://www.enseignementsecondaire.gouv.bj/', 1),
  ('Bourses d''études', 'DBAU — Direction des Bourses et Aides Universitaires', 'Pour les étudiants et familles qui cherchent une bourse.', 'https://bourses.enseignementsuperieur.gouv.bj/', 2),
  ('Contenus accessibles', 'Manuels numériques accessibles (UNICEF)', 'Pour les élèves en situation de handicap et leurs enseignants.', 'https://www.unicef.org/benin/', 3),
  ('Formation professionnelle', 'École des Métiers du Numérique', 'Pour les jeunes en recherche de compétences numériques.', 'https://ecolenumerique.bj/', 4),
  ('Institutionnel', 'Ministère des Enseignements Maternel et Primaire', 'Textes officiels et actualités de l''éducation.', 'https://memp.gouv.bj/', 5);
