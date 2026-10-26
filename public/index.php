<?php
declare(strict_types=1);
// หน้า Dashboard: แยกเป็นการ์ดต่องาน (module) — รายการงานและตัวเลขสรุปของแต่ละงานกำหนดใน assets/js/home.js (MODULES)
$pageTitle = 'Dashboard'; $active = 'index';
include __DIR__ . '/../app/includes/header.php';
?>
<?php /* พื้นที่การ์ดของแต่ละงาน (home.js สร้างเนื้อหา) */ ?>
<div id="modules" aria-live="polite"></div>
<?php /* โหลด home.js แล้วปิดหน้าด้วย footer */ ?>
<?php $pageScripts = ['assets/js/home.js']; include __DIR__ . '/../app/includes/footer.php'; ?>
