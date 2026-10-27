// ===================================================================
// tp_pressure.js — แท็บ Pressure test ของหน้ารายละเอียด Test Package: บันทึกผลทดสอบแรงดัน + gate ล็อกการทดสอบ
//   gate (ห้ามบันทึกการทดสอบ): มี punch Category A ที่ยัง Open · หรือ Pre-test ยังไม่ผ่าน (ตอบไม่ครบ / มี NO / ดึงสถานะไม่ได้)
//        Category B ที่ Open ไม่ล็อก (ตามดุลยพินิจ PM) แต่แสดงเป็นคำเตือน
//        หน้าเว็บตรวจเพื่อแสดงเหตุผล — ตัวบังคับจริงคือ trigger ใน sql/12_pressure_test.sql (เรียก API ตรงก็ข้ามไม่ได้)
//   บันทึกได้หลายครั้งต่อ pack (attempt) เช่น FAIL แล้วทดสอบซ้ำ · PASS ต้องมีค่าที่อ่านได้ถึงความดันทดสอบและค้างครบเวลา · ใบสอบเทียบเกจต้องไม่หมดอายุก่อนวันทดสอบ
//   ตารางที่ใช้ : pressure_tests (sql/12)   สิทธิ์: QC / admin บันทึกได้ · คนอื่นดูอย่างเดียว (บังคับซ้ำที่ RLS)
//   พึ่งพา      : tp_detail.js (tp, me, canQC, tpId, counts, renderHead) · tp_pretest.js (pretest, pretestSummary) · punch_common.js ($, today) · app.js (sb, esc, fmtDate, friendlyErr)
//   ต้องโหลดก่อน tp_detail.js (tp_detail.js เรียก loadPressure / renderPressure / bindPressure / pressureBadge)
// ===================================================================

// tests = ผลที่บันทึกแล้ว (attempt เรียงใหม่→เก่า) · missing = true เมื่อยังไม่ได้รัน sql/12 · openForm = เปิดฟอร์มบันทึกครั้งใหม่อยู่ไหม
const pressure = { tests: [], missing: false, openForm: false };

async function loadPressure() {
  const { data, error } = await sb.from('pressure_tests').select('*').eq('test_pack_id', tpId).order('attempt_no', { ascending: false });
  pressure.missing = !!error; pressure.tests = data || [];
}
const passedTest = () => pressure.tests.find(t => t.result === 'pass');
// ป้ายผลทดสอบแรงดันข้างป้ายสถานะ punch ในหัวหน้า
function pressureBadge() {
  if (pressure.missing || !pressure.tests.length) return '';
  const p = passedTest();
  return p ? ` <span class="badge-status bg-s-approved" title="Pressure test passed on ${esc(fmtDate(p.test_date))}"><i class="fas fa-check"></i> Test passed</span>`
           : ` <span class="badge-status bg-s-rework" title="Last pressure test failed — retest required"><i class="fas fa-times"></i> Test failed</span>`;
}

// เหตุผลที่ยังทดสอบไม่ได้ (รายการว่าง = ทดสอบได้) พร้อมแท็บที่ต้องไปแก้
function pressureGate() {
  const c = counts(), ps = pretestSummary(), why = [];
  if (c.open_a > 0) why.push({ text: `${c.open_a} Category A punch item${c.open_a > 1 ? 's are' : ' is'} still open.`, tab: 'punch', go: 'Open Punch tab' });
  if (!pretest.missing && !pretest.tpl.length) why.push({ text: 'The pre-test checklist template is empty.', tab: 'pretest', go: 'Open Pre-test tab' });
  else if (pretest.missing) why.push({ text: 'Pre-test status is unavailable, so the checklist cannot be confirmed.', tab: 'pretest', go: 'Open Pre-test tab' });
  else if (ps.no) why.push({ text: `The pre-test checklist has ${ps.no} item${ps.no > 1 ? 's' : ''} answered NO.`, tab: 'pretest', go: 'Open Pre-test tab' });
  else if (ps.unanswered) why.push({ text: `The pre-test checklist is incomplete (${ps.total - ps.unanswered} of ${ps.total} answered).`, tab: 'pretest', go: 'Open Pre-test tab' });
  return { ok: !why.length, why, openB: c.open_b };
}

