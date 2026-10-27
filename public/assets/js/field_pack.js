// ===================================================================
// field_pack.js — หน้างานของ Test Package 1 ใบ (field_pack.php?id=...) สำหรับแท็บเล็ต
//   ① Pre-test (Sheet5) ตอบ YES / NO / N/A ด้วยปุ่มใหญ่ · ตอบ NO → ออก punch Category A อัตโนมัติ (ฟังก์ชันของ tp_pretest.js)
//   ② Punch: รายการของ pack + ฟอร์มเพิ่มเต็มจอ (Category / Discipline / รูป — กล้องหลังเปิดตรงจากปุ่ม Take photo)
//   ③ Pressure test ④ Sign-off: แสดงสถานะ gate และลิงก์ไปแท็บของหน้าออฟฟิศ (มีฟอร์มและลายเซ็นบนจออยู่แล้ว)
//   ร่างกันหาย (field_draft.js): คำตอบ Pre-test ที่ส่งไม่ได้ตอนเน็ตหลุด → รอส่งซ้ำอัตโนมัติเมื่อกลับมาออนไลน์ · ฟอร์ม punch จำค่าที่พิมพ์ไว้ (รูปไม่ถูกเก็บ)
//   สิทธิ์ : QC / admin บันทึกได้ · คนอื่นดูอย่างเดียว (บังคับซ้ำที่ RLS)
//   พึ่งพา : tp_pretest.js (pretest, loadPretest, savePretestAnswer, setSectionYes, pretestSummary, pretestGateHtml) · punch_photos.js (makePicker, uploadPhotos)
//            punch_common.js ($, today, STATUS, CAT_CLS, alertErr) · app.js (sb, appReady, esc, friendlyErr, fmtDate)
//   ตัวแปรกลาง tpId / tp / me / canQC ต้องประกาศที่นี่ เพราะ tp_pretest.js อ่านตัวแปรชื่อเหล่านี้
// ===================================================================
const tpId = Number(new URLSearchParams(location.search).get('id'));
let tp = null, me = null, canQC = false, fpItems = [], fpCats = [], fpDiscs = [], fpDrawings = [];
let pending = {};                                                        // คำตอบ Pre-test ที่ยังส่งไม่สำเร็จ { template_id: { answer, remark } }
let flushing = false;

// หน้านี้วาดเองหลังคำตอบเปลี่ยน (ทับฟังก์ชันชื่อเดียวกันใน tp_pretest.js ที่วาดหน้าออฟฟิศ)
async function afterPretestChange() { await reloadItems(); renderAll(); }

// error จากเครือข่าย (เน็ตหลุด/ช้า) → เก็บเป็นร่างรอส่ง ต่างจาก error อื่น (ไม่มีสิทธิ์/ข้อมูลผิด) ที่ต้องแจ้งผู้ใช้
const isNetErr = (e) => !navigator.onLine || /failed to fetch|network|timeout|load failed/i.test(String(e?.message || e || ''));

// ---------- ข้อมูล ----------
async function reloadItems() {
  const r = await sb.from('v_punch_items').select('*').eq('test_pack_id', tpId).order('item_no').order('id');
  fpItems = r.data || [];
}
const openCounts = () => {
  const live = fpItems.filter(i => i.status !== 'cancelled'), open = live.filter(i => i.status === 'open');
  return { total: live.length, open: open.length, openA: open.filter(i => i.category === 'A').length };
};

// ---------- ส่วนหัว + แถบขั้นตอน ----------
function renderHead() {
  const c = openCounts(), s = pretestSummary(), ptOk = pretest.missing || s.ready;
  $('fpNo').textContent = tp.test_pack_no;
  $('fpSub').textContent = [tp.module_no && `Module ${tp.module_no}`, tp.piping_system && `System ${tp.piping_system}`, tp.piping_name].filter(Boolean).join(' · ');
  $('fpState').innerHTML = c.openA ? '<span class="badge-status bg-s-rework">Blocked — Category A open</span>'
    : !ptOk ? '<span class="badge-status bg-s-fixed">Pre-test not complete</span>' : '<span class="badge-status bg-s-approved">Ready to test</span>';
  $('stPre').textContent = pretest.missing ? '' : `${s.total - s.unanswered}/${s.total}`;
  $('stPunch').textContent = c.open ? `${c.open} open` : '';
  const gate = c.openA ? `<div class="alert alert-danger py-2 mb-0" role="status"><i class="fas fa-ban"></i> Pressure test is <b>not allowed</b>: ${c.openA} Category A punch item${c.openA > 1 ? 's are' : ' is'} still open.</div>`
    : !ptOk ? '<div class="alert alert-warning py-2 mb-0" role="status"><i class="fas fa-hourglass-half"></i> Pressure test is <b>not allowed yet</b>: the pre-test checklist is not complete.</div>'
    : '<div class="alert alert-success py-2 mb-0" role="status"><i class="fas fa-check-circle"></i> Ready for the pressure test.</div>';
  $('fpGate').innerHTML = gate;
}

