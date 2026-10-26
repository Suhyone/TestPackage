<?php
declare(strict_types=1);
/*
 * punch_list.php — หน้า Test Package > Punch List (โครง HTML เท่านั้น)
 * ตรรกะทั้งหมดอยู่ใน assets/js:
 *   punch_list.js   ตารางหลัก / ตัวกรอง / แถวบันทึกใหม่ / ฟอร์มเพิ่มตำหนิ
 *   punch_detail.js แผงรายละเอียดด้านขวา (ไอคอน 🔍: ตรวจ แก้ อนุมัติ)
 *   punch_photos.js ปุ่มเลือกไฟล์/ถ่ายรูป และอัปโหลดรูป
 */
// ตั้งชื่อหน้า + เมนูที่ active แล้วโหลดส่วนหัว (navbar + เมนูซ้าย)
$pageTitle = 'Punch List'; $active = 'punch_list';
include __DIR__ . '/../app/includes/header.php';
?>
<?php /* สไตล์ AG Grid (ตารางหลัก) */ ?>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/ag-grid-community@31.3.4/styles/ag-grid.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/ag-grid-community@31.3.4/styles/ag-theme-alpine.css">

<?php /* การ์ดตัวกรองบนสุด: Skid / สถานะ / Category / Discipline (ทุกตัวมี "ทั้งหมด") + ปุ่มเพิ่มตำหนิ/ล้างตัวกรอง */ ?>
<div class="card card-outline card-info mb-2"><div class="card-body py-2">
  <?php /* แถวจัดวางตัวกรองให้อยู่เรียงกัน */ ?>
  <div class="form-row align-items-end">
    <div class="col-6 col-md-2"><label class="mb-0 small">Skid</label><select id="fSkid" class="form-control form-control-sm"></select></div>
    <div class="col-6 col-md-2"><label class="mb-0 small">Status</label><select id="fStatus" class="form-control form-control-sm"></select></div>
    <div class="col-6 col-md-2"><label class="mb-0 small">Category</label><select id="fCategory" class="form-control form-control-sm"></select></div>
    <div class="col-6 col-md-2"><label class="mb-0 small">Discipline</label><select id="fDiscipline" class="form-control form-control-sm"></select></div>
    <?php /* ปุ่มด้านขวา: เพิ่มตำหนิ (เฉพาะ QC/admin — JS เป็นคนเอา d-none ออก) และล้างตัวกรอง */ ?>
    <div class="col-6 col-md-2 text-right">
      <button id="btnAdd" class="btn btn-sm btn-info d-none"><i class="fas fa-plus"></i> Add Punch Item</button>
      <button id="btnReset" class="btn btn-sm btn-outline-secondary" title="Clear filters"><i class="fas fa-undo"></i></button>
    </div>
  </div>
</div></div>

<?php /* การ์ดสรุปจำนวนตามสถานะ (JS สร้างเนื้อหา กดเพื่อกรองสถานะ) */ ?>
<div class="d-flex flex-wrap mb-2" style="gap:6px" id="statRow"></div>

<?php /* แท็บแยกประเภทงาน: ทั้งหมด / Welded / Non-welded / ยังไม่ระบุ */ ?>
<ul class="nav nav-tabs mb-0" id="typeTabs">
  <li class="nav-item"><a class="nav-link active" href="#" data-type="all">All</a></li>
  <li class="nav-item"><a class="nav-link" href="#" data-type="welded"><i class="fas fa-fire"></i> Welded (report required)</a></li>
  <li class="nav-item"><a class="nav-link" href="#" data-type="non_welded"><i class="fas fa-search"></i> Non-welded (inspection only)</a></li>
  <li class="nav-item"><a class="nav-link" href="#" data-type="none">Type not set</a></li>
</ul>

<?php /* แถบเครื่องมือเหนือตาราง: ค้นหา / จัดกลุ่ม / ขยาย-พับ / คอลัมน์ / กระชับ / Export + แถบโหลดข้อมูล */ ?>
<div class="card card-body border-top-0 py-2 mb-0" style="border-radius:0">
  <div class="d-flex flex-wrap align-items-center" style="gap:8px">
    <?php /* ช่องค้นหาข้อความ (Test Pack / Drawing / ตำหนิ / ผู้ Punch) */ ?>
    <div class="input-group input-group-sm" style="max-width:340px">
      <div class="input-group-prepend"><span class="input-group-text"><i class="fas fa-search"></i></span></div>
      <input id="qSearch" class="form-control" placeholder="Search Test Package No. / Drawing / Description / Punched by">
    </div>
    <?php /* เลือกจัดกลุ่มได้ 2 ชั้น (ค่าเริ่มต้น: ชั้นแรก Test Pack ชั้นสองไม่มี) */ ?>
    <div class="d-flex align-items-center small" style="gap:4px">Group by
      <select id="gGroup1" class="form-control form-control-sm w-auto">
        <option value="">— No grouping —</option><option value="test_pack_no">Test Package No.</option><option value="drawing_id">Drawing</option>
        <option value="skid">Skid</option><option value="project_no">Project</option><option value="status">Status</option>
        <option value="category">Category</option><option value="discipline">Discipline</option></select>
      <i class="fas fa-angle-right text-muted"></i>
      <select id="gGroup2" class="form-control form-control-sm w-auto">
        <option value="">— None —</option><option value="test_pack_no">Test Package No.</option><option value="drawing_id">Drawing</option>
        <option value="skid">Skid</option><option value="project_no">Project</option><option value="status">Status</option>
        <option value="category">Category</option><option value="discipline">Discipline</option></select>
    </div>
    <?php /* ปุ่มขยาย/พับทุกกลุ่ม */ ?>
    <div class="btn-group btn-group-sm">
      <button class="btn btn-outline-secondary" id="btnExpand"><i class="fas fa-plus-square"></i> Expand</button>
      <button class="btn btn-outline-secondary" id="btnCollapse"><i class="fas fa-minus-square"></i> Collapse</button>
    </div>
    <?php /* เมนูเลือกแสดง/ซ่อนคอลัมน์ (JS สร้างรายการใน #colMenu) */ ?>
    <div class="dropdown">
      <button class="btn btn-sm btn-outline-secondary dropdown-toggle" data-toggle="dropdown"><i class="fas fa-columns"></i> Columns</button>
      <div class="dropdown-menu p-2" id="colMenu" style="min-width:200px"></div>
    </div>
    <button class="btn btn-sm btn-outline-secondary" id="btnDensity"><i class="fas fa-compress-alt"></i> Compact</button>
    <button class="btn btn-sm btn-success ml-auto" id="btnCsv"><i class="fas fa-file-excel"></i> Export CSV</button>
    <?php /* ข้อความสรุป "N รายการ · M Test Pack" */ ?>
    <span class="small text-muted" id="rowInfo"></span>
  </div>
  <?php /* แถบความคืบหน้าตอนโหลดข้อมูลจากฐานข้อมูล */ ?>
  <div class="progress mt-2 d-none" id="loadBar" style="height:4px"><div class="progress-bar bg-info" style="width:0"></div></div>
