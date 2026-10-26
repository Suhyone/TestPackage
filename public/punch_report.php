<?php
declare(strict_types=1);
/*
 * punch_report.php — รายงาน PROCESS PUNCH-LIST แบบพิมพ์ A4 ของ Test Package 1 ใบ (punch_report.php?id=...) ตามฟอร์ม CT8 Sheet6
 * โครง HTML เท่านั้น — ตรรกะอยู่ใน assets/js/punch_report.js · สไตล์การพิมพ์อยู่ท้าย assets/css/app.css (@media print)
 */
$pageTitle = 'Punch List Report'; $active = 'test_packages';
include __DIR__ . '/../app/includes/header.php';
?>
<div id="notFound" class="alert alert-danger d-none" role="alert">Test Package not found. <a href="test_packages.php">Back to the list</a></div>

<?php /* ปุ่มด้านบน (ไม่พิมพ์) */ ?>
<div class="d-flex align-items-center mb-2 no-print" style="gap:8px" id="rpTools">
  <a class="btn btn-sm btn-outline-secondary" id="rpBack" href="test_packages.php"><i class="fas fa-arrow-left"></i> Back</a>
  <button type="button" class="btn btn-sm btn-info ml-auto" id="rpPrint"><i class="fas fa-print"></i> Print / Save as PDF</button>
</div>

<?php /* กระดาษ A4: JS เติมหัวใบ ตารางรายการ และลายเซ็น */ ?>
<div class="report-sheet" id="rpSheet"></div>

<?php
$pageScripts = ['assets/js/punch_common.js', 'assets/js/punch_report.js'];
include __DIR__ . '/../app/includes/footer.php';
?>
