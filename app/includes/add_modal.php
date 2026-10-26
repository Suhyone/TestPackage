<?php declare(strict_types=1); /* หน้าต่างเพิ่มตำหนิ — 1 Drawing มีได้หลายตำหนิ (กดปุ่ม "เพิ่มตำหนิ" ด้านล่างเพื่อเพิ่มการ์ดอีกใบ แบบ Google Form)
   Item รันเลขให้อัตโนมัติ · ตรรกะอยู่ใน assets/js/punch_add.js ใช้ร่วมกันทั้ง punch_list.php และ qc_list.php */ ?>
<div class="modal fade" id="addModal" tabindex="-1" role="dialog" aria-labelledby="addTitle"><div class="modal-dialog modal-lg modal-dialog-scrollable"><div class="modal-content">
  <div class="modal-header"><h5 class="modal-title" id="addTitle">Add Punch Items</h5><button class="close" data-dismiss="modal" aria-label="Close">&times;</button></div>
  <div class="modal-body">
    <?php /* เลือก Test Pack (พิมพ์ค้นหาได้) แล้วเลือก/พิมพ์ Drawing */ ?>
    <div class="form-group"><label for="addPack">Test Package No. (type to search)</label>
      <input id="addPack" list="addPackList" class="form-control" autocomplete="off"><datalist id="addPackList"></datalist>
      <small class="text-muted" id="addSkid"></small></div>
    <div class="form-row">
      <div class="form-group col-7"><label for="addDrawing">Drawing</label><select id="addDrawing" class="form-control"></select></div>
      <div class="form-group col-5"><label for="addNewDrawing">Or new Drawing</label><input id="addNewDrawing" class="form-control" placeholder="Drawing No."></div>
    </div>
    <?php /* การ์ดตำหนิ (JS สร้าง): Category / Discipline / Deficiency / รูป */ ?>
    <div id="addCards"></div>
    <button type="button" class="btn btn-outline-info btn-block" id="addMore"><i class="fas fa-plus"></i> Add another item</button>
  </div>
  <div class="modal-footer"><button class="btn btn-secondary" data-dismiss="modal">Cancel</button><button id="addSave" class="btn btn-info">Save</button></div>
</div></div></div>