const num = (v) => { const n = parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(n) ? n : null; };
const fmtN = (v) => v == null ? '–' : String(+v);
// ค่า input ในฟอร์ม
const pv = (id) => { const e = $(id); return e ? e.value.trim() : ''; };

function renderPressure() {
  const box = $('tab-pressure');
  if (pressure.missing) {
    box.innerHTML = `<div class="alert alert-warning py-2 small" role="status">Run <code>sql/12_pressure_test.sql</code> in the Supabase SQL Editor to enable pressure test records.</div>`;
    return;
  }
  const g = pressureGate(), p = passedTest(), req = { bar: num(tp.test_pressure), min: num(tp.holding_time_min) };

  const status = !g.ok
    ? `<div class="alert alert-danger py-2 small mb-3" role="status"><div><i class="fas fa-lock"></i> <b>Pressure test is locked.</b></div><ul class="mb-0 pl-3">${g.why.map(w => `<li>${esc(w.text)} <a href="#tab-${w.tab}" data-goto="${w.tab}">${esc(w.go)}</a></li>`).join('')}</ul></div>`
    : p
    ? `<div class="alert alert-success py-2 small mb-3" role="status"><i class="fas fa-check-circle"></i> <b>Pressure test passed</b> on ${esc(fmtDate(p.test_date))} (attempt ${p.attempt_no}).</div>`
    : `<div class="alert alert-success py-2 small mb-3" role="status"><i class="fas fa-unlock"></i> <b>Ready for pressure test.</b> No Category A punch is open and the pre-test checklist is complete.${g.openB ? ` ${g.openB} Category B item${g.openB > 1 ? 's' : ''} still open — proceed at the project manager's discretion.` : ''}</div>`;

  const rows = pressure.tests.map(t => `<tr${t.result === 'pass' ? ' class="table-success"' : ''}>
    <td>${t.attempt_no}</td><td>${esc(fmtDate(t.test_date))}</td><td>${esc(t.test_type === 'hydro' ? 'Hydro' : t.test_type === 'pneumatic' ? 'Pneumatic' : '')}</td>
    <td>${fmtN(t.required_pressure)}</td><td>${fmtN(t.max_reading)}</td><td>${fmtN(t.end_reading)}</td><td>${fmtN(t.holding_time_min)}</td>
    <td>${esc(t.gauge_id)}<div class="small text-muted">Cal. due ${esc(fmtDate(t.gauge_cal_due))}</div></td>
    <td><span class="badge-status ${t.result === 'pass' ? 'bg-s-approved' : 'bg-s-rework'}">${t.result === 'pass' ? 'PASS' : 'FAIL'}</span></td>
    <td class="text-left">${esc(t.tested_by || '')}${t.witnessed_by ? `<div class="small text-muted">Witness: ${esc(t.witnessed_by)}</div>` : ''}${t.remarks ? `<div class="small">${esc(t.remarks)}</div>` : ''}</td></tr>`).join('');
  const history = `<h6 class="text-muted small text-uppercase mb-2">Test attempts</h6>
    <div class="table-responsive"><table class="table table-sm table-bordered mb-3"><thead><tr><th>#</th><th>Date</th><th>Type</th><th>Required (bar g)</th><th>Max reading</th><th>End reading</th><th>Held (min)</th><th>Gauge</th><th>Result</th><th class="text-left">Tested by / Remarks</th></tr></thead>
    <tbody>${rows || '<tr><td colspan="10" class="text-muted">No pressure test recorded yet.</td></tr>'}</tbody></table></div>`;

  let form = '';
  if (canQC && g.ok) {
    if (p && !pressure.openForm) form = `<button type="button" class="btn btn-sm btn-outline-info" id="prMore"><i class="fas fa-plus"></i> Record another attempt</button>`;
    else form = pressureFormHtml(req);
  } else if (!canQC) form = '<div class="small text-muted">View only — QC / admin can record the test.</div>';
  box.innerHTML = status + history + form + '<div class="small mt-2" id="prMsg" role="status" aria-live="polite"></div>';
}

