-- ═══════════════════════════════════════════
-- LOUP-GAROU DE THIERCELIEU — Configuration Supabase
-- À coller dans l'éditeur SQL de votre projet Supabase
-- (Supabase.com → votre projet → SQL Editor → New query → Run)
-- ═══════════════════════════════════════════

create table if not exists games (
  id uuid primary key default gen_random_uuid(),
  room_code text unique not null,
  state jsonb not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Active la sécurité au niveau des lignes
alter table games enable row level security;

-- Autorise tout le monde (clé anonyme) à lire et écrire les parties.
-- C'est volontairement permissif car il n'y a pas de compte utilisateur :
-- n'importe qui avec le code à 6 caractères peut rejoindre la partie.
create policy "Tout le monde peut lire les parties"
  on games for select
  using (true);

create policy "Tout le monde peut créer une partie"
  on games for insert
  with check (true);

create policy "Tout le monde peut mettre à jour une partie"
  on games for update
  using (true);

-- Active le temps réel (Realtime) sur cette table
alter publication supabase_realtime add table games;
