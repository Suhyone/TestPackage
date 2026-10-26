-- ============================================================
-- ปรับฐานข้อมูลให้รองรับไฟล์ Test Package ของโครงการ CT8  (Sheet1 = PRESSURE TEST INFORMATION, Sheet6 = PROCESS PUNCH-LIST)
-- วางทั้งไฟล์ใน Supabase > SQL Editor แล้ว Run  (รันซ้ำได้ ยกเว้นข้อ 0 ที่ลบข้อมูลเก่า — รันซ้ำก็ไม่เสียหายเพราะไม่เหลือข้อมูลเก่าแล้ว)
-- ลำดับ: ไฟล์ที่ 05 (รันหลัง 01-04) แล้วค่อยรัน  node tools/import_punch_xlsx.mjs "<โฟลเดอร์ไฟล์ xlsx>" --commit
-- ============================================================

-- 0) ลบข้อมูลเก่าทั้งหมด (โครงการ C-31902-4 ที่นำเข้าจาก JSON — ข้อมูลทดสอบ)
--    ลบที่ test_packs แล้ว cascade ไปที่ drawings > punch_items > punch_rounds อัตโนมัติ  (ย้อนกลับไม่ได้)
delete from public.test_packs where project_no = 'C-31902-4';

-- 1) Category เหลือ A และ B ตามฟอร์ม (ลบ A1 และ C) — ต้องทำหลังข้อ 0 เพราะ punch_items อ้างอิง category
delete from public.categories where code not in ('A', 'B');
insert into public.categories (code, description, sort_order) values
  ('A', 'Any subsequent operation or process cannot be performed until punch is closed.', 1),
  ('B', 'Subsequent operation can be proceeding with discretion of project manager.', 2)
on conflict (code) do update set description = excluded.description, sort_order = excluded.sort_order;

-- 2) โครงการ: ข้อมูลที่ซ้ำทุกใบ (Client / Project Name / Project No.)
create table if not exists public.projects (
  project_no   text primary key,              -- CT8
  project_name text,                          -- USA PROJECT UNIT 1 - TALLGRASS
  client       text                           -- CIMTAS (NINGBO) STEELPROCESSING.CO.,LTD.
);

-- 3) Test Package = ข้อมูลจาก Sheet1 "PRESSURE TEST INFORMATION"
--    (Report No. ในฟอร์มคือเลขเดียวกับ Test Package No. จึงใช้ test_pack_no เดิม ไม่ต้องมีคอลัมน์ใหม่)
alter table public.test_packs
  add column if not exists module_no           text,   -- Block/Module No.      เช่น MD-1.1
  add column if not exists location            text,   -- Location              เช่น On Module / On Module MBH02AA701-KD01
  add column if not exists piping_system       text,   -- Piping System         เช่น 27A0B หรือ 45A0A, 45A0C, 45A0E
  add column if not exists piping_name         text,   -- Piping Name           เช่น LUBE OIL RETURN PIPING
  add column if not exists pid_no              text,   -- P&ID No.              เช่น See line List
  add column if not exists test_medium         text,   -- Test Medium           เช่น Nitrogen (N2)
  add column if not exists insulation_spec     text,   -- Insulation Spec.
  add column if not exists insulation_thk      text,   -- Insulation Thk.
  add column if not exists design_pressure     text,   -- Design Pressure       เช่น "0.1 / 1.0" หรือ "See line list" (เป็นข้อความเพราะมีหลายรูปแบบ)
  add column if not exists design_temp         text,   -- Design Temp. (°C)
  add column if not exists fluid_code          text,   -- Fluid Code            เช่น LO, LUBRICATING OIL
  add column if not exists pipe_material       text,   -- Pipe Material         เช่น A106-B
  add column if not exists test_pressure       text,   -- Test Pressure (bar g.)
  add column if not exists holding_time_min    numeric,-- Holding Time (min.)
  add column if not exists rev_no              text,   -- ตารางแก้ไขเอกสาร (REV. / DESCRIPTION / DATE / PREPARED / REVIEW / APPROVED)
  add column if not exists rev_description     text,
  add column if not exists rev_date            date,
  add column if not exists prepared_by         text,
  add column if not exists review_by           text,
  add column if not exists approved_by         text,
  add column if not exists signed_prepared_name   text, add column if not exists signed_prepared_date   date,  -- PREPARED BY (BJCHI Engineering)
  add column if not exists signed_inspector_name  text, add column if not exists signed_inspector_date  date,  -- TEST/INSPECTOR BY (BJCHI QC/Inspector)
  add column if not exists signed_approved_name   text, add column if not exists signed_approved_date   date;  -- TESTING APPROVED BY (CIMTAS Representative)
