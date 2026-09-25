-- ============================================================
-- Migration : abonnements aux notifications push (Web Push).
-- Un parent peut s'abonner depuis son navigateur ; chaque abonnement
-- correspond à un appareil/navigateur (endpoint fourni par le navigateur).
-- À exécuter APRÈS schema.sql et migration_children.sql.
-- ============================================================

create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz default now()
);

alter table push_subscriptions enable row level security;

-- Le parent gère ses propres abonnements. La route serveur qui ENVOIE les
-- notifications (côté API, jamais côté navigateur) utilise la clé de
-- service Supabase, qui contourne RLS pour retrouver tous les abonnements
-- concernés par un post — voir src/app/api/notify.
create policy "push_subscriptions insert own" on push_subscriptions
  for insert with check (parent_id = auth.uid());

create policy "push_subscriptions select own" on push_subscriptions
  for select using (parent_id = auth.uid());

create policy "push_subscriptions delete own" on push_subscriptions
  for delete using (parent_id = auth.uid());

create index if not exists idx_push_subscriptions_parent on push_subscriptions(parent_id);
