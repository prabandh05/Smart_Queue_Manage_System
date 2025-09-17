-- Add boolean role flags to profiles
alter table public.profiles
  add column if not exists is_officer boolean not null default false,
  add column if not exists is_admin boolean not null default false;

-- Backfill existing roles into booleans for convenience
update public.profiles
set is_officer = (role in ('officer','admin')),
    is_admin = (role = 'admin');

-- Optional: keep text role for compatibility, but booleans will be primary

-- Policy tweaks: use existing logic; boolean checks will be done in app/JWT

