-- 12: Pressure Test Record — บันทึกผลทดสอบแรงดันของ Test Package (แท็บ Pressure test)
--   1 pack มีได้หลายครั้ง (attempt_no) เช่น FAIL แล้วทดสอบซ้ำจน PASS · ข้อมูลเกจ/ใบสอบเทียบ/ค่าที่อ่านได้/เวลาค้าง/ผล
--   GATE ล็อกที่ฐานข้อมูล: บันทึกครั้งใหม่ไม่ได้ถ้า pack ยังมี punch Category A ที่ Open หรือ Pre-test ยังไม่ผ่าน (ตอบไม่ครบ / มี NO)
--   (หน้าเว็บตรวจกฎเดียวกันเพื่อแสดงเหตุผล แต่ตัวบังคับจริงอยู่ที่ trigger นี้ — เรียก API ตรงก็ข้ามไม่ได้)
-- รันหลัง 07_pretest_checklist.sql · รันซ้ำได้ · สิทธิ์: ทุกคนที่ล็อกอินอ่านได้ · QC/admin เพิ่ม-แก้ได้ · ลบได้เฉพาะ admin

create table if not exists public.pressure_tests (
  id                   bigint generated always as identity primary key,
  test_pack_id         bigint not null references public.test_packs(id) on delete cascade,
  attempt_no           int    not null default 1,
  test_date            date   not null,
  test_type            text   check (test_type in ('hydro','pneumatic')),
  test_medium          text,
  required_pressure    numeric,            -- bar g ตามเงื่อนไขของ pack ตอนบันทึก (เก็บสำเนาไว้ เพราะแก้ Info ทีหลังไม่ควรเปลี่ยนผลเก่า)
  required_holding_min numeric,
  gauge_id             text   not null,
  gauge_cal_cert       text,
  gauge_cal_due        date   not null,
  start_reading        numeric,
  max_reading          numeric not null,
  end_reading          numeric,
  holding_time_min     numeric not null,
  result               text   not null check (result in ('pass','fail')),
  tested_by            text,
  witnessed_by         text,
  remarks              text,
  created_by           uuid references public.profiles(id),
  created_at           timestamptz not null default now(),
  unique (test_pack_id, attempt_no)
);
create index if not exists pressure_tests_pack_idx on public.pressure_tests(test_pack_id);

-- เหตุผลที่ pack ยังทดสอบแรงดันไม่ได้ (null = ทดสอบได้) — กฎเดียวกับแถบ gate ในหน้าเว็บ
create or replace function public.pressure_gate_reason(p_pack bigint) returns text
language plpgsql stable security definer set search_path = public as $$
declare open_a int; total int; answered int; no_cnt int;
begin
  select count(*) into open_a from public.punch_items i join public.drawings d on d.id = i.drawing_id
   where d.test_pack_id = p_pack and i.status = 'open' and i.category = 'A';
  if open_a > 0 then return format('%s Category A punch item(s) are still open.', open_a); end if;
  select count(*) into total from public.pretest_template;
  select count(*), count(*) filter (where answer = 'no') into answered, no_cnt
    from public.pretest_items where test_pack_id = p_pack;
  if total = 0 then return 'The pre-test checklist template is empty.'; end if;
  if no_cnt > 0 then return format('The pre-test checklist has %s item(s) answered NO.', no_cnt); end if;
  if answered < total then return format('The pre-test checklist is incomplete (%s of %s answered).', answered, total); end if;
  return null;
end $$;

create or replace function public.pressure_tests_gate() returns trigger
language plpgsql security definer set search_path = public as $$
declare why text;
begin
  why := public.pressure_gate_reason(new.test_pack_id);
  if why is not null then raise exception 'GATE: Pressure test is not allowed. %', why using errcode = 'P0001'; end if;
  return new;
end $$;

drop trigger if exists pressure_tests_gate_trg on public.pressure_tests;
create trigger pressure_tests_gate_trg before insert on public.pressure_tests
  for each row execute function public.pressure_tests_gate();

alter table public.pressure_tests enable row level security;
drop policy if exists "read_pressure_tests" on public.pressure_tests;
create policy "read_pressure_tests" on public.pressure_tests for select to authenticated using (true);
drop policy if exists "qc_insert_pressure_tests" on public.pressure_tests;
create policy "qc_insert_pressure_tests" on public.pressure_tests for insert to authenticated with check (public.my_role() in ('admin','qc'));
drop policy if exists "qc_update_pressure_tests" on public.pressure_tests;
create policy "qc_update_pressure_tests" on public.pressure_tests for update to authenticated
  using (public.my_role() in ('admin','qc')) with check (public.my_role() in ('admin','qc'));
drop policy if exists "admin_delete_pressure_tests" on public.pressure_tests;
create policy "admin_delete_pressure_tests" on public.pressure_tests for delete to authenticated using (public.my_role() = 'admin');

grant select on public.pressure_tests to authenticated;
grant execute on function public.pressure_gate_reason(bigint) to authenticated;

select count(*) as pressure_tests from public.pressure_tests;