</div>
<?php /* พื้นที่ตาราง AG Grid (JS สร้างตารางในนี้) */ ?>
<div id="punchTable" class="ag-theme-alpine"></div>
<?php /* ตัวนำทาง record แบบ Access: |◀ ◀ [เลขแถว] จาก N ▶ ▶| ▶＊ */ ?>
<div class="record-nav mb-3">
  <span class="text-muted mr-2">Record:</span>
  <button class="btn btn-sm btn-light" id="navFirst" title="First"><i class="fas fa-step-backward"></i></button>
  <button class="btn btn-sm btn-light" id="navPrev" title="Previous"><i class="fas fa-caret-left"></i></button>
  <input id="navPos" class="form-control form-control-sm d-inline-block text-center" style="width:70px">
  <span id="navTotal" class="mx-1 small text-muted">of 0</span>
  <button class="btn btn-sm btn-light" id="navNext" title="Next"><i class="fas fa-caret-right"></i></button>
  <button class="btn btn-sm btn-light" id="navLast" title="Last"><i class="fas fa-step-forward"></i></button>
  <button class="btn btn-sm btn-light" id="navNew" title="New record"><i class="fas fa-caret-right"></i>*</button>
  <span class="ml-3 small text-muted">Tips: click a row for details · use Columns to show more fields · click the filter icon on a column header · the green bottom row adds a new item · double-click a cell to edit</span>
</div>

<?php /* แผงรายละเอียดด้านขวา (เปิดจากไอคอน 🔍) — เนื้อหาสร้างโดย openDetail() ใน punch_detail.js */ ?>
<div id="detailPanel"></div>

<?php /* หน้าต่างตั้งค่า Drawing: เลือกประเภท Welded/Non-welded + แนบ Report (เปิดจากลิงก์ "ตั้งค่า" ที่หัวกลุ่ม) */ ?>
<div class="modal fade" id="dwgModal" tabindex="-1"><div class="modal-dialog"><div class="modal-content">
  <div class="modal-header"><h6 class="modal-title" id="dwgTitle"></h6><button class="close" data-dismiss="modal">&times;</button></div>
  <div class="modal-body">
    <div class="form-group"><label>Work type</label><select id="dwgType" class="form-control">
      <option value="">— Not set —</option><option value="welded">Welded (report required)</option><option value="non_welded">Non-welded (inspection only)</option></select></div>
    <?php /* ส่วนที่แสดงเฉพาะงาน Welded: ไฟล์ Report + หมายเหตุ */ ?>
    <div id="dwgWeldBox" class="d-none">
      <div class="form-group"><label>Report</label><div id="dwgRptLink" class="small mb-1"></div><input type="file" id="dwgRptFile" class="form-control-file"></div>
      <div class="form-group"><label>Report note</label><textarea id="dwgNote" class="form-control" rows="2"></textarea></div>
    </div>
  </div>
  <div class="modal-footer"><button class="btn btn-secondary" data-dismiss="modal">Close</button><button id="dwgSave" class="btn btn-info">Save</button></div>
</div></div></div>

<?php include __DIR__ . '/../app/includes/add_modal.php'; ?>

<?php
// สคริปต์ของหน้านี้ (ลำดับสำคัญ: ไลบรารีตาราง → รูป → แผงรายละเอียด → ตารางหลัก) แล้วปิดหน้าด้วย footer
$pageScripts = [
  'https://cdn.jsdelivr.net/npm/ag-grid-community@31.3.4/dist/ag-grid-community.min.js',
  'assets/js/punch_common.js',
  'assets/js/punch_photos.js',
  'assets/js/punch_add.js',
  'assets/js/punch_detail.js',
  'assets/js/punch_list.js',
];
include __DIR__ . '/../app/includes/footer.php';
?>