// ฟอร์มบันทึกครั้งใหม่: ค่าตั้งต้นจากเงื่อนไขของ pack (Info) และตัวผู้ใช้
function pressureFormHtml(req) {
  const guess = /water|hydro/i.test(tp.test_medium || '') ? 'hydro' : /n2|nitrogen|air|pneum/i.test(tp.test_medium || '') ? 'pneumatic' : '';
  const next = Math.max(0, ...pressure.tests.map(t => t.attempt_no)) + 1;
  const f = (id, label, type = 'text', val = '', w = 3, extra = '') => `<div class="form-group col-md-${w} mb-2"><label for="${id}" class="small mb-1">${label}</label>
    <input id="${id}" class="form-control form-control-sm" type="${type}"${type === 'number' ? ' step="any" inputmode="decimal"' : ''} value="${esc(val)}" ${extra}></div>`;
  return `<form id="prForm" autocomplete="off" novalidate class="border rounded p-3">
    <h6 class="mb-1">Record pressure test — attempt ${next}</h6>
    <div class="small text-muted mb-3">Required: <b>${req.bar != null ? req.bar + ' bar g' : 'not set in the Info tab'}</b> · hold <b>${req.min != null ? req.min + ' min' : 'not set'}</b></div>
    <div class="form-row">
      ${f('pr_date', 'Test date *', 'date', today(), 3)}
      <div class="form-group col-md-3 mb-2"><label for="pr_type" class="small mb-1">Test type *</label><select id="pr_type" class="form-control form-control-sm">
        <option value="">Select…</option><option value="hydro"${guess === 'hydro' ? ' selected' : ''}>Hydrostatic</option><option value="pneumatic"${guess === 'pneumatic' ? ' selected' : ''}>Pneumatic</option></select></div>
      ${f('pr_medium', 'Test medium', 'text', tp.test_medium || '', 6)}
    </div>
    <div class="form-row">
      ${f('pr_gauge', 'Gauge ID *', 'text', '', 4)}${f('pr_cert', 'Calibration certificate no.', 'text', '', 4)}${f('pr_due', 'Calibration due date *', 'date', '', 4)}
    </div>
    <div class="form-row">
      ${f('pr_start', 'Start reading (bar g)', 'number', '', 3)}${f('pr_max', 'Max reading (bar g) *', 'number', '', 3)}${f('pr_end', 'End reading (bar g)', 'number', '', 3)}${f('pr_hold', 'Held for (min) *', 'number', '', 3)}
    </div>
    <div class="form-row">${f('pr_tested', 'Tested by', 'text', me.name || '', 6)}${f('pr_witness', 'Witnessed by', 'text', '', 6)}</div>
    <div class="form-group mb-2"><label for="pr_remarks" class="small mb-1">Remarks</label><textarea id="pr_remarks" class="form-control form-control-sm" rows="2"></textarea></div>
    <fieldset class="mb-3"><legend class="small mb-1">Result *</legend>
      <div class="btn-group btn-group-toggle" role="radiogroup" aria-label="Result">
        <label class="btn btn-outline-success"><input type="radio" name="pr_result" value="pass"> PASS</label>
        <label class="btn btn-outline-danger"><input type="radio" name="pr_result" value="fail"> FAIL</label></div></fieldset>
    <div class="d-flex align-items-center" style="gap:10px"><button type="submit" class="btn btn-info btn-sm" id="prSave">Save test record</button>
      ${pressure.tests.length ? '<button type="button" class="btn btn-sm btn-outline-secondary" id="prCancel">Cancel</button>' : ''}</div>
  </form>`;
}

