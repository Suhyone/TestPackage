<?php
declare(strict_types=1);
// หน้าจัดการข้อมูลหลัก (เฉพาะ admin): Category และ Discipline
$pageTitle = 'Category / Discipline'; $active = 'admin_master';
include __DIR__ . '/../app/includes/header.php';
?>
<?php /* แบ่งสองการ์ดคู่กัน */ ?>
<div class="row">
  <?php /* การ์ด Category (fix priority): แก้คำอธิบาย/ลำดับ และเพิ่มรหัสใหม่ */ ?>
  <div class="col-md-6"><div class="card"><div class="card-header"><b>Category</b> <span class="small text-muted">(fix priority)</span></div>
    <div class="card-body p-2 table-responsive"><table class="table table-sm"><thead><tr><th style="width:90px">Code</th><th>Description</th><th style="width:80px">Order</th></tr></thead><tbody id="catRows"></tbody></table>
    <div class="form-inline"><input id="newCat" class="form-control form-control-sm mr-1" placeholder="New code"><button id="addCat" class="btn btn-sm btn-info">Add</button></div></div></div></div>
  <?php /* การ์ด Discipline (responsible department): เพิ่ม/ลบ */ ?>
  <div class="col-md-6"><div class="card"><div class="card-header"><b>Discipline</b> <span class="small text-muted">(responsible department)</span></div>
    <div class="card-body p-2"><table class="table table-sm"><tbody id="discRows"></tbody></table>
    <div class="form-inline"><input id="newDisc" class="form-control form-control-sm mr-1" placeholder="New discipline"><button id="addDisc" class="btn btn-sm btn-info">Add</button></div></div></div></div>
</div>
<?php /* โหลด admin_master.js แล้วปิดหน้าด้วย footer */ ?>
<?php $pageScripts = ['assets/js/admin_master.js']; include __DIR__ . '/../app/includes/footer.php'; ?>
