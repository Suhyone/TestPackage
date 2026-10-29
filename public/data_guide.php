<?php
declare(strict_types=1);
/*
 * data_guide.php — คู่มือชุดข้อมูล Test Package (หน้าอ่านอย่างเดียว ไม่มี JavaScript ของตัวเอง)
 * สรุปที่มาของข้อมูล CT8 / CT3 / CT5, ตารางในฐานข้อมูล, ข้อมูลแต่ละอย่างไปแสดงที่หน้าไหน, กฎ punch และวิธีนำเข้า
 * อ้างอิง: data/AGENT_GUIDE.md · All_CT-8.xlsx (ชีต README) · sql/05–08
 */
// ตั้งชื่อหน้า + เมนูที่ active แล้วโหลดส่วนหัว
$pageTitle = 'Data Guide'; $active = 'data_guide';
include __DIR__ . '/../app/includes/header.php';
?>
<?php /* หัวหน้า */ ?>
<div class="d-flex align-items-center mb-3"><h5 class="mb-0">Data Guide</h5><span class="small text-muted ml-3">Where the data comes from, where it lives, and how to use it</span></div>

<?php /* 1) ชุดข้อมูลที่มี */ ?>
<div class="card mb-3"><div class="card-header py-2"><b>1. Datasets</b></div><div class="card-body p-0"><div class="table-responsive">
  <table class="table table-sm mb-0">
    <thead><tr><th>Project</th><th>Name</th><th>Source</th><th class="text-right">Packs</th><th class="text-right">ISO lines</th><th class="text-right">Punch</th><th>Content / Pre-test</th></tr></thead>
    <tbody>
      <tr><td><b>CT8</b></td><td>USA Project Unit 1 – Tallgrass</td><td>13 Excel forms → <code>All_CT-8.xlsx</code></td><td class="text-right">13</td><td class="text-right">110</td><td class="text-right">11</td><td>Content 195 · Pre-test 380 answers</td></tr>
      <tr><td><b>CT3</b></td><td>UTE Portocem M501 JAC Modular</td><td><code>tools/data/ct3/*.json</code></td><td class="text-right">25</td><td class="text-right">195</td><td class="text-right">111</td><td>Content 100</td></tr>
      <tr><td><b>CT5</b></td><td>NRG Cedar Bayou</td><td><code>tools/data/ct5/*.json</code></td><td class="text-right">20</td><td class="text-right">203</td><td class="text-right">59</td><td>—</td></tr>
    </tbody>
  </table></div></div></div>

<?php /* 2) ข้อมูลไปแสดงที่ไหน */ ?>
<div class="card mb-3"><div class="card-header py-2"><b>2. Where each piece of data is shown</b></div><div class="card-body p-0"><div class="table-responsive">
  <table class="table table-sm mb-0">
    <thead><tr><th>Data (form sheet)</th><th>Database table</th><th>Page</th></tr></thead>
    <tbody>
      <tr><td>Test package information, revision, sign-off (Sheet1)</td><td><code>test_packs</code></td><td><a href="test_packages.php">Test Packages</a> → open a package → <b>Info</b>, <b>Sign-off</b></td></tr>
      <tr><td>Content check list, 15 sections YES / N/A (Sheet2 + SECTION sheets)</td><td><code>pack_documents</code></td><td>Package → <b>Contents</b> (QC / admin can change YES / N/A)</td></tr>
      <tr><td>ISO index: isometric, line, spool, fluid, pressure, material</td><td><code>iso_lines</code></td><td>Package → <b>ISO / Spool</b> (read-only, searchable)</td></tr>
      <tr><td>Pressure test pack checklist: 17 documents + 13 preparation checks (Sheet5)</td><td><code>pretest_template</code> · <code>pretest_items</code></td><td>Package → <b>Pre-test</b> (answer NO raises a Category A punch)</td></tr>
      <tr><td>Process punch list (Sheet6)</td><td><code>punch_reports</code> · <code>drawings</code> · <code>punch_items</code></td><td>Package → <b>Punch</b> · <a href="qc_list.php">Punch List</a></td></tr>
    </tbody>
  </table></div></div></div>

<?php /* 3) กฎสำคัญ */ ?>
<div class="card mb-3"><div class="card-header py-2"><b>3. Rules to keep in mind</b></div><div class="card-body small">
  <ul class="mb-0 pl-4">
    <li><b>Category A</b> = no subsequent operation until the punch is closed — <b>the pressure test must not start</b>. <b>Category B</b> = work may continue at the project manager's discretion.</li>
    <li>Punch status in the app: <code>open</code> / <code>close</code> / <code>cancelled</code> (dataset <code>OPEN</code> / <code>CLOSED</code> map to open / close). A package is <i>blocked</i> while any Category A item is open.</li>
    <li>If a pre-test checklist item is <b>NO</b>, QC raises a punch list and the pressure test shall not proceed.</li>
    <li>The test package number comes from the <b>content of Sheet1</b>, not the file name (three CT8 files are named <code>CT8-AC-…</code> inside).</li>
    <li>Pressure and temperature values are kept as text because the forms use mixed formats ("0.10 / 1.0", "See line list").</li>
    <li>Source network share <code>\\192.168.100.12\qaqc</code> is read-only — never write to it.</li>
  </ul></div></div>

<?php /* 4) วิธีนำเข้า */ ?>
<div class="card mb-3"><div class="card-header py-2"><b>4. Import (admin, once per environment)</b></div><div class="card-body small">
  <ol class="pl-4 mb-2">
    <li>In the Supabase SQL Editor run <code>sql/01</code> … <code>sql/08</code> in order (<code>05</code> deletes the old C-31902-4 data).</li>
    <li>CT8 packs and punch lists from the 13 forms: <code>node tools/import_punch_xlsx.mjs "D:\ฝึกงาน\file_puch_list" --commit</code></li>
    <li>Check the extra datasets (nothing is written): <code>node tools/import_datasets.mjs</code></li>
    <li>Import them: <code>node tools/import_datasets.mjs --commit</code> &nbsp; (<code>--only ct8|ct3|ct5</code> to import one project)</li>
  </ol>
  <div class="text-muted">Re-running is safe: package headers, punch items and pre-test answers that already exist are <b>not overwritten</b>, so edits made in the web app are kept. ISO lines and contents are refreshed from the files.</div>
</div></div>

<?php /* 5) หมายเหตุคุณภาพข้อมูลที่พบตอนนำเข้า */ ?>
<div class="card mb-3"><div class="card-header py-2"><b>5. Data notes found while importing</b></div><div class="card-body small">
  <ul class="mb-0 pl-4">
    <li>CT8 pre-test: 10 preparation items (items 1 and 3 on five packs) are blank in the source forms, so they stay <b>unanswered</b> instead of being guessed.</li>
    <li>CT3: 6 punch items repeat the same item number within one package; they are all kept (the later ones get a <code>~2</code> suffix in <code>source_key</code>). 24 punch rows use a drawing number that is not in the ISO index.</li>
    <li>CT5: the file "Cedar-bayou Weld Map shop required" has no package data and is skipped. Package <code>CT4-TP-MD-1.2-2</code> appears inside the CT5 dataset and is kept as written.</li>
    <li>CT5 drawing numbers of <code>-</code> are placeholders in the source; they are shown as-is in ISO / Spool and not turned into drawings.</li>
  </ul></div></div>
<?php
// หน้านี้ไม่มีสคริปต์เฉพาะหน้า — ปิดหน้าด้วย footer
include __DIR__ . '/../app/includes/footer.php';
?>
