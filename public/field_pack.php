<?php
declare(strict_types=1);
/*
 * field_pack.php — งานหน้างานของ Test Package 1 ใบ (field_pack.php?id=...) สำหรับแท็บเล็ต (โครง HTML เท่านั้น)
 * ตรรกะอยู่ใน assets/js/field_pack.js (ร่างกันหาย: field_draft.js · Pre-test ใช้ฟังก์ชันของ tp_pretest.js)
 * หน้าเดียวไล่ตามลำดับงานจริง: ① Pre-test ② Punch ③ Pressure test ④ ลงนาม
 * ③ ④ เปิดต่อที่หน้าออฟฟิศ (test_package.php) ซึ่งมีฟอร์มบันทึกผลทดสอบแรงดันและลายเซ็นบนจออยู่แล้ว
 */
$pageTitle = 'Field · Test Package'; $active = 'field';
include __DIR__ . '/../app/includes/header.php';
?>
<div id="notFound" class="alert alert-danger d-none" role="alert">Test Package not found. <a href="field.php">Back to Field mode</a></div>

<div class="fd-page d-none" id="fpPage">
  <?php /* หัวเรื่อง: กลับ + ชื่อ pack + สถานะออนไลน์ */ ?>
  <div class="d-flex flex-wrap align-items-center mb-2" style="gap:10px">
    <a class="btn btn-outline-secondary fd-btn" href="field.php"><i class="fas fa-arrow-left"></i> Packs</a>
    <h4 class="mb-0" id="fpNo"></h4><span id="fpState"></span>
    <span id="fpNet" class="ml-auto"></span>
  </div>
  <div class="text-muted mb-2" id="fpSub"></div>
  <?php /* แถบขั้นตอนติดด้านบนขณะเลื่อน */ ?>
  <nav class="fd-steps" aria-label="Steps" id="fpSteps">
    <a href="#fpPretest" class="fd-step"><span>1</span> Pre-test <small id="stPre"></small></a>
    <a href="#fpPunch" class="fd-step"><span>2</span> Punch <small id="stPunch"></small></a>
    <a href="#fpPressure" class="fd-step"><span>3</span> Pressure test</a>
    <a href="#fpSign" class="fd-step"><span>4</span> Sign-off</a>
  </nav>
  <div id="fpDraftBar" class="alert alert-warning d-none fd-draftbar" role="status"></div>

  <?php /* ① Pre-test (Sheet5): ตอบ YES / NO / N/A — ตอบ NO ระบบออก punch A ให้อัตโนมัติ */ ?>
  <section class="card fd-sec" id="fpPretest" aria-labelledby="h1">
    <div class="card-header"><h5 id="h1" class="mb-0">1 · Pre-test checklist</h5></div>
    <div class="card-body" id="fpPretestBody"></div>
  </section>

  <?php /* ② Punch: รายการของ pack นี้ + ปุ่มเพิ่ม */ ?>
  <section class="card fd-sec" id="fpPunch" aria-labelledby="h2">
    <div class="card-header d-flex align-items-center"><h5 id="h2" class="mb-0">2 · Punch list</h5>
      <button type="button" class="btn btn-info fd-btn ml-auto" id="fpAdd"><i class="fas fa-plus"></i> Add punch</button></div>
    <div class="card-body" id="fpPunchBody"></div>
  </section>

  <?php /* ③ ④ เปิดต่อที่หน้าออฟฟิศ (แท็บ Pressure test / Sign-off) */ ?>
  <section class="card fd-sec" id="fpPressure"><div class="card-header"><h5 class="mb-0">3 · Pressure test</h5></div>
    <div class="card-body"><div id="fpGate" class="mb-2"></div>
      <a class="btn btn-outline-info fd-btn" id="fpPressureLink" href="test_package.php"><i class="fas fa-tachometer-alt"></i> Open pressure test record</a></div></section>
  <section class="card fd-sec" id="fpSign"><div class="card-header"><h5 class="mb-0">4 · Sign-off</h5></div>
    <div class="card-body"><p class="text-muted mb-2">Draw or upload signatures on the screen.</p>
      <a class="btn btn-outline-info fd-btn" id="fpSignLink" href="test_package.php"><i class="fas fa-signature"></i> Open sign-off</a>
      <a class="btn btn-outline-secondary fd-btn ml-1" id="fpReportLink" href="punch_report.php"><i class="fas fa-print"></i> Punch report</a></div></section>
</div>

<?php /* ฟอร์มเพิ่ม punch เต็มจอ (JS วางเนื้อหา) */ ?>
<div class="modal fade" id="fpModal" tabindex="-1" role="dialog" aria-labelledby="fpModalTitle" aria-hidden="true">
  <div class="modal-dialog modal-lg modal-dialog-scrollable fd-modal" role="document"><div class="modal-content">
    <div class="modal-header"><h5 class="modal-title" id="fpModalTitle">Add punch item</h5>
      <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button></div>
    <div class="modal-body" id="fpModalBody"></div>
    <div class="modal-footer">
      <span class="small mr-auto" id="fpModalMsg" role="status" aria-live="polite"></span>
      <button type="button" class="btn btn-outline-secondary fd-btn" data-dismiss="modal">Close</button>
      <button type="button" class="btn btn-outline-info fd-btn" id="fpSave">Save</button>
      <button type="button" class="btn btn-info fd-btn" id="fpSaveMore">Save &amp; add another</button>
    </div>
  </div></div>
</div>

<?php /* แผงเล็กของรายการ punch: ดูเลข/สถานะ/รูป + เพิ่มรูป (JS วางเนื้อหา) */ ?>
<div class="modal fade" id="fpItemModal" tabindex="-1" role="dialog" aria-labelledby="fpItemTitle" aria-hidden="true">
  <div class="modal-dialog modal-lg modal-dialog-scrollable fd-modal" role="document"><div class="modal-content">
    <div class="modal-header"><h5 class="modal-title fd-item-no" id="fpItemTitle"></h5>
      <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button></div>
    <div class="modal-body" id="fpItemBody"></div>
    <div class="modal-footer">
      <span class="small mr-auto" id="fpItemMsg" role="status" aria-live="polite"></span>
      <button type="button" class="btn btn-outline-secondary fd-btn" data-dismiss="modal">Close</button>
      <button type="button" class="btn btn-info fd-btn d-none" id="fpItemSave"><i class="fas fa-upload"></i> Save photos</button>
    </div>
  </div></div>
</div>
<?php
$pageScripts = ['assets/js/punch_common.js', 'assets/js/punch_photos.js', 'assets/js/field_draft.js', 'assets/js/tp_pretest.js', 'assets/js/field_pack.js'];
include __DIR__ . '/../app/includes/footer.php';
?>
