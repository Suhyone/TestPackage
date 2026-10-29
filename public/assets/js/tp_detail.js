// ===================================================================
// tp_detail.js — หน้ารายละเอียด Test Package 1 ใบ (test_package.php?id=...)
//   แท็บที่ใช้งานได้ : Info (Sheet1) · Contents + ISO / Spool (ตรรกะอยู่ใน tp_data.js) · Pre-test (Sheet5 — tp_pretest.js) · Punch (หัวใบ Sheet6 + รายการ punch) · Sign-off (ลายเซ็น Sheet1 + Sheet6)
//   Pressure test    : บันทึกผลทดสอบแรงดัน + gate ล็อกการทดสอบ (ตรรกะอยู่ใน tp_pressure.js)
//   ตารางที่ใช้      : test_packs (Info + ลายเซ็น Sheet1) · punch_reports (หัวใบ + ลายเซ็น Sheet6) · projects · v_punch_items
//   สิทธิ์           : QC / admin แก้และบันทึกได้ · เจ้าหน้าที่ดูอย่างเดียว (บังคับซ้ำที่ RLS ในฐานข้อมูล)
//   พึ่งพา           : punch_common.js ($, STATUS, CAT_CLS, alertErr), tp_common.js (PSTATE, punchState, stateBadge), app.js (sb, appReady, esc, fmtDate)
// ===================================================================

// id ของ pack จาก URL · me/canQC = ผู้ใช้และสิทธิ์ · tp/project/report/items = ข้อมูลที่โหลดมา
const tpId = Number(new URLSearchParams(location.search).get('id'));
let me, canQC = false, tp = null, project = null, report = null, items = [];

