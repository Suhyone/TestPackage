<?php declare(strict_types=1); /* หน้าต่างเพิ่มตำหนิ — 1 Drawing มีได้หลายตำหนิ (กดปุ่ม "เพิ่มตำหนิ" ด้านล่างเพื่อเพิ่มการ์ดอีกใบ แบบ Google Form)
   Item รันเลขให้อัตโนมัติ · ตรรกะอยู่ใน assets/js/punch_add.js ใช้ร่วมกันทั้ง punch_list.php และ qc_list.php
   External punch = ตำหนิที่ไม่อยู่ใน Test Package ใดเลย (เลือกที่สวิตช์ด้านบน แล้วระบุ Project + พื้นที่/ตำแหน่งแทน Pack/Drawing) */ ?>
<div class="modal fade" id="addModal" tabindex="-1" role="dialog" aria-labelledby="addTitle"><div class="modal-dialog modal-lg modal-dialog-scrollable"><div class="modal-content">
  <div class="modal-header"><h5 class="modal-title" id="addTitle">Add Punch Items</h5></div>
  <div class="modal-body">
    <?php /* สวิตช์ External punch: ตำหนิที่ไม่ได้อยู่ใน Test Package */ ?>
    <div class="custom-control custom-switch mb-3">
      <input type="checkbox" class="custom-control-input" id="addExternal">
      <label class="custom-control-label" for="addExternal">External punch <span class="text-muted small">— not part of any Test Package</span></label>
    </div>
    <?php /* แบบปกติ: เลือก Test Pack (พิมพ์ค้นหาได้) แล้วเลือก/พิมพ์ Drawing */ ?>
    <div id="addPackGroup">
      <div class="form-group"><label for="addPack">Test Package No. (type to search)</label>
        <input id="addPack" list="addPackList" class="form-control" autocomplete="off"><datalist id="addPackList"></datalist>
        <small class="text-muted" id="addSkid"></small></div>
      <div class="form-row">
        <div class="form-group col-7"><label for="addDrawing">Drawing</label><select id="addDrawing" class="form-control"></select></div>
        <div class="form-group col-5"><label for="addNewDrawing">Or new Drawing</label><input id="addNewDrawing" class="form-control" placeholder="Drawing No."></div>
      </div>
    </div>
    <?php /* แบบ External: เลือก Project + ระบุพื้นที่/ตำแหน่ง (เก็บเป็น "Drawing" ของ pack พิเศษ EXTERNAL ของโครงการนั้น) */ ?>
    <div id="addExtGroup" class="d-none">
      <div class="form-row">
        <div class="form-group col-5"><label for="addExtProject">Project No.</label><select id="addExtProject" class="form-control"></select></div>
        <div class="form-group col-7"><label for="addExtArea">Area / Location</label><input id="addExtArea" list="addExtAreaList" class="form-control" autocomplete="off" placeholder="e.g. Module MD-1 walkway"><datalist id="addExtAreaList"></datalist></div>
      </div>
      <small class="text-muted d-block mb-3">External punch items are kept outside every Test Package, so they never block a pressure test.</small>
    </div>
    <?php /* การ์ดตำหนิ (JS สร้าง): Category / Discipline / Deficiency / รูป */ ?>
    <div id="addCards"></div>
    <button type="button" class="btn btn-outline-info btn-block" id="addMore"><i class="fas fa-plus"></i> Add another item</button>
  </div>
  <div class="modal-footer">
    <span class="small mr-auto" id="addMsg" role="status" aria-live="polite"></span>
    <button type="button" class="btn btn-outline-secondary" id="addCancel">Cancel</button>
    <button type="button" id="addSaveMore" class="btn btn-outline-info">Save &amp; add another</button>
    <button type="button" id="addSave" class="btn btn-info">Save</button>
  </div>
</div></div></div>
