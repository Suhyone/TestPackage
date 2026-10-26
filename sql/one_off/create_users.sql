-- ตั้ง role ให้บัญชีที่มีอยู่แล้ว (qc@bjc.com / user1@bjc.com) และลบบัญชีซ้ำ @bjc1994.com ที่สร้างไว้ก่อนหน้า
-- วางใน Supabase > SQL Editor แล้ว Run — รันซ้ำได้

-- 1) ตั้ง role / ชื่อ
update public.profiles set role = 'qc',      full_name = 'QC'     where id = (select id from auth.users where email = 'qc@bjc.com');
update public.profiles set role = 'officer', full_name = 'User 1' where id = (select id from auth.users where email = 'user1@bjc.com');

-- 2) ย้ายงานที่มอบหมายไว้กับบัญชีซ้ำ มาที่ user1@bjc.com (ต้องทำก่อนลบ ไม่งั้นติด foreign key)
update public.punch_items
set assigned_to = (select id from auth.users where email = 'user1@bjc.com')
where assigned_to in (select id from auth.users where email in ('qc@bjc1994.com', 'user1@bjc1994.com'));

-- 3) ลบบัญชีซ้ำ (profiles / identities ถูกลบตามอัตโนมัติ)
delete from auth.users where email in ('qc@bjc1994.com', 'user1@bjc1994.com');

-- 4) (ไม่บังคับ) ถ้ายังไม่มีงานมอบหมายให้ user1 ให้ 5 งาน Open แรกเพื่อทดสอบหน้า "งานของฉัน"
update public.punch_items
set assigned_to = (select id from auth.users where email = 'user1@bjc.com')
where id in (select id from public.punch_items where status = 'open' order by id limit 5)
  and not exists (select 1 from public.punch_items where assigned_to = (select id from auth.users where email = 'user1@bjc.com'));

-- ตรวจผล: ควรเหลือ admin@bjc.com = admin, qc@bjc.com = qc, user1@bjc.com = officer
select u.email, p.full_name, p.role,
       (select count(*) from public.punch_items i where i.assigned_to = u.id) as assigned_items
from auth.users u join public.profiles p on p.id = u.id order by p.role, u.email;