// ตรวจข้อมูลฟอร์ม → คืนข้อความผิดพลาด (ว่าง = ผ่าน) และแถวที่จะบันทึก
function pressureCheck() {
  const req = { bar: num(tp.test_pressure), min: num(tp.holding_time_min) };
  const row = { test_pack_id: tpId, attempt_no: Math.max(0, ...pressure.tests.map(t => t.attempt_no)) + 1, test_date: pv('pr_date'), test_type: pv('pr_type') || null,
    test_medium: pv('pr_medium') || null, required_pressure: req.bar, required_holding_min: req.min, gauge_id: pv('pr_gauge'), gauge_cal_cert: pv('pr_cert') || null,
    gauge_cal_due: pv('pr_due'), start_reading: num(pv('pr_start')), max_reading: num(pv('pr_max')), end_reading: num(pv('pr_end')), holding_time_min: num(pv('pr_hold')),
    result: document.querySelector('input[name="pr_result"]:checked')?.value || '', tested_by: pv('pr_tested') || null, witnessed_by: pv('pr_witness') || null,
    remarks: pv('pr_remarks') || null, created_by: me.id };
  if (!row.test_date) return { err: 'Enter the test date.' };
  if (!row.test_type) return { err: 'Select the test type.' };
  if (!row.gauge_id) return { err: 'Enter the gauge ID.' };
  if (!row.gauge_cal_due) return { err: 'Enter the gauge calibration due date.' };
  if (row.gauge_cal_due < row.test_date) return { err: 'The gauge calibration expired before the test date. Use a gauge with a valid calibration.' };
  if (row.max_reading == null) return { err: 'Enter the max reading.' };
  if (row.holding_time_min == null) return { err: 'Enter how long the pressure was held (minutes).' };
  if (!row.result) return { err: 'Choose the result (PASS or FAIL).' };
  if (row.result === 'pass') {
    if (req.bar != null && row.max_reading < req.bar) return { err: `PASS needs the max reading to reach the test pressure (${req.bar} bar g). Record FAIL, or correct the reading.` };
    if (req.min != null && row.holding_time_min < req.min) return { err: `PASS needs the pressure held for at least ${req.min} min. Record FAIL, or correct the time.` };
  }
  return { row };
}

function bindPressure() {
  const box = $('tab-pressure'), msg = (t, ok = true) => { const e = $('prMsg'); if (e) { e.textContent = t; e.className = 'small mt-2 ' + (ok ? 'text-success' : 'text-danger'); } };
  box.addEventListener('click', (e) => {
    const go = e.target.closest('[data-goto]');
    if (go) { e.preventDefault(); window.jQuery(`#tpTabs a[href="#tab-${go.dataset.goto}"]`).tab('show'); return; }
    if (e.target.closest('#prMore')) { pressure.openForm = true; renderPressure(); }
    if (e.target.closest('#prCancel')) { pressure.openForm = false; renderPressure(); }
  });
  box.addEventListener('submit', async (e) => {
    e.preventDefault(); if (!canQC) return;
    const { err, row } = pressureCheck();
    if (err) return msg(err, false);
    if (pressureGate().ok === false) return msg('Pressure test is locked. Resolve the items above first.', false);   // กันกรณีสถานะเปลี่ยนระหว่างกรอก
    $('prSave').disabled = true; msg('Saving…');
    try {
      const { data, error } = await sb.from('pressure_tests').insert(row).select().single();
      if (error) throw error;
      pressure.tests.unshift(data); pressure.openForm = false;
      renderPressure(); renderHead(); msg(`Saved attempt ${data.attempt_no}: ${data.result === 'pass' ? 'PASS' : 'FAIL'}`);
    } catch (err2) { $('prSave').disabled = false; msg('Could not save: ' + friendlyErr(err2), false); }
  });
}
