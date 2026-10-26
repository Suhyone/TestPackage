-- ============================================================
-- View สรุปต่อ Test Package สำหรับหน้า Test Packages (Register) และหน้ารายละเอียด
-- รันหลัง 05_ct8_migration.sql  (ใช้คอลัมน์ module_no / piping_system ... และตาราง punch_reports)
-- วางใน Supabase > SQL Editor แล้ว Run (รันซ้ำได้) — security_invoker = ใช้สิทธิ์ RLS ของผู้เรียก
--
-- punch_state (สรุปว่า pack นี้พร้อมทดสอบหรือยัง ตามกฎของฟอร์ม):
--   blocked = ยังมี punch Category A ที่ Open  → ห้ามทดสอบแรงดัน
--   open    = มี punch Open แต่เป็น Category B → ทำงานต่อได้ตามดุลยพินิจของ PM
--   clear   = มี punch และปิด (Close) หมดแล้ว
--   none    = ยังไม่มี punch item
-- ============================================================
drop view if exists public.v_test_packs;
create view public.v_test_packs with (security_invoker = true) as
select t.id, t.project_no, t.test_pack_no, t.skid, t.module_no, t.location, t.piping_system, t.piping_name, t.pid_no,
       t.test_medium, t.design_pressure, t.design_temp, t.fluid_code, t.pipe_material, t.test_pressure, t.holding_time_min,
       r.inspection_date,
       coalesce(c.items_total, 0)::int   as items_total,
       coalesce(c.items_open, 0)::int    as items_open,
       coalesce(c.open_a, 0)::int        as open_a,
       coalesce(c.open_b, 0)::int        as open_b,
       coalesce(c.items_closed, 0)::int  as items_closed,
       case when coalesce(c.open_a, 0) > 0 then 'blocked'
            when coalesce(c.items_open, 0) > 0 then 'open'
            when coalesce(c.items_total, 0) > 0 then 'clear'
            else 'none' end              as punch_state
from public.test_packs t
left join public.punch_reports r on r.test_pack_id = t.id
left join (
  select d.test_pack_id,
         count(*) filter (where i.status <> 'cancelled')                      as items_total,
         count(*) filter (where i.status = 'open')                            as items_open,
         count(*) filter (where i.status = 'open' and i.category = 'A')       as open_a,
         count(*) filter (where i.status = 'open' and i.category = 'B')       as open_b,
         count(*) filter (where i.status = 'close')                           as items_closed
  from public.punch_items i
  join public.drawings d on d.id = i.drawing_id
  group by d.test_pack_id
) c on c.test_pack_id = t.id;

grant select on public.v_test_packs to authenticated;

-- ตรวจผล
select punch_state, count(*) as packs from public.v_test_packs group by punch_state order by punch_state;
