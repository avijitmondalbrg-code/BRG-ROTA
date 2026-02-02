
-- Drop existing tables to start fresh (Warning: This deletes existing data in Supabase)
-- DROP TABLE IF EXISTS public.assignments;
-- DROP TABLE IF EXISTS public.employees;
-- DROP TABLE IF EXISTS public.shifts;
-- DROP TABLE IF EXISTS public.locations;

-- 1. Create Locations Table
create table if not exists public.locations (
  id text primary key,
  name text not null,
  color text not null
);

-- 2. Create Employees Table (Added available_days)
create table if not exists public.employees (
  id text primary key,
  name text not null,
  role text not null,
  category text not null,
  default_location_id text references public.locations(id) on delete set null,
  preferred_hours numeric default 40,
  available_days text[] default '{"Mon","Tue","Wed","Thu","Fri","Sat","Sun"}'
);

-- 3. Create Shifts Table
create table if not exists public.shifts (
  id text primary key,
  name text not null,
  color text,
  start_time text not null,
  end_time text not null,
  hours numeric not null
);

-- 4. Create Assignments Table
create table if not exists public.assignments (
  id text primary key,
  date text not null,
  employee_id text references public.employees(id) on delete cascade,
  shift_id text references public.shifts(id) on delete cascade,
  location_id text references public.locations(id) on delete set null
);

-- Enable Row Level Security (RLS)
alter table public.locations enable row level security;
alter table public.employees enable row level security;
alter table public.shifts enable row level security;
alter table public.assignments enable row level security;

-- Create ALL ACCESS policies (For Demo/Internal Use)
-- This allows anyone with the API key to read/write.
do $$ 
begin
    execute 'create policy "Public Access" on public.locations for all using (true) with check (true)';
    execute 'create policy "Public Access" on public.employees for all using (true) with check (true)';
    execute 'create policy "Public Access" on public.shifts for all using (true) with check (true)';
    execute 'create policy "Public Access" on public.assignments for all using (true) with check (true)';
exception when others then 
    null; 
end $$;
