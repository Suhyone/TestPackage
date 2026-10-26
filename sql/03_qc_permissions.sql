-- สิทธิ์ QC: อ่านได้ทั้งหมด (policy read_* เดิม) เพิ่ม/แก้ไขได้ ลบไม่ได้ — วางใน Supabase > SQL Editor แล้ว Run (รันซ้ำได้)

-- เขียน: admin / qc เพิ่ม+แก้ไขได้ในตารางงาน, ลบได้เฉพาะ admin (qc ลบไม่ได้ — ใช้สถานะ Cancelled แทน)
do $$
declare t text;
begin
  foreach t in array array['test_packs','drawings','punch_items','punch_rounds'] loop
    execute format('drop policy if exists "qc_write_%1$s" on public.%1$s', t);
    execute format('drop policy if exists "qc_insert_%1$s" on public.%1$s', t);
    execute format('drop policy if exists "qc_update_%1$s" on public.%1$s', t);
    execute format('drop policy if exists "admin_delete_%1$s" on public.%1$s', t);
    execute format($p$create policy "qc_insert_%1$s" on public.%1$s for insert to authenticated
      with check (public.my_role() in ('admin','qc'))$p$, t);
    execute format($p$create policy "qc_update_%1$s" on public.%1$s for update to authenticated
      using (public.my_role() in ('admin','qc')) with check (public.my_role() in ('admin','qc'))$p$, t);
    execute format($p$create policy "admin_delete_%1$s" on public.%1$s for delete to authenticated
      using (public.my_role() = 'admin')$p$, t);
  end loop;
end $$;

-- ไฟล์ใน Storage (รูป/Report): ลบได้เฉพาะ admin
drop policy if exists "punch_photos_delete" on storage.objects;
create policy "punch_photos_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'punch-photos' and public.my_role() = 'admin');
