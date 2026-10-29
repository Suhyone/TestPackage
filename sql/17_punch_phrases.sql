-- 17: ข้อความสำเร็จรูป (quick text) ร่วมกันทุกคน ของช่อง Punch item description ในหน้า Field
--   ข้อความที่มี [__] = ช่องว่างให้กรอกตัวเลข (หน้า Field จะถามเลขแล้วแทนที่ก่อนบันทึก)
--   สิทธิ์: ทุกคนที่ล็อกอินอ่านได้ · admin / qc / officer เพิ่มได้ · แก้/ลบได้เฉพาะ admin
--   หน้าเว็บยังใช้ได้ถ้ายังไม่ได้รันไฟล์นี้ (ใช้ข้อความที่เก็บในเครื่องแทน)
-- รันซ้ำได้ · รันหลัง 16_punch_item_history.sql

create table if not exists public.punch_phrases (
  id              bigint generated always as identity primary key,
  text            text not null,
  created_by      uuid,
  created_by_name text,
  created_at      timestamptz not null default now()
);
create unique index if not exists punch_phrases_text_uq on public.punch_phrases (lower(btrim(text)));

alter table public.punch_phrases enable row level security;
drop policy if exists "read_punch_phrases" on public.punch_phrases;
create policy "read_punch_phrases" on public.punch_phrases for select to authenticated using (true);
drop policy if exists "insert_punch_phrases" on public.punch_phrases;
create policy "insert_punch_phrases" on public.punch_phrases for insert to authenticated with check (public.my_role() in ('admin','qc','officer'));
drop policy if exists "admin_update_punch_phrases" on public.punch_phrases;
create policy "admin_update_punch_phrases" on public.punch_phrases for update to authenticated using (public.my_role() = 'admin') with check (public.my_role() = 'admin');
drop policy if exists "admin_delete_punch_phrases" on public.punch_phrases;
create policy "admin_delete_punch_phrases" on public.punch_phrases for delete to authenticated using (public.my_role() = 'admin');
grant select, insert, update, delete on public.punch_phrases to authenticated;

insert into public.punch_phrases (text) values
  ('U-bolt ต้องมีแก็บด้านบน [__] mm'),
  ('U-bolt ต้องมีแก็บด้านล่าง [__] mm'),
  ('U-bolt ต้องมีแก็บด้านข้าง [__] mm'),
  ('น๊อตของ U-Bolt ต้องอยู่บน 1 ตัว ล่าง 1 ตัว'),
  ('ใส่ Linner plate [__] mm'),
  ('ใส่ U-Bolt')
on conflict do nothing;

select count(*) as phrase_rows from public.punch_phrases;