// ---------- ① Pre-test ----------
function renderPretestField() {
  const box = $('fpPretestBody');
  if (pretest.missing) { box.innerHTML = pretestGateHtml(); return; }
  const dis = canQC ? '' : ' disabled';
  const sec = (s) => {
    const list = pretest.tpl.filter(t => t.section === s.key), unans = list.some(t => !pretest.ans.has(t.id) && !pending[t.id]);
    return `<div class="d-flex align-items-center mt-3 mb-2"><h6 class="text-uppercase text-muted mb-0">${esc(s.title)}</h6>
      ${canQC && unans ? `<button type="button" class="btn btn-outline-success fd-btn ml-auto" data-allyes="${s.key}"><i class="fas fa-check-double"></i> Set unanswered to YES</button>` : ''}</div>
      ${list.map(t => {
        const saved = pretest.ans.get(t.id), p = pending[t.id], cur = p?.answer ?? saved?.answer, remark = p ? p.remark : (saved?.remark ?? '');
        const b = (v, label, cls) => `<button type="button" class="btn fd-ans btn-outline-${cls}${cur === v ? ' active' : ''}" data-t="${t.id}" data-a="${v}" aria-pressed="${cur === v}"${dis}>${label}</button>`;
        return `<div class="fd-q${cur === 'no' ? ' is-no' : !cur ? ' is-un' : ''}${p ? ' is-pending' : ''}" data-q="${t.id}">
          <div class="fd-q-text"><span class="fd-q-no">${t.seq}</span> ${esc(t.text)}${p ? ' <span class="badge badge-warning"><i class="fas fa-clock"></i> not sent</span>' : ''}</div>
          <div class="fd-q-btns">${b('yes', 'YES', 'success')}${b('no', 'NO', 'danger')}${b('na', 'N/A', 'secondary')}</div>
          ${cur ? `<input class="form-control fd-remark" data-r="${t.id}" value="${esc(remark)}" placeholder="${cur === 'no' ? 'What is wrong? (goes into the punch item)' : 'Remarks (optional)'}" aria-label="Remarks for item ${t.seq}"${dis}>` : ''}
        </div>`; }).join('')}`;
  };
  const un = Object.keys(pending).length;
  box.innerHTML = `${pretestGateHtml()}${un ? `<div class="alert alert-warning d-flex align-items-center" role="status"><span>${un} answer${un > 1 ? 's' : ''} not sent yet (kept on this device).</span>
    <button type="button" class="btn btn-warning fd-btn ml-auto" id="fpSendNow"><i class="fas fa-paper-plane"></i> Send now</button></div>` : ''}
    ${PT_SECTIONS.map(sec).join('')}<div class="small text-muted mt-3">NO raises a Category A punch item and blocks the pressure test.${canQC ? '' : ' (View only)'}</div>
    <div class="small mt-2" id="fpPtMsg" role="status" aria-live="polite"></div>`;
}
const ptMsg = (t, ok = true) => { const e = $('fpPtMsg'); if (e) { e.textContent = t; e.className = 'small mt-2 ' + (ok ? 'text-success' : 'text-danger'); } };
const savePending = () => Object.keys(pending).length ? FieldDraft.set(tpId, 'pretest', pending) : FieldDraft.clear(tpId, 'pretest');

