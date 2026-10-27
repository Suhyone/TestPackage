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
const isExt = () => $('addExternal').checked;
// pack พิเศษ EXTERNAL ของโครงการที่เลือก (ยังไม่มี = undefined)
const extPack = () => state.packs.find(p => p.project_no === $('addExtProject').value && p.test_pack_no === EXTERNAL_PACK);
async function addDrawingId() {
  if (isExt()) {
    const pack = extPack(), area = $('addExtArea').value.trim();
    if (!pack || !area) return 0;
    const { data } = await sb.from('drawings').select('id').eq('test_pack_id', pack.id).eq('drawing_no', area).maybeSingle();
    return data?.id || 0;
  }
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
// สลับโหมดปกติ / External punch
function applyExtMode() {
  const ext = isExt();
  $('addPackGroup').classList.toggle('d-none', ext); $('addExtGroup').classList.toggle('d-none', !ext);
  if (ext) fillExtAreas();
  return refreshBase();
}
// รายการพื้นที่ที่เคยใช้กับ External ของโครงการที่เลือก (ให้เลือกแทนการพิมพ์ซ้ำ)
async function fillExtAreas() {
  const pack = extPack();
  if (!pack) { $('addExtAreaList').innerHTML = ''; return; }
  const { data } = await sb.from('drawings').select('drawing_no').eq('test_pack_id', pack.id).order('drawing_no');
  $('addExtAreaList').innerHTML = (data || []).map(d => `<option value="${esc(d.drawing_no)}"></option>`).join('');
}
// ฟอร์มมีข้อมูลที่ยังไม่ได้บันทึกไหม (ใช้ถามก่อนทิ้ง)
const addDirty = () => addCards.some(c => c.el.querySelector('.dc-def').value.trim() || c.picker.files.length);
// ปิดฟอร์ม (ถามยืนยันถ้ามีข้อมูลค้าง)
function closeAdd() {
  if (addDirty() && !confirm('Discard the punch items you have entered?')) return;
  window.jQuery('#addModal').modal('hide');
}
// เปิดฟอร์มเพิ่มตำหนิ: ใส่ค่าล่าสุด (Pack/Drawing หรือ Project/พื้นที่) ให้อัตโนมัติ เหลือการ์ดเปล่า 1 ใบ · pre = { pack } เปิดจากหน้า Test Package
async function openAdd(pre) {
  const real = state.packs.filter(p => p.test_pack_no !== EXTERNAL_PACK);
  const packs = real.filter(p => !state.f.project || p.project_no === state.f.project);
  $('addPackList').innerHTML = packs.map(p => `<option value="${esc(p.test_pack_no)}">${esc(p.skid || '')}</option>`).join('');
  const projects = [...new Set(state.packs.map(p => p.project_no))].sort();
  $('addExtProject').innerHTML = projects.map(p => `<option>${esc(p)}</option>`).join('');
  const last = loadLast();
  $('addMsg').textContent = ''; $('addMsg').className = 'small mr-auto';
  $('addPack').value = ''; $('addSkid').textContent = ''; $('addNewDrawing').value = ''; $('addExtArea').value = '';
  $('addDrawing').innerHTML = '<option value="">Select a Test Package No. first</option>';
  $('addExternal').checked = !pre && !!last.ext;
  $('addExtProject').value = (last.project && projects.includes(last.project)) ? last.project : (state.f.project || projects[0] || '');
  $('addCards').innerHTML = ''; addCards = []; addBase = 1; addCard();
  window.jQuery('#addModal').modal({ backdrop: 'static', keyboard: false, show: true });   // ปิดด้วยปุ่ม Cancel / × เท่านั้น กันกดพลาดแล้วข้อมูลหาย
  if (isExt()) { $('addExtArea').value = last.area || ''; await applyExtMode(); return; }
  await applyExtMode();
  const name = pre?.pack ?? last.pack;
  if (name && packs.some(p => p.test_pack_no === name)) {
    $('addPack').value = name; await fillAddDrawings();
    if (!pre && last.drawingId && [...$('addDrawing').options].some(o => o.value === String(last.drawingId))) { $('addDrawing').value = String(last.drawingId); await refreshBase(); }
  }
}

// บันทึกทุกการ์ดเป็น punch item (สร้าง Drawing ใหม่ถ้าพิมพ์ใหม่) แล้วอัปโหลดรูปแท็กของแต่ละตำหนิเป็นรอบแรก
// keepOpen = true ("Save & add another"): คง Pack/Drawing/Category/Discipline ไว้ ล้างเฉพาะคำอธิบายและรูป
async function saveAdd(keepOpen = false) {
  const ext = isExt();
  let pack = null, areaNo = '';
  if (ext) {
    areaNo = $('addExtArea').value.trim();
    if (!$('addExtProject').value) return alert('Select the Project No.');
    if (!areaNo) { $('addExtArea').focus(); return alert('Enter the Area / Location of this external punch.'); }
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
        const { data, error } = await sb.from('test_packs').upsert({ project_no: $('addExtProject').value, test_pack_no: EXTERNAL_PACK }, { onConflict: 'project_no,test_pack_no' }).select('id,project_no,test_pack_no,skid').single();
        if (error) throw error; pack = data; state.packs.push(pack);
      }
    }
    let drawingId = ext ? 0 : +$('addDrawing').value;
    const newNo = ext ? areaNo : $('addNewDrawing').value.trim();
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
      } catch (e) { failed.push(`Item ${it.item_no}: ${friendlyErr(e)}`); }
    }
    const d = state.drawings.get(drawingId) || { id: drawingId, drawing_no: newNo || $('addDrawing').selectedOptions[0]?.text, work_type: null, test_pack_id: pack.id };
    state.drawings.set(drawingId, d);
    items.forEach(it => state.rows.push({ ...it, drawing_no: d.drawing_no, work_type: d.work_type || 'none',
      test_pack_no: pack.test_pack_no, skid: pack.skid, project_no: pack.project_no, rc: rcs.get(it.id) || 0 }));
    saveLast({ ext, pack: ext ? '' : pack.test_pack_no, drawingId: ext ? 0 : drawingId, project: pack.project_no, area: ext ? areaNo : '' });
    applyFilters();
    if (typeof afterAdd === 'function') afterAdd();
    if (keepOpen) {                                                 // เก็บตำหนิถัดไปใน Pack/Drawing เดิมต่อได้เลย
      const keep = { cat: addCards.at(-1).el.querySelector('.dc-cat').value, disc: addCards.at(-1).el.querySelector('.dc-disc').value };
      $('addCards').innerHTML = ''; addCards = []; addCard(keep);
      if (ext) await fillExtAreas();
      else { $('addNewDrawing').value = ''; await fillAddDrawings(); $('addDrawing').value = String(drawingId); }   // โหลดรายการ Drawing ใหม่ (รวมที่เพิ่งสร้าง) ก่อนเลือก
      await refreshBase();
      $('addMsg').textContent = `Saved ${items.length} item${items.length > 1 ? 's' : ''}. Add the next one.`; $('addMsg').className = 'small mr-auto text-success';
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
  $('addPack').addEventListener('change', fillAddDrawings);                    // เปลี่ยน Test Pack → โหลดรายการ Drawing ใหม่
  $('addDrawing').addEventListener('change', refreshBase);                     // เปลี่ยน Drawing → คำนวณเลข Item ต่อ
  $('addNewDrawing').addEventListener('change', refreshBase);
  $('addExternal').addEventListener('change', applyExtMode);                   // สวิตช์ External punch
  $('addExtProject').addEventListener('change', () => { fillExtAreas(); refreshBase(); });
  $('addExtArea').addEventListener('change', refreshBase);
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
