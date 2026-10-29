// ฟอร์มเพิ่มตำหนิ (modal #addModal จาก includes/add_modal.php) — ใช้ร่วมกันทั้ง punch_list.js และ qc_list.js
// 1 Drawing มีได้หลายตำหนิ: แต่ละตำหนิคือ "การ์ด" (Category / Discipline / Deficiency / รูป) กด "เพิ่มตำหนิ" เพื่อเพิ่มการ์ดอีกใบ
// เลข Item รันให้อัตโนมัติ (ต่อจากเลขสูงสุดของ Drawing นั้นในฐานข้อมูล)
// External punch = ตำหนิที่ไม่อยู่ใน Test Package (สวิตช์ในฟอร์ม) เก็บใต้ pack พิเศษชื่อ EXTERNAL_PACK ของแต่ละโครงการ โดย "Drawing" = พื้นที่/ตำแหน่งที่พิมพ์
// ฟอร์มจำ Pack/Drawing/โครงการล่าสุดไว้ในเครื่อง (localStorage) และมีปุ่ม Save & add another สำหรับตรวจต่อเนื่อง
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
const isExt = () => $('addModeExt').checked;
// pack พิเศษ EXTERNAL ของโครงการที่เลือก (ยังไม่มี = undefined)
const extPack = () => state.packs.find(p => p.project_no === $('addProject').value && p.test_pack_no === EXTERNAL_PACK);
async function addDrawingId() {
  const pack = isExt() ? extPack() : addPackSel(), newNo = $('addNewDrawing').value.trim();
  if (isExt() && (newNo || !+$('addDrawing').value)) {          // External: พิมพ์ใหม่ หรือไม่ได้เลือกเลย ("(No drawing)") → หาจากชื่อเต็มใต้ pack EXTERNAL
    if (!pack) return 0;
    const { data } = await sb.from('drawings').select('id').eq('test_pack_id', pack.id).eq('drawing_no', extName(newNo)).maybeSingle();
    return data?.id || 0;
  }
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
  if (isExt()) return fillExtDrawings();
  const pack = addPackSel();
  $('addSkid').textContent = pack ? `Skid: ${pack.skid || '-'}` : '';
  if (!pack) { $('addDrawing').innerHTML = '<option value="">Select a Test Package No. first</option>'; return refreshBase(); }
  const { data } = await sb.from('drawings').select('id,drawing_no').eq('test_pack_id', pack.id).order('drawing_no');
  $('addDrawing').innerHTML = (data || []).map(d => `<option value="${d.id}">${esc(d.drawing_no)}</option>`).join('')
    || '<option value="">No drawings yet — type a new Drawing No.</option>';
  await refreshBase();
}
// ---------- Project → Test Package → Unit / Module ----------
// unit_no / module_no อยู่ในตาราง test_packs — โหลดแยกครั้งเดียวต่อหน้า แล้วจับคู่ด้วย id · อ่านไม่ได้ = ซ่อนช่องนั้น ฟอร์มยังใช้ได้
// ช่อง Unit/Module เป็น select เดียวกันทั้งสองโหมด: แบบ Test Package เติมจาก pack อัตโนมัติแต่แก้ได้ (เก็บลง punch_items เฉพาะค่าที่ต่างจาก pack) · แบบ External เลือกเองจากข้อมูลของ pack ในโครงการ
let addMeta = null, addHasUnit = false, addHasModule = false, addScope = [];   // addScope = pack จริงของโครงการที่เลือก
async function loadAddMeta() {
  if (addMeta) return;
  addMeta = new Map();
  for (const cols of ['id,unit_no,module_no', 'id,module_no']) {
    try {
      const rows = await fetchAll(() => sb.from('test_packs').select(cols).order('id'));
      rows.forEach(r => addMeta.set(r.id, { unit: (r.unit_no || '').trim(), module: (r.module_no || '').trim() }));
      addHasUnit = cols.includes('unit_no'); addHasModule = true; return;
    } catch { /* ลองชุดคอลัมน์ถัดไป */ }
  }
  addHasUnit = addHasModule = false;
}
const packMeta = (p) => addMeta?.get(p.id) || { unit: '', module: '' };
// punch_items มีคอลัมน์ unit_no/module_no แล้วหรือยัง (sql/18) — ตรวจครั้งเดียวต่อหน้า ล้มเงียบ = ยังไม่มี
let addHasItemUnit = null;
async function checkItemUnit() {
  if (addHasItemUnit !== null) return;
  try { const { error } = await sb.from('punch_items').select('unit_no').limit(1); addHasItemUnit = !error; } catch { addHasItemUnit = false; }
}
const sortNum = (a, b) => a.localeCompare(b, undefined, { numeric: true });
// ส่วนนำหน้าของชื่อ Drawing External เมื่อยังไม่มีคอลัมน์ unit/module ใน DB เช่น ["U1","A1-1"] · มีคอลัมน์แล้ว = ว่าง
const extParts = () => {
  if (addHasItemUnit) return [];
  const u = addHasUnit ? $('addUnit').value : '', m = addHasModule ? $('addModule').value : '';
  return [u ? 'U' + u : '', m].filter(Boolean);
};
// ชื่อ "Drawing" ของ External: มีคอลัมน์ใน DB = ที่พิมพ์ล้วน · ยังไม่มี = นำ Unit/Module ไว้ข้างหน้า เช่น "U1 · A1-1 · DWG-01" · ไม่ได้พิมพ์ = "(No drawing)" (ทางสำรองใช้ "U1 · A1-1" เฉย ๆ)
const NO_DRAWING = '(No drawing)';
const extName = (typed) => [...extParts(), typed].filter(Boolean).join(' · ') || NO_DRAWING;
// เติม Unit/Module ตาม pack ที่พิมพ์ (โหมด Test Package) แล้วผู้ใช้แก้ต่อได้ · ไม่มี pack = ว่าง
function updateAddRO() {
  const p = addPackSel(), mt = p ? packMeta(p) : { unit: '', module: '' };
  refreshExtUM();
  if (addHasUnit) { $('addUnit').value = mt.unit; refreshExtUM(); }
  if (addHasModule) $('addModule').value = mt.module;
  noteUMUnsaved();
}
// Unit/Module ที่เลือกต่างจากของ pack ไหม (โหมด Test Package) → ค่าที่ต้องเก็บลง punch_items (เฉพาะที่ต่างและไม่ว่าง)
function addUMOverride() {
  const p = addPackSel(); if (!p) return {};
  const mt = packMeta(p), u = addHasUnit ? $('addUnit').value : '', m = addHasModule ? $('addModule').value : '';
  return { ...(u && u !== mt.unit ? { unit_no: u } : {}), ...(m && m !== mt.module ? { module_no: m } : {}) };
}
// ยังไม่รัน SQL 18 แต่ผู้ใช้แก้ Unit/Module ของ pack → แจ้งสีเทาว่าจะไม่ถูกบันทึก (ไม่ใช่ error)
function noteUMUnsaved() {
  if (isExt()) return;
  const bad = addHasItemUnit === false && Object.keys(addUMOverride()).length;
  $('addMsg').textContent = bad ? 'Changed Unit/Module will not be saved until SQL 18 is run.' : '';
  $('addMsg').className = 'small mr-auto' + (bad ? ' text-muted' : '');
}
// รายการ pack ของโครงการที่เลือก
function fillAddPackList() {
  addScope = state.packs.filter(p => p.test_pack_no !== EXTERNAL_PACK && p.project_no === $('addProject').value);
  $('addPackList').innerHTML = addScope.map(p => `<option value="${esc(p.test_pack_no)}">${esc(p.skid || '')}</option>`).join('');
}
// โหมด External: เติมตัวเลือก Unit → Module จาก pack ของโครงการ (Module จำกัดตาม Unit ที่เลือก) · ค่าที่เลือกไว้ยังอยู่ถ้ายังมีในรายการ
function refreshExtUM() {
  const opts = (sel, vals) => { const cur = sel.value; sel.innerHTML = '<option value="">—</option>' + vals.map(v => `<option value="${esc(v)}">${esc(v)}</option>`).join(''); sel.value = vals.includes(cur) ? cur : ''; };
  const uniq = (arr) => [...new Set(arr.filter(Boolean))].sort(sortNum);
  if (addHasUnit) opts($('addUnit'), uniq(addScope.map(p => packMeta(p).unit)));
  const u = addHasUnit ? $('addUnit').value : '';
  if (addHasModule) opts($('addModule'), uniq(addScope.filter(p => !u || packMeta(p).unit === u).map(p => packMeta(p).module)));
}
// ผู้ใช้เปลี่ยน Project: pack/Unit/Module เหลือเฉพาะของโครงการนั้น
async function onAddProject() {
  fillAddPackList();
  $('addPack').value = ''; $('addNewDrawing').value = '';
  updateAddRO(); refreshExtUM();
  await fillAddDrawings();
}
// ผู้ใช้พิมพ์/เลือก pack: Unit/Module ขึ้นตาม pack นั้น
async function onAddPack() { updateAddRO(); await fillAddDrawings(); }
// เพิ่มการ์ดตำหนิ 1 ใบ (copy = ค่า Category/Discipline จากใบก่อนหน้า เพื่อกรอกต่อได้เร็ว)
// Category เป็นปุ่มเลือก (A / B ...) ที่เก็บค่าใน input.dc-cat (hidden) — ต้องเลือกก่อนบันทึก เพราะ Category A/B ใช้กำหนดการล็อกทดสอบแรงดัน
function addCard(copy) {
  const el = document.createElement('div'); el.className = 'card defect-card mb-3';
  el.innerHTML = `<div class="card-body p-3">
    <div class="d-flex align-items-center mb-2"><span class="badge badge-info dc-badge"></span>
      <button type="button" class="btn btn-sm btn-link text-danger ml-auto dc-del" title="Remove this item" aria-label="Remove this item"><i class="fas fa-trash-alt"></i></button></div>
    <div class="form-group mb-2"><label class="small mb-1">Category <span class="text-danger" aria-hidden="true">*</span></label>
      <div class="d-flex dc-cat-btns" role="radiogroup" aria-label="Category" style="gap:6px"></div><input type="hidden" class="dc-cat">
      <small class="text-muted dc-cat-help d-block mt-1"></small></div>
    <div class="form-group mb-2"><label class="small mb-1">Discipline</label><select class="form-control dc-disc"></select></div>
    <div class="form-group"><label class="small mb-1">Punch Item Description</label><textarea class="form-control dc-def" rows="2"></textarea></div>
    <label class="small mb-1">Photos (multiple allowed)</label><div class="dc-photos"></div></div>`;
  const cat = el.querySelector('.dc-cat'), btns = el.querySelector('.dc-cat-btns');
  btns.innerHTML = state.categories.map(c => `<button type="button" class="btn btn-outline-${c.code === 'A' ? 'danger' : 'info'} flex-fill" data-cat="${esc(c.code)}" role="radio" aria-checked="false">${esc(c.code)}</button>`).join('');
  const names = state.disciplines.map(d => d.name);
  el.querySelector('.dc-disc').innerHTML = '<option value="">—</option>' + names.map(n => `<option>${esc(n)}</option>`).join('');
  el.querySelector('.dc-disc').value = copy?.disc ?? (names.includes(DEFAULT_DISCIPLINE) ? DEFAULT_DISCIPLINE : '');
  const setCat = (v) => {
    cat.value = v || '';
    btns.querySelectorAll('button').forEach(b => { const on = b.dataset.cat === cat.value; b.classList.toggle('active', on); b.setAttribute('aria-checked', on); });
    el.querySelector('.dc-cat-help').textContent = state.categories.find(c => c.code === cat.value)?.description || 'Choose the category (required)';
  };
  btns.onclick = (e) => { const b = e.target.closest('button[data-cat]'); if (b) setCat(b.dataset.cat); };
  setCat(copy?.cat);
  const card = { el, picker: makePicker(el.querySelector('.dc-photos')) };
  el.querySelector('.dc-del').onclick = () => { addCards.splice(addCards.indexOf(card), 1); el.remove(); numberCards(); };
  $('addCards').appendChild(el); addCards.push(card); numberCards();
  return card;
}

