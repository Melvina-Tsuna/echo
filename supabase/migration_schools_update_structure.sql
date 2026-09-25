-- ============================================================
-- Migration : permet aux comptes Structure (ministère, ONG) de corriger
-- le type et la zone des écoles. Jusqu'ici, aucune policy "update" n'existe
-- sur schools : personne ne peut modifier une école une fois créée.
-- À exécuter APRÈS migration_schools_type_zone.sql.
-- ============================================================

create policy "schools update by structure" on schools
  for update
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role = 'structure'
    )
  )
  with check (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role = 'structure'
    )
  );
