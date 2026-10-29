-- 18: Unit / Module ของ External punch — เก็บไว้ที่ punch_items เอง (punch ปกติอ่านจาก Test Package ผ่าน view)
--   v_punch_items: unit_no / module_no = coalesce(ค่าของ punch, ค่าของ Test Package) · ต่อท้ายสุดของ view
--   หน้าเว็บตรวจเองว่ามีคอลัมน์หรือยัง ถ้ายังไม่รันไฟล์นี้ External จะใส่ Unit/Module ไว้หน้าข้อความ Area แทน
--   ไม่มี view อื่นอ้าง v_punch_items (ตรวจใน sql/01–17) จึง drop แล้วสร้างใหม่ได้เลย
-- รันซ้ำได้ · รันหลัง 17_punch_phrases.sql

alter table public.punch_items
  add column if not exists unit_no   text,
  add column if not exists module_no text;

-- สร้าง view ใหม่: ระบุคอลัมน์ของ punch_items เองทีละตัว (ไม่ใช้ i.*) เพราะ i.* จะมี unit_no/module_no ชนกับคอลัมน์ท้าย view
do $$
declare cols text;
begin
  select string_agg('i.' || quote_ident(column_name), ', ' order by ordinal_position) into cols
  from information_schema.columns
  where table_schema = 'public' and table_name = 'punch_items' and column_name not in ('unit_no', 'module_no');

  drop view if exists public.v_punch_items;
  execute 'create view public.v_punch_items with (security_invoker = true) as select ' || cols
    || ', d.drawing_no, d.work_type, d.test_pack_id, t.test_pack_no, t.skid, t.project_no, t.piping_system, t.piping_name,'
    || ' coalesce(i.unit_no, t.unit_no) as unit_no, coalesce(i.module_no, t.module_no) as module_no'
    || ' from public.punch_items i'
    || ' join public.drawings d   on d.id = i.drawing_id'
    || ' join public.test_packs t on t.id = d.test_pack_id';
  grant select on public.v_punch_items to authenticated;
end $$;

select count(*) as punch_items, count(unit_no) as with_unit from public.v_punch_items;
