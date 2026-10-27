-- 16: ประวัติการแก้ PUNCH-LIST DESCRIPTION (punch_items.deficiency) — ใครแก้อะไรเมื่อไร แสดงแบบ diff ในแผงรายละเอียดของ Punch List
--   บันทึกด้วย trigger ที่ฐานข้อมูล จึงจับการแก้จากทุกทาง (แผงรายละเอียด, ตารางแก้ในช่อง Advanced Grid, เรียก API ตรง) และข้ามไม่ได้
--   ผู้แก้ระบุจาก auth.uid() + ชื่อใน profiles · ตารางเป็นแบบทั่วไป (field / old_value / new_value) ต่อยอดฟิลด์อื่นได้ภายหลัง รอบนี้ติดตามเฉพาะ deficiency
--   สิทธิ์: ทุกคนที่ล็อกอินอ่านประวัติได้ · ไม่มี policy เขียน (เขียนผ่าน trigger เท่านั้น) · ลบได้เฉพาะ admin (ล้างข้อมูลทดสอบ)
--   ผู้แก้ข้อความได้ = QC / admin เท่านั้น (policy เดิม + 13_hardening.sql กัน officer แก้ช่องอื่นนอกจากส่งงานแก้)
-- รันซ้ำได้ · รันหลัง 13_hardening.sql

create table if not exists public.punch_item_history (
  id              bigint generated always as identity primary key,
  punch_item_id   bigint not null references public.punch_items(id) on delete cascade,
  field           text   not null,
  old_value       text,
  new_value       text,
  changed_by      uuid,
  changed_by_name text,
  changed_at      timestamptz not null default now()
);
create index if not exists punch_item_history_item_idx on public.punch_item_history(punch_item_id, changed_at desc);

alter table public.punch_item_history enable row level security;
drop policy if exists "read_punch_item_history" on public.punch_item_history;
create policy "read_punch_item_history" on public.punch_item_history for select to authenticated using (true);
drop policy if exists "admin_delete_punch_item_history" on public.punch_item_history;
create policy "admin_delete_punch_item_history" on public.punch_item_history for delete to authenticated using (public.my_role() = 'admin');
grant select on public.punch_item_history to authenticated;

create or replace function public.punch_items_log_deficiency() returns trigger
language plpgsql security definer set search_path = public as $$
declare who text;
begin
  select coalesce(nullif(full_name, ''), 'unknown') into who from public.profiles where id = auth.uid();
  insert into public.punch_item_history (punch_item_id, field, old_value, new_value, changed_by, changed_by_name)
  values (new.id, 'deficiency', old.deficiency, new.deficiency, auth.uid(), coalesce(who, 'unknown'));
  return new;
end $$;

drop trigger if exists punch_items_log_deficiency_trg on public.punch_items;
create trigger punch_items_log_deficiency_trg after update of deficiency on public.punch_items
  for each row when (old.deficiency is distinct from new.deficiency)
  execute function public.punch_items_log_deficiency();

select count(*) as history_rows from public.punch_item_history;
