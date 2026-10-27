<?php
declare(strict_types=1);
/*
 * field.php — โหมดหน้างาน (แท็บเล็ต): เลือก Module แล้วเลือก Test Package ที่จะตรวจ (โครง HTML เท่านั้น)
 * ตรรกะอยู่ใน assets/js/field.js · หน้างานของ pack ใบเดียวอยู่ที่ field_pack.php?id=...
 * การ์ดใหญ่ แตะง่าย แสดงความคืบหน้า Pre-test และ punch ที่ค้าง — หน้าออฟฟิศ (test_packages.php) ยังใช้กรอกละเอียดบนเดสก์ท็อป
 */
$pageTitle = 'Field mode'; $active = 'field';
include __DIR__ . '/../app/includes/header.php';
?>
<div class="fd-page">
  <div class="d-flex flex-wrap align-items-center mb-3" style="gap:10px">
    <h4 class="mb-0"><i class="fas fa-tablet-alt text-info"></i> Field mode</h4>
    <span id="fdNet" class="ml-auto"></span>
  </div>
  <?php /* ค้นหา + ตัวกรองสถานะ + เลือก Module (JS เติม) */ ?>
  <div class="fd-toolbar mb-3">
    <input type="search" id="fdSearch" class="form-control" placeholder="Search Test Package, system or module" aria-label="Search Test Package">
    <div class="btn-group btn-group-toggle fd-filter" id="fdFilter" role="group" aria-label="Filter">
      <label class="btn btn-outline-secondary active"><input type="radio" name="fdf" value="all" checked> All</label>
      <label class="btn btn-outline-secondary"><input type="radio" name="fdf" value="todo"> To do</label>
      <label class="btn btn-outline-secondary"><input type="radio" name="fdf" value="blocked"> Blocked</label>
    </div>
  </div>
  <div class="fd-modules mb-3" id="fdModules" role="group" aria-label="Module"></div>
  <div id="fdList" class="fd-grid" aria-live="polite"></div>
  <div id="fdEmpty" class="text-muted text-center py-5 d-none">No Test Packages match.</div>
  <div id="fdLoading" class="text-muted text-center py-5"><i class="fas fa-spinner fa-spin"></i> Loading…</div>
</div>
<?php
$pageScripts = ['assets/js/punch_common.js', 'assets/js/field_draft.js', 'assets/js/field.js'];
include __DIR__ . '/../app/includes/footer.php';
?>
