-- ============================================================
-- Migration : autoriser la création d'une école ou d'une classe à
-- l'inscription.
-- Sans ça, un compte "École" ne peut que se rattacher à une école déjà en
-- base (choisie dans une liste) et un compte "Enseignant" ne peut choisir
-- que parmi les classes déjà existantes de son école — impossible d'en
-- créer une nouvelle, donc rien n'apparaît jamais dans les listes utilisées
-- par les parcours d'inscription Enseignant / Famille tant que personne ne
-- les a ajoutées manuellement en base.
--
-- Idempotent : peut être relancé sans erreur même si tu as déjà créé une
-- partie de ces policies à la main.
-- ============================================================

drop policy if exists "schools insert by authenticated" on schools;
create policy "schools insert by authenticated" on schools
  for insert to authenticated with check (true);

drop policy if exists "classes insert by authenticated" on classes;
create policy "classes insert by authenticated" on classes
  for insert to authenticated with check (true);
