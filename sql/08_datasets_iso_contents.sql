-- ============================================================
-- ข้อมูลเสริมจากชุดข้อมูลโครงการ CT8 / CT3 / CT5  (อ้างอิง All_CT-8.xlsx และ data/AGENT_GUIDE.md)
--   iso_lines      : ISO INDEX — isometric / line / spool ของแต่ละ Test Package (แท็บ ISO / Spool)
--   pack_documents : Sheet2 TEST PACK CONTENT CHECK LIST — หัวข้อเอกสาร 15 หมวด YES / N/A (แท็บ Contents)
--   test_packs     : เพิ่ม unit_no, contractor, test_stage (CT3 / CT5 มีข้อมูลนี้)
-- รันหลัง 01–07 — วางใน Supabase > SQL Editor แล้ว Run (รันซ้ำได้ ไม่ลบข้อมูล)
-- จากนั้นนำเข้าข้อมูลด้วย  node tools/import_datasets.mjs --commit
-- ============================================================

-- 1) คอลัมน์ใหม่ของ test_packs (ข้อมูลหัวที่มีในชุด CT3 / CT5)
alter table public.test_packs
  add column if not exists unit_no     text,    -- Unit No.            เช่น 1
  add column if not exists contractor  text,    -- ผู้รับเหมา          เช่น BJCHI
  add column if not exists test_stage  text;    -- Line Check / Pressure Test

-- 2) ISO INDEX — 1 แถว = 1 spool/line บน isometric
--    ค่าความดัน/อุณหภูมิเก็บเป็นข้อความ เพราะในฟอร์มมีหลายรูปแบบ ("0.10 / 1.0", "See line list")
--    source_key กันข้อมูลซ้ำเมื่อนำเข้าไฟล์ซ้ำ
create table if not exists public.iso_lines (
  id               bigint generated always as identity primary key,
  test_pack_id     bigint not null references public.test_packs(id) on delete cascade,
  item_no          int,
  iso_drawing_no   text,           -- Iso. Drawing No.   เช่น N05-003570 / G1-S4452
  iso_sht          text,           -- Iso. Sht.          เช่น "2 OF 4"
  iso_rev          text,
  pid_drawing_no   text, pid_sht text, pid_rev text,
  module_no        text,
  line_no          text,           -- Line No.           เช่น MBV02BR101
  spool_no         text,           -- Spool No.          เช่น **27A0B-3 / DSA-200
  fluid            text,
  design_pressure  text,           -- Design Pressure (MPag / bar)
  design_temp      text,           -- Design Temp. (°C)
  test_pressure    text,           -- Test Pressure
  test_type        text,           -- P = Pneumatic · H = Hydrostatic · Line Check
  material         text,
  insulation_spec  text,
  insulation_thk   text,
  pipe_npd         text,           -- Pipe NPD (in)
  remark           text,
  source_key       text unique,
  created_at       timestamptz not null default now()
);
create index if not exists iso_lines_pack_idx on public.iso_lines(test_pack_id);
create index if not exists iso_lines_dwg_idx  on public.iso_lines(iso_drawing_no);

-- 3) CONTENT CHECK LIST — 1 แถว = 1 หมวด (SECTION #1–#15) ของ pack
--    title = ชื่อหมวดจากใบคั่น SECTION · content = ข้อความในเช็กลิสต์ · verify = YES / N/A · marker = ข้อความ N/A บนใบคั่น (ถ้ามี)
create table if not exists public.pack_documents (
  id            bigint generated always as identity primary key,
  test_pack_id  bigint not null references public.test_packs(id) on delete cascade,
  section_no    int not null,
  title         text,
  content       text,
  verify        text check (verify in ('YES','N/A')),
  marker        text,
  remark        text,
  updated_at    timestamptz not null default now(),
  unique (test_pack_id, section_no)
);
create index if not exists pack_documents_pack_idx on public.pack_documents(test_pack_id);

-- 4) สิทธิ์: ทุกคนที่ล็อกอินอ่านได้ · QC/admin เพิ่ม-แก้ · admin ลบ
alter table public.iso_lines      enable row level security;
alter table public.pack_documents enable row level security;
do $$
declare t text;
begin
  foreach t in array array['iso_lines','pack_documents'] loop
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
grant select on public.iso_lines, public.pack_documents to authenticated;

-- ตรวจผล: ต้องไม่ error (ก่อนนำเข้าข้อมูลจะได้ 0 ทั้งคู่)
select (select count(*) from public.iso_lines) as iso_lines, (select count(*) from public.pack_documents) as pack_documents;
