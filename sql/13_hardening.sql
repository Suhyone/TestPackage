-- 13: เสริมความปลอดภัยฝั่งฐานข้อมูล (จากรายงาน QA รอบ 4) — รันหลัง 12_pressure_test.sql · รันซ้ำได้
--   1) pressure_tests: แก้ผลเดิมไม่ได้ (QC) — แก้ได้เฉพาะ remarks / ผู้ทดสอบ / พยาน / test medium · ถ้าผิดให้บันทึกครั้งใหม่ (admin แก้ได้ทุกช่อง)
--      + check constraint: PASS ต้องมีค่าที่อ่านได้ถึงความดันทดสอบและค้างครบเวลา · ใบสอบเทียบเกจต้องไม่หมดอายุก่อนวันทดสอบ · ค่าติดลบไม่ได้
--   2) punch_items: เจ้าหน้าที่ (officer) แก้ได้เฉพาะช่องส่งงานแก้ (bjc_by, bjc_date, fix_pending) — เปลี่ยน category / status / description ผ่าน API ตรงไม่ได้
--      (เดิม policy officer_update_items ไม่จำกัดคอลัมน์ จึงแก้ Category A เป็น B เพื่อหลบ gate ทดสอบแรงดันได้)

-- ---------- 1) pressure_tests ----------
alter table public.pressure_tests drop constraint if exists pressure_tests_pass_rule;
alter table public.pressure_tests add constraint pressure_tests_pass_rule check (
  result = 'fail'
  or (max_reading >= coalesce(required_pressure, 0) and holding_time_min >= coalesce(required_holding_min, 0))) not valid;
alter table public.pressure_tests drop constraint if exists pressure_tests_gauge_valid;
alter table public.pressure_tests add constraint pressure_tests_gauge_valid check (gauge_cal_due >= test_date) not valid;
alter table public.pressure_tests drop constraint if exists pressure_tests_values_ok;
alter table public.pressure_tests add constraint pressure_tests_values_ok check (
  max_reading >= 0 and holding_time_min >= 0 and coalesce(start_reading, 0) >= 0 and coalesce(end_reading, 0) >= 0) not valid;

create or replace function public.pressure_tests_update_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.my_role() is distinct from 'admin' and (
       new.test_pack_id is distinct from old.test_pack_id or new.attempt_no is distinct from old.attempt_no
    or new.test_date is distinct from old.test_date or new.test_type is distinct from old.test_type
    or new.required_pressure is distinct from old.required_pressure or new.required_holding_min is distinct from old.required_holding_min
    or new.gauge_id is distinct from old.gauge_id or new.gauge_cal_cert is distinct from old.gauge_cal_cert or new.gauge_cal_due is distinct from old.gauge_cal_due
    or new.start_reading is distinct from old.start_reading or new.max_reading is distinct from old.max_reading
    or new.end_reading is distinct from old.end_reading or new.holding_time_min is distinct from old.holding_time_min
    or new.result is distinct from old.result or new.created_by is distinct from old.created_by) then
    raise exception 'GATE: A recorded pressure test cannot be changed. Record a new attempt instead (an admin can correct mistakes).' using errcode = 'P0001';
  end if;
  return new;
end $$;
drop trigger if exists pressure_tests_update_guard_trg on public.pressure_tests;
create trigger pressure_tests_update_guard_trg before update on public.pressure_tests
  for each row execute function public.pressure_tests_update_guard();

-- ---------- 2) punch_items: officer แก้ได้เฉพาะช่องส่งงานแก้ ----------
create or replace function public.punch_items_officer_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare keys text[] := array['bjc_by', 'bjc_date', 'fix_pending', 'updated_at'];
begin
  if public.my_role() = 'officer' and (to_jsonb(new) - keys) is distinct from (to_jsonb(old) - keys) then
    raise exception 'GATE: Officers can only submit fixes. Ask QC to change the other details.' using errcode = 'P0001';
  end if;
  return new;
end $$;
drop trigger if exists punch_items_officer_guard_trg on public.punch_items;
create trigger punch_items_officer_guard_trg before update on public.punch_items
  for each row execute function public.punch_items_officer_guard();
