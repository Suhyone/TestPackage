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
let flushing = false, fpLoadFailed = false;                              // fpLoadFailed = โหลดรายการ punch ไม่สำเร็จ → ไม่รู้สถานะ gate ห้ามขึ้นเขียว

// หน้านี้วาดเองหลังคำตอบเปลี่ยน (ทับฟังก์ชันชื่อเดียวกันใน tp_pretest.js ที่วาดหน้าออฟฟิศ)
async function afterPretestChange() { await reloadItems(); renderAll(); }

// error จากเครือข่าย (เน็ตหลุด/ช้า) → เก็บเป็นร่างรอส่ง ต่างจาก error อื่น (ไม่มีสิทธิ์/ข้อมูลผิด) ที่ต้องแจ้งผู้ใช้
const isNetErr = (e) => !navigator.onLine || /failed to fetch|network|timeout|load failed/i.test(String(e?.message || e || ''));

// ---------- ข้อมูล ----------
async function reloadItems() {
  const r = await sb.from('v_punch_items').select('*').eq('test_pack_id', tpId).order('item_no').order('id');
  if (r.error) { fpLoadFailed = true; throw r.error; }
  fpLoadFailed = false; fpItems = r.data || [];
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
  $('fpState').innerHTML = fpLoadFailed ? '<span class="badge-status bg-s-fixed">Status unknown</span>' : c.openA ? '<span class="badge-status bg-s-rework">Blocked — Category A open</span>'
    : !ptOk ? '<span class="badge-status bg-s-fixed">Pre-test not complete</span>' : '<span class="badge-status bg-s-approved">Ready to test</span>';
  $('stPre').textContent = pretest.missing ? '' : `${s.total - s.unanswered}/${s.total}`;
  $('stPunch').textContent = c.open ? `${c.open} open` : '';
  const gate = fpLoadFailed ? '<div class="alert alert-warning py-2 mb-0" role="status"><i class="fas fa-exclamation-triangle"></i> Could not load the punch items, so the pressure-test status is unknown. Check your connection and reload.</div>'
    : c.openA ? `<div class="alert alert-danger py-2 mb-0" role="status"><i class="fas fa-ban"></i> Pressure test is <b>not allowed</b>: ${c.openA} Category A punch item${c.openA > 1 ? 's are' : ' is'} still open.</div>`
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
          <div class="fd-q-text"><span class="fd-q-no">${t.seq}</span> ${esc(t.text)}${p ? (p.err ? ` <span class="badge badge-danger"><i class="fas fa-exclamation-circle"></i> not saved: ${esc(p.err)}</span>` : ' <span class="badge badge-warning"><i class="fas fa-clock"></i> not sent</span>') : ''}</div>
          <div class="fd-q-btns">${b('yes', 'YES', 'success')}${b('no', 'NO', 'danger')}${b('na', 'N/A', 'secondary')}</div>
          ${cur ? `<input class="form-control fd-remark" data-r="${t.id}" value="${esc(remark)}" placeholder="${cur === 'no' ? 'What is wrong? (goes into the punch item)' : 'Remarks (optional)'}" aria-label="Remarks for item ${t.seq}"${dis}>` : ''}
        </div>`; }).join('')}`;
  };
  const un = Object.values(pending).filter(v => !v.sending).length;       // ข้อที่กำลังส่งอยู่ไม่นับเป็น "ค้างส่ง"
  box.innerHTML = `${pretestGateHtml()}${un ? `<div class="alert alert-warning d-flex align-items-center" role="status"><span>${un} answer${un > 1 ? 's' : ''} not sent yet (kept on this device).</span>
    <button type="button" class="btn btn-warning fd-btn ml-auto" id="fpSendNow"><i class="fas fa-paper-plane"></i> Send now</button></div>` : ''}
    ${PT_SECTIONS.map(sec).join('')}<div class="small text-muted mt-3">NO raises a Category A punch item and blocks the pressure test.${canQC ? '' : ' (View only)'}</div>
    <div class="small mt-2" id="fpPtMsg" role="status" aria-live="polite"></div>`;
}
const ptMsg = (t, ok = true) => { const e = $('fpPtMsg'); if (e) { e.textContent = t; e.className = 'small mt-2 ' + (ok ? 'text-success' : 'text-danger'); } };
const savePending = () => {                                                // ไม่เก็บธง sending ลงเครื่อง (เป็นสถานะชั่วคราวของหน้านี้)
  const p = {}; for (const [k, v] of Object.entries(pending)) { const { sending, ...rest } = v; p[k] = rest; }
  if (Object.keys(p).length) FieldDraft.set(tpId, 'pretest', p); else FieldDraft.clear(tpId, 'pretest');
};
const draftWarn = () => FieldDraft.available() ? '' : ' (this device could not store the draft — do not close the page)';