// ---------- จำค่าล่าสุด ----------
const LAST_KEY = 'punchAddLast';
const loadLast = () => { try { return JSON.parse(localStorage.getItem(LAST_KEY)) || {}; } catch { return {}; } };
const saveLast = (v) => { try { localStorage.setItem(LAST_KEY, JSON.stringify(v)); } catch { /* ไม่มีที่เก็บ — ข้าม */ } };
// สลับโหมด Test Package / External punch: ซ่อน-แสดงกลุ่มช่อง + สลับช่อง Unit/Module ระหว่างแบบแก้ไม่ได้ (pack) กับแบบเลือกเอง (External)
function applyExtMode() {
  const ext = isExt();
  $('addPackGroup').classList.toggle('d-none', ext); $('addExtGroup').classList.toggle('d-none', !ext);   // ช่อง Drawing (#addDrawGroup) ใช้ร่วมกันทั้งสองโหมด
  $('addNewDrawing').value = '';
  $('addUnitGroup').classList.toggle('d-none', !addHasUnit); $('addModuleGroup').classList.toggle('d-none', !addHasModule);
  $('addFilterRow').classList.toggle('d-none', !addHasUnit && !addHasModule);
  if (ext) {
    refreshExtUM();
    if (addHasItemUnit === false) { $('addMsg').textContent = 'SQL 18 has not been run yet — Unit/Module will be saved in the Drawing text for now.'; $('addMsg').className = 'small mr-auto text-muted'; }
  } else { $('addMsg').textContent = ''; $('addMsg').className = 'small mr-auto'; updateAddRO(); }   // กลับโหมด pack: เติม Unit/Module จาก pack อีกครั้ง
  return fillAddDrawings();                                         // โหลดรายการ Drawing ตามโหมด (แล้วคำนวณเลข Item)
}
// โหมด External: เติมรายการ Drawing ที่เคยใช้ใต้ pack EXTERNAL ของโครงการที่เลือก · ไม่แสดง "(No drawing)" · ยังไม่มีคอลัมน์ใน DB: แสดงเฉพาะที่ขึ้นต้นด้วย Unit/Module ปัจจุบันและตัดส่วนนำหน้าออก (value = id, data-no = ชื่อเต็ม)
async function fillExtDrawings() {
  $('addSkid').textContent = '';
  const pack = extPack(), none = '<option value="">No drawings yet — type a new Drawing No. or leave empty</option>';
  let list = [];
  if (pack) {
    const { data } = await sb.from('drawings').select('id,drawing_no').eq('test_pack_id', pack.id).order('drawing_no');
    list = (data || []).filter(d => d.drawing_no && d.drawing_no !== NO_DRAWING);
    if (!addHasItemUnit && extParts().length) { const pre = extParts().join(' · ') + ' · '; list = list.filter(d => d.drawing_no.startsWith(pre)); }   // "U1 · A1-1 · "
  }
  const cut = (!addHasItemUnit && extParts().length) ? extParts().join(' · ').length + 3 : 0;
  $('addDrawing').innerHTML = list.length
    ? '<option value="">—</option>' + list.map(d => `<option value="${d.id}" data-no="${esc(d.drawing_no)}">${esc(d.drawing_no.slice(cut))}</option>`).join('')
    : none;
  await refreshBase();
}
// ฟอร์มมีข้อมูลที่ยังไม่ได้บันทึกไหม (ใช้ถามก่อนทิ้ง)
const addDirty = () => addCards.some(c => c.el.querySelector('.dc-def').value.trim() || c.picker.files.length);
// ปิดฟอร์ม (ถามยืนยันถ้ามีข้อมูลค้าง)
function closeAdd() {
  if (addDirty() && !confirm('Discard the punch items you have entered?')) return;
  window.jQuery('#addModal').modal('hide');
}
// เปิดฟอร์มเพิ่มตำหนิ: ใส่ค่าล่าสุด (Project/โหมด/Pack/Drawing หรือ Unit/Module/พื้นที่) ให้อัตโนมัติ เหลือการ์ดเปล่า 1 ใบ · pre = { pack } เปิดจากหน้า Test Package
async function openAdd(pre) {
  await loadAddMeta(); await checkItemUnit();
  const projects = [...new Set(state.packs.map(p => p.project_no))].sort();
  const last = loadLast();
  const prePack = pre?.pack && state.packs.find(p => p.test_pack_no === pre.pack && p.test_pack_no !== EXTERNAL_PACK && (!state.f.project || p.project_no === state.f.project));
  $('addProject').innerHTML = projects.map(p => `<option>${esc(p)}</option>`).join('');
  $('addProject').value = prePack?.project_no || [state.f.project, last.project].find(x => x && projects.includes(x)) || projects[0] || '';
  const ext = !pre && !!last.ext;
  $('addModeExt').checked = ext; $('addModePack').checked = !ext;
  $('addMsg').textContent = ''; $('addMsg').className = 'small mr-auto';
  $('addPack').value = ''; $('addSkid').textContent = ''; $('addNewDrawing').value = '';
  $('addUnit').value = ''; $('addModule').value = '';
  $('addDrawing').innerHTML = '<option value="">Select a Test Package No. first</option>';
  $('addCards').innerHTML = ''; addCards = []; addBase = 1; addCard();
  fillAddPackList(); refreshExtUM();
  window.jQuery('#addModal').modal({ backdrop: 'static', keyboard: false, show: true });   // ปิดด้วยปุ่ม Cancel / × เท่านั้น กันกดพลาดแล้วข้อมูลหาย
  if (ext) {
    refreshExtUM();
    const same = last.project === $('addProject').value;
    if (same) {                                                             // Unit/Module ล่าสุด (ถ้ายังมีให้เลือกในโครงการนี้)
      if ([...$('addUnit').options].some(o => o.value === last.unit)) $('addUnit').value = last.unit || '';
      refreshExtUM();
      if ([...$('addModule').options].some(o => o.value === last.module)) $('addModule').value = last.module || '';
    }
    await applyExtMode();
    if (same && last.drawingId && [...$('addDrawing').options].some(o => o.value === String(last.drawingId))) { $('addDrawing').value = String(last.drawingId); await refreshBase(); }   // Drawing ล่าสุดของ External
    return;
  }
  await applyExtMode();
  const name = prePack?.test_pack_no ?? last.pack;
  if (name && addScope.some(p => p.test_pack_no === name)) {
    $('addPack').value = name; await onAddPack();
    if (!pre && last.drawingId && [...$('addDrawing').options].some(o => o.value === String(last.drawingId))) { $('addDrawing').value = String(last.drawingId); await refreshBase(); }
  }
}

