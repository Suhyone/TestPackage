-- เปลี่ยนสถานะให้ตรงฟอร์ม Punch List ของโครงการ: O = Open, C = Close, N = Cancelled (เหลือ 3 สถานะเท่านั้น)
-- วางใน Supabase > SQL Editor แล้ว Run (รันซ้ำได้) — ควรรันก่อนใช้หน้าเว็บเวอร์ชันนี้
--
-- การแปลงข้อมูลเดิม:  approved -> close  |  cancelled -> cancelled  |  open / rework / fixed -> open
--   (fixed = แก้แล้วรอตรวจ ยังไม่ปิด จึงกลับเป็น Open; วันที่/ผู้แก้ใน bjc_date, bjc_by ยังอยู่ครบ ไม่ถูกลบ)

-- 1) เอา constraint สถานะเดิมออก -> แปลงข้อมูล -> ใส่ constraint ใหม่
do $$
declare c text;
begin
  for c in select conname from pg_constraint
           where conrelid = 'public.punch_items'::regclass and contype = 'c' and pg_get_constraintdef(oid) ilike '%status%'
  loop
    execute format('alter table public.punch_items drop constraint %I', c);
  end loop;
end $$;

update public.punch_items
set status = case status when 'approved' then 'close' when 'close' then 'close' when 'cancelled' then 'cancelled' else 'open' end;

alter table public.punch_items add constraint punch_items_status_check check (status in ('open','close','cancelled'));

-- 2) คำอธิบาย Category ตามฟอร์ม (เรียง A1, A, B, C)
insert into public.categories (code, description, sort_order) values
  ('A', 'Any subsequent operation or process cannot be performed until punch is closed.', 1),
  ('B', 'Subsequent operation can be proceeding with discretion of project manager.', 2)
on conflict (code) do update set description = excluded.description, sort_order = excluded.sort_order;

-- 3) เจ้าหน้าที่: ส่งงานแก้ (บันทึกรอบ 'fix') ได้ทุกงานที่ยัง Open — สถานะยังเป็น Open จน QC ปิด
drop policy if exists "officer_update_items" on public.punch_items;
create policy "officer_update_items" on public.punch_items for update to authenticated
  using (public.my_role() = 'officer' and status = 'open')
  with check (public.my_role() = 'officer' and status = 'open');

drop policy if exists "officer_insert_rounds" on public.punch_rounds;
create policy "officer_insert_rounds" on public.punch_rounds for insert to authenticated
  with check (public.my_role() = 'officer' and kind = 'fix' and by_user = auth.uid());

-- ตรวจผล
select status, count(*) from public.punch_items group by status order by status;