// ---------- นิยามฟอร์ม (ป้ายข้อความตรงกับชื่อช่องในฟอร์ม Excel) ----------
// f = ชื่อคอลัมน์ · t = ตาราง (tp = test_packs, rp = punch_reports) · ro = แก้ไม่ได้ · type = ชนิด input · w = ความกว้างคอลัมน์ bootstrap
const INFO_SECTIONS = [
  { title: 'General', fields: [
    { f: 'project_no', t: 'tp', label: 'Project No.', ro: true }, { f: '_project_name', label: 'Project name', ro: true }, { f: '_client', label: 'Client', ro: true },
    { f: 'module_no', t: 'tp', label: 'Block / Module No.' }, { f: 'location', t: 'tp', label: 'Location' }, { f: 'test_pack_no', t: 'tp', label: 'Test Package No.', ro: true },
    { f: 'piping_system', t: 'tp', label: 'Piping system' }, { f: 'piping_name', t: 'tp', label: 'Piping name' }, { f: 'pid_no', t: 'tp', label: 'P&ID No.' } ] },
  { title: 'Test conditions', fields: [
    { f: 'test_medium', t: 'tp', label: 'Test medium' }, { f: 'test_pressure', t: 'tp', label: 'Test pressure (bar g)' }, { f: 'holding_time_min', t: 'tp', label: 'Holding time (min)', type: 'number' },
    { f: 'design_pressure', t: 'tp', label: 'Design pressure (MPag / bar)' }, { f: 'design_temp', t: 'tp', label: 'Design temp. (°C)' }, { f: 'fluid_code', t: 'tp', label: 'Fluid code' },
    { f: 'pipe_material', t: 'tp', label: 'Pipe material' }, { f: 'insulation_spec', t: 'tp', label: 'Insulation spec.' }, { f: 'insulation_thk', t: 'tp', label: 'Insulation thk. (mm)' } ] },
  { title: 'Document revision', fields: [
    { f: 'rev_no', t: 'tp', label: 'Rev.' }, { f: 'rev_description', t: 'tp', label: 'Description' }, { f: 'rev_date', t: 'tp', label: 'Date', type: 'date' },
    { f: 'prepared_by', t: 'tp', label: 'Prepared by' }, { f: 'review_by', t: 'tp', label: 'Review by' }, { f: 'approved_by', t: 'tp', label: 'Approved by' } ] },
];
// หัวใบ PROCESS PUNCH-LIST (Sheet6) ที่แสดงในแท็บ Punch
const PUNCH_FIELDS = [
  { f: 'inspection_date', t: 'rp', label: "Inspection date", type: 'date', w: 3 }, { f: 'process_discipline', t: 'rp', label: 'Process discipline', w: 3 },
  { f: 'test_stage', t: 'rp', label: 'Test stage', w: 3 }, { f: 'pages', t: 'rp', label: 'Pages', w: 3 },
];
// ลายเซ็น: Test Package (Sheet1) = ชื่อ+วันที่ · ใบ Punch List (Sheet6) = ชื่อ+ตำแหน่ง+วันที่
const SIGN_SECTIONS = [
  { title: 'Test package sign-off (Pressure Test Information)', cols: [
    { head: 'Prepared by', sub: 'BJCHI Engineering', sig: ['signed_prepared_sig', 'tp'], fields: [['signed_prepared_name', 'Name', 'tp'], ['signed_prepared_date', 'Date', 'tp', 'date']] },
    { head: 'Test / Inspector by', sub: 'BJCHI QC / Inspector', sig: ['signed_inspector_sig', 'tp'], fields: [['signed_inspector_name', 'Name', 'tp'], ['signed_inspector_date', 'Date', 'tp', 'date']] },
    { head: 'Testing approved by', sub: 'CIMTAS representative', sig: ['signed_approved_sig', 'tp'], fields: [['signed_approved_name', 'Name', 'tp'], ['signed_approved_date', 'Date', 'tp', 'date']] } ] },
  { title: 'Punch-list sign-off (Review & Witness)', cols: [
    { head: 'Completed by', sub: '', sig: ['completed_sig', 'rp'], fields: [['completed_name', 'Name', 'rp'], ['completed_position', 'Position', 'rp'], ['completed_date', 'Date', 'rp', 'date']] },
    { head: 'BJCHI', sub: '', sig: ['bjchi_sig', 'rp'], fields: [['bjchi_name', 'Name', 'rp'], ['bjchi_position', 'Position', 'rp'], ['bjchi_date', 'Date', 'rp', 'date']] },
    { head: 'CIMTAS', sub: '', sig: ['cimtas_sig', 'rp'], fields: [['cimtas_name', 'Name', 'rp'], ['cimtas_position', 'Position', 'rp'], ['cimtas_date', 'Date', 'rp', 'date']] },
    { head: 'Representative', sub: '', sig: ['representative_sig', 'rp'], fields: [['representative_name', 'Name', 'rp'], ['representative_position', 'Position', 'rp'], ['representative_date', 'Date', 'rp', 'date']] } ] },
];
// ---------- ตัวช่วย ----------
// สร้างช่อง input 1 ช่อง (data-t / data-f ใช้ตอนรวบรวมค่าไปบันทึก) · ค่าอ่านจากแถวข้อมูลที่ตรงกับตาราง
function inputHtml({ f, t, label, type = 'text', ro = false, w = 4 }, value, idPrefix = 'f_') {
  const dis = (!canQC || ro) ? ' disabled' : '';
  const attrs = t ? ` data-t="${t}" data-f="${f}"${type === 'number' ? ' data-num="1"' : ''}` : '';
  return `<div class="form-group col-md-${w}"><label for="${idPrefix}${f}" class="small mb-1">${esc(label)}</label>
    <input id="${idPrefix}${f}" class="form-control form-control-sm" type="${type}"${type === 'number' ? ' step="any"' : ''}${attrs} value="${esc(value ?? '')}"${dis}></div>`;
}
// ค่าของช่องในแถวข้อมูล: ช่องพิเศษ _project_name / _client มาจากตาราง projects
const valueOf = (t, f) => f === '_project_name' ? project?.project_name : f === '_client' ? project?.client : (t === 'rp' ? report?.[f] : tp?.[f]);
// รวบรวมค่าจากฟอร์มตามตาราง (ว่าง = null · ช่องตัวเลขแปลงเป็นตัวเลข) — ข้ามช่อง *_sig: path ลายเซ็นบันทึกแยกผ่าน saveSigPath แล้ว กัน Save sign-off เอาค่าเก่าไปทับ (เช่นเปิดสองแท็บ)
function collect(form, t) {
  const out = {};
  form.querySelectorAll(`[data-t="${t}"]:not(:disabled):not([data-f$="_sig"])`).forEach(el => {
    const v = el.value.trim();
    out[el.dataset.f] = v === '' ? null : (el.dataset.num ? Number(v) : v);
  });
  return out;
}
// แสดงข้อความผลการบันทึกใต้ปุ่ม (ok = สีเขียว, ไม่ใช่ = สีแดง)
function setMsg(id, text, ok = true) { const e = $(id); e.textContent = text; e.className = 'small ' + (ok ? 'text-success' : 'text-danger'); }
// บันทึกใบ Punch List (สร้างแถวถ้ายังไม่มี) — ใช้ร่วมกันระหว่างแท็บ Punch และ Sign-off
async function saveReport(patch) {
  const { data, error } = await sb.from('punch_reports').upsert({ test_pack_id: tpId, ...patch, updated_at: new Date().toISOString() }, { onConflict: 'test_pack_id' }).select().single();
  if (error) throw error;
  report = data;
}
// บันทึกลง test_packs
async function saveTp(patch) {
  const { data, error } = await sb.from('test_packs').update(patch).eq('id', tpId).select().single();
  if (error) throw error;
  tp = data;
}