// บันทึกคำตอบ 1 ข้อ: สำเร็จ = ล้างร่างข้อนั้น · เน็ตหลุด = เก็บเป็นร่างรอส่ง · error อื่น = แจ้งผู้ใช้
async function submitAnswer(tid, answer, remark) {
  if (!navigator.onLine) { pending[tid] = { answer, remark }; savePending(); renderAll(); return ptMsg('Offline — saved on this device, will send when you are back online.', false); }
  try { await savePretestAnswer(tid, answer, remark); delete pending[tid]; savePending(); renderAll(); ptMsg('Saved'); }
  catch (e) {
    if (isNetErr(e)) { pending[tid] = { answer, remark }; savePending(); renderAll(); ptMsg('Connection problem — saved on this device. Press "Send now" when the signal is back.', false); }
    else { delete pending[tid]; savePending(); renderAll(); ptMsg('Could not save: ' + friendlyErr(e), false); }
  }
}
// ส่งคำตอบที่ค้างทีละข้อ (หยุดเมื่อเน็ตยังไม่กลับ)
async function flushPending() {
  if (flushing || !Object.keys(pending).length || !navigator.onLine) return;
  flushing = true;
  try {
    for (const [tid, v] of Object.entries(pending)) {
      try { await savePretestAnswer(+tid, v.answer, v.remark); delete pending[tid]; savePending(); }
      catch (e) { if (isNetErr(e)) break; delete pending[tid]; savePending(); ptMsg('One answer could not be saved: ' + friendlyErr(e), false); }
    }
  } finally { flushing = false; renderAll(); }
}
function bindPretestField() {
  const box = $('fpPretestBody');
  box.addEventListener('click', async (e) => {
    if (!canQC) return;
    if (e.target.closest('#fpSendNow')) return flushPending();
    const all = e.target.closest('[data-allyes]');
    if (all) {
      const n = pretest.tpl.filter(t => t.section === all.dataset.allyes && !pretest.ans.has(t.id) && !pending[t.id]).length;
      if (!n || !confirm(`Set ${n} unanswered item${n > 1 ? 's' : ''} to YES?\nItems already answered (including NO and N/A) will not be changed.`)) return;
      box.querySelectorAll('button,input').forEach(i => i.disabled = true);
      try { const r = await setSectionYes(all.dataset.allyes); ptMsg(`${r.set} item${r.set === 1 ? '' : 's'} set to YES${r.skipped ? `; ${r.skipped} had just been answered by someone else and kept` : ''}`, !r.skipped); }
      catch (err) { renderAll(); ptMsg('Could not save: ' + (isNetErr(err) ? 'no connection — try again when you have signal.' : friendlyErr(err)), false); }
      return;
    }
    const b = e.target.closest('[data-a]'); if (!b) return;
    const tid = +b.dataset.t, row = box.querySelector(`[data-r="${tid}"]`);
    box.querySelectorAll('button,input').forEach(i => i.disabled = true);
    await submitAnswer(tid, b.dataset.a, row?.value.trim() || pending[tid]?.remark || pretest.ans.get(tid)?.remark || '');
  });
  box.addEventListener('change', async (e) => {                              // แก้หมายเหตุของข้อที่ตอบแล้ว
    const r = e.target.closest('[data-r]'); if (!r || !canQC) return;
    const tid = +r.dataset.r, cur = pending[tid]?.answer ?? pretest.ans.get(tid)?.answer; if (!cur) return;
    box.querySelectorAll('button,input').forEach(i => i.disabled = true);
    await submitAnswer(tid, cur, r.value.trim());
  });
}

// ---------- ② Punch ----------
function renderPunchField() {
  const cat = (c) => c ? `<span class="badge badge-${CAT_CLS[c] || 'light'} fd-cat">${esc(c)}</span>` : '';
  $('fpPunchBody').innerHTML = fpItems.filter(i => i.status !== 'cancelled').map(i => `<div class="fd-item">
    <div class="d-flex align-items-center" style="gap:8px">${cat(i.category)}<b>${esc(i.drawing_no)}</b> <span class="text-muted">#${esc(i.item_no ?? '')}</span>
      <span class="badge-status ml-auto ${STATUS[i.status]?.cls || ''}">${esc(STATUS[i.status]?.label || i.status)}</span></div>
    <div>${esc(i.deficiency)}</div></div>`).join('') || '<div class="text-muted">No punch items for this package yet.</div>';
  $('fpAdd').classList.toggle('d-none', !canQC);
}

