create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'profile_role') then
    create type public.profile_role as enum ('admin', 'user');
  end if;
end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role public.profile_role not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.error_reports (
  id uuid primary key default gen_random_uuid(),
  human_id bigint generated always as identity unique,
  title text not null,
  description text,
  error_date date,
  affected_area text,
  error_type text,
  severity text,
  financial_impact numeric,
  status text,
  responsible_profile_id uuid references public.profiles(id) on delete set null,
  opened_at date,
  resolved_at date,
  happened_before boolean,
  corrective_action text,
  reported_by_profile_id uuid references public.profiles(id) on delete set null,
  reported_by_name text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint error_reports_reported_by_check check (
    reported_by_profile_id is not null or reported_by_name is not null
  )
);

create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  error_report_id uuid not null references public.error_reports(id) on delete cascade,
  storage_bucket text,
  storage_path text,
  file_url text,
  external_url text,
  file_name text,
  file_size bigint,
  mime_type text,
  kind text not null default 'file' check (kind in ('file', 'image', 'link')),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint attachments_has_location_check check (
    storage_path is not null or file_url is not null or external_url is not null
  )
);

create table if not exists public.select_options (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  label text not null,
  value text not null,
  color text not null default '#a4a4a8',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (type, value)
);

create table if not exists public.table_layout_settings (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  column_key text not null,
  column_label text not null,
  visible boolean not null default true,
  width integer not null default 160,
  position integer not null default 0,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (table_name, column_key)
);

create table if not exists public.reported_people (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (name)
);

create table if not exists public.custom_fields (
  id uuid primary key default gen_random_uuid(),
  table_name text not null default 'error_reports',
  label text not null,
  field_key text not null,
  field_type text not null check (field_type in ('text', 'number', 'select', 'status', 'date', 'person', 'checkbox', 'url', 'email')),
  is_required boolean not null default false,
  is_active boolean not null default true,
  width integer not null default 160,
  position integer not null default 1000,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (table_name, field_key)
);

create table if not exists public.custom_field_options (
  id uuid primary key default gen_random_uuid(),
  field_id uuid not null references public.custom_fields(id) on delete cascade,
  label text not null,
  value text not null,
  color text not null default '#8f949b',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (field_id, value)
);

create table if not exists public.custom_field_values (
  id uuid primary key default gen_random_uuid(),
  error_report_id uuid not null references public.error_reports(id) on delete cascade,
  field_id uuid not null references public.custom_fields(id) on delete cascade,
  value text,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (error_report_id, field_id)
);

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_error_reports_updated_at on public.error_reports;
create trigger set_error_reports_updated_at
before update on public.error_reports
for each row execute function public.set_updated_at();

drop trigger if exists set_select_options_updated_at on public.select_options;
create trigger set_select_options_updated_at
before update on public.select_options
for each row execute function public.set_updated_at();

drop trigger if exists set_custom_fields_updated_at on public.custom_fields;
create trigger set_custom_fields_updated_at
before update on public.custom_fields
for each row execute function public.set_updated_at();

drop trigger if exists set_custom_field_options_updated_at on public.custom_field_options;
create trigger set_custom_field_options_updated_at
before update on public.custom_field_options
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    coalesce(new.email, ''),
    nullif(new.raw_user_meta_data->>'full_name', ''),
    'user'
  )
  on conflict (id) do update
  set email = excluded.email,
      full_name = coalesce(public.profiles.full_name, excluded.full_name);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_admin(user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = user_id
      and role = 'admin'
  );
$$;

alter table public.profiles enable row level security;
alter table public.error_reports enable row level security;
alter table public.attachments enable row level security;
alter table public.select_options enable row level security;
alter table public.table_layout_settings enable row level security;
alter table public.reported_people enable row level security;
alter table public.custom_fields enable row level security;
alter table public.custom_field_options enable row level security;
alter table public.custom_field_values enable row level security;

drop policy if exists "Authenticated users can read profiles" on public.profiles;
create policy "Authenticated users can read profiles"
on public.profiles for select
to authenticated
using (true);

drop policy if exists "Admins can update profiles" on public.profiles;
create policy "Admins can update profiles"
on public.profiles for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Authenticated users can read error reports" on public.error_reports;
create policy "Authenticated users can read error reports"
on public.error_reports for select
to authenticated
using (true);

drop policy if exists "Authenticated users can create error reports" on public.error_reports;
create policy "Authenticated users can create error reports"
on public.error_reports for insert
to authenticated
with check (created_by = auth.uid());

drop policy if exists "Admins and creators can update error reports" on public.error_reports;
create policy "Admins and creators can update error reports"
on public.error_reports for update
to authenticated
using (public.is_admin() or created_by = auth.uid())
with check (public.is_admin() or created_by = auth.uid());