// ---------- วาดหน้า ----------
// ส่วนหัว: ชื่อ pack, รายละเอียดสั้น, ป้ายสถานะ punch และจำนวนแยกตามประเภท
function counts() {
  const live = items.filter(i => i.status !== 'cancelled');
  const open = live.filter(i => i.status === 'open');
  return { items_total: live.length, items_open: open.length, open_a: open.filter(i => i.category === 'A').length,
           open_b: open.filter(i => i.category === 'B').length, items_closed: live.filter(i => i.status === 'close').length };
}
function renderHead() {
  const c = counts();
  document.title = `${tp.test_pack_no} · Test Package | BJCHI QA/QC`;
  $('crumbNo').textContent = tp.test_pack_no; $('hNo').textContent = tp.test_pack_no;
  $('hSub').textContent = [tp.module_no && `Module ${tp.module_no}`, tp.piping_system && `System ${tp.piping_system}`, tp.piping_name].filter(Boolean).join(' · ');
  $('hState').innerHTML = stateBadge(punchState(c)) + pressureBadge();
  const pill = (n, label, cls) => `<span class="badge-status ${cls}">${label} ${n}</span>`;
  $('hCounts').innerHTML = pill(c.open_a, 'Open A', 'bg-s-rework') + pill(c.open_b, 'Open B', 'bg-s-fixed') + pill(c.items_closed, 'Closed', 'bg-s-approved') + pill(c.items_total, 'Total', 'bg-s-all');
}
// แท็บ Info: ฟอร์มข้อมูล Sheet1 แบ่ง 3 กลุ่ม
function renderInfo() {
  $('infoFields').innerHTML = INFO_SECTIONS.map(s => `<h6 class="text-muted small text-uppercase mt-3 mb-2">${esc(s.title)}</h6>
    <div class="form-row">${s.fields.map(fd => inputHtml(fd, valueOf(fd.t, fd.f))).join('')}</div>`).join('');
  $('infoSave').classList.toggle('d-none', !canQC);
}
// แท็บ Punch: หัวใบ + ตารางรายการ + ลิงก์ไปหน้า Punch List (กรองด้วยเลข pack)
function renderPunch() {
  $('punchFields').innerHTML = PUNCH_FIELDS.map(fd => inputHtml(fd, valueOf(fd.t, fd.f), 'p_')).join('');
  $('punchSave').classList.toggle('d-none', !canQC);
  $('punchReport').href = 'punch_report.php?id=' + tpId;
  $('hField').href = 'field_pack.php?id=' + tpId;
  $('punchLink').href ='qc_list.php?tp=' + encodeURIComponent(tp.test_pack_no);
  $('punchAdd').href = 'qc_list.php?add=1&tp=' + encodeURIComponent(tp.test_pack_no);
  $('punchAdd').classList.toggle('d-none', !canQC);
  const cat = (c) => c ? `<span class="badge badge-${CAT_CLS[c] || 'light'}">${esc(c)}</span>` : '';
  $('punchRows').innerHTML = items.map(i => `<tr>
    <td>${esc(i.item_no ?? '')}</td><td>${esc(i.drawing_no)}</td><td class="pl-desc">${esc(i.deficiency)}</td>
    <td class="text-center">${cat(i.category)}</td>
    <td class="text-center"><span class="badge-status ${STATUS[i.status]?.cls || ''}">${esc(STATUS[i.status]?.label || i.status)}</span></td>
    <td>${esc(i.bjc_by)}</td><td>${esc(i.qci_by)}</td><td>${esc(i.client_by)}</td></tr>`).join('');
  $('punchEmpty').textContent = items.length ? '' : 'No punch items for this package yet.';
  $('punchTable').classList.toggle('d-none', !items.length);
}
// แท็บ Sign-off: ลายเซ็น 2 ชุด
function renderSign() {
  $('signFields').innerHTML = SIGN_SECTIONS.map(s => `<h6 class="text-muted small text-uppercase mt-3 mb-2">${esc(s.title)}</h6>
    <div class="form-row">${s.cols.map(col => `<div class="col-md-${12 / s.cols.length} mb-2">
      <div class="border rounded p-2 h-100"><div class="font-weight-bold small">${esc(col.head)}</div>${col.sub ? `<div class="small text-muted mb-1">${esc(col.sub)}</div>` : '<div class="mb-1"></div>'}
      <div class="form-row">${col.fields.map(([f, label, t, type]) => inputHtml({ f, t, label, type: type || 'text', w: 12 }, valueOf(t, f), 's_')).join('')}</div>${col.sig && sigEnabled() ? sigBoxHtml(...col.sig) : ''}</div></div>`).join('')}</div>`).join('');
  loadSigPreviews();
  $('signSave').classList.toggle('d-none', !canQC);
}
// แท็บ Pressure test (ชื่อฟังก์ชันเดิม — ถูกเรียกทุกครั้งที่ punch / pre-test เปลี่ยน เพื่อให้ gate อัปเดต)
function renderSoon() { renderPressure(); }

