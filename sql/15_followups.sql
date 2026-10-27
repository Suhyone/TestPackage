-- 15: งานต่อเนื่องหลังรอบ QA 5 — รันซ้ำได้ · ต้องรันหลัง 14_signatures.sql
-- (ก) รูปลายเซ็น (prefix signatures/ ใน bucket 'punch-photos') อ่านได้เฉพาะ admin / qc / officer — viewer (เช่น ลูกค้า) อ่านไม่ได้
--     รูป punch ปกติ (prefix อื่นทั้งหมด) ยังอ่านได้ทุกคนที่ล็อกอินเหมือนเดิม จึงไม่กระทบรูป punch เดิม
--     คำเตือน: viewer จะไม่เห็นรูปลายเซ็นในแท็บ Sign-off และในรายงาน Punch List แบบพิมพ์ (ช่องลายเซ็นจะว่าง) — ถ้าต้องการให้ viewer เห็น ให้ลบ policy ใหม่นี้แล้วสร้าง punch_photos_read แบบเดิมจาก 01_schema.sql
--     ผู้ใช้ที่ไม่มีโปรไฟล์ (my_role() เป็น null) จะอ่านลายเซ็นไม่ได้ด้วย (ถือเป็น viewer)
-- (ข) ไฟล์ลายเซ็นเก่า (orphan) — เมื่อเปลี่ยน/ลบลายเซ็น ระบบลบเฉพาะ path ในฐานข้อมูล ไฟล์เดิมยังค้างในที่เก็บรูป
--     ให้ admin ล้างเป็นรอบ ๆ ที่ Supabase > Storage > bucket punch-photos > โฟลเดอร์ signatures/ (ลบไฟล์ที่ path ไม่ตรงกับคอลัมน์ *_sig ของ test_packs / punch_reports อีกแล้ว)
-- (ค) แถว pressure_tests เก่าที่ผิดกฎ — constraint ใน 13_hardening.sql เพิ่มแบบ NOT VALID (ตรวจเฉพาะแถวใหม่/แถวที่ถูกแก้) ดูตัวอย่างตรวจ/ยืนยันที่ท้ายไฟล์

drop policy if exists "punch_photos_read" on storage.objects;
create policy "punch_photos_read" on storage.objects for select to authenticated
  using (
    bucket_id = 'punch-photos'
    and (name not like 'signatures/%' or public.my_role() in ('admin','qc','officer'))
  );

-- ---------- ตัวอย่างตรวจแถวเก่าที่ผิดกฎ (รันเองใน SQL Editor ตามต้องการ — คอมเมนต์ไว้) ----------
-- ผ่านโดยค่าไม่ถึงเกณฑ์:
--   select id, test_pack_id, result, max_reading, required_pressure, holding_time_min, required_holding_min
--   from public.pressure_tests
--   where result <> 'fail' and not (max_reading >= coalesce(required_pressure, 0) and holding_time_min >= coalesce(required_holding_min, 0));
-- เกจหมดอายุก่อนวันทดสอบ:
--   select id, test_pack_id, test_date, gauge_cal_due from public.pressure_tests where not (gauge_cal_due >= test_date);
-- ค่าติดลบ:
--   select id, test_pack_id from public.pressure_tests
--   where not (max_reading >= 0 and holding_time_min >= 0 and coalesce(start_reading, 0) >= 0 and coalesce(end_reading, 0) >= 0);
-- เมื่อแก้/ยืนยันแถวเหล่านั้นแล้ว (query ข้างบนไม่พบแถว) จึงยืนยัน constraint ทั้งชุด:
--   alter table public.pressure_tests validate constraint pressure_tests_pass_rule;
--   alter table public.pressure_tests validate constraint pressure_tests_gauge_valid;
--   alter table public.pressure_tests validate constraint pressure_tests_values_ok;