// บันทึกคำตอบ 1 ข้อ: สำเร็จ = ล้างร่างข้อนั้น · เน็ตหลุด = เก็บเป็นร่างรอส่ง · error อื่น = แจ้งผู้ใช้
// แสดงคำตอบทันที (optimistic · ป้าย not sent จนกว่าจะยืนยัน) แล้วส่งหลังบ้านเป็นคิวต่อข้อ — ไม่ปิดปุ่มทั้งกล่อง
let sendChain = Promise.resolve();                                         // คิวส่งเดียวทั้งหน้า (ทั้งแตะตอบและ flushPending) — กัน item_no ของ punch A ซ้ำเวลาส่งต่างข้อซ้อนกัน
const enqueueSend = (fn) => sendChain = sendChain.then(fn).catch(() => {});
function submitAnswer(tid, answer, remark) {
  if (!navigator.onLine) { pending[tid] = { answer, remark }; savePending(); renderAll(); return ptMsg('Offline — saved on this device, will send when you are back online.' + draftWarn(), false); }
  const mine = pending[tid] = { answer, remark, sending: true }; renderAll();
  return enqueueSend(() => sendAnswer(tid, answer, remark, mine));
}
async function sendAnswer(tid, answer, remark, mine) {
  try { await savePretestAnswer(tid, answer, remark); if (pending[tid] === mine) delete pending[tid]; savePending(); renderAll(); ptMsg('Saved'); }
  catch (e) {
    if (pending[tid] !== mine) return;                                     // มีคำตอบใหม่ของข้อนี้ทับแล้ว ให้คำตอบใหม่เป็นตัวตัดสิน
    if (isNetErr(e)) { pending[tid] = { answer, remark }; savePending(); renderAll(); ptMsg('Connection problem — saved on this device. Press "Send now" when the signal is back.' + draftWarn(), false); }
    else { pending[tid] = { answer, remark, err: friendlyErr(e) }; savePending(); renderAll(); ptMsg('Could not save: ' + friendlyErr(e) + ' The answer is marked below — tap an answer again to retry.', false); }
  }
}
// ส่งคำตอบที่ค้างทีละข้อ (หยุดเมื่อเน็ตยังไม่กลับ)
async function flushPending() {
  if (flushing || !Object.keys(pending).length || !navigator.onLine) return;
  flushing = true;
  return enqueueSend(async () => {                                                 // ต่อท้ายคิวเดียวกับการแตะตอบ
    try {
      for (const [tid, v] of Object.entries(pending)) {
        if (v.err || v.sending) continue;                                          // ล้มเพราะไม่ใช่เครือข่าย: รอผู้ใช้แตะตอบใหม่
        try { await savePretestAnswer(+tid, v.answer, v.remark); if (pending[tid] === v) delete pending[tid]; savePending(); }
        catch (e) { if (isNetErr(e)) break; if (pending[tid] === v) pending[tid] = { ...v, err: friendlyErr(e) }; savePending(); ptMsg('An answer could not be saved: ' + friendlyErr(e), false); }
      }
    } finally { flushing = false; renderAll(); }
  });
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
    await submitAnswer(tid, b.dataset.a, row?.value.trim() || pending[tid]?.remark || pretest.ans.get(tid)?.remark || '');
  });
  box.addEventListener('change', async (e) => {                              // แก้หมายเหตุของข้อที่ตอบแล้ว
    const r = e.target.closest('[data-r]'); if (!r || !canQC) return;
    const tid = +r.dataset.r, cur = pending[tid]?.answer ?? pretest.ans.get(tid)?.answer; if (!cur) return;
    await submitAnswer(tid, cur, r.value.trim());
  });
}

