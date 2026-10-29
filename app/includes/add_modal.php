<?php declare(strict_types=1); /* หน้าต่างเพิ่มตำหนิ — 1 Drawing มีได้หลายตำหนิ (กดปุ่ม "เพิ่มตำหนิ" ด้านล่างเพื่อเพิ่มการ์ดอีกใบ แบบ Google Form)
   Item รันเลขให้อัตโนมัติ · ตรรกะอยู่ใน assets/js/punch_add.js ใช้ร่วมกันทั้ง punch_list.php และ qc_list.php
   External punch = ตำหนิที่ไม่อยู่ใน Test Package ใดเลย (เลือกที่ตัวเลือกด้านบน แล้วระบุ Unit/Module + Drawing/พื้นที่ (ไม่บังคับ) แทน Pack/Drawing) */ ?>
<div class="modal fade" id="addModal" tabindex="-1" role="dialog" aria-labelledby="addTitle"><div class="modal-dialog modal-lg modal-dialog-scrollable"><div class="modal-content">
  <div class="modal-header"><h5 class="modal-title" id="addTitle">Add Punch Items</h5></div>
  <div class="modal-body">
    <?php /* ลำดับช่อง: Project → Test Package / External punch → Unit → Module (→ Drawing หรือ Area) */ ?>
    <div class="form-group"><label for="addProject">Project No.</label><select id="addProject" class="form-control" style="min-height:44px"></select></div>
    <?php /* เลือกโหมด: Test Package (ปกติ) หรือ External punch (ไม่อยู่ใน Test Package ใดเลย) */ ?>
    <div class="form-group" role="radiogroup" aria-label="Punch type">
      <div class="custom-control custom-radio custom-control-inline" style="min-height:44px">
        <input type="radio" class="custom-control-input" name="addMode" id="addModePack" checked><label class="custom-control-label pt-1" for="addModePack">Test Package</label></div>
      <div class="custom-control custom-radio custom-control-inline" style="min-height:44px">
        <input type="radio" class="custom-control-input" name="addMode" id="addModeExt"><label class="custom-control-label pt-1" for="addModeExt">External punch <span class="text-muted small">— not part of any Test Package</span></label></div>
    </div>
    <?php /* แบบปกติ: เลือก Test Pack ของโครงการ (พิมพ์ค้นหาได้) */ ?>
    <div id="addPackGroup">
      <div class="form-group"><label for="addPack">Test Package No. (type to search)</label>
        <input id="addPack" list="addPackList" class="form-control" style="min-height:44px" autocomplete="off"><datalist id="addPackList"></datalist>
        <small class="text-muted" id="addSkid"></small></div>
    </div>
    <?php /* Unit / Module: แบบปกติเติมจาก pack อัตโนมัติแต่แก้ได้ · แบบ External เลือกเอง */ ?>
    <div class="form-row" id="addFilterRow">
      <div class="form-group col-5" id="addUnitGroup"><label for="addUnit">Unit</label>
        <select id="addUnit" class="form-control" style="min-height:44px"></select></div>
      <div class="form-group col-7" id="addModuleGroup"><label for="addModule">Module</label>
        <select id="addModule" class="form-control" style="min-height:44px"></select></div>
    </div>
    <div id="addDrawGroup">
      <div class="form-row">
        <div class="form-group col-7"><label for="addDrawing">Drawing</label><select id="addDrawing" class="form-control" style="min-height:44px"></select></div>
        <div class="form-group col-5"><label for="addNewDrawing">Or new Drawing</label><input id="addNewDrawing" class="form-control" style="min-height:44px" placeholder="Drawing No."></div>
      </div>
    </div>
    <?php /* แบบ External: ช่อง Drawing ด้านบนใช้ร่วมกัน (เก็บเป็น "Drawing" ของ pack พิเศษ EXTERNAL ของโครงการนั้น) */ ?>
    <div id="addExtGroup" class="d-none">
      <small class="text-muted d-block mb-3">External punch items are kept outside every Test Package, so they never block a pressure test and are not in any report. Choose a Drawing from the list or type a new one. If you leave both empty it is saved as "(No drawing)".</small>
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