drop policy if exists "Admins can delete error reports" on public.error_reports;
create policy "Admins can delete error reports"
on public.error_reports for delete
to authenticated
using (public.is_admin());

drop policy if exists "Authenticated users can read attachments" on public.attachments;
create policy "Authenticated users can read attachments"
on public.attachments for select
to authenticated
using (deleted_at is null);

drop policy if exists "Authenticated users can create attachments" on public.attachments;
create policy "Authenticated users can create attachments"
on public.attachments for insert
to authenticated
with check (
  created_by = auth.uid()
  and deleted_at is null
  and exists (
    select 1
    from public.error_reports
    where error_reports.id = attachments.error_report_id
      and (public.is_admin() or error_reports.created_by = auth.uid())
  )
);

drop policy if exists "Admins and creators can update attachments" on public.attachments;
create policy "Admins and creators can update attachments"
on public.attachments for update
to authenticated
using (public.is_admin() or created_by = auth.uid())
with check (public.is_admin() or created_by = auth.uid());

drop policy if exists "Admins can delete attachments" on public.attachments;
create policy "Admins can delete attachments"
on public.attachments for delete
to authenticated
using (public.is_admin());

drop policy if exists "Authenticated users can read select options" on public.select_options;
create policy "Authenticated users can read select options"
on public.select_options for select
to authenticated
using (true);

drop policy if exists "Admins can manage select options" on public.select_options;
create policy "Admins can manage select options"
on public.select_options for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Authenticated users can read table layout settings" on public.table_layout_settings;
create policy "Authenticated users can read table layout settings"
on public.table_layout_settings for select
to authenticated
using (true);

drop policy if exists "Admins can manage table layout settings" on public.table_layout_settings;
create policy "Admins can manage table layout settings"
on public.table_layout_settings for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Authenticated users can read reported people" on public.reported_people;
create policy "Authenticated users can read reported people"
on public.reported_people for select
to authenticated
using (true);

drop policy if exists "Authenticated users can create reported people" on public.reported_people;
create policy "Authenticated users can create reported people"
on public.reported_people for insert
to authenticated
with check (created_by = auth.uid() or created_by is null);

drop policy if exists "Admins and creators can update reported people" on public.reported_people;
create policy "Admins and creators can update reported people"
on public.reported_people for update
to authenticated
using (public.is_admin() or created_by = auth.uid())
with check (public.is_admin() or created_by = auth.uid());

drop policy if exists "Admins can delete reported people" on public.reported_people;
create policy "Admins can delete reported people"
on public.reported_people for delete
to authenticated
using (public.is_admin());

drop policy if exists "Authenticated users can read custom fields" on public.custom_fields;
create policy "Authenticated users can read custom fields"
on public.custom_fields for select
to authenticated
using (true);

drop policy if exists "Admins can manage custom fields" on public.custom_fields;
create policy "Admins can manage custom fields"
on public.custom_fields for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Authenticated users can read custom field options" on public.custom_field_options;
create policy "Authenticated users can read custom field options"
on public.custom_field_options for select
to authenticated
using (true);

drop policy if exists "Admins can manage custom field options" on public.custom_field_options;
create policy "Admins can manage custom field options"
on public.custom_field_options for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Authenticated users can read custom field values" on public.custom_field_values;
create policy "Authenticated users can read custom field values"
on public.custom_field_values for select
to authenticated
using (true);

drop policy if exists "Authenticated users can manage custom field values" on public.custom_field_values;
create policy "Authenticated users can manage custom field values"
on public.custom_field_values for all
to authenticated
using (
  exists (
    select 1 from public.error_reports
    where error_reports.id = custom_field_values.error_report_id
      and (public.is_admin() or error_reports.created_by = auth.uid())
  )
)
with check (
  exists (
    select 1 from public.error_reports
    where error_reports.id = custom_field_values.error_report_id
      and (public.is_admin() or error_reports.created_by = auth.uid())
  )
);