// ---------- เหตุการณ์ ----------
// ปุ่มบันทึกของแต่ละฟอร์ม (Info / Punch / Sign-off) — บันทึกเฉพาะช่องที่แก้ไขได้ แล้วแจ้งผล
function bindForms() {
  $('infoForm').addEventListener('submit', async (e) => {
    e.preventDefault(); $('infoSave').disabled = true; setMsg('infoMsg', 'Saving…');
    try { await saveTp(collect($('infoForm'), 'tp')); renderHead(); renderSoon(); setMsg('infoMsg', 'Saved'); }
    catch (err) { setMsg('infoMsg', 'Could not save: ' + friendlyErr(err), false); }
    finally { $('infoSave').disabled = false; }
  });
  $('punchForm').addEventListener('submit', async (e) => {
    e.preventDefault(); $('punchSave').disabled = true; setMsg('punchMsg', 'Saving…');
    try { await saveReport(collect($('punchForm'), 'rp')); setMsg('punchMsg', 'Saved'); }
    catch (err) { setMsg('punchMsg', 'Could not save: ' + friendlyErr(err), false); }
    finally { $('punchSave').disabled = false; }
  });
  $('signForm').addEventListener('submit', async (e) => {
    e.preventDefault(); $('signSave').disabled = true; setMsg('signMsg', 'Saving…');
    try { await saveTp(collect($('signForm'), 'tp')); await saveReport(collect($('signForm'), 'rp')); setMsg('signMsg', 'Saved'); }
    catch (err) { setMsg('signMsg', 'Could not save: ' + friendlyErr(err), false); }
    finally { $('signSave').disabled = false; }
  });
  // จำแท็บที่เปิดไว้ใน URL (#punch ฯลฯ) เพื่อรีเฟรช/ส่งลิงก์แล้วกลับมาที่แท็บเดิม
  window.jQuery('#tpTabs a[data-toggle="tab"]').on('shown.bs.tab', (e) => history.replaceState(null, '', e.target.getAttribute('href')));
  const h = location.hash;
  if (h && document.querySelector(`#tpTabs a[href="${h.replace(/[^#\w-]/g, '')}"]`)) window.jQuery(`#tpTabs a[href="${h.replace(/[^#\w-]/g, '')}"]`).tab('show');
}

// โหลดรายการ punch ของ pack ใหม่ (ถ้ายังไม่มี view ใช้ตารางตรง) — ใช้ตอนเปิดหน้าและหลัง checklist ออก/ยกเลิก punch
async function reloadItems() {
  const its = await sb.from('v_punch_items').select('*').eq('test_pack_id', tpId).order('item_no').order('id');
  if (its.error) {
    const alt = await sb.from('punch_items').select('*, drawings!inner(drawing_no,test_pack_id)').eq('drawings.test_pack_id', tpId).order('item_no').order('id');
    items = (alt.data || []).map(({ drawings: d, ...r }) => ({ ...r, drawing_no: d.drawing_no }));
  } else items = its.data || [];
}

// ---------- เริ่มหน้า ----------
// โหลด pack + โครงการ + ใบ punch + รายการ punch (ถ้ายังไม่มี view ใช้ตารางตรง) แล้ววาดทุกแท็บ
async function init() {
  ({ me } = await appReady);
  canQC = me.role === 'qc' || me.role === 'admin';
  if (!canQC) $('tpTabs').insertAdjacentHTML('beforebegin', '<div class="small text-muted mb-2" role="status"><i class="fas fa-eye" aria-hidden="true"></i> View only — QC / admin can edit.</div>');
  if (!tpId) return $('notFound').classList.remove('d-none');
  const { data, error } = await sb.from('test_packs').select('*').eq('id', tpId).maybeSingle();
  if (error || !data) return $('notFound').classList.remove('d-none');
  tp = data;
  if (!('module_no' in tp)) $('setupMsg').classList.remove('d-none');       // ยังไม่ได้รัน sql/05 → ช่องของ Sheet1 ยังไม่มี

  const [proj, rep] = await Promise.all([
    sb.from('projects').select('*').eq('project_no', tp.project_no).maybeSingle(),
    sb.from('punch_reports').select('*').eq('test_pack_id', tpId).maybeSingle(),
    reloadItems(), loadPretest(), loadData(), loadPressure(),
  ]);
  project = proj.data || null; report = rep.data || null;

  renderHead(); renderInfo(); renderPunch(); renderSign(); renderPretest(); renderData(); renderSoon(); bindForms(); bindPretest(); bindData(); bindPressure(); bindSignature();
  $('tpHead').classList.remove('d-none');
}
// เริ่มทำงานของหน้า
init().catch(alertErr);