// บันทึกทุกการ์ดเป็น punch item (สร้าง Drawing ใหม่ถ้าพิมพ์ใหม่) แล้วอัปโหลดรูปแท็กของแต่ละตำหนิเป็นรอบแรก
// keepOpen = true ("Save & add another"): คง Pack/Drawing/Category/Discipline ไว้ ล้างเฉพาะคำอธิบายและรูป
async function saveAdd(keepOpen = false) {
  const ext = isExt();
  let pack = null;
  await checkItemUnit();
  if (!$('addProject').value) return alert('Select the Project No.');
  if (ext) {
    if (addHasUnit && $('addUnit').options.length > 1 && !$('addUnit').value) { $('addUnit').focus(); return alert('Select the Unit.'); }
    if (addHasModule && $('addModule').options.length > 1 && !$('addModule').value) { $('addModule').focus(); return alert('Select the Module.'); }
  } else {
    pack = addPackSel();
    if (!pack) return alert('Select a valid Test Package No.');
  }
  const defs = addCards.map(c => c.el.querySelector('.dc-def').value.trim());
  const noCat = addCards.findIndex(c => !c.el.querySelector('.dc-cat').value);
  if (noCat >= 0) { addCards[noCat].el.scrollIntoView({ block: 'center' }); return alert(`Choose a Category (item ${noCat + 1})`); }
  const empty = defs.findIndex(d => !d);
  if (empty >= 0) { addCards[empty].el.querySelector('.dc-def').focus(); return alert(`Enter the punch item description (item ${empty + 1})`); }
  const btns = [$('addSave'), $('addSaveMore'), $('addCancel')], labels = btns.map(b => b.textContent), btn = keepOpen ? $('addSaveMore') : $('addSave');
  btns.forEach(b => b.disabled = true);
  try {
    if (ext) {                                                      // pack พิเศษ EXTERNAL ของโครงการ (สร้างครั้งแรกอัตโนมัติ)
      pack = extPack();
      if (!pack) {
        const { data, error } = await sb.from('test_packs').upsert({ project_no: $('addProject').value, test_pack_no: EXTERNAL_PACK }, { onConflict: 'project_no,test_pack_no' }).select('id,project_no,test_pack_no,skid').single();
        if (error) throw error; pack = data; state.packs.push(pack);
      }
    }
    let drawingId = +$('addDrawing').value || 0;
    const typed = $('addNewDrawing').value.trim();
    const extNone = ext && !typed && !drawingId;                    // External ไม่เลือก/ไม่พิมพ์ = "(No drawing)" (ไม่จำเป็น Drawing ล่าสุด)
    // External: ชื่อที่พิมพ์ใหม่ใส่ prefix Unit/Module เมื่อยังไม่มีคอลัมน์ใน DB · Drawing ที่เลือกมีชื่อเต็มอยู่แล้ว ไม่ใส่ซ้ำ
    const newNo = ext ? (typed ? extName(typed) : drawingId ? '' : extName('')) : typed;
    if (newNo) {
      const { data, error } = await sb.from('drawings').upsert({ test_pack_id: pack.id, drawing_no: newNo }, { onConflict: 'test_pack_id,drawing_no' }).select().single();
      if (error) throw error; drawingId = data.id;
    }
    if (!drawingId) return alert('Select or type a Drawing No.');
    const umOverride = ext ? {} : addUMOverride();
    const base = await dbNextItem(drawingId);                       // นับใหม่ตอนบันทึก กันเลขซ้ำถ้ามีคนเพิ่มพร้อมกัน
    const { data: items, error } = await sb.from('punch_items').insert(addCards.map((c, i) => ({
      drawing_id: drawingId, item_no: base + i, deficiency: defs[i],
      category: c.el.querySelector('.dc-cat').value || null, discipline: c.el.querySelector('.dc-disc').value || null,
      status: 'open', punch_by: me.name, punch_date: today(), input_date: today(), created_by: me.id,
      ...(!addHasItemUnit ? {} : ext ? { unit_no: (addHasUnit && $('addUnit').value) || null, module_no: (addHasModule && $('addModule').value) || null } : umOverride) }))).select();   // External เก็บ Unit/Module เสมอ · punch ปกติเก็บเฉพาะค่าที่ต่างจาก pack (ที่เหลืออ่านจาก pack)
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
      } catch (e) { failed.push(`Item ${it.item_no}: ${friendlyErr(e)}`); }
    }
    const d = state.drawings.get(drawingId) || { id: drawingId, drawing_no: newNo || $('addDrawing').selectedOptions[0]?.dataset.no || $('addDrawing').selectedOptions[0]?.text, work_type: null, test_pack_id: pack.id };
    state.drawings.set(drawingId, d);
    items.forEach(it => state.rows.push({ ...it, drawing_no: d.drawing_no, work_type: d.work_type || 'none',
      test_pack_no: pack.test_pack_no, skid: pack.skid, project_no: pack.project_no, rc: rcs.get(it.id) || 0 }));
    saveLast({ ext, pack: ext ? '' : pack.test_pack_no, drawingId: extNone ? 0 : drawingId, project: pack.project_no, unit: ext ? $('addUnit').value : '', module: ext ? $('addModule').value : '' });
    applyFilters();
    if (typeof afterAdd === 'function') afterAdd();
    if (keepOpen) {                                                 // เก็บตำหนิถัดไปใน Pack/Drawing เดิมต่อได้เลย
      const keep = { cat: addCards.at(-1).el.querySelector('.dc-cat').value, disc: addCards.at(-1).el.querySelector('.dc-disc').value };
      $('addCards').innerHTML = ''; addCards = []; addCard(keep);
      $('addNewDrawing').value = ''; await fillAddDrawings();       // โหลดรายการ Drawing ใหม่ (รวมที่เพิ่งสร้าง) ก่อนเลือก
      if (!extNone) $('addDrawing').value = String(drawingId);
      await refreshBase();
      $('addMsg').textContent = `Saved ${items.length} item${items.length > 1 ? 's' : ''}. Add the next one.`; $('addMsg').className = 'small mr-auto text-success';
      if (addHasItemUnit === false && Object.keys(umOverride).length) $('addMsg').textContent += ' (Changed Unit/Module was not saved — run SQL 18.)';
      addCards[0].el.querySelector('.dc-def').focus();
    } else {
      window.jQuery('#addModal').modal('hide');
      if (items.length === 1) openDetail(items[0].id);
    }
    if (failed.length) alert('Items saved, but some photos failed to upload:\n' + failed.join('\n') + '\n\nOpen the item and add the photos in the detail panel.');
  } catch (e) { alertErr(e); } finally { btns.forEach((b, i) => { b.disabled = false; b.textContent = labels[i]; }); }
}

