<?php
declare(strict_types=1);
/*
 * test_packages.php — Test Package Register: ตารางรายการ Test Package ทั้งหมด (โครง HTML เท่านั้น)
 * ตรรกะอยู่ใน assets/js/tp_register.js · ข้อมูลมาจาก view v_test_packs (sql/06_test_package_register.sql)
 * คลิกแถวเพื่อเข้าหน้ารายละเอียด (test_package.php?id=...)
 */
// ตั้งชื่อหน้า + เมนูที่ active แล้วโหลดส่วนหัว (navbar + เมนูซ้าย)
$pageTitle = 'Test Packages'; $active = 'test_packages';
include __DIR__ . '/../app/includes/header.php';
?>
<?php /* สไตล์ AG Grid (ตาราง) */ ?>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/ag-grid-community@31.3.4/styles/ag-grid.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/ag-grid-community@31.3.4/styles/ag-theme-alpine.css">

<?php /* ข้อความแจ้งเมื่อฐานข้อมูลยังไม่พร้อม (JS แสดงเมื่อไม่พบ view v_test_packs) */ ?>
<div id="setupMsg" class="alert alert-warning d-none" role="alert">
  <b>Database is not ready.</b> Run <code>sql/05_ct8_migration.sql</code> then <code>sql/06_test_package_register.sql</code> in the Supabase SQL Editor, then reload this page.
</div>

<?php /* หัวหน้า: ชื่อ + ปุ่มเพิ่ม/ส่งออก (ปุ่มเพิ่มเห็นเฉพาะ QC/admin — JS เอา d-none ออก) */ ?>
<div class="d-flex flex-wrap align-items-center mb-2" style="gap:8px">
  <h5 class="mb-0 mr-2">Test Packages</h5>
  <span class="small text-muted" id="rowInfo"></span>
  <button id="btnAdd" class="btn btn-sm btn-info ml-auto d-none"><i class="fas fa-plus"></i> Add Test Package</button>
  <button id="btnCsv" class="btn btn-sm btn-success"><i class="fas fa-file-excel"></i> Export CSV</button>
</div>

<?php /* ชิปสรุปตามสถานะ punch (กดเพื่อกรอง) — JS สร้างเนื้อหา */ ?>
<div class="row mb-2" id="chipRow" role="radiogroup" aria-label="Punch status"></div>

<?php /* ตัวกรอง: ค้นหา / Module / Piping system */ ?>
<div class="d-flex flex-wrap align-items-center mb-2" style="gap:8px">
  <div class="input-group input-group-sm" style="max-width:360px">
    <div class="input-group-prepend"><span class="input-group-text"><i class="fas fa-search"></i></span></div>
    <input id="qSearch" class="form-control" placeholder="Search Test Package / system / name">
  </div>
  <select id="fModule" class="form-control form-control-sm w-auto" title="Block / Module"></select>
  <select id="fSystem" class="form-control form-control-sm w-auto" title="Piping system"></select>
</div>

<?php /* ตาราง Test Package (AG Grid) */ ?>
<div id="tpGrid" class="ag-theme-alpine"></div>

<?php /* หน้าต่างเพิ่ม Test Package ใหม่ (QC/admin) — กรอกข้อมูลหลักแล้วไปต่อที่หน้ารายละเอียด */ ?>
<div class="modal fade" id="tpModal" tabindex="-1" aria-labelledby="tpModalTitle" aria-hidden="true"><div class="modal-dialog"><div class="modal-content">
  <div class="modal-header"><h5 class="modal-title" id="tpModalTitle">Add Test Package</h5><button class="close" data-dismiss="modal" aria-label="Close">&times;</button></div>
  <div class="modal-body">
    <div class="form-group"><label for="newProject">Project No.</label>
      <input id="newProject" list="newProjectList" class="form-control" autocomplete="off"><datalist id="newProjectList"></datalist></div>
    <div class="form-group"><label for="newTp">Test Package No.</label><input id="newTp" class="form-control" placeholder="e.g. CT8-TP-MD-1.1-2"></div>
    <div class="form-row">
      <div class="form-group col-6"><label for="newModule">Block / Module</label><input id="newModule" class="form-control" placeholder="e.g. MD-1.1"></div>
      <div class="form-group col-6"><label for="newSystem">Piping system</label><input id="newSystem" class="form-control" placeholder="e.g. 27A0B"></div>
    </div>
    <div class="form-group"><label for="newName">Piping name</label><input id="newName" class="form-control" placeholder="e.g. LUBE OIL RETURN PIPING"></div>
    <div id="newErr" class="text-danger small d-none" role="alert"></div>
  </div>
  <div class="modal-footer"><button class="btn btn-secondary" data-dismiss="modal">Cancel</button><button id="newSave" class="btn btn-info">Create and open</button></div>
</div></div></div>

<?php
// สคริปต์ของหน้านี้ (ไลบรารีตาราง → ตัวช่วยร่วม 2 ไฟล์ → ตรรกะหน้า Register) แล้วปิดหน้าด้วย footer
$pageScripts = [
  'https://cdn.jsdelivr.net/npm/ag-grid-community@31.3.4/dist/ag-grid-community.min.js',
  'assets/js/punch_common.js',
  'assets/js/tp_common.js',
  'assets/js/tp_register.js',
];
include __DIR__ . '/../app/includes/footer.php';
?>