// ---------- ② Punch ----------
function renderPunchField() {
  const cat = (c) => c ? `<span class="badge badge-${CAT_CLS[c] || 'light'} fd-cat">${esc(c)}</span>` : '';
  // แถวเป็นปุ่ม (แตะ = เปิดดู/เพิ่มรูป) · เลขรายการตัวใหญ่ไว้เขียนบนเทปกาว · "Fix submitted" = งานเปิดที่ส่งแก้แล้วรอ QC (ป้ายเดียวกับ qc_list.js ไม่ใช่สถานะใหม่)
  const badge = (i) => i.status === 'open' && i.fix_pending ? '<span class="badge-status bg-s-fixed" title="Fix submitted — waiting for QC to check">Fix submitted</span>'
    : `<span class="badge-status ${STATUS[i.status]?.cls || ''}">${esc(STATUS[i.status]?.label || i.status)}</span>`;
  $('fpPunchBody').innerHTML = fpItems.filter(i => i.status !== 'cancelled').map(i => `<button type="button" class="fd-item fd-item-btn" data-item="${i.id}" aria-label="Punch item ${esc(i.drawing_no)} number ${esc(i.item_no ?? '')} — open to view or add photos">
    <span class="d-flex align-items-center" style="gap:8px">${cat(i.category)}<span class="fd-item-no">${esc(i.drawing_no)} #${esc(i.item_no ?? '')}</span>
      <span class="ml-auto">${badge(i)}</span></span>
    <span class="d-block fd-desc">${esc(i.deficiency)}</span>${fpHeld.has(i.id) ? `<span class="d-block small text-danger"><i class="fas fa-clock"></i> ${fpHeld.get(i.id).length} photo${fpHeld.get(i.id).length > 1 ? 's' : ''} waiting to send</span>` : ''}</button>`).join('') || '<div class="text-muted">No punch items for this package yet.</div>';
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
    <div class="form-group"><label for="fpDef">Punch item description</label>
      <div id="fpQuick" class="fd-quick" aria-label="Quick texts"></div>
      <textarea id="fpDef" class="form-control fd-input" rows="3"></textarea>
      <button type="button" class="btn btn-outline-secondary fd-btn mt-2" id="fpQuickSave"><i class="fas fa-bookmark"></i> Save as quick text</button></div>
    <label>Photos</label><div id="fpPhotos"></div>`;
}
let fpCat = '';
const newKey = () => `FP|${tpId}|${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
let fpKey = newKey();                                                     // รหัสของฟอร์มนี้ (เก็บในร่าง) — ส่งซ้ำหลังเน็ตหลุดจะไม่ได้ item ซ้ำ
function setCat(v) {
  fpCat = v || '';
  document.querySelectorAll('#fpCat [data-cat]').forEach(b => { const on = b.dataset.cat === fpCat; b.classList.toggle('active', on); b.setAttribute('aria-checked', on); });
  $('fpCatHelp').textContent = fpCats.find(c => c.code === fpCat)?.description || 'Choose the category (required)';
}
const readForm = () => ({ key: fpKey, drawing: $('fpDrawing').value, newDrawing: $('fpNewDrawing').value, cat: fpCat, disc: $('fpDisc').value, def: $('fpDef').value });
const saveDraft = () => FieldDraft.set(tpId, 'punch', readForm());
function fillDrawings(selectId) {
  const known = selectId && fpDrawings.some(d => String(d.id) === String(selectId));
  // มี drawing มากกว่า 1 ใบและยังไม่เคยเลือก → เริ่มที่ "— Select drawing —" ให้เลือกเอง กันบันทึกผิดใบ
  const ph = fpDrawings.length > 1 && !known ? '<option value="">— Select drawing —</option>' : '';
  $('fpDrawing').innerHTML = ph + fpDrawings.map(d => `<option value="${d.id}">${esc(d.drawing_no)}</option>`).join('') || '<option value="">No drawings yet — type a new Drawing No.</option>';
  if (known) $('fpDrawing').value = String(selectId);
}
// ข้อความสำเร็จรูป: รายการร่วม (ตาราง punch_phrases · sql/17) + รายการของเครื่องนี้ (localStorage) · แตะ = เติมต่อท้ายช่อง description
//   ข้อความที่มี [__] = แตะแล้วถามตัวเลขช่องเดียว แล้วแทน [__] ก่อนเติม (ห้ามมี [__] เหลือใน description ที่บันทึก)
//   ตารางยังไม่มี/ออฟไลน์ → ใช้ชุดร่วมที่แคชไว้ล่าสุด (ถ้ามี) + รายการของเครื่องเดิม โดยไม่ขึ้น error
const quickKey = () => `bjchiFieldQuick:${window.ME?.id || 'anon'}`;
const getQuick = () => { try { const a = JSON.parse(localStorage.getItem(quickKey())); return Array.isArray(a) ? a.filter(x => typeof x === 'string') : []; } catch { return []; } };
const setQuick = (a) => { try { localStorage.setItem(quickKey(), JSON.stringify(a)); return true; } catch { return false; } };
const PHRASE_CACHE = 'bjchiFieldPhrases';
const PH_MARK = '[__]';
let fpPhrases = [], fpPhraseMissing = false, fpPendingTpl = '';           // fpPhrases = [{id, text}] ชุดร่วม · fpPendingTpl = chip ที่รอตัวเลข
try { const a = JSON.parse(localStorage.getItem(PHRASE_CACHE)); if (Array.isArray(a)) fpPhrases = a.filter(x => x && x.id != null && typeof x.text === 'string'); } catch { /* ไม่มีแคช */ }
const phNorm = (s) => String(s).trim().replace(/\s+/g, ' ').toLowerCase();
async function loadPhrases() {                                            // best-effort: error ทุกชนิดไม่รบกวนผู้ใช้
  try {
    const r = await sb.from('punch_phrases').select('id,text').order('id');
    if (r.error) { if (r.error.code === '42P01' || r.error.code === 'PGRST205') fpPhraseMissing = true; return; }
    fpPhraseMissing = false; fpPhrases = (r.data || []).map(x => ({ id: x.id, text: x.text }));
    try { localStorage.setItem(PHRASE_CACHE, JSON.stringify(fpPhrases)); } catch { /* แคชไม่ได้ก็ไม่เป็นไร */ }
  } catch { /* ออฟไลน์ → ใช้แคช */ }
}
// รายการที่แสดง: ชุดร่วมก่อน แล้วตามด้วยของเครื่องนี้ที่ไม่ซ้ำกับชุดร่วม
const quickList = () => {
  const seen = new Set(fpPhrases.map(p => phNorm(p.text)));
  return [...fpPhrases.map(p => ({ text: p.text, id: p.id })), ...getQuick().filter(t => !seen.has(phNorm(t))).map(t => ({ text: t, id: null }))];
};
function paintQuick() {
  const admin = me?.role === 'admin';
  $('fpQuick').innerHTML = quickList().map((q, i) => `<span class="btn-group mr-2 mb-2"><button type="button" class="btn btn-outline-info fd-btn fd-chip" data-qt="${i}">${esc(q.text)}</button>
    ${q.id == null || admin ? `<button type="button" class="btn btn-outline-secondary fd-btn" data-qdel="${i}" title="Remove quick text" aria-label="Remove quick text ${esc(q.text)}">&times;</button>` : ''}</span>`).join('');
}
// เติมข้อความต่อท้าย description: ถ้ามีข้อความเดิมให้ขึ้นบรรทัดใหม่
function appendDef(text) {
  const ta = $('fpDef'), cur = ta.value;
  ta.value = cur && !/\n$/.test(cur) ? `${cur.replace(/[ \t]+$/, '')}\n${text}` : cur + text;
  saveDraft(); ta.focus();
}
function closeQuickNum() { fpPendingTpl = ''; $('fpQuickNum').classList.add('d-none'); }
function bindQuick() {
  $('fpQuick').insertAdjacentHTML('afterend', `<div id="fpQuickNum" class="d-none mb-2"><div class="input-group"><input id="fpQuickNumIn" class="form-control fd-input" inputmode="decimal" autocomplete="off" aria-label="Number in mm">
    <div class="input-group-append"><span class="input-group-text">mm</span><button type="button" class="btn btn-info fd-btn" id="fpQuickNumAdd"><i class="fas fa-plus"></i> Add</button></div></div></div>`);
  const addNum = () => {
    const v = $('fpQuickNumIn').value.trim().replace(',', '.');
    if (!/^\d+(\.\d+)?$/.test(v)) { formMsg('Enter the number first, then tap Add.', false); $('fpQuickNumIn').focus(); return; }
    const tpl = fpPendingTpl; closeQuickNum(); formMsg('', null);
    appendDef(tpl.split(PH_MARK).join(v));
  };
  $('fpQuickNumAdd').addEventListener('click', addNum);
  $('fpQuickNumIn').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); addNum(); } });
  $('fpQuick').addEventListener('click', async (e) => {
    const list = quickList(), add = e.target.closest('[data-qt]'), del = e.target.closest('[data-qdel]');
    if (add) {
      const q = list[+add.dataset.qt]; if (!q) return;
      if (q.text.includes(PH_MARK)) { fpPendingTpl = q.text; $('fpQuickNum').classList.remove('d-none'); $('fpQuickNumIn').value = ''; $('fpQuickNumIn').focus(); }
      else { closeQuickNum(); appendDef(q.text); }
    } else if (del) {
      const q = list[+del.dataset.qdel]; if (!q || !confirm(`Remove quick text "${q.text}"?`)) return;
      if (q.id == null) { setQuick(getQuick().filter(t => t !== q.text)); paintQuick(); return; }
      if (me?.role !== 'admin') return;                                   // ชุดร่วมลบได้เฉพาะ admin (บังคับซ้ำที่ RLS)
      const r = await sb.from('punch_phrases').delete().eq('id', q.id).select('id');
      if (r.error || !r.data?.length) return formMsg(r.error ? 'Could not remove: ' + friendlyErr(r.error) : 'Could not remove this quick text (no permission).', false);
      await loadPhrases(); paintQuick(); formMsg('Quick text removed.', true);
    }
  });
  $('fpQuickSave').addEventListener('click', () => {                      // เก็บลงเครื่องนี้เหมือนเดิม (ไม่ลงชุดร่วม)
    const t = $('fpDef').value.trim(), q = getQuick();
    if (!t) return formMsg('Type the description first, then save it as a quick text.', false);
    if (t.includes(PH_MARK)) return formMsg('Replace [__] with a number first.', false);
    if (q.includes(t) || fpPhrases.some(p => phNorm(p.text) === phNorm(t))) return formMsg('This quick text is already saved.', false);
    q.push(t);
    if (!setQuick(q.slice(-12))) return formMsg('This device could not store the quick text.', false);
    paintQuick(); formMsg('Quick text saved on this device.', true);
  });
}
// หลังบันทึก punch สำเร็จ: เพิ่มบรรทัดใหม่เข้าชุดร่วมอัตโนมัติ (เลขหน้าบรรทัดถูกตัด · ตัวเลข mm → [__] · ข้ามซ้ำ/สั้น/ยาวเกิน) — best-effort ไม่กระทบการบันทึก
async function addPhrasesFrom(def) {
  if (fpPhraseMissing) return;
  const known = new Set(quickList().map(q => phNorm(q.text))), rows = [];
  for (const raw of String(def).split(/\r?\n/)) {
    const t = raw.replace(/^\s*\d+\s*[).]\s*/, '').trim().replace(/\d+(?:\.\d+)?\s*mm\b/gi, `${PH_MARK} mm`);
    if (t.length < 4 || t.length > 120 || known.has(phNorm(t))) continue;
    known.add(phNorm(t)); rows.push({ text: t, created_by: me.id, created_by_name: me.name });
  }
  let added = false;
  for (const row of rows) {                                               // ทีละแถว: แถวซ้ำ/ไม่มีสิทธิ์ไม่ทำให้แถวอื่นล้ม
    const r = await sb.from('punch_phrases').insert(row);
    if (r.error) { if (r.error.code === '42P01' || r.error.code === 'PGRST205') { fpPhraseMissing = true; return; } continue; }
    added = true;
  }
  if (added) { await loadPhrases(); if ($('fpQuick')) paintQuick(); }
}
async function openForm() {
  const d = await sb.from('drawings').select('id,drawing_no').eq('test_pack_id', tpId).order('drawing_no');
  fpDrawings = d.data || [];
  $('fpModalBody').innerHTML = formHtml();
  fpPicker = makePicker($('fpPhotos'));
  paintQuick(); bindQuick();
  const draft = FieldDraft.get(tpId, 'punch');                              // ร่างที่พิมพ์ค้างไว้
  fillDrawings(draft?.drawing || FieldDraft.get(tpId, 'lastDrawing'));      // ใช้ drawing ในร่าง/ใบล่าสุดที่บันทึก ถ้าไม่มีให้เลือกเอง
  fpKey = draft?.key || newKey();
  if (draft) { $('fpNewDrawing').value = draft.newDrawing || ''; $('fpDisc').value = draft.disc || ''; $('fpDef').value = draft.def || ''; setCat(draft.cat); }
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
  if (def.includes(PH_MARK)) { $('fpDef').focus(); formMsg('The description still has [__] — replace it with a number (or delete that line).', false); return; }
  if (!newNo && !+f.drawing) { formMsg('Select or type a Drawing No.', false); return; }
  const btns = [$('fpSave'), $('fpSaveMore')]; btns.forEach(b => b.disabled = true); formMsg('Saving…');
  let item = null, dNo = '', drawingId = +f.drawing;
  try {
    if (newNo) {
      const { data, error } = await sb.from('drawings').upsert({ test_pack_id: tpId, drawing_no: newNo }, { onConflict: 'test_pack_id,drawing_no' }).select('id').single();
      if (error) throw error; drawingId = data.id;
    }
    dNo = newNo || fpDrawings.find(x => x.id === drawingId)?.drawing_no || '';
    const last = await sb.from('punch_items').select('item_no').eq('drawing_id', drawingId).order('item_no', { ascending: false, nullsFirst: false }).limit(1);
    const dup = await sb.from('punch_items').select('*').eq('source_key', fpKey).maybeSingle();    // เคย insert สำเร็จแต่คำตอบหาย → ใช้รายการเดิม
    if (dup.error) throw dup.error;
    const ins = dup.data ? { data: dup.data } : await sb.from('punch_items').insert({ source_key: fpKey, drawing_id: drawingId, item_no: (last.data?.[0]?.item_no || 0) + 1, deficiency: def, category: f.cat, discipline: f.disc || null,
      status: 'open', punch_by: me.name, punch_date: today(), input_date: today(), created_by: me.id }).select().single();
    if (ins.error) throw ins.error; item = ins.data;
  } catch (e) {                                                              // ยังไม่ได้บันทึก → คงข้อมูลในฟอร์มและร่างไว้
    formMsg(isNetErr(e) ? 'Not saved — connection problem. Your entry is kept; try again when you have signal.' : 'Could not save: ' + friendlyErr(e), false);
    btns.forEach(b => b.disabled = false); return;
  }
  addPhrasesFrom(def).catch(() => {});                                       // item บันทึกแล้ว → เพิ่มข้อความใหม่เข้าชุดร่วม (best-effort)
  let photoErr = '';
  if (fpPicker.files.length) {
    const sendFiles = [...fpPicker.files];
    try {
      const paths = await uploadPhotos(sendFiles, `items/${item.id}`, (n, t) => formMsg(`Uploading photos ${n}/${t}…`));
      const r = await sb.from('punch_rounds').insert({ punch_item_id: item.id, round_no: 1, kind: 'defect', photo_paths: paths, by_user: me.id, by_name: me.name });
      if (r.error) throw r.error;
    } catch (e) { photoErr = friendlyErr(e); fpHeld.set(item.id, sendFiles); }   // เก็บรูปไว้ในหน่วยความจำ ส่งซ้ำจากแผงรายการ (หายถ้าโหลดหน้าใหม่)
  }
  btns.forEach(b => b.disabled = false);
  FieldDraft.clear(tpId, 'punch'); fpKey = newKey();
  FieldDraft.set(tpId, 'lastDrawing', String(drawingId));                   // จำ drawing ล่าสุด ครั้งหน้าเปิดฟอร์มมาเลือกไว้แล้ว
  const savedNo = `Saved #${dNo ? dNo + '-' : ''}${item.item_no ?? ''}`;
  try { await reloadItems(); } catch { /* บันทึกสำเร็จแล้ว — แสดงสถานะไม่ทราบแทน */ }
  renderAll();
  const keep = { drawing: f.drawing, cat: f.cat, disc: f.disc };
  if (keepOpen) {
    const d = await sb.from('drawings').select('id,drawing_no').eq('test_pack_id', tpId).order('drawing_no'); fpDrawings = d.data || [];
    fillDrawings(newNo ? fpDrawings.find(x => x.drawing_no === newNo)?.id : keep.drawing); $('fpNewDrawing').value = ''; $('fpDef').value = ''; fpPicker.clear(); setCat(keep.cat); $('fpDisc').value = keep.disc || '';
    formMsg(photoErr ? `${savedNo}, but the photos were not sent: ${photoErr}. The photos are kept — no need to retake. Tap the item in the list and press Send. They are lost if you reload the page.` : `${savedNo}. Add the next one.`, photoErr ? false : true); $('fpDef').focus();
  } else {
    formMsg(savedNo, true);
    window.jQuery('#fpModal').modal('hide');
    if (photoErr) alert(`Punch item saved, but the photos were not sent: ${photoErr}\n\nThe photos are kept — no need to retake. Tap the item in the list and press Send.\nThey are lost if you reload the page.`);
  }
  paintHeld();
}