insert into public.select_options (type, label, value, color, sort_order)
values
  ('affected_area', 'Atendimento', 'atendimento', '#a06a86', 10),
  ('affected_area', 'Estoque', 'estoque', '#4f7da8', 20),
  ('affected_area', 'Expedicao', 'expedicao', '#8063a8', 30),
  ('affected_area', 'Marketplace', 'marketplace', '#a76b45', 40),
  ('affected_area', 'Transportadora', 'transportadora', '#7a7a74', 50),
  ('affected_area', 'Financeiro', 'financeiro', '#a68a3f', 60),
  ('error_type', 'Avaria', 'avaria', '#a06666', 10),
  ('error_type', 'Cadastro/Dados', 'cadastro_dados', '#657fa5', 20),
  ('error_type', 'Humano', 'humano', '#9a7f4e', 30),
  ('error_type', 'Sistema', 'sistema', '#5f8e7d', 40),
  ('error_type', 'Integracao', 'integracao', '#8667a8', 50),
  ('error_type', 'Terceiros', 'terceiros', '#6f8496', 60),
  ('severity', 'Baixa', 'baixa', '#5d8a6b', 10),
  ('severity', 'Media', 'media', '#9b884d', 20),
  ('severity', 'Alta', 'alta', '#a56d42', 30),
  ('severity', 'Critica', 'critica', '#a45555', 40),
  ('status', 'Em andamento', 'em_andamento', '#5b7fa7', 10),
  ('status', 'Aguardando Informacoes', 'aguardando_informacoes', '#9b884d', 20),
  ('status', 'Concluida', 'concluida', '#5d8a6b', 30),
  ('happened_before', 'Sim', 'true', '#9b884d', 10),
  ('happened_before', 'Nao', 'false', '#6f8496', 20)
on conflict (type, value) do update
set label = excluded.label,
    color = excluded.color,
    sort_order = excluded.sort_order,
    is_active = true;

insert into public.table_layout_settings
  (table_name, column_key, column_label, visible, width, position)
values
  ('error_reports', 'human_id', 'ID', true, 96, 10),
  ('error_reports', 'title', 'Titulo', true, 280, 20),
  ('error_reports', 'affected_area', 'Area afetada', true, 160, 30),
  ('error_reports', 'error_type', 'Tipo de erro', true, 160, 40),
  ('error_reports', 'severity', 'Severidade', true, 140, 50),
  ('error_reports', 'financial_impact', 'Impacto financeiro', true, 160, 60),
  ('error_reports', 'status', 'Status', true, 180, 70),
  ('error_reports', 'responsible_profile_id', 'Responsavel', true, 180, 80),
  ('error_reports', 'reported_by', 'Reportado por', true, 180, 90),
  ('error_reports', 'opened_at', 'Aberto em', true, 130, 100),
  ('error_reports', 'resolved_at', 'Resolvido em', true, 130, 110)
on conflict (table_name, column_key) do update
set column_label = excluded.column_label,
    visible = excluded.visible,
    width = excluded.width,
    position = excluded.position;

create index if not exists error_reports_created_by_idx on public.error_reports(created_by);
create index if not exists error_reports_responsible_profile_id_idx on public.error_reports(responsible_profile_id);
create index if not exists error_reports_reported_by_profile_id_idx on public.error_reports(reported_by_profile_id);
create index if not exists attachments_error_report_id_idx on public.attachments(error_report_id);
create index if not exists attachments_storage_path_idx on public.attachments(storage_path);
create index if not exists select_options_type_idx on public.select_options(type, sort_order);
create index if not exists custom_fields_table_position_idx on public.custom_fields(table_name, position);
create index if not exists custom_field_options_field_idx on public.custom_field_options(field_id, sort_order);
create index if not exists custom_field_values_report_idx on public.custom_field_values(error_report_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'tasky-attachments',
  'tasky-attachments',
  false,
  10485760,
  array['image/png', 'image/jpeg', 'image/webp', 'application/pdf']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Tasky users can read attachment objects" on storage.objects;
create policy "Tasky users can read attachment objects"
on storage.objects for select
to authenticated
using (
  bucket_id = 'tasky-attachments'
  and exists (
    select 1
    from public.attachments
    where attachments.storage_bucket = storage.objects.bucket_id
      and attachments.storage_path = storage.objects.name
      and attachments.deleted_at is null
  )
);

drop policy if exists "Tasky users can upload attachment objects" on storage.objects;
create policy "Tasky users can upload attachment objects"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'tasky-attachments'
  and split_part(name, '/', 1) = 'error-reports'
  and exists (
    select 1
    from public.error_reports
    where error_reports.id = nullif(split_part(name, '/', 2), '')::uuid
      and (public.is_admin() or error_reports.created_by = auth.uid())
  )
);

drop policy if exists "Tasky users can delete own attachment objects" on storage.objects;
create policy "Tasky users can delete own attachment objects"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'tasky-attachments'
  and exists (
    select 1
    from public.attachments
    where attachments.storage_bucket = storage.objects.bucket_id
      and attachments.storage_path = storage.objects.name
      and (public.is_admin() or attachments.created_by = auth.uid())
  )
);

-- Depois de criar a primeira conta pelo signup, rode uma vez para promover o admin inicial:
-- update public.profiles set role = 'admin' where email = 'seu-email@empresa.com';
