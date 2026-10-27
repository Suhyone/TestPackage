<?php
declare(strict_types=1);
/*
 * test_package.php — หน้ารายละเอียดของ Test Package 1 ใบ (test_package.php?id=...) แบบแท็บตามชีตในฟอร์ม (โครง HTML เท่านั้น)
 * ตรรกะอยู่ใน assets/js/tp_detail.js
 *   ทุกแท็บใช้งานได้: Info · Contents / ISO (tp_data.js) · Pre-test (tp_pretest.js) · Punch · Pressure test (tp_pressure.js) · Sign-off (tp_signature.js)
 *   ปุ่ม "Field mode" เปิดหน้างานของ pack นี้สำหรับแท็บเล็ต (field_pack.php)
 */
// ตั้งชื่อหน้า + เมนูที่ active (ใช้เมนู Test Packages) แล้วโหลดส่วนหัว
$pageTitle = 'Test Package'; $active = 'test_packages';
include __DIR__ . '/../app/includes/header.php';
?>
<?php /* ข้อความแจ้งเมื่อฐานข้อมูลยังไม่ถูกปรับ (JS แสดงเมื่อไม่มีคอลัมน์ของ Sheet1) หรือไม่พบ pack */ ?>
<div id="setupMsg" class="alert alert-warning d-none" role="alert">
  <b>Database is not up to date.</b> Run <code>sql/05_ct8_migration.sql</code> and <code>sql/06_test_package_register.sql</code> in the Supabase SQL Editor, then reload.
</div>
<div id="notFound" class="alert alert-danger d-none" role="alert">Test Package not found. <a href="test_packages.php">Back to the list</a></div>

