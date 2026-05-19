alter table public.attachments
  add column if not exists storage_bucket text,
  add column if not exists storage_path text,
  add column if not exists file_size bigint,
  add column if not exists kind text,
  add column if not exists deleted_at timestamptz;

update public.attachments
set kind = case
  when external_url is not null then 'link'
  when mime_type like 'image/%' then 'image'
  else 'file'
end
where kind is null;

alter table public.attachments
  alter column kind set default 'file',
  alter column kind set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'attachments_kind_check'
      and conrelid = 'public.attachments'::regclass
  ) then
    alter table public.attachments
      add constraint attachments_kind_check check (kind in ('file', 'image', 'link'));
  end if;
end $$;

alter table public.attachments
  drop constraint if exists attachments_has_location_check;

alter table public.attachments
  add constraint attachments_has_location_check check (
    storage_path is not null or file_url is not null or external_url is not null
  );

create index if not exists attachments_storage_path_idx on public.attachments(storage_path);

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
using (public.is_admin() or created_by = auth.uid());

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
