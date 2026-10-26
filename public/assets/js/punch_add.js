// ฟอร์มเพิ่มตำหนิ (modal #addModal จาก includes/add_modal.php) — ใช้ร่วมกันทั้ง punch_list.js และ qc_list.js
// 1 Drawing มีได้หลายตำหนิ: แต่ละตำหนิคือ "การ์ด" (Category / Discipline / Deficiency / รูป) กด "เพิ่มตำหนิ" เพื่อเพิ่มการ์ดอีกใบ
// เลข Item รันให้อัตโนมัติ (ต่อจากเลขสูงสุดของ Drawing นั้นในฐานข้อมูล)
// พึ่งพา: state (rows/drawings/packs/categories/disciplines/f.project), me, applyFilters(), openDetail() (punch_detail.js),
//         makePicker/uploadPhotos (punch_photos.js), ตัวช่วยจาก punch_common.js — เรียก bindAdd() หลังหน้าพร้อมเพื่อผูกปุ่ม
//         ถ้าหน้าไหนมีฟังก์ชัน afterAdd() จะถูกเรียกหลังบันทึกสำเร็จ
// การ์ดตำหนิที่แสดงอยู่ [{ el, picker }] และเลข Item ตัวแรกของชุดที่กำลังเพิ่ม
let addCards = [], addBase = 1;
// Discipline เริ่มต้นของการ์ดใหม่
const DEFAULT_DISCIPLINE = 'Piping';

