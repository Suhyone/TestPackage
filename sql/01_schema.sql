-- ============================================================
-- BJCHI QA/QC ERP : Test Package > Punch List
-- วางทั้งไฟล์นี้ใน Supabase > SQL Editor แล้วกด Run (รันซ้ำได้)
-- ============================================================

-- ---------- Master data ----------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null default '',
  role        text not null default 'officer' check (role in ('admin','qc','officer')),
  discipline  text,
  created_at  timestamptz not null default now()
);

create table if not exists public.categories (      -- ลำดับความสำคัญในการแก้งาน
  code        text primary key,
  description text not null default '',
  sort_order  int  not null default 0
);

create table if not exists public.disciplines (     -- แผนก/ผู้รับผิดชอบ
  name        text primary key,
  sort_order  int not null default 0
);

insert into public.categories (code, description, sort_order) values
  ('A', 'Any subsequent operation or process cannot be performed until punch is closed.', 1),
  ('B', 'Subsequent operation can be proceeding with discretion of project manager.', 2)
on conflict (code) do update set description = excluded.description, sort_order = excluded.sort_order;

insert into public.disciplines (name, sort_order) values
  ('Piping',1),('Insulation',2),('Engineering',3),('Painting',4)
on conflict (name) do nothing;

-- ---------- Test Pack > Drawing > Punch item ----------
create table if not exists public.test_packs (
  id           bigint generated always as identity primary key,
  project_no   text not null,
  test_pack_no text not null,
  skid         text,
  created_at   timestamptz not null default now(),
  unique (project_no, test_pack_no)
);

create table if not exists public.drawings (        -- "punchlist" = เส้นท่อ/จุดเชื่อม
  id           bigint generated always as identity primary key,
  test_pack_id bigint not null references public.test_packs(id) on delete cascade,
  drawing_no   text not null,
  sheet        text,
  work_type    text check (work_type in ('welded','non_welded')),  -- QC เลือกเอง (null = ยังไม่ระบุ)
  report_path  text,                                  -- ไฟล์ Report (เฉพาะ welded)
  report_note  text,
  created_at   timestamptz not null default now(),
  unique (test_pack_id, drawing_no)
);

create table if not exists public.punch_items (
  id            bigint generated always as identity primary key,
  legacy_id     int unique,                           -- test_pack_punch_id เดิม
  drawing_id    bigint not null references public.drawings(id) on delete cascade,
  item_no       int,                                  -- เลขลำดับของวิศวกร
  category      text references public.categories(code) on update cascade,
  deficiency    text,
  discipline    text,
  status        text not null default 'open'
                check (status in ('open','close','cancelled')),   -- ตามฟอร์มโครงการ: O / C / N
  assigned_to   uuid references public.profiles(id),
  punch_by      text,
  punch_date    date,
  input_date    date,
  bjc_by        text,
  bjc_date      date,
  client_by     text,
  client_date   date,
  remarks       text,
  cancel_by     text,
  cancel_date   date,
  cancel_remark text,
  created_by    uuid references public.profiles(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists punch_items_drawing_idx on public.punch_items(drawing_id);
create index if not exists punch_items_status_idx  on public.punch_items(status);
create index if not exists drawings_pack_idx       on public.drawings(test_pack_id);

-- ประวัติแต่ละรอบ: defect (QC ถ่ายแท็ก) > fix (เจ้าหน้าที่แก้) > recheck (QC ตรวจ ผ่าน/ไม่ผ่าน)
create table if not exists public.punch_rounds (
  id            bigint generated always as identity primary key,
  punch_item_id bigint not null references public.punch_items(id) on delete cascade,
  round_no      int not null default 1,
  kind          text not null check (kind in ('defect','fix','recheck')),
  result        text check (result in ('pass','fail')),
  photo_paths   text[] not null default '{}',
  note          text,
  by_user       uuid references public.profiles(id),
  by_name       text,
  created_at    timestamptz not null default now()
);
create index if not exists punch_rounds_item_idx on public.punch_rounds(punch_item_id);

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
drop trigger if exists punch_items_touch on public.punch_items;
create trigger punch_items_touch before update on public.punch_items
  for each row execute function public.touch_updated_at();

-- สร้าง profile อัตโนมัติเมื่อมีผู้ใช้ใหม่ (role เริ่มต้น officer, Admin ปรับทีหลัง)
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email))
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- RLS ----------
create or replace function public.my_role() returns text
language sql stable security definer set search_path = public as
$$ select role from public.profiles where id = auth.uid() $$;

