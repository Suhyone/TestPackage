-- ============================================================
-- Pre-test Checklist (CT8 Sheet5 "PRESSURE TEST PACK CHECKLIST")
--   Document checklist 17 ข้อ + Test preparation checklist 13 ข้อ  ตอบ YES / NO / N/A
--   กฎของฟอร์ม: ตอบ NO → QC ต้องออก punch และห้ามทดสอบแรงดัน
-- รันหลัง 01–06 — วางใน Supabase > SQL Editor แล้ว Run (รันซ้ำได้)
--
--   pretest_template : แม่แบบข้อคำถาม (ใช้ชุดเดียวทุก pack; แยกตามชนิดทดสอบภายหลังได้ด้วยคอลัมน์ test_type)
--   pretest_items    : คำตอบต่อ pack (มีแถวเฉพาะข้อที่ตอบแล้ว · punch_item_id = punch ที่ระบบออกให้เมื่อตอบ NO)
--   v_pretest_status : สรุปต่อ pack → ready = ตอบครบทุกข้อและไม่มี NO
-- ============================================================
create table if not exists public.pretest_template (
  id        serial primary key,
  section   text not null check (section in ('doc','prep')),
  seq       int  not null,
  text      text not null,
  test_type text,                                   -- null = ใช้กับทุกชนิด (hydro / pneumatic)
  unique (section, seq)
);

create table if not exists public.pretest_items (
  id            bigserial primary key,
  test_pack_id  bigint not null references public.test_packs(id) on delete cascade,
  template_id   int    not null references public.pretest_template(id),
  answer        text   not null check (answer in ('yes','no','na')),
  remark        text,
  punch_item_id bigint references public.punch_items(id) on delete set null,
  answered_by   text,
  answered_at   timestamptz not null default now(),
  unique (test_pack_id, template_id)
);

-- แม่แบบ 17 + 13 ข้อ (ข้อความตามฟอร์ม CT8 Sheet5)
insert into public.pretest_template (section, seq, text) values
  ('doc', 1,  'Test Pack Line List'),
  ('doc', 2,  'Drawing List and Correct Revision No''s'),
  ('doc', 3,  'P&ID Drawing and P&ID List'),
  ('doc', 4,  'Flushing Test Report'),
  ('doc', 5,  'Punch List'),
  ('doc', 6,  'Pressure and Temperature Gauge Calibration Certs.'),
  ('doc', 7,  'NDT and Inspection Release Note (IRN)'),
  ('doc', 8,  'Weld History Sheet completed'),
  ('doc', 9,  'Test Medium Certificate'),
  ('doc', 10, 'Site Technical Queries'),
  ('doc', 11, 'Special Instruction'),
  ('doc', 12, 'Pressure Testing procedure'),
  ('doc', 13, 'Pressure Test Chart Form approved'),
  ('doc', 14, 'Pressure Testing Report Form'),
  ('doc', 15, 'Mechanical Equipment''s List Approved by Engineering'),
  ('doc', 16, 'Record of all Fittings are available'),
  ('doc', 17, 'Check PWHT, PMI and Ferrite Test reports are available'),
  ('prep', 1,  'Check correct gaskets & bolts are fitted at all mechanical joints'),
  ('prep', 2,  'Check fittings are correct rating to specification'),
  ('prep', 3,  'Check all flanges are correctly aligned'),
  ('prep', 4,  'Check all vents and drains are correctly installed'),
  ('prep', 5,  'Check correct valves have been fitted and are complete'),
  ('prep', 6,  'Check correct flow through valves and in-line devices'),
  ('prep', 7,  'Check that all instrument connections are correctly installed'),
  ('prep', 8,  'Check all pipe supports are fitted and complete'),
  ('prep', 9,  'Check that all pipework is adequately supported for test'),
  ('prep', 10, 'Check pressure and temp. gauges are installed at correct location'),
  ('prep', 11, 'Check that temperature recorder and pressure recorder are installed'),
  ('prep', 12, 'Check safety barricade and warning signs have been installed'),
  ('prep', 13, 'Check work permit has been issued by BJCHI HSE Department')
on conflict (section, seq) do nothing;

-- สิทธิ์: ทุกคนที่ล็อกอินอ่านได้ · แม่แบบแก้ได้เฉพาะ admin · คำตอบ QC/admin เพิ่ม-แก้ได้ ลบได้เฉพาะ admin
alter table public.pretest_template enable row level security;
alter table public.pretest_items    enable row level security;

drop policy if exists "read_pretest_template" on public.pretest_template;
create policy "read_pretest_template" on public.pretest_template for select to authenticated using (true);
drop policy if exists "admin_write_pretest_template" on public.pretest_template;
create policy "admin_write_pretest_template" on public.pretest_template for all to authenticated
  using (public.my_role() = 'admin') with check (public.my_role() = 'admin');

drop policy if exists "read_pretest_items" on public.pretest_items;
create policy "read_pretest_items" on public.pretest_items for select to authenticated using (true);
drop policy if exists "qc_insert_pretest_items" on public.pretest_items;
create policy "qc_insert_pretest_items" on public.pretest_items for insert to authenticated
  with check (public.my_role() in ('admin','qc'));
drop policy if exists "qc_update_pretest_items" on public.pretest_items;
create policy "qc_update_pretest_items" on public.pretest_items for update to authenticated
  using (public.my_role() in ('admin','qc')) with check (public.my_role() in ('admin','qc'));
drop policy if exists "admin_delete_pretest_items" on public.pretest_items;
create policy "admin_delete_pretest_items" on public.pretest_items for delete to authenticated
  using (public.my_role() = 'admin');

-- สรุปต่อ pack: total = จำนวนข้อทั้งหมดในแม่แบบ · ready = ตอบครบและไม่มี NO
drop view if exists public.v_pretest_status;
create view public.v_pretest_status with (security_invoker = true) as
select t.id as test_pack_id,
       (select count(*) from public.pretest_template)::int                         as total,
       count(i.id) filter (where i.answer = 'yes')::int                            as yes_count,
       count(i.id) filter (where i.answer = 'no')::int                             as no_count,
       count(i.id) filter (where i.answer = 'na')::int                             as na_count,
       ((select count(*) from public.pretest_template) - count(i.id))::int         as unanswered,
       (count(i.id) = (select count(*) from public.pretest_template)
         and count(i.id) filter (where i.answer = 'no') = 0)                       as ready
from public.test_packs t
left join public.pretest_items i on i.test_pack_id = t.id
group by t.id;

grant select on public.pretest_template, public.pretest_items, public.v_pretest_status to authenticated;

-- ตรวจผล: ควรได้ doc = 17, prep = 13
select section, count(*) from public.pretest_template group by section order by section;