// เลข Item ถัดไปของ Drawing จากข้อมูลที่โหลดในหน้า (ใช้กับแถวบันทึกใหม่ของหน้า admin)
function nextItemNo(drawingId) {
  return Math.max(0, ...state.rows.filter(i => i.drawing_id === drawingId).map(i => i.item_no || 0)) + 1;
}
// เลข Item ถัดไปจากฐานข้อมูลโดยตรง (หน้า QC โหลดแถวไม่ครบทุกสถานะ จึงนับจากที่นี่)
async function dbNextItem(drawingId) {
  if (!drawingId) return 1;
  const { data } = await sb.from('punch_items').select('item_no').eq('drawing_id', drawingId).order('item_no', { ascending: false, nullsFirst: false }).limit(1);
  return (data?.[0]?.item_no || 0) + 1;
}
// Test Pack ที่พิมพ์ในฟอร์ม
const addPackSel = () => state.packs.find(p => p.test_pack_no === $('addPack').value.trim());
// Drawing ที่เลือก/พิมพ์ใหม่ในฟอร์ม → id ที่มีอยู่แล้วในฐานข้อมูล (ไม่มี = Drawing ใหม่ → เริ่ม Item ที่ 1)
async function addDrawingId() {
  const pack = addPackSel(), newNo = $('addNewDrawing').value.trim();
  if (newNo && pack) {
    const { data } = await sb.from('drawings').select('id').eq('test_pack_id', pack.id).eq('drawing_no', newNo).maybeSingle();
    return data?.id || 0;
  }
  return +$('addDrawing').value || 0;
}
// คำนวณเลข Item ตัวแรกแล้วใส่ป้ายบนการ์ดทุกใบ
async function refreshBase() { addBase = await dbNextItem(await addDrawingId()); numberCards(); }
// ใส่ป้าย "Item N" บนการ์ด และซ่อนปุ่มลบเมื่อเหลือใบเดียว
function numberCards() {
  addCards.forEach((c, i) => {
    c.el.querySelector('.dc-badge').textContent = `Item ${addBase + i}`;
    c.el.querySelector('.dc-del').classList.toggle('d-none', addCards.length === 1);
  });
}
// เติมรายการ Drawing ในฟอร์มตาม Test Pack ที่พิมพ์ + แสดง Skid
async function fillAddDrawings() {
  const pack = addPackSel();
  $('addSkid').textContent = pack ? `Skid: ${pack.skid || '-'}` : '';
  if (!pack) { $('addDrawing').innerHTML = '<option value="">Select a Test Package No. first</option>'; return refreshBase(); }
  const { data } = await sb.from('drawings').select('id,drawing_no').eq('test_pack_id', pack.id).order('drawing_no');
  $('addDrawing').innerHTML = (data || []).map(d => `<option value="${d.id}">${esc(d.drawing_no)}</option>`).join('')
    || '<option value="">No drawings yet — type a new Drawing No.</option>';
  await refreshBase();
}
// เพิ่มการ์ดตำหนิ 1 ใบ (copy = ค่า Category/Discipline จากใบก่อนหน้า เพื่อกรอกต่อได้เร็ว)
function addCard(copy) {
  const el = document.createElement('div'); el.className = 'card defect-card mb-3';
  el.innerHTML = `<div class="card-body p-3">
    <div class="d-flex align-items-center mb-2"><span class="badge badge-info dc-badge"></span>
      <button type="button" class="btn btn-sm btn-link text-danger ml-auto dc-del" title="Remove this item" aria-label="Remove this item"><i class="fas fa-trash-alt"></i></button></div>
    <div class="form-row">
      <div class="form-group col-6"><label class="small mb-0">Category</label><select class="form-control dc-cat"></select><small class="text-muted dc-cat-help"></small></div>
      <div class="form-group col-6"><label class="small mb-0">Discipline</label><select class="form-control dc-disc"></select></div>
    </div>
    <div class="form-group"><label class="small mb-0">Punch Item Description</label><textarea class="form-control dc-def" rows="2"></textarea></div>
    <label class="small mb-1">Photos (multiple allowed)</label><div class="dc-photos"></div></div>`;
  el.querySelector('.dc-cat').innerHTML = '<option value="">—</option>' + state.categories.map(c => `<option>${esc(c.code)}</option>`).join('');
  const names = state.disciplines.map(d => d.name);
  el.querySelector('.dc-disc').innerHTML = '<option value="">—</option>' + names.map(n => `<option>${esc(n)}</option>`).join('');
  el.querySelector('.dc-cat').value = copy?.cat ?? '';
  el.querySelector('.dc-disc').value = copy?.disc ?? (names.includes(DEFAULT_DISCIPLINE) ? DEFAULT_DISCIPLINE : '');
  const help = () => { el.querySelector('.dc-cat-help').textContent = state.categories.find(c => c.code === el.querySelector('.dc-cat').value)?.description || ''; };
  el.querySelector('.dc-cat').addEventListener('change', help); help();
  const card = { el, picker: makePicker(el.querySelector('.dc-photos')) };
  el.querySelector('.dc-del').onclick = () => { addCards.splice(addCards.indexOf(card), 1); el.remove(); numberCards(); };
  $('addCards').appendChild(el); addCards.push(card); numberCards();
  return card;
}
// เปิดฟอร์มเพิ่มตำหนิ (ล้างค่า เหลือการ์ดเปล่า 1 ใบ)
function openAdd() {
  const packs = state.packs.filter(p => !state.f.project || p.project_no === state.f.project);
  $('addPackList').innerHTML = packs.map(p => `<option value="${esc(p.test_pack_no)}">${esc(p.skid || '')}</option>`).join('');
  $('addPack').value = ''; $('addSkid').textContent = ''; $('addNewDrawing').value = '';
  $('addDrawing').innerHTML = '<option value="">Select a Test Package No. first</option>';
  $('addCards').innerHTML = ''; addCards = []; addBase = 1; addCard();
  window.jQuery('#addModal').modal('show');
}

