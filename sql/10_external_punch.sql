-- 10: External punch — ตำหนิที่ไม่อยู่ใน Test Package ใด
-- เก็บใต้ pack พิเศษชื่อ 'EXTERNAL' (โครงการละ 1 pack, สร้างอัตโนมัติจากฟอร์มเพิ่มตำหนิ) โดย drawing_no = พื้นที่/ตำแหน่งที่ผู้ใช้พิมพ์
-- ไฟล์นี้ซ่อน pack EXTERNAL ออกจาก v_test_packs (Register / จำนวน pack) — punch ของมันยังเห็นในหน้า Punch List ตามปกติ
-- และไม่เกี่ยวกับ gate ทดสอบแรงดันของ pack ใด · รันซ้ำได้ · ไม่ต้องรันถ้ายังไม่ใช้ External punch (แต่ pack EXTERNAL จะโผล่ใน Register จนกว่าจะรัน)
-- ต้องรันหลัง 06_test_package_register.sql
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
) c on c.test_pack_id = t.id
where t.test_pack_no <> 'EXTERNAL';

grant select on public.v_test_packs to authenticated;