// ฟอร์มเพิ่ม punch (1 รายการต่อครั้ง · "Save & add another" เก็บ Drawing/Category/Discipline ไว้)
let fpPicker = null;
function formHtml() {
  return `<div class="form-group"><label for="fpDrawing">Drawing No.</label>
      <select id="fpDrawing" class="form-control fd-input"></select>
      <input id="fpNewDrawing" class="form-control fd-input mt-2" placeholder="…or type a new Drawing No." autocomplete="off"></div>
    <div class="form-group"><label>Category <span class="text-danger" aria-hidden="true">*</span></label>
      <div class="d-flex" style="gap:8px" id="fpCat" role="radiogroup" aria-label="Category">${fpCats.map(c => `<button type="button" class="btn fd-ans btn-outline-${c.code === 'A' ? 'danger' : 'info'} flex-fill" data-cat="${esc(c.code)}" role="radio" aria-checked="false">${esc(c.code)}</button>`).join('')}</div>
      <small class="text-muted d-block mt-1" id="fpCatHelp">Choose the category (required)</small></div>
    <div class="form-group"><label for="fpDisc">Discipline</label><select id="fpDisc" class="form-control fd-input"><option value="">—</option>${fpDiscs.map(d => `<option>${esc(d.name)}</option>`).join('')}</select></div>
    <div class="form-group"><label for="fpDef">Punch item description</label><textarea id="fpDef" class="form-control fd-input" rows="3"></textarea></div>
    <label>Photos</label><div id="fpPhotos"></div>`;
}
let fpCat = '';
function setCat(v) {
  fpCat = v || '';
  document.querySelectorAll('#fpCat [data-cat]').forEach(b => { const on = b.dataset.cat === fpCat; b.classList.toggle('active', on); b.setAttribute('aria-checked', on); });
  $('fpCatHelp').textContent = fpCats.find(c => c.code === fpCat)?.description || 'Choose the category (required)';
}
const readForm = () => ({ drawing: $('fpDrawing').value, newDrawing: $('fpNewDrawing').value, cat: fpCat, disc: $('fpDisc').value, def: $('fpDef').value });
const saveDraft = () => FieldDraft.set(tpId, 'punch', readForm());
function fillDrawings(selectId) {
  $('fpDrawing').innerHTML = fpDrawings.map(d => `<option value="${d.id}">${esc(d.drawing_no)}</option>`).join('') || '<option value="">No drawings yet — type a new Drawing No.</option>';
  if (selectId && fpDrawings.some(d => String(d.id) === String(selectId))) $('fpDrawing').value = String(selectId);
}
async function openForm() {
  const d = await sb.from('drawings').select('id,drawing_no').eq('test_pack_id', tpId).order('drawing_no');
  fpDrawings = d.data || [];
  $('fpModalBody').innerHTML = formHtml();
  fpPicker = makePicker($('fpPhotos'));
  fillDrawings();
  const draft = FieldDraft.get(tpId, 'punch');                              // ร่างที่พิมพ์ค้างไว้
  if (draft) { fillDrawings(draft.drawing); $('fpNewDrawing').value = draft.newDrawing || ''; $('fpDisc').value = draft.disc || ''; $('fpDef').value = draft.def || ''; setCat(draft.cat); }
  else { $('fpDisc').value = fpDiscs.some(x => x.name === 'Piping') ? 'Piping' : ''; setCat(''); }
  $('fpModalMsg').textContent = draft ? 'Restored your unsaved entry. Photos must be added again.' : ''; $('fpModalMsg').className = 'small mr-auto text-muted';
  $('fpCat').addEventListener('click', (e) => { const b = e.target.closest('[data-cat]'); if (b) { setCat(b.dataset.cat); saveDraft(); } });
  window.jQuery('#fpModal').modal({ backdrop: 'static', keyboard: false, show: true });
}
const formMsg = (t, ok) => { const e = $('fpModalMsg'); e.textContent = t; e.className = 'small mr-auto ' + (ok === true ? 'text-success' : ok === false ? 'text-danger' : 'text-muted'); };