<?php /* ส่วนหัวของ pack: ชื่อ, รายละเอียดสั้น, ป้ายสถานะ punch และจำนวน (JS เติมข้อมูล) */ ?>
<div id="tpHead" class="d-none">
  <nav aria-label="breadcrumb"><ol class="breadcrumb bg-transparent p-0 mb-1 small">
    <li class="breadcrumb-item"><a href="test_packages.php">Test Packages</a></li>
    <li class="breadcrumb-item active" id="crumbNo" aria-current="page"></li>
  </ol></nav>
  <div class="d-flex flex-wrap align-items-center mb-2" style="gap:10px">
    <h4 class="mb-0" id="hNo"></h4>
    <span id="hState"></span>
    <span class="text-muted" id="hSub"></span>
    <div class="ml-auto d-flex align-items-center flex-wrap" style="gap:6px">
      <a class="btn btn-sm btn-outline-info" id="hField" href="field.php"><i class="fas fa-tablet-alt"></i> Field mode</a>
      <span class="d-flex" style="gap:6px" id="hCounts"></span>
    </div>
  </div>

  <?php /* แท็บตามชีตในฟอร์ม: Info / Contents / ISO / Pre-test / Punch / Pressure test / Sign-off */ ?>
  <ul class="nav nav-tabs" id="tpTabs" role="tablist">
    <li class="nav-item"><a class="nav-link active" id="t-info" data-toggle="tab" href="#tab-info" role="tab" aria-controls="tab-info" aria-selected="true">Info</a></li>
    <li class="nav-item"><a class="nav-link" id="t-contents" data-toggle="tab" href="#tab-contents" role="tab" aria-controls="tab-contents" aria-selected="false">Contents</a></li>
    <li class="nav-item"><a class="nav-link" id="t-iso" data-toggle="tab" href="#tab-iso" role="tab" aria-controls="tab-iso" aria-selected="false">ISO / Spool</a></li>
    <li class="nav-item"><a class="nav-link" id="t-pretest" data-toggle="tab" href="#tab-pretest" role="tab" aria-controls="tab-pretest" aria-selected="false">Pre-test</a></li>
    <li class="nav-item"><a class="nav-link" id="t-punch" data-toggle="tab" href="#tab-punch" role="tab" aria-controls="tab-punch" aria-selected="false">Punch</a></li>
    <li class="nav-item"><a class="nav-link" id="t-pressure" data-toggle="tab" href="#tab-pressure" role="tab" aria-controls="tab-pressure" aria-selected="false">Pressure test</a></li>
    <li class="nav-item"><a class="nav-link" id="t-signoff" data-toggle="tab" href="#tab-signoff" role="tab" aria-controls="tab-signoff" aria-selected="false">Sign-off</a></li>
  </ul>

  <div class="tab-content card card-body border-top-0 mb-3" style="border-radius:0 0 .25rem .25rem">

    <?php /* แท็บ Info = ข้อมูลจาก Sheet1 (PRESSURE TEST INFORMATION): ทั่วไป / เงื่อนไขทดสอบ / ประวัติแก้ไขเอกสาร */ ?>
    <div class="tab-pane fade show active" id="tab-info" role="tabpanel" aria-labelledby="t-info">
      <form id="infoForm" autocomplete="off" novalidate>
        <div id="infoFields"></div>
        <div class="d-flex align-items-center mt-3" style="gap:10px">
          <button type="submit" class="btn btn-info btn-sm" id="infoSave">Save changes</button>
          <span class="small" id="infoMsg" role="status" aria-live="polite"></span>
        </div>
      </form>
    </div>

    <?php /* Contents / ISO = ข้อมูลจากชุด dataset (tp_data.js) · Pre-test = tp_pretest.js · Pressure test = เตรียมไว้เฟสถัดไป */ ?>
    <div class="tab-pane fade" id="tab-contents" role="tabpanel" aria-labelledby="t-contents"></div>
    <div class="tab-pane fade" id="tab-iso" role="tabpanel" aria-labelledby="t-iso"></div>
    <div class="tab-pane fade" id="tab-pressure" role="tabpanel" aria-labelledby="t-pressure"></div>

    <?php /* แท็บ Pre-test = Sheet5: Document checklist 17 ข้อ + Test preparation checklist 13 ข้อ (JS วาดใน tp_pretest.js) */ ?>
    <div class="tab-pane fade" id="tab-pretest" role="tabpanel" aria-labelledby="t-pretest"></div>

    <?php /* แท็บ Punch: ข้อมูลหัวใบ Punch List (Sheet6) + รายการ punch ของ pack นี้ + ลิงก์ไปหน้า Punch List */ ?>
    <div class="tab-pane fade" id="tab-punch" role="tabpanel" aria-labelledby="t-punch">
      <form id="punchForm" autocomplete="off" novalidate>
        <div class="form-row" id="punchFields"></div>
        <div class="d-flex align-items-center mb-3" style="gap:10px">
          <button type="submit" class="btn btn-info btn-sm" id="punchSave">Save report details</button>
          <span class="small" id="punchMsg" role="status" aria-live="polite"></span>
          <a class="btn btn-sm btn-outline-info ml-auto" id="punchReport" href="punch_report.php"><i class="fas fa-print"></i> Print report</a>
          <a class="btn btn-sm btn-info d-none" id="punchAdd" href="qc_list.php"><i class="fas fa-plus"></i> Add punch item</a>
          <a class="btn btn-sm btn-outline-info" id="punchLink" href="qc_list.php"><i class="fas fa-external-link-alt"></i> Open in Punch List</a>
        </div>
      </form>
      <div class="table-responsive"><table class="table table-sm table-hover mb-0" id="punchTable">
        <thead><tr><th>Item</th><th>Drawing No.</th><th>Description</th><th class="text-center">Cat.</th><th class="text-center">Status</th><th>Prod Sup.</th><th>QCI</th><th>Client Rep.</th></tr></thead>
        <tbody id="punchRows"></tbody>
      </table></div>
      <div class="small text-muted mt-2" id="punchEmpty"></div>
    </div>

    <?php /* แท็บ Sign-off: ลายเซ็นของ Test Package (Sheet1) และของใบ Punch List (Sheet6) */ ?>
    <div class="tab-pane fade" id="tab-signoff" role="tabpanel" aria-labelledby="t-signoff">
      <form id="signForm" autocomplete="off" novalidate>
        <div id="signFields"></div>
        <div class="d-flex align-items-center mt-3" style="gap:10px">
          <button type="submit" class="btn btn-info btn-sm" id="signSave">Save sign-off</button>
          <span class="small" id="signMsg" role="status" aria-live="polite"></span>
        </div>
      </form>
    </div>
  </div>
</div>

<?php
// สคริปต์ของหน้านี้: ตัวช่วยร่วม (punch_common.js) แล้วตรรกะหน้ารายละเอียด
$pageScripts = ['assets/js/punch_common.js', 'assets/js/punch_photos.js', 'assets/js/tp_common.js', 'assets/js/tp_signature.js', 'assets/js/tp_pretest.js', 'assets/js/tp_pressure.js', 'assets/js/tp_data.js', 'assets/js/tp_detail.js'];
include __DIR__ . '/../app/includes/footer.php';
?>
