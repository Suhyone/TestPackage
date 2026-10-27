<?php
declare(strict_types=1);
// เมนูซ้ายสไตล์เดียวกับระบบ BJCHI QA/QC เดิม
// เปิดกลุ่มเมนู Test Package ค้างไว้เมื่ออยู่ในหน้าย่อยของกลุ่มนี้
$testPackOpen = in_array($active, ['test_packages', 'punch_list', 'qc_list', 'data_guide'], true);
// สร้างเมนู 1 รายการ (ลิงก์ + ไอคอน + ชื่อ) และทำเครื่องหมาย active ถ้าเป็นหน้าปัจจุบัน
// $cls = คลาสเพิ่มของ <li> เช่น 'role-admin d-none' (ซ่อนจนกว่า app.js ตรวจสิทธิ์แล้วเอา d-none ออก)
function navItem(string $href, string $icon, string $label, bool $on, string $cls = ''): string {
    return '<li class="nav-item' . ($cls ? ' ' . $cls : '') . '"><a href="' . $href . '" class="nav-link' . ($on ? ' active' : '') . '">'
         . '<i class="nav-icon ' . $icon . '"></i><p>' . $label . '</p></a></li>';
}
?>
<?php /* เมนูซ้ายทั้งก้อน */ ?>
<aside class="main-sidebar sidebar-dark-primary elevation-4">
  <?php /* ชื่อระบบ/โลโก้ด้านบนเมนู */ ?>
  <a href="index.php" class="brand-link"><span class="brand-text font-weight-light">BJCHI QA/QC</span></a>
  <div class="sidebar">
    <?php /* กล่องแสดงชื่อผู้ใช้ (app.js ใส่ชื่อลงใน #userName) */ ?>
    <div class="user-panel mt-3 pb-3 mb-3 d-flex">
      <div class="image"><i class="fas fa-user-circle fa-2x text-info"></i></div>
      <div class="info"><a href="#" class="d-block" id="userName">...</a></div>
    </div>
    <?php /* ช่องกรองรายการเมนู (ทำงานฝั่งเบราว์เซอร์ใน app.js) */ ?>
    <div class="form-inline mb-2"><input class="form-control form-control-sidebar w-100" type="search" id="menuFilter" placeholder="Filter menu..."></div>
    <?php /* รายการเมนูทั้งหมด */ ?>
    <nav class="mt-2">
      <ul class="nav nav-pills nav-sidebar flex-column" data-widget="treeview" role="menu">
        <?php /* เมนู Dashboard */ ?>
        <?= navItem('index.php', 'fas fa-th', 'Dashboard', $active === 'index') ?>
        <?php /* Field mode: หน้างานสำหรับแท็บเล็ต (field.php → field_pack.php) */ ?>
        <?= navItem('field.php', 'fas fa-tablet-alt', 'Field mode', $active === 'field') ?>
        <?php /* กลุ่มเมนู Test Package (ดรอปดาวน์) — ต้องการเพิ่มเมนูย่อยของ Test Package ให้เพิ่มใน <ul> ด้านล่าง */ ?>
        <li class="nav-item has-treeview<?= $testPackOpen ? ' menu-open' : '' ?>">
          <a href="#" class="nav-link<?= $testPackOpen ? ' active' : '' ?>">
            <i class="nav-icon fas fa-clipboard-check"></i><p>Test Package<i class="right fas fa-angle-left"></i></p>
          </a>
          <ul class="nav nav-treeview">
            <?php /* Register: รายการ Test Package ทั้งหมด (คลิกเข้าหน้ารายละเอียดของแต่ละ pack) */ ?>
            <?= navItem('test_packages.php', 'far fa-circle', 'Test Packages', $active === 'test_packages') ?>
            <?php /* ทุกสิทธิ์ใช้ Punch List แบบเดียวกัน (qc_list.php) · admin มีตารางเต็ม (แก้ในเซลล์/จัดกลุ่ม/ตั้งค่า Drawing) เพิ่มอีกเมนู */ ?>
            <?= navItem('qc_list.php', 'far fa-circle', 'Punch List', $active === 'qc_list') ?>
            <?= navItem('punch_list.php', 'far fa-circle', 'Advanced Grid', $active === 'punch_list', 'role-admin d-none') ?>
            <?php /* คู่มือชุดข้อมูล: ที่มาของข้อมูล CT8/CT3/CT5, ตารางในฐานข้อมูล, วิธีนำเข้า/ใช้งาน */ ?>
            <?= navItem('data_guide.php', 'far fa-circle', 'Data Guide', $active === 'data_guide', 'role-admin d-none') ?>
          </ul>
        </li>
        <?php /* กลุ่ม Administrator เห็นเฉพาะ admin (app.js เอา d-none ออกเมื่อสิทธิ์เป็น admin) */ ?>
        <li class="nav-item role-admin d-none has-treeview<?= str_starts_with($active, 'admin') ? ' menu-open' : '' ?>">
          <a href="#" class="nav-link"><i class="nav-icon fas fa-user-cog"></i><p>Administrator<i class="right fas fa-angle-left"></i></p></a>
          <ul class="nav nav-treeview">
            <?= navItem('admin_users.php', 'far fa-circle', 'Users', $active === 'admin_users') ?>
            <?= navItem('admin_master.php', 'far fa-circle', 'Category / Discipline', $active === 'admin_master') ?>
          </ul>
        </li>
      </ul>
    </nav>
  </div>
</aside>
