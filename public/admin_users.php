<?php
declare(strict_types=1);
// หน้าจัดการผู้ใช้ (เฉพาะ admin)
$pageTitle = 'Users'; $active = 'admin_users';
include __DIR__ . '/../app/includes/header.php';
?>
<?php /* ตารางผู้ใช้: ชื่อ / สิทธิ์ / แผนก (admin_users.js สร้างแถวและบันทึกเมื่อแก้ไข) */ ?>
<div class="card"><div class="card-header"><b>Users</b>
  <span class="text-muted small ml-2">Create new users in Supabase &gt; Authentication &gt; Users, then set their role here</span></div>
  <div class="card-body p-0 table-responsive"><table class="table table-sm mb-0"><thead><tr><th>Name</th><th>Role</th><th>Discipline</th></tr></thead>
  <tbody id="userRows"></tbody></table></div></div>
<?php /* โหลด admin_users.js แล้วปิดหน้าด้วย footer */ ?>
<?php $pageScripts = ['assets/js/admin_users.js']; include __DIR__ . '/../app/includes/footer.php'; ?>
