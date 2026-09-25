-- ============================================================
-- Migration : type d'école (publique/privée) et zone territoriale.
-- Suite à la réforme de 2026 qui organise les 77 communes du Bénin
-- en six pôles de développement territorial (les départements restent
-- la référence administrative de base, ce découpage est un niveau
-- de coordination supplémentaire).
-- À exécuter APRÈS schema.sql.
-- ============================================================

alter table schools add column if not exists type text not null default 'publique'
  check (type in ('publique', 'privee'));

alter table schools add column if not exists zone text
  check (zone in ('grand_nokoue', 'nord_ouest', 'nord_est', 'centre', 'sud_ouest', 'sud_est'));

create index if not exists idx_schools_zone on schools(zone);
