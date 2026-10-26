-- View รวม punch_items + drawings + test_packs เป็นแถวเดียว ให้ฐานข้อมูลเรียง Test Package > Drawing > Item ให้เอง
-- (หน้า qc_list.js ดึงข้อมูลเป็นชุด ๆ เบื้องหลัง — ถ้าเรียงฝั่งฐานข้อมูลได้ตั้งแต่ชุดแรก แถวบนสุดจะนิ่ง ไม่กระโดดตอนโหลดต่อ)
-- วางใน Supabase > SQL Editor แล้ว Run (รันซ้ำได้) — security_invoker = ใช้สิทธิ์ RLS ของผู้เรียก เหมือนอ่านตารางเดิม
drop view if exists public.v_punch_items;
create view public.v_punch_items with (security_invoker = true) as
select i.*, d.drawing_no, d.work_type, d.test_pack_id, t.test_pack_no, t.skid, t.project_no
from public.punch_items i
join public.drawings d   on d.id = i.drawing_id
join public.test_packs t on t.id = d.test_pack_id;

grant select on public.v_punch_items to authenticated;

-- ตรวจผล
select test_pack_no, drawing_no, item_no, status from public.v_punch_items
order by test_pack_no, drawing_no, item_no limit 5;
