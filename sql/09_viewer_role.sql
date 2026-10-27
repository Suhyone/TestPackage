-- 09: เพิ่มสิทธิ์ 'viewer' (อ่านอย่างเดียว — เช่น ลูกค้า CIMTAS) ในตาราง profiles
-- รันซ้ำได้ ไม่กระทบ role เดิม  ·  viewer ไม่มีสิทธิ์เขียนใน policy ใด (policy เขียนทั้งหมดเช็ก admin/qc/officer เท่านั้น)
-- สิทธิ์อ่าน: ใช้ policy select ของ authenticated เดิมใน 01/05/06/07 — ตรวจในหน้าเว็บด้วยบัญชี viewer ก่อนใช้งานจริง
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('admin','qc','officer','viewer'));

-- อัปโหลดรูป punch: เฉพาะ admin / qc / officer (เดิมผู้ใช้ที่ล็อกอินทุกคนอัปโหลดได้ — viewer จึงเขียนผ่าน API ตรงได้)
drop policy if exists "punch_photos_insert" on storage.objects;
create policy "punch_photos_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'punch-photos' and public.my_role() in ('admin','qc','officer'));