alter table public.profiles     enable row level security;
alter table public.categories   enable row level security;
alter table public.disciplines  enable row level security;
alter table public.test_packs   enable row level security;
alter table public.drawings     enable row level security;
alter table public.punch_items  enable row level security;
alter table public.punch_rounds enable row level security;

-- อ่าน: ผู้ใช้ที่ล็อกอินทุกคน
do $$
declare t text;
begin
  foreach t in array array['profiles','categories','disciplines','test_packs','drawings','punch_items','punch_rounds'] loop
    execute format('drop policy if exists "read_%1$s" on public.%1$s', t);
    execute format('create policy "read_%1$s" on public.%1$s for select to authenticated using (true)', t);
  end loop;
end $$;

-- เขียน: admin / qc เพิ่ม+แก้ไขได้ในตารางงาน, ลบได้เฉพาะ admin (qc ลบไม่ได้ — ใช้สถานะ Cancelled แทน)
do $$
declare t text;
begin
  foreach t in array array['test_packs','drawings','punch_items','punch_rounds'] loop
    execute format('drop policy if exists "qc_write_%1$s" on public.%1$s', t);
    execute format('drop policy if exists "qc_insert_%1$s" on public.%1$s', t);
    execute format('drop policy if exists "qc_update_%1$s" on public.%1$s', t);
    execute format('drop policy if exists "admin_delete_%1$s" on public.%1$s', t);
    execute format($p$create policy "qc_insert_%1$s" on public.%1$s for insert to authenticated
      with check (public.my_role() in ('admin','qc'))$p$, t);
    execute format($p$create policy "qc_update_%1$s" on public.%1$s for update to authenticated
      using (public.my_role() in ('admin','qc')) with check (public.my_role() in ('admin','qc'))$p$, t);
    execute format($p$create policy "admin_delete_%1$s" on public.%1$s for delete to authenticated
      using (public.my_role() = 'admin')$p$, t);
  end loop;
end $$;

-- Master data และ profiles: เฉพาะ admin
do $$
declare t text;
begin
  foreach t in array array['profiles','categories','disciplines'] loop
    execute format('drop policy if exists "admin_write_%1$s" on public.%1$s', t);
    execute format($p$create policy "admin_write_%1$s" on public.%1$s for all to authenticated
      using (public.my_role() = 'admin') with check (public.my_role() = 'admin')$p$, t);
  end loop;
end $$;

-- เจ้าหน้าที่: ส่งงานแก้ (บันทึกรอบ 'fix') ได้ทุกงานที่ยัง Open — สถานะยังเป็น Open จน QC ปิด
drop policy if exists "officer_update_items" on public.punch_items;
create policy "officer_update_items" on public.punch_items for update to authenticated
  using (public.my_role() = 'officer' and status = 'open')
  with check (public.my_role() = 'officer' and status = 'open');

drop policy if exists "officer_insert_rounds" on public.punch_rounds;
create policy "officer_insert_rounds" on public.punch_rounds for insert to authenticated
  with check (public.my_role() = 'officer' and kind = 'fix' and by_user = auth.uid());

-- ---------- Storage (รูปแท็ก/รูปแก้ไข/Report) ----------
insert into storage.buckets (id, name, public)
values ('punch-photos', 'punch-photos', false)
on conflict (id) do nothing;

drop policy if exists "punch_photos_read"   on storage.objects;
drop policy if exists "punch_photos_insert" on storage.objects;
drop policy if exists "punch_photos_delete" on storage.objects;
create policy "punch_photos_read"   on storage.objects for select to authenticated
  using (bucket_id = 'punch-photos');
create policy "punch_photos_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'punch-photos');
create policy "punch_photos_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'punch-photos' and public.my_role() = 'admin');

-- ---------- ตั้งผู้ใช้คนแรกเป็น admin (แก้อีเมลแล้วรัน) ----------
-- update public.profiles set role = 'admin' where id = (select id from auth.users where email = 'you@bjc1994.com');
drop view if exists public.v_punch_items;
create view public.v_punch_items with (security_invoker = true) as
select i.*, d.drawing_no, d.work_type, d.test_pack_id, t.test_pack_no, t.skid, t.project_no
from public.punch_items i
join public.drawings d   on d.id = i.drawing_id
join public.test_packs t on t.id = d.test_pack_id;

grant select on public.v_punch_items to authenticated;