// บันทึกทุกการ์ดเป็น punch item (สร้าง Drawing ใหม่ถ้าพิมพ์ใหม่) แล้วอัปโหลดรูปแท็กของแต่ละตำหนิเป็นรอบแรก
async function saveAdd() {
  const pack = addPackSel();
  if (!pack) return alert('Select a valid Test Package No.');
  const defs = addCards.map(c => c.el.querySelector('.dc-def').value.trim());
  const empty = defs.findIndex(d => !d);
  if (empty >= 0) { addCards[empty].el.querySelector('.dc-def').focus(); return alert(`Enter the punch item description (item ${empty + 1})`); }
  const btn = $('addSave'), label = btn.textContent; btn.disabled = true;
  try {
    let drawingId = +$('addDrawing').value;
    const newNo = $('addNewDrawing').value.trim();
    if (newNo) {
      const { data, error } = await sb.from('drawings').upsert({ test_pack_id: pack.id, drawing_no: newNo }, { onConflict: 'test_pack_id,drawing_no' }).select().single();
      if (error) throw error; drawingId = data.id;
    }
    if (!drawingId) return alert('Select or type a Drawing No.');
    const base = await dbNextItem(drawingId);                       // นับใหม่ตอนบันทึก กันเลขซ้ำถ้ามีคนเพิ่มพร้อมกัน
    const { data: items, error } = await sb.from('punch_items').insert(addCards.map((c, i) => ({
      drawing_id: drawingId, item_no: base + i, deficiency: defs[i],
      category: c.el.querySelector('.dc-cat').value || null, discipline: c.el.querySelector('.dc-disc').value || null,
      status: 'open', punch_by: me.name, punch_date: today(), input_date: today(), created_by: me.id }))).select();
    if (error) throw error;
    items.sort((a, b) => a.item_no - b.item_no);

    // รูปของแต่ละตำหนิ (ถ้าอัปโหลดรูปไหนไม่สำเร็จ ตำหนิยังถูกบันทึกแล้ว — แจ้งให้ไปเพิ่มรูปในรายละเอียด)
    const failed = [], rcs = new Map();
    for (const [i, it] of items.entries()) {
      const files = addCards[i].picker.files; if (!files.length) continue;
      try {
        btn.textContent = `Uploading photos ${i + 1}/${items.length}...`;
        const paths = await uploadPhotos([...files], `items/${it.id}`);
        const r = await sb.from('punch_rounds').insert({ punch_item_id: it.id, round_no: 1, kind: 'defect', photo_paths: paths, by_user: me.id, by_name: me.name });
        if (r.error) throw r.error; rcs.set(it.id, 1);
      } catch (e) { failed.push(`Item ${it.item_no}: ${e.message || e}`); }
    }
    const d = state.drawings.get(drawingId) || { id: drawingId, drawing_no: newNo || $('addDrawing').selectedOptions[0]?.text, work_type: null, test_pack_id: pack.id };
    state.drawings.set(drawingId, d);
    items.forEach(it => state.rows.push({ ...it, drawing_no: d.drawing_no, work_type: d.work_type || 'none',
      test_pack_no: pack.test_pack_no, skid: pack.skid, project_no: pack.project_no, rc: rcs.get(it.id) || 0 }));
    applyFilters(); window.jQuery('#addModal').modal('hide');
    if (typeof afterAdd === 'function') afterAdd();
    if (items.length === 1) openDetail(items[0].id);
    if (failed.length) alert('Items saved, but some photos failed to upload:\n' + failed.join('\n') + '\n\nOpen the item and add the photos in the detail panel.');
  } catch (e) { alertErr(e); } finally { btn.disabled = false; btn.textContent = label; }
}

// ผูกปุ่ม/ช่องของฟอร์มเพิ่มตำหนิ (เรียกครั้งเดียวตอนหน้าเริ่มทำงาน)
function bindAdd() {
  $('addPack').addEventListener('change', fillAddDrawings);                    // เปลี่ยน Test Pack → โหลดรายการ Drawing ใหม่
  $('addDrawing').addEventListener('change', refreshBase);                     // เปลี่ยน Drawing → คำนวณเลข Item ต่อ
  $('addNewDrawing').addEventListener('change', refreshBase);
  $('addMore').onclick = () => {                                               // เพิ่มการ์ดตำหนิ (ต่อจากใบล่าสุด คัดลอก Category/Discipline มาให้)
    const last = addCards.at(-1)?.el;
    const c = addCard(last && { cat: last.querySelector('.dc-cat').value, disc: last.querySelector('.dc-disc').value });
    c.el.scrollIntoView({ behavior: 'smooth', block: 'center' }); c.el.querySelector('.dc-def').focus();
  };
  $('btnAdd').onclick = openAdd;
  $('addSave').onclick = saveAdd;
}
