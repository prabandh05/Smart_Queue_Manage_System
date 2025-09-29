--Schema for Smart Queue Management System

-- Extensions
create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";

-- Tables
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text not null,
  phone text not null,
  citizen_id text,
  role text not null default 'citizen' check (role in ('citizen','officer','admin')),
  is_officer boolean not null default false,
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.counters (
  id serial primary key,
  name text not null,
  officer_id uuid references public.profiles(id),
  officer_name text,
  is_active boolean default true,
  services text[] default array['general'],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tokens (
  id uuid primary key default gen_random_uuid(),
  token_number integer not null,
  citizen_id uuid not null references public.profiles(id) on delete cascade,
  citizen_name text not null,
  citizen_phone text not null,
  service_type text not null default 'general',
  time_slot timestamptz not null,
  estimated_time text,
  status text not null default 'waiting' check (status in ('waiting','serving','completed','no-show','cancelled')),
  priority boolean default false,
  disability_type text check (disability_type in ('vision','hearing','mobility')),
  counter_id integer references public.counters(id),
  called_at timestamptz,
  served_at timestamptz,
  completed_at timestamptz,
  qr_code text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  slot_date date
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  token_id uuid not null references public.tokens(id) on delete cascade,
  type text not null check (type in ('sms','whatsapp','push')),
  status text not null default 'pending' check (status in ('pending','sent','delivered','failed')),
  message text not null,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.queue_stats (
  id uuid primary key default gen_random_uuid(),
  date date not null default current_date,
  total_tokens integer default 0,
  completed_tokens integer default 0,
  avg_wait_time_minutes integer default 0,
  avg_service_time_minutes integer default 0,
  peak_queue_size integer default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(date)
);

-- RLS enable
alter table public.profiles enable row level security;
alter table public.counters enable row level security;
alter table public.tokens enable row level security;
alter table public.notifications enable row level security;
alter table public.queue_stats enable row level security;

-- RLS Policies
drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile" on public.profiles for select using (auth.uid() = user_id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile" on public.profiles for update using (auth.uid() = user_id);

drop policy if exists "Anyone can create profile on signup" on public.profiles;
create policy "Anyone can create profile on signup" on public.profiles for insert with check (auth.uid() = user_id);

drop policy if exists "Officers can view all profiles" on public.profiles;
create policy "Officers can view all profiles" on public.profiles for select using (
  coalesce((auth.jwt() -> 'user_metadata' ->> 'role') in ('officer','admin'), false)
);

drop policy if exists "Anyone can view active counters" on public.counters;
create policy "Anyone can view active counters" on public.counters for select using (is_active = true);

drop policy if exists "Officers can manage counters" on public.counters;
create policy "Officers can manage counters" on public.counters for all using (
  coalesce((auth.jwt() -> 'user_metadata' ->> 'role') in ('officer','admin'), false)
);

drop policy if exists "Citizens can view their own tokens" on public.tokens;
create policy "Citizens can view their own tokens" on public.tokens for select using (
  citizen_id = (select id from public.profiles where user_id = auth.uid())
);

drop policy if exists "Citizens can create their own tokens" on public.tokens;
create policy "Citizens can create their own tokens" on public.tokens for insert with check (
  citizen_id = (select id from public.profiles where user_id = auth.uid())
);

drop policy if exists "Officers can view all tokens" on public.tokens;
create policy "Officers can view all tokens" on public.tokens for select using (
  coalesce((auth.jwt() -> 'user_metadata' ->> 'role') in ('officer','admin'), false)
);

drop policy if exists "Officers can update all tokens" on public.tokens;
create policy "Officers can update all tokens" on public.tokens for update using (
  coalesce((auth.jwt() -> 'user_metadata' ->> 'role') in ('officer','admin'), false)
);

drop policy if exists "Users can view their token notifications" on public.notifications;
create policy "Users can view their token notifications" on public.notifications for select using (
  exists (
    select 1 from public.tokens t
    where t.id = token_id
      and t.citizen_id = (select id from public.profiles where user_id = auth.uid())
  )
);

drop policy if exists "Officers can view all notifications" on public.notifications;
create policy "Officers can view all notifications" on public.notifications for select using (
  coalesce((auth.jwt() -> 'user_metadata' ->> 'role') in ('officer','admin'), false)
);

drop policy if exists "System can create notifications" on public.notifications;
create policy "System can create notifications" on public.notifications for insert with check (true);

drop policy if exists "Anyone can view queue stats" on public.queue_stats;
create policy "Anyone can view queue stats" on public.queue_stats for select using (true);

drop policy if exists "Officers can manage queue stats" on public.queue_stats;
create policy "Officers can manage queue stats" on public.queue_stats for all using (
  coalesce((auth.jwt() -> 'user_metadata' ->> 'role') in ('officer','admin'), false)
);

-- Functions
create or replace function public.generate_token_number()
returns integer as $$
declare next_number integer; begin
  select coalesce(max(token_number),0)+1 into next_number from public.tokens where date(created_at)=current_date;
  return next_number;
end; $$ language plpgsql security definer set search_path=public;

create or replace function public.update_updated_at_column()
returns trigger as $$ begin new.updated_at = now(); return new; end; $$ language plpgsql security definer set search_path=public;

-- Triggers
drop trigger if exists update_profiles_updated_at on public.profiles;
create trigger update_profiles_updated_at before update on public.profiles for each row execute function public.update_updated_at_column();

drop trigger if exists update_tokens_updated_at on public.tokens;
create trigger update_tokens_updated_at before update on public.tokens for each row execute function public.update_updated_at_column();

drop trigger if exists update_counters_updated_at on public.counters;
create trigger update_counters_updated_at before update on public.counters for each row execute function public.update_updated_at_column();

drop trigger if exists update_queue_stats_updated_at on public.queue_stats;
create trigger update_queue_stats_updated_at before update on public.queue_stats for each row execute function public.update_updated_at_column();

-- Realtime
alter table public.tokens replica identity full;
alter table public.counters replica identity full;
alter table public.queue_stats replica identity full;
alter publication supabase_realtime add table public.tokens;
alter publication supabase_realtime add table public.counters;
alter publication supabase_realtime add table public.queue_stats;

-- Indexes
create index if not exists idx_tokens_status on public.tokens(status);
create index if not exists idx_tokens_citizen_id on public.tokens(citizen_id);
create index if not exists idx_tokens_created_at on public.tokens(created_at);
create index if not exists idx_tokens_counter_id on public.tokens(counter_id);
create index if not exists idx_profiles_user_id on public.profiles(user_id);
create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_tokens_time_slot on public.tokens(time_slot);
create index if not exists idx_tokens_slot_date on public.tokens(slot_date);

-- Business constraints
create unique index if not exists uniq_active_token_per_user on public.tokens (citizen_id) where status in ('waiting','serving');

create or replace function public.enforce_slot_capacity()
returns trigger as $$
declare v_count int; v_time timestamptz; v_service text; v_status text; begin
  v_time := coalesce(new.time_slot, old.time_slot);
  v_service := coalesce(new.service_type, old.service_type);
  v_status := coalesce(new.status, old.status);
  if v_status is null then v_status := 'waiting'; end if;
  if v_time is null or v_service is null then return new; end if;
  select count(*) into v_count from public.tokens t
  where t.time_slot = v_time and t.service_type = v_service and t.status <> 'cancelled'
  and (tg_op='INSERT' or t.id <> new.id);
  if v_count >= 3 then raise exception 'Slot capacity reached for % at % (max 3)', v_service, v_time; end if;
  return new; end; $$ language plpgsql security definer set search_path=public;

drop trigger if exists trg_enforce_slot_capacity_ins on public.tokens;
create trigger trg_enforce_slot_capacity_ins before insert on public.tokens for each row execute function public.enforce_slot_capacity();

drop trigger if exists trg_enforce_slot_capacity_upd on public.tokens;
create trigger trg_enforce_slot_capacity_upd before update of time_slot, service_type, status on public.tokens for each row execute function public.enforce_slot_capacity();

create or replace function public.prevent_past_slots()
returns trigger as $$
declare v_time timestamptz; begin
  v_time := coalesce(new.time_slot, old.time_slot);
  if v_time < now() then raise exception 'Cannot book a past time slot'; end if;
  return new; end; $$ language plpgsql security definer set search_path=public;

drop trigger if exists trg_prevent_past_slots_ins on public.tokens;
create trigger trg_prevent_past_slots_ins before insert on public.tokens for each row execute function public.prevent_past_slots();

drop trigger if exists trg_prevent_past_slots_upd on public.tokens;
create trigger trg_prevent_past_slots_upd before update of time_slot on public.tokens for each row execute function public.prevent_past_slots();

-- Maintain slot_date from time_slot (avoid generated column immutability issues)
create or replace function public.set_slot_date_from_time_slot()
returns trigger as $$
begin
  if new.time_slot is not null then
    new.slot_date := (new.time_slot at time zone 'UTC')::date;
  end if;
  return new;
end; $$ language plpgsql security definer set search_path=public;

drop trigger if exists trg_set_slot_date_ins on public.tokens;
create trigger trg_set_slot_date_ins
  before insert on public.tokens
  for each row execute function public.set_slot_date_from_time_slot();

drop trigger if exists trg_set_slot_date_upd on public.tokens;
create trigger trg_set_slot_date_upd
  before update of time_slot on public.tokens
  for each row execute function public.set_slot_date_from_time_slot();

-- Seed counters
insert into public.counters (name, officer_name, is_active, services) values
('Counter 1', 'Available', true, array['general','license','registration']),
('Counter 2', 'Available', true, array['general','license','registration']),
('Counter 3', 'Available', true, array['general','license','registration'])
on conflict do nothing;

