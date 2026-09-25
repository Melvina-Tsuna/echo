-- ============================================================
-- Jeu de données de démo pour le FIL (posts) : un post école + un post
-- classe pour CHACUNE des 3 écoles de seed.sql, pensé pour tester le
-- multi-enfants.
--
-- Une famille avec un enfant dans CM2 A (EPP Cotonou Centre) et un autre en
-- 6ème A (Collège Sainte-Rita) doit voir, dans son fil, les posts nationaux
-- + ceux des écoles/classes de SES enfants uniquement (étiquetés avec le
-- bon "· Pour <prénom>"), et surtout NE PAS voir les posts d'EPP Parakou I
-- (aucun enfant du foyer n'y est inscrit) : ça permet de vérifier que le
-- filtrage par enfant fonctionne bien, pas seulement que les posts existent.
--
-- À exécuter APRÈS schema.sql et seed.sql (qui contient déjà les 3 écoles
-- et 4 classes utilisées ici).
-- ============================================================

-- ------------------------------------------------------------
-- ÉTAPE A — Créer les comptes de démo via l'interface (pas en SQL,
-- pour ne pas bricoler auth.users) :
-- ------------------------------------------------------------
-- 1. /signup/etablissement → un compte Enseignant (l'école/classe choisie
--    à l'inscription n'a pas d'importance : le script poste directement
--    pour chacune des 3 écoles via ce même compte, pour éviter de créer un
--    enseignant par école).
-- 2. /signup/etablissement → un compte École (idem, un seul suffit).
-- 3. /signup/structure → un compte Structure (ex. "Ministère").
-- 4. /signup/famille → un compte Famille avec 2 enfants :
--      - Enfant 1 → école "EPP Cotonou Centre", classe "CM2 A"
--      - Enfant 2 → école "Collège Sainte-Rita", classe "6ème A"
--    (aucun enfant à EPP Parakou I, volontairement)

-- ------------------------------------------------------------
-- ÉTAPE B — Récupérer les identifiants nécessaires
-- ------------------------------------------------------------
-- select id, full_name, role from profiles where role in ('teacher', 'school', 'structure');
-- select id, full_name, class_id from children order by full_name;

-- ------------------------------------------------------------
-- ÉTAPE C — Coller les identifiants ci-dessous, puis exécuter tout le bloc
-- ------------------------------------------------------------
do $$
declare
  v_teacher_id   uuid := '<TEACHER_ID>';    -- profil "teacher" (CM2 A)
  v_school_id    uuid := '<SCHOOL_ID>';     -- profil "school" (EPP Cotonou Centre)
  v_structure_id uuid := '<STRUCTURE_ID>';  -- profil "structure"

  -- Écoles/classes déjà créées par seed.sql
  epp_cotonou      uuid := '11111111-1111-1111-1111-111111111111';
  college_ste_rita uuid := '22222222-2222-2222-2222-222222222222';
  epp_parakou      uuid := '33333333-3333-3333-3333-333333333333';
  cm2_a            uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  sixieme_a        uuid := 'cccccccc-cccc-cccc-cccc-cccccccccccc';
  ce2_a            uuid := 'dddddddd-dddd-dddd-dddd-dddddddddddd';
begin

  -- Post national (visible par tout le monde, y compris les 2 enfants)
  insert into posts (author_id, scope, school_id, class_id, category, title, body)
  values (
    v_structure_id, 'national', null, null, 'bourse',
    'Ouverture des inscriptions aux bourses nationales',
    'Les dossiers de bourse pour l''année scolaire sont à déposer avant le 30 du mois.'
  );

  -- ---- EPP Cotonou Centre (concerne l'enfant 1) ----
  insert into posts (author_id, scope, school_id, class_id, category, title, body)
  values (
    v_school_id, 'school', epp_cotonou, null, 'urgence',
    'Fermeture exceptionnelle de l''école demain',
    'L''école EPP Cotonou Centre sera fermée demain pour cause de maintenance électrique.'
  );
  insert into posts (author_id, scope, school_id, class_id, category, title, body)
  values (
    v_teacher_id, 'class', epp_cotonou, cm2_a, 'devoir',
    'Devoir de mathématiques pour vendredi',
    'Exercices 3 et 4 page 42 à faire pour vendredi. Pense à revoir les tables de multiplication.'
  );

  -- ---- Collège Sainte-Rita (concerne l'enfant 2) ----
  insert into posts (author_id, scope, school_id, class_id, category, title, body)
  values (
    v_school_id, 'school', college_ste_rita, null, 'info',
    'Nouvel horaire de sortie des classes',
    'À partir de lundi, la sortie des classes se fait à 17h30 au lieu de 17h.'
  );
  -- Note : postés ici par les comptes Enseignant/École de démo pour
  -- simplifier le jeu de données ; en usage réel, chaque établissement a
  -- son propre compte.
  insert into posts (author_id, scope, school_id, class_id, category, title, body)
  values (
    v_teacher_id, 'class', college_ste_rita, sixieme_a, 'reunion',
    'Réunion parents-professeurs du trimestre',
    'La réunion parents-professeurs de 6ème A aura lieu samedi à 9h en salle polyvalente.'
  );

  -- ---- EPP Parakou I (aucun enfant du foyer démo n'y est inscrit :
  -- ces 2 posts NE DOIVENT PAS apparaître dans le fil de la famille) ----
  insert into posts (author_id, scope, school_id, class_id, category, title, body)
  values (
    v_school_id, 'school', epp_parakou, null, 'info',
    'Journée portes ouvertes samedi prochain',
    'Venez découvrir les activités périscolaires proposées cette année.'
  );
  insert into posts (author_id, scope, school_id, class_id, category, title, body)
  values (
    v_teacher_id, 'class', epp_parakou, ce2_a, 'examen',
    'Évaluation de lecture la semaine prochaine',
    'Les élèves de CE2 A seront évalués sur la lecture à voix haute mardi prochain.'
  );

end $$;

-- ------------------------------------------------------------
-- ÉTAPE D — Vérifier
-- ------------------------------------------------------------
-- Connecte-toi avec le compte Famille sur /feed : tu dois voir 5 posts
-- (1 national + 2 pour l'enfant 1 à EPP Cotonou Centre + 2 pour l'enfant 2
-- à Collège Sainte-Rita). "· Pour <prénom>" s'affiche seulement sur les 2
-- posts de PORTÉE CLASSE (devoir CM2 A, réunion 6ème A) — les posts école
-- s'appliquent par nature à tous les enfants de cette école, donc pas
-- besoin de préciser lequel. Aucun des 2 posts d'EPP Parakou I ne doit
-- apparaître (pas d'enfant du foyer inscrit là-bas).
