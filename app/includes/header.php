<?php
declare(strict_types=1);
// โหลดค่าตั้งค่า (URL/คีย์ Supabase จาก config.php) และกำหนดค่าเริ่มต้นของตัวแปรหน้า: $pageTitle ชื่อหน้า, $active เมนูที่เลือก, $public หน้าสาธารณะ (เช่น login)
require_once __DIR__ . '/../bootstrap.php';   // PHP 8.3 + ตำแหน่งโฟลเดอร์ (APP_PATH / ROOT_PATH)
$cfg = require APP_PATH . '/config.php';
$pageTitle = $pageTitle ?? 'Dashboard';
$active    = $active ?? '';
$public    = $public ?? false;   // หน้า login ไม่ต้องมี sidebar
// ลิงก์ไฟล์ใน assets/ พร้อมเวลาแก้ไขไฟล์ (?v=...) — แก้ไฟล์แล้วเบราว์เซอร์โหลดตัวใหม่ทันที ไม่ค้างตัวเก่าจากแคช
if (!function_exists('asset')) {
    function asset(string $path): string {
        $f = __DIR__ . '/../../public/' . $path;
        return htmlspecialchars($path) . (is_file($f) ? '?v=' . filemtime($f) : '');
    }
}
?>
<?php /* ส่วนหัวของทุกหน้า (header.php) — เปิด <html> <head> <body> และ navbar + เมนูซ้าย ส่วนที่ปิดอยู่ใน footer.php */ ?>
<!DOCTYPE html>
<html lang="en">
<?php /* ส่วน head: ชื่อหน้า, สไตล์ (Font Awesome / AdminLTE / ฟอนต์ Sarabun / app.css) และส่งค่า Supabase ให้ JavaScript */ ?>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title><?= htmlspecialchars($pageTitle) ?> | <?= htmlspecialchars($cfg['app_name']) ?></title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/admin-lte/3.2.0/css/adminlte.min.css">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;600&display=swap">
  <link rel="stylesheet" href="<?= asset('assets/css/app.css') ?>">
  <?php /* ขนาดตัวอักษรที่ผู้ใช้เลือก (Aa) — ตั้งก่อนหน้าแสดงผลเพื่อไม่ให้กระพริบ · ค่าที่ใช้ได้: lg (18px) / xl (20px) · ว่าง = 16px */ ?>
  <script>try { var f = localStorage.getItem('bjchiFs'); if (f === 'lg' || f === 'xl') document.documentElement.setAttribute('data-fs', f); } catch (e) {}</script>
  <?php /* ส่งเฉพาะ URL กับ publishable key ให้ app.js ผ่าน window.APP_CONFIG (ห้ามใส่ secret key) */ ?>
  <script>
    window.APP_CONFIG = <?= json_encode([
      'url' => $cfg['supabase_url'], 'anonKey' => $cfg['supabase_anon_key'],
    ], JSON_UNESCAPED_SLASHES) ?>;
  </script>
</head>
<?php /* เปิด body — หน้า login ใช้คลาส login-page (ไม่มีเมนูซ้าย) */ ?>
<body class="hold-transition sidebar-mini <?= $public ? 'login-page' : '' ?>">
<?php /* หน้าปกติ (ไม่ใช่ login): สร้างโครง wrapper + navbar + เมนูซ้าย + พื้นที่เนื้อหา */ ?>
<?php if (!$public): ?>
<div class="wrapper">
  <?php /* แถบ navbar ด้านบน */ ?>
  <nav class="main-header navbar navbar-expand navbar-white navbar-light">
    <?php /* ฝั่งซ้ายของ navbar: ปุ่มย่อเมนู, Home, ตัวเลือก Project No. */ ?>
    <ul class="navbar-nav">
      <li class="nav-item"><a class="nav-link" data-widget="pushmenu" href="#" role="button" aria-label="Toggle menu"><i class="fas fa-bars"></i></a></li>
      <li class="nav-item d-none d-sm-inline-block"><a href="index.php" class="nav-link">Home</a></li>
      <?php /* ตัวเลือก Project No. (ซ่อนอยู่จนกว่าหน้าที่ใช้งานจะเติมรายการ เช่น punch_list.js) */ ?>
      <li class="nav-item d-none align-items-center" id="projectBox">
        <span class="nav-link text-muted pr-1 d-none d-md-inline">Project No. :</span>
        <select id="fProject" class="form-control form-control-sm" style="width:auto;min-width:120px;max-width:46vw"></select>
      </li>
    </ul>
    <?php /* ฝั่งขวาของ navbar: สิทธิ์ผู้ใช้ + ปุ่มออกจากระบบ (app.js ผูกเหตุการณ์) */ ?>
    <ul class="navbar-nav ml-auto">
      <?php /* ขนาดตัวอักษร: Normal 16px / Large 18px / Extra large 20px (เก็บในเครื่อง, app.js ผูกปุ่ม) */ ?>
      <li class="nav-item dropdown">
        <a class="nav-link" href="#" id="fsMenu" data-toggle="dropdown" role="button" aria-haspopup="true" aria-expanded="false" title="Text size" aria-label="Text size"><i class="fas fa-text-height"></i></a>
        <div class="dropdown-menu dropdown-menu-right p-2" aria-labelledby="fsMenu" style="min-width:230px">
          <div class="small text-muted px-1 mb-1">Text size</div>
          <div class="btn-group w-100" role="group" aria-label="Text size">
            <button type="button" class="btn btn-outline-secondary fs-opt" data-fsbtn="" aria-pressed="false" style="font-size:14px">Aa<div style="font-size:13px">Normal</div></button>
            <button type="button" class="btn btn-outline-secondary fs-opt" data-fsbtn="lg" aria-pressed="false" style="font-size:17px">Aa<div style="font-size:13px">Large</div></button>
            <button type="button" class="btn btn-outline-secondary fs-opt" data-fsbtn="xl" aria-pressed="false" style="font-size:20px">Aa<div style="font-size:13px">X-Large</div></button>
          </div>
        </div>
      </li>
      <li class="nav-item"><span class="nav-link text-muted" id="roleBadge"></span></li>
      <li class="nav-item"><a class="nav-link" href="#" id="logoutBtn" title="Sign out" aria-label="Sign out"><i class="fas fa-sign-out-alt"></i></a></li>
    </ul>
  </nav>
  <?php /* เมนูซ้าย (includes/sidebar.php) */ ?>
  <?php include __DIR__ . '/sidebar.php'; ?>
  <?php /* พื้นที่เนื้อหาของแต่ละหน้า (ไปปิดแท็กใน footer.php) */ ?>
  <div class="content-wrapper">
    <section class="content pt-3"><div class="container-fluid">
<?php endif; ?>
