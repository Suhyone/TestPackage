<?php
declare(strict_types=1);
// หน้าเข้าสู่ระบบ (หน้าสาธารณะ ไม่มีเมนูซ้าย)
$pageTitle = 'Sign in'; $public = true;
include __DIR__ . '/../app/includes/header.php';
?>
<?php /* กล่องเข้าสู่ระบบ */ ?>
<div class="login-box">
  <div class="card card-outline card-info">
    <div class="card-header text-center"><h4 class="mb-0">BJCHI QA/QC</h4><small class="text-muted">Test Package · Punch List</small></div>
    <div class="card-body">
      <?php /* ข้อความแจ้งเมื่อเข้าสู่ระบบไม่สำเร็จ */ ?>
      <div id="loginErr" class="alert alert-danger d-none"></div>
      <?php /* ฟอร์มอีเมล/รหัสผ่าน — login.js ส่งไปตรวจกับ Supabase Auth */ ?>
      <form id="loginForm">
        <div class="input-group mb-3"><input type="email" id="email" class="form-control" placeholder="Email" required>
          <div class="input-group-append"><div class="input-group-text"><span class="fas fa-envelope"></span></div></div></div>
        <div class="input-group mb-3"><input type="password" id="password" class="form-control" placeholder="Password" required>
          <div class="input-group-append"><div class="input-group-text"><span class="fas fa-lock"></span></div></div></div>
        <button class="btn btn-info btn-block" type="submit">Sign in</button>
      </form>
    </div>
  </div>
</div>
<?php /* โหลด login.js แล้วปิดหน้าด้วย footer */ ?>
<?php $pageScripts = ['assets/js/login.js']; include __DIR__ . '/../app/includes/footer.php'; ?>