-- project_no ต้องมีใน projects (ใส่ foreign key หลังนำเข้าข้อมูลใหม่ได้ถ้าต้องการบังคับ)

-- 4) ใบ PROCESS PUNCH-LIST (Sheet6): 1 ใบ ต่อ 1 Test Package  — หัวฟอร์ม + ลายเซ็นท้ายฟอร์ม
create table if not exists public.punch_reports (
  test_pack_id          bigint primary key references public.test_packs(id) on delete cascade,
  inspection_date       date,                  -- INSPC' DATE
  process_discipline    text,                  -- PROCESS DISCIPLINE  (PIPING)
  test_stage            text,                  -- TEST STAGE          (ไฟล์ทดสอบเว้นว่าง — ใช้งานจริงกรอกได้)
  pages                 text,                  -- PAGES               เช่น "1 of 1"
  -- ลายเซ็นท้ายฟอร์ม REVIEW & WITNESS มี 4 ช่อง: COMPLETED BY / BJCHI / CIMTAS / REPRESENTATIVE
  completed_name        text, completed_position        text, completed_date        date,
  bjchi_name            text, bjchi_position            text, bjchi_date            date,
  cimtas_name           text, cimtas_position           text, cimtas_date           date,
  representative_name   text, representative_position   text, representative_date   date,
  updated_at            timestamptz not null default now()
);

-- 5) รายการ Punch: ช่อง PUNCH CLOSING ACTION AND VERIFICATION มี 3 คน  (Prod Sup. / QCI / Client Rep.)
--    Prod Sup. -> bjc_by (มีอยู่แล้ว) · Client Rep. -> client_by (มีอยู่แล้ว) · QCI -> qci_by (ใหม่)
--    source_key = "<Test Package No.>#<Item No.>" ให้นำเข้าไฟล์ซ้ำได้โดยไม่เกิดรายการซ้ำ (Item No. ในฟอร์มนับต่อใบ ไม่ใช่ต่อ drawing)
alter table public.punch_items
  add column if not exists qci_by     text,
  add column if not exists qci_date   date,
  add column if not exists source_key text;
create unique index if not exists punch_items_source_key_uq on public.punch_items(source_key);

-- 6) สิทธิ์: อ่านได้ทุกคนที่ล็อกอิน, QC/admin เพิ่ม-แก้, admin ลบ (เหมือนตารางงานอื่น)
alter table public.projects      enable row level security;
alter table public.punch_reports enable row level security;
do $$
declare t text;
begin
  foreach t in array array['projects','punch_reports'] loop
    execute format('drop policy if exists "read_%1$s" on public.%1$s', t);
    execute format('create policy "read_%1$s" on public.%1$s for select to authenticated using (true)', t);
    execute format('drop policy if exists "qc_insert_%1$s" on public.%1$s', t);
    execute format($p$create policy "qc_insert_%1$s" on public.%1$s for insert to authenticated with check (public.my_role() in ('admin','qc'))$p$, t);
    execute format('drop policy if exists "qc_update_%1$s" on public.%1$s', t);
    execute format($p$create policy "qc_update_%1$s" on public.%1$s for update to authenticated using (public.my_role() in ('admin','qc')) with check (public.my_role() in ('admin','qc'))$p$, t);
    execute format('drop policy if exists "admin_delete_%1$s" on public.%1$s', t);
    execute format($p$create policy "admin_delete_%1$s" on public.%1$s for delete to authenticated using (public.my_role() = 'admin')$p$, t);
  end loop;
end $$;

-- 7) View รวมข้อมูลใหม่ให้หน้าเว็บเรียกครั้งเดียว (แทน v_punch_items เดิม — เพิ่มข้อมูล Test Package)
drop view if exists public.v_punch_items;
create view public.v_punch_items with (security_invoker = true) as
select i.*, d.drawing_no, d.work_type, d.test_pack_id, t.test_pack_no, t.skid, t.project_no,
       t.module_no, t.piping_system, t.piping_name
from public.punch_items i
join public.drawings d   on d.id = i.drawing_id
join public.test_packs t on t.id = d.test_pack_id;
grant select on public.v_punch_items to authenticated;

-- ตรวจผล
select (select count(*) from public.test_packs) as test_packs, (select count(*) from public.punch_items) as punch_items,
       (select string_agg(code, ',' order by sort_order) from public.categories) as categories;
