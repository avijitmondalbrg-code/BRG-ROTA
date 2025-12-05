-- Create Locations Table
create table public.locations (
  id text primary key,
  name text not null,
  color text not null
);

-- Create Employees Table
create table public.employees (
  id text primary key,
  name text not null,
  role text not null,
  category text not null,
  default_location_id text references public.locations(id),
  preferred_hours numeric default 40
);

-- Create Shifts Table
create table public.shifts (
  id text primary key,
  name text not null,
  color text,
  start_time text not null,
  end_time text not null,
  hours numeric not null
);

-- Create Assignments Table
create table public.assignments (
  id text primary key,
  date text not null,
  employee_id text references public.employees(id) on delete cascade,
  shift_id text references public.shifts(id) on delete cascade,
  location_id text references public.locations(id)
);

-- Enable Row Level Security (RLS) but allow public access for this demo
alter table public.locations enable row level security;
alter table public.employees enable row level security;
alter table public.shifts enable row level security;
alter table public.assignments enable row level security;

-- Create policies to allow everyone to read/write (SIMPLIFIED FOR DEMO)
create policy "Allow all access" on public.locations for all using (true) with check (true);
create policy "Allow all access" on public.employees for all using (true) with check (true);
create policy "Allow all access" on public.shifts for all using (true) with check (true);
create policy "Allow all access" on public.assignments for all using (true) with check (true);