async function saveForm(keepOpen) {
  const f = readForm(), def = f.def.trim(), newNo = f.newDrawing.trim();
  if (!f.cat) { formMsg('Choose a Category (A or B).', false); return; }
  if (!def) { $('fpDef').focus(); formMsg('Enter the punch item description.', false); return; }
  if (!newNo && !+f.drawing) { formMsg('Select or type a Drawing No.', false); return; }
  const btns = [$('fpSave'), $('fpSaveMore')]; btns.forEach(b => b.disabled = true); formMsg('Saving…');
  let item = null;
  try {
    let drawingId = +f.drawing;
    if (newNo) {
      const { data, error } = await sb.from('drawings').upsert({ test_pack_id: tpId, drawing_no: newNo }, { onConflict: 'test_pack_id,drawing_no' }).select('id').single();
      if (error) throw error; drawingId = data.id;
    }
    const last = await sb.from('punch_items').select('item_no').eq('drawing_id', drawingId).order('item_no', { ascending: false, nullsFirst: false }).limit(1);
    const ins = await sb.from('punch_items').insert({ drawing_id: drawingId, item_no: (last.data?.[0]?.item_no || 0) + 1, deficiency: def, category: f.cat, discipline: f.disc || null,
      status: 'open', punch_by: me.name, punch_date: today(), input_date: today(), created_by: me.id }).select().single();
    if (ins.error) throw ins.error; item = ins.data;
  } catch (e) {                                                              // ยังไม่ได้บันทึก → คงข้อมูลในฟอร์มและร่างไว้
    formMsg(isNetErr(e) ? 'Not saved — connection problem. Your entry is kept; try again when you have signal.' : 'Could not save: ' + friendlyErr(e), false);
    btns.forEach(b => b.disabled = false); return;
  }
  let photoErr = '';
  if (fpPicker.files.length) {
    try {
      const paths = await uploadPhotos([...fpPicker.files], `items/${item.id}`, (n, t) => formMsg(`Uploading photos ${n}/${t}…`));
      const r = await sb.from('punch_rounds').insert({ punch_item_id: item.id, round_no: 1, kind: 'defect', photo_paths: paths, by_user: me.id, by_name: me.name });
      if (r.error) throw r.error;
    } catch (e) { photoErr = friendlyErr(e); }
  }
  btns.forEach(b => b.disabled = false);
  FieldDraft.clear(tpId, 'punch');
  await reloadItems(); renderAll();
  const keep = { drawing: f.drawing, cat: f.cat, disc: f.disc };
  if (keepOpen) {
    const d = await sb.from('drawings').select('id,drawing_no').eq('test_pack_id', tpId).order('drawing_no'); fpDrawings = d.data || [];
    fillDrawings(newNo ? fpDrawings.find(x => x.drawing_no === newNo)?.id : keep.drawing); $('fpNewDrawing').value = ''; $('fpDef').value = ''; fpPicker.clear(); setCat(keep.cat); $('fpDisc').value = keep.disc || '';
    formMsg(photoErr ? `Item saved, but the photos failed: ${photoErr}. Add them from the Punch List.` : 'Saved. Add the next one.', photoErr ? false : true); $('fpDef').focus();
  } else {
    window.jQuery('#fpModal').modal('hide');
    if (photoErr) alert(`Punch item saved, but the photos failed to upload: ${photoErr}\n\nOpen the item in the Punch List to add photos.`);
  }
}

// ---------- วาดทั้งหน้า ----------
function renderAll() { renderHead(); renderPretestField(); renderPunchField(); }

function showDraftBar() {                                                   // มีร่างค้างจากครั้งก่อนไหม
  const un = Object.keys(pending).length, pd = FieldDraft.get(tpId, 'punch');
  if (!un && !pd) return;
  const bar = $('fpDraftBar');
  bar.innerHTML = `<i class="fas fa-save"></i> Unsent entries from your last visit: ${un ? `${un} pre-test answer${un > 1 ? 's' : ''}` : ''}${un && pd ? ' · ' : ''}${pd ? 'an unsaved punch item' : ''}.
    ${pd ? '<button type="button" class="btn btn-sm btn-outline-dark ml-2" id="fpOpenDraft">Open punch draft</button>' : ''}`;
  bar.classList.remove('d-none');
  $('fpOpenDraft')?.addEventListener('click', () => { openForm(); bar.classList.add('d-none'); });
}

async function init() {
  ({ me } = await appReady);
  canQC = me.role === 'qc' || me.role === 'admin';
  if (!tpId) return $('notFound').classList.remove('d-none');
  const r = await sb.from('test_packs').select('*').eq('id', tpId).maybeSingle();
  if (r.error || !r.data) return $('notFound').classList.remove('d-none');
  tp = r.data;
  const [cats, discs] = await Promise.all([sb.from('categories').select('*').order('sort_order'), sb.from('disciplines').select('*').order('sort_order'), reloadItems(), loadPretest()]);
  fpCats = cats.data || []; fpDiscs = discs.data || [];
  pending = FieldDraft.get(tpId, 'pretest') || {};
  $('fpPressureLink').href = `test_package.php?id=${tpId}#pressure`; $('fpSignLink').href = `test_package.php?id=${tpId}#signoff`; $('fpReportLink').href = `punch_report.php?id=${tpId}`;
  document.title = `${tp.test_pack_no} · Field | BJCHI QA/QC`;
  $('fpPage').classList.remove('d-none');
  watchOnline($('fpNet'), flushPending);
  renderAll(); bindPretestField(); showDraftBar();
  $('fpAdd').addEventListener('click', openForm);
  $('fpSave').addEventListener('click', () => saveForm(false)); $('fpSaveMore').addEventListener('click', () => saveForm(true));
  $('fpModalBody').addEventListener('input', saveDraft); $('fpModalBody').addEventListener('change', saveDraft);   // ร่างฟอร์ม punch บันทึกทุกครั้งที่พิมพ์/เลือก
  flushPending();                                                            // มีคำตอบค้างและตอนนี้ออนไลน์อยู่ → ส่งเลย
}
init().catch(alertErr);
