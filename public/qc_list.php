<?php
declare(strict_types=1);
/*
 * qc_list.php — หน้า Punch List แบบย่อสำหรับ QA/QC และเจ้าหน้าที่ (โครง HTML เท่านั้น)
 * แสดงแค่ Test Pack / Drawing No. / Deficiency / สถานะ — รายละเอียดอื่นอยู่ในแผงด้านขวาเมื่อคลิกแถว
 * ตรรกะอยู่ใน assets/js/qc_list.js (แผงรายละเอียดใช้ punch_detail.js ร่วมกับหน้า admin)
 *   QA/QC     เห็นทุกงาน เริ่มที่ "รอตรวจซ้ำ" และเพิ่มตำหนิได้
 *   เจ้าหน้าที่ เห็นเฉพาะงานที่ถูกมอบหมาย เริ่มที่ "Open + Rework" (ต้องแก้)
 */
$pageTitle = 'Punch List'; $active = 'qc_list';
include __DIR__ . '/../app/includes/header.php';
?>
<?php /* ชิปสถานะ: กดเพื่อเลือก/ยกเลิกการกรอง (JS สร้างเนื้อหา) + ปุ่มเพิ่มตำหนิ (เฉพาะ QC) */ ?>
<div class="d-flex flex-wrap align-items-center mb-2" style="gap:8px">
  <h5 class="mb-0 mr-2" id="pageHead">Punch List</h5>
  <div class="d-flex flex-wrap" id="chipRow" style="gap:6px" role="radiogroup" aria-label="Status"></div>
  <button id="btnAdd" class="btn btn-sm btn-info ml-auto d-none"><i class="fas fa-plus"></i> Add Punch Item</button>
</div>

<?php /* ค้นหา + Skid */ ?>
<div class="d-flex flex-wrap align-items-center mb-2" style="gap:8px">
  <div class="input-group input-group-sm" style="max-width:360px">
    <div class="input-group-prepend"><span class="input-group-text"><i class="fas fa-search"></i></span></div>
    <input id="qSearch" class="form-control" placeholder="Search Test Package No. / Drawing / Description">
  </div>
  <select id="fSkid" class="form-control form-control-sm w-auto" title="Skid"></select>
  <span class="small text-muted ml-auto" id="rowInfo"></span>
  <button id="btnCsv" class="btn btn-sm btn-success d-none"><i class="fas fa-file-excel"></i> Export CSV</button>
</div>

<?php /* รายการงาน: 4 คอลัมน์ คลิกแถวเพื่อเปิดรายละเอียด */ ?>
<div class="card"><div class="table-responsive qc-wrap">
  <table class="table table-hover mb-0 qc-table">
    <thead><tr><th style="width:210px">Test Package No.</th><th style="width:190px">Drawing No.</th><th style="width:70px" class="text-center">Item</th><th>Punch Item Description</th><th style="width:90px" class="text-center">Category</th><th style="width:110px" class="text-center">Status</th></tr></thead>
    <tbody id="qcRows"></tbody>
  </table>
  <?php /* ท้ายตาราง: เลื่อนมาถึงตรงนี้ JS จะวาดแถวเพิ่มเอง (ไม่มีปุ่ม Show more) */ ?>
  <div id="moreSentinel" style="height:1px"></div>
</div>
<div class="p-2 text-center small text-muted" id="loadInfo" aria-live="polite"></div>
</div>

<?php /* แผงรายละเอียดด้านขวา — เนื้อหาสร้างโดย openDetail() ใน punch_detail.js */ ?>
<div id="detailPanel"></div>

<?php include __DIR__ . '/../app/includes/add_modal.php'; ?>

<?php
$pageScripts = [
  'assets/js/punch_common.js',
  'assets/js/punch_photos.js',
  'assets/js/punch_add.js',
  'assets/js/punch_detail.js',
  'assets/js/qc_list.js',
];
include __DIR__ . '/../app/includes/footer.php';
?>
