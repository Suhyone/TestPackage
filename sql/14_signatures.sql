-- 14: รูปลายเซ็นในแท็บ Sign-off (path ของไฟล์ในที่เก็บรูป bucket 'punch-photos' โฟลเดอร์ signatures/<test_pack_id>/)
--   test_packs     : ลายเซ็น 3 ช่องของ Pressure Test Information
--   punch_reports  : ลายเซ็น 4 ช่องของใบ Punch List (แสดงในรายงานพิมพ์ด้วย)
-- รันซ้ำได้ · ต้องรัน 05_ct8_migration.sql ก่อน · ถ้ายังไม่รัน หน้าเว็บจะซ่อนส่วนรูปลายเซ็น (ส่วนอื่นใช้งานได้ปกติ)
-- สิทธิ์อัปโหลดไฟล์ใช้ policy ของ bucket เดิม (09_viewer_role.sql: admin / qc / officer) และการบันทึก path ใช้สิทธิ์แก้ตารางเดิม (QC / admin)
alter table public.test_packs
  add column if not exists signed_prepared_sig  text,
  add column if not exists signed_inspector_sig text,
  add column if not exists signed_approved_sig  text;
alter table public.punch_reports
  add column if not exists completed_sig      text,
  add column if not exists bjchi_sig          text,
  add column if not exists cimtas_sig         text,
  add column if not exists representative_sig text;
