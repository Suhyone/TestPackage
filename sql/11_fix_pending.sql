  -- 11: fix_pending — "ส่งงานแก้แล้ว รอ QC ตรวจ" (ไม่ใช่สถานะใหม่ สถานะยังมีแค่ Open / Close / Cancelled ตามฟอร์ม)
  -- หน้าเว็บใช้แสดงป้าย "Fix submitted" และชิป "Waiting for QC" / "To fix" ใน Punch List
  --   Submit Fix → true · QC ปิด / ตีกลับ / ยกเลิก / เปิดใหม่ → false (หน้าเว็บตั้งค่านี้เอง ตอนบันทึกรอบ)
  -- รันซ้ำได้ · รันหลัง 05_ct8_migration.sql · ถ้ายังไม่รัน หน้าเว็บทำงานปกติแต่ไม่แสดงป้าย/ชิปนี้
  
  alter table public.punch_items add column if not exists fix_pending boolean not null default false;
  
  -- ข้อมูลเดิม: งานที่ยัง Open และรอบล่าสุดคือ 'fix' (ยังไม่มี QC ตรวจต่อ) = รอ QC
  update public.punch_items i set fix_pending = true
  where i.status = 'open' and not i.fix_pending
    and (select r.kind from public.punch_rounds r where r.punch_item_id = i.id order by r.created_at desc, r.id desc limit 1) = 'fix';
  
  -- view ต้องสร้างใหม่เพื่อให้เห็นคอลัมน์ใหม่ (i.* ถูกขยายตอนสร้าง view)
  drop view if exists public.v_punch_items;
  create view public.v_punch_items with (security_invoker = true) as
  select i.*, d.drawing_no, d.work_type, d.test_pack_id, t.test_pack_no, t.skid, t.project_no,
         t.module_no, t.piping_system, t.piping_name
  from public.punch_items i
  join public.drawings d   on d.id = i.drawing_id
  join public.test_packs t on t.id = d.test_pack_id;
  grant select on public.v_punch_items to authenticated;
  
  select count(*) filter (where fix_pending) as waiting_for_qc, count(*) filter (where status = 'open' and not fix_pending) as to_fix from public.punch_items;