// ผูกปุ่ม/ช่องของฟอร์มเพิ่มตำหนิ (เรียกครั้งเดียวตอนหน้าเริ่มทำงาน)
function bindAdd() {
  $('addPack').addEventListener('change', onAddPack);                          // เปลี่ยน Test Pack → Unit/Module ขึ้นตาม pack + โหลดรายการ Drawing ใหม่
  $('addProject').addEventListener('change', onAddProject);                    // เปลี่ยน Project → pack/Unit/Module เหลือเฉพาะของโครงการนั้น
  $('addDrawing').addEventListener('change', refreshBase);                     // เปลี่ยน Drawing → คำนวณเลข Item ต่อ
  $('addNewDrawing').addEventListener('change', refreshBase);
  $('addModePack').addEventListener('change', applyExtMode);                   // เลือกโหมด Test Package / External punch
  $('addModeExt').addEventListener('change', applyExtMode);
  $('addUnit').addEventListener('change', () => { refreshExtUM(); noteUMUnsaved(); if (isExt()) fillAddDrawings(); });   // Unit → จำกัด Module · โหมด pack แก้แล้วไม่เปลี่ยน pack/Drawing
  $('addModule').addEventListener('change', () => { noteUMUnsaved(); if (isExt()) fillAddDrawings(); });
  $('addMore').onclick = () => {                                               // เพิ่มการ์ดตำหนิ (ต่อจากใบล่าสุด คัดลอก Category/Discipline มาให้)
    const last = addCards.at(-1)?.el;
    const c = addCard(last && { cat: last.querySelector('.dc-cat').value, disc: last.querySelector('.dc-disc').value });
    c.el.scrollIntoView({ behavior: 'smooth', block: 'center' }); c.el.querySelector('.dc-def').focus();
  };
  $('btnAdd').onclick = () => openAdd();
  $('addSave').onclick = () => saveAdd(false);
  $('addSaveMore').onclick = () => saveAdd(true);
  $('addCancel').onclick = closeAdd;
  // มาจากปุ่ม "Add punch" ของหน้า Test Package (?tp=...&add=1): เปิดฟอร์มพร้อมเลือก pack นั้นให้
  const q = new URLSearchParams(location.search);
  if (q.get('add') === '1' && q.get('tp')) openAdd({ pack: q.get('tp') });
}