// แผงเล็กของรายการ punch: เห็นเลข/สถานะ/รูปเดิม + เพิ่มรูป (บันทึกเป็นรอบ 'defect' เหมือนปุ่ม Add Photos ใน punch_detail.js)
let fpItemPicker = null, fpCur = null;
const itemMsg = (t, ok) => { const e = $('fpItemMsg'); e.textContent = t; e.className = 'small mr-auto ' + (ok === true ? 'text-success' : ok === false ? 'text-danger' : 'text-muted'); };
async function openItem(id) {
  const it = fpItems.find(x => x.id === id); if (!it) return;
  fpCur = it;
  $('fpItemTitle').textContent = `${it.drawing_no} #${it.item_no ?? ''}`;
  const fixed = it.status === 'open' && it.fix_pending;
  $('fpItemBody').innerHTML = `<div class="mb-2"><span class="badge badge-${CAT_CLS[it.category] || 'light'} fd-cat">${esc(it.category || '')}</span>
      <span class="badge-status ${fixed ? 'bg-s-fixed' : (STATUS[it.status]?.cls || '')}">${esc(fixed ? 'Fix submitted' : (STATUS[it.status]?.label || it.status))}</span>
      <span class="small text-muted ml-1">${esc(it.discipline || '')}</span></div>
    <div class="mb-3 fd-desc">${esc(it.deficiency)}</div>
    <label>Photos</label><div id="fpItemOld" class="pk-thumbs mb-3"><span class="small text-muted">Loading…</span></div>
    ${canQC ? '<label>Add photos</label><div id="fpItemPhotos"></div>' : '<div class="small text-muted">View only.</div>'}`;
  $('fpItemSave').classList.toggle('d-none', !canQC); itemMsg('');
  fpItemPicker = canQC ? makePicker($('fpItemPhotos')) : null;
  const held = fpHeld.get(id);                                              // รูปที่ส่งไม่สำเร็จก่อนหน้า → ใส่กลับใน picker ไม่ต้องถ่ายใหม่
  if (canQC && held?.length) { fpItemPicker.addFiles(held); itemMsg(`${held.length} photo${held.length > 1 ? 's' : ''} waiting to send — press Send. (Kept only until you reload the page.)`, false); }
  window.jQuery('#fpItemModal').modal({ show: true });
  try {
    const r = await sb.from('punch_rounds').select('photo_paths').eq('punch_item_id', id).order('created_at');
    if (r.error) throw r.error;
    const paths = (r.data || []).flatMap(x => x.photo_paths || []), urls = (await signed(paths)).filter(Boolean);
    if (fpCur !== it) return;                                               // เปลี่ยนไปเปิดรายการอื่นแล้ว
    $('fpItemOld').innerHTML = urls.length ? urls.map((u, n) => `<a class="pk-thumb" href="${esc(u)}" target="_blank" rel="noopener"><img src="${esc(u)}" alt="Photo ${n + 1}"></a>`).join('') : '<span class="small text-muted">No photos yet.</span>';
  } catch (e) { $('fpItemOld').innerHTML = `<span class="small text-danger">Could not load photos: ${esc(friendlyErr(e))}</span>`; }
}
async function saveItemPhotos() {
  const it = fpCur; if (!it || !fpItemPicker) return;
  if (!fpItemPicker.files.length) { fpHeld.delete(it.id); paintHeld(); renderPunchField(); return itemMsg('Take or choose a photo first.', false); }
  const sendFiles = [...fpItemPicker.files];
  const b = $('fpItemSave'); b.disabled = true; itemMsg('Uploading…');
  try {
    const paths = await uploadPhotos(sendFiles, `items/${it.id}`, (n, t) => itemMsg(`Uploading photos ${n}/${t}…`));
    const lr = await sb.from('punch_rounds').select('round_no').eq('punch_item_id', it.id).order('round_no', { ascending: false }).limit(1);   // เลขรอบถัดไปแบบเดียวกับ punch_detail.js (defect = รอบสุดท้าย + 1)
    if (lr.error) throw lr.error;
    const r = await sb.from('punch_rounds').insert({ punch_item_id: it.id, round_no: (lr.data?.[0]?.round_no || 0) + 1, kind: 'defect', photo_paths: paths, by_user: me.id, by_name: me.name });
    if (r.error) throw r.error;
    fpHeld.delete(it.id); paintHeld(); renderPunchField();                  // ส่งสำเร็จ → ไม่ค้างในหน่วยความจำ
    b.disabled = false; await openItem(it.id); itemMsg(`Added ${paths.length} photo${paths.length > 1 ? 's' : ''}.`, true);
  } catch (e) {
    b.disabled = false; fpHeld.set(it.id, sendFiles); paintHeld(); renderPunchField();
    itemMsg((isNetErr(e) ? 'Not sent — connection problem. ' : 'Could not add photos: ' + friendlyErr(e) + '. ') + 'Your photos are kept here — no need to retake; press Send again. They are lost if you reload the page.', false);
  }
}
// รูปที่ส่งไม่สำเร็จหลัง item บันทึกแล้ว (key = punch item id) — เก็บในหน่วยความจำเท่านั้น (ไม่ใช้ IndexedDB) หายเมื่อโหลดหน้าใหม่
const fpHeld = new Map();
function paintHeld() {
  let bar = $('fpHeldBar');
  if (!bar) { $('fpDraftBar').insertAdjacentHTML('afterend', '<div id="fpHeldBar" class="alert alert-warning d-none" role="status"></div>'); bar = $('fpHeldBar'); }
  const n = [...fpHeld.values()].reduce((s, a) => s + a.length, 0);
  bar.classList.toggle('d-none', !n);
  if (n) bar.innerHTML = `<i class="fas fa-camera"></i> ${n} photo${n > 1 ? 's' : ''} waiting to send${navigator.onLine ? '' : ' — will be possible when you are back online'}. Tap the item marked "waiting to send" in the list, then press Send. They are kept only until you reload the page.`;
}

// ---------- วาดทั้งหน้า ----------
function renderAll() {
  renderHead(); renderPretestField(); renderPunchField();
  if (!Object.keys(pending).length && !FieldDraft.get(tpId, 'punch')) $('fpDraftBar').classList.add('d-none');
}

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
  $('fpPressureLink').href = `test_package.php?id=${tpId}#tab-pressure`; $('fpSignLink').href = `test_package.php?id=${tpId}#tab-signoff`; $('fpReportLink').href = `punch_report.php?id=${tpId}`;
  document.title = `${tp.test_pack_no} · Field | BJCHI QA/QC`;
  $('fpPage').classList.remove('d-none');
  watchOnline($('fpNet'), flushPending);
  loadPhrases().then(() => { if ($('fpQuick')) paintQuick(); });             // ชุดข้อความร่วม (ไม่มีตาราง/ออฟไลน์ → ใช้แคช/ของเครื่อง ไม่ error · ไม่รอ ไม่บล็อกหน้า)
  window.addEventListener('online', paintHeld); window.addEventListener('offline', paintHeld);   // กลับมาออนไลน์ → ชี้ว่ายังมีรูปค้างให้กด Send
  renderAll(); bindPretestField(); showDraftBar();
  $('fpAdd').addEventListener('click', openForm);
  $('fpPunchBody').addEventListener('click', (e) => { const b = e.target.closest('[data-item]'); if (b) openItem(+b.dataset.item); });
  $('fpItemSave').addEventListener('click', saveItemPhotos);
  $('fpSave').addEventListener('click', () => saveForm(false)); $('fpSaveMore').addEventListener('click', () => saveForm(true));
  $('fpModalBody').addEventListener('input', saveDraft); $('fpModalBody').addEventListener('change', saveDraft);   // ร่างฟอร์ม punch บันทึกทุกครั้งที่พิมพ์/เลือก
  flushPending();                                                            // มีคำตอบค้างและตอนนี้ออนไลน์อยู่ → ส่งเลย
}
init().catch(alertErr);
