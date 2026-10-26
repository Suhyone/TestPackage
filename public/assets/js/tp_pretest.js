// ===================================================================
// tp_pretest.js — แท็บ Pre-test ของหน้ารายละเอียด Test Package (Sheet5 "PRESSURE TEST PACK CHECKLIST")
//   Document checklist 17 ข้อ + Test preparation checklist 13 ข้อ ตอบ YES / NO / N/A
//   ตอบ NO → ระบบออก punch Category A ให้อัตโนมัติ (ผูกกับข้อนั้น) และ pack จะ "Not ready" ห้ามทดสอบแรงดัน
//   เปลี่ยนจาก NO เป็นคำตอบอื่น → punch ที่ออกไว้ (ถ้ายัง Open) ถูกเปลี่ยนเป็น Cancelled (ไม่ลบ)
//   ตารางที่ใช้ : pretest_template · pretest_items · punch_items · drawings   (สร้างโดย sql/07_pretest_checklist.sql)
//   สิทธิ์      : QC / admin ตอบได้ · เจ้าหน้าที่ดูอย่างเดียว (บังคับซ้ำที่ RLS)
//   พึ่งพา      : tp_detail.js (tp, me, canQC, tpId, items, reloadItems, renderHead, renderPunch, renderSoon) · punch_common.js ($, today) · app.js (sb, esc)
//   ต้องโหลดก่อน tp_detail.js (tp_detail.js เรียก loadPretest / renderPretest / pretestGateHtml)
// ===================================================================

// tpl = แม่แบบข้อคำถาม · ans = Map(template_id → แถวคำตอบ) · missing = true เมื่อยังไม่ได้รัน sql/07
const pretest = { tpl: [], ans: new Map(), missing: false };
const PT_DRAWING = 'PRE-TEST CHECKLIST';                       // drawing สมมติที่ punch จาก checklist ผูกอยู่ (punch_items.drawing_id ห้ามว่าง)
const PT_SECTIONS = [{ key: 'doc', title: 'Document checklist' }, { key: 'prep', title: 'Test preparation checklist' }];

// โหลดแม่แบบ + คำตอบของ pack นี้ (ถ้าตารางยังไม่มี = ยังไม่ได้รัน sql/07)
async function loadPretest() {
  const [t, a] = await Promise.all([
    sb.from('pretest_template').select('*').order('section').order('seq'),
    sb.from('pretest_items').select('*').eq('test_pack_id', tpId),
  ]);
  pretest.missing = !!(t.error || a.error);
  pretest.tpl = t.data || [];
  pretest.ans = new Map((a.data || []).map(r => [r.template_id, r]));
}

// สรุปสถานะ: ตอบครบและไม่มี NO = ready
function pretestSummary() {
  const v = [...pretest.ans.values()], n = (x) => v.filter(r => r.answer === x).length;
  const total = pretest.tpl.length;
  return { total, yes: n('yes'), no: n('no'), na: n('na'), unanswered: total - v.length, ready: total > 0 && v.length === total && n('no') === 0 };
}

// แถบสถานะ Pre-test สำหรับแท็บ Pre-test / Pressure test
function pretestGateHtml() {
  if (pretest.missing) return `<div class="alert alert-warning py-2 small mb-3" role="status">Run <code>sql/07_pretest_checklist.sql</code> in the Supabase SQL Editor to enable the pre-test checklist.</div>`;
  const s = pretestSummary();
  if (s.no) return `<div class="alert alert-danger py-2 small mb-3" role="status"><i class="fas fa-ban"></i> Pre-test checklist <b>not ready</b>: ${s.no} item${s.no > 1 ? 's' : ''} answered NO. Close the punch items raised before the pressure test.</div>`;
  if (s.unanswered) return `<div class="alert alert-warning py-2 small mb-3" role="status"><i class="fas fa-hourglass-half"></i> Pre-test checklist <b>incomplete</b>: ${s.unanswered} of ${s.total} items not answered yet.</div>`;
  return `<div class="alert alert-success py-2 small mb-3" role="status"><i class="fas fa-check-circle"></i> Pre-test checklist <b>complete</b> (${s.yes} YES, ${s.na} N/A).</div>`;
}

// วาดแท็บ Pre-test: แถบสถานะ + ตารางรายข้อ (YES / NO / N/A + หมายเหตุ)
function renderPretest() {
  const box = $('tab-pretest');
  if (pretest.missing) { box.innerHTML = pretestGateHtml(); return; }
  const dis = canQC ? '' : ' disabled';
  const btn = (id, v, label, cls, cur) => `<label class="btn btn-sm btn-outline-${cls}${cur === v ? ' active' : ''}${canQC ? '' : ' disabled'}">
    <input type="radio" name="pt_${id}" value="${v}" data-pt="${id}"${cur === v ? ' checked' : ''}${dis}>${label}</label>`;
  const sec = (s) => `<h6 class="text-muted small text-uppercase mt-3 mb-2">${esc(s.title)}</h6>
    <div class="table-responsive"><table class="table table-sm mb-0"><thead><tr><th style="width:56px">No.</th><th>Description</th><th style="width:190px" class="text-center">Status</th><th style="width:28%">Remarks</th></tr></thead><tbody>
    ${pretest.tpl.filter(t => t.section === s.key).map(t => { const a = pretest.ans.get(t.id), cur = a?.answer;
      return `<tr${cur === 'no' ? ' class="table-danger"' : ''}><td>${t.seq}</td><td>${esc(t.text)}</td>
        <td class="text-center"><div class="btn-group btn-group-toggle">${btn(t.id, 'yes', 'YES', 'success', cur)}${btn(t.id, 'no', 'NO', 'danger', cur)}${btn(t.id, 'na', 'N/A', 'secondary', cur)}</div></td>
        <td><input class="form-control form-control-sm" data-ptr="${t.id}" value="${esc(a?.remark ?? '')}" aria-label="Remarks for item ${t.seq}"${cur && canQC ? '' : ' disabled'}></td></tr>`; }).join('')}
    </tbody></table></div>`;
  box.innerHTML = `${pretestGateHtml()}${PT_SECTIONS.map(sec).join('')}
    <div class="small text-muted mt-3">When a status is NO, a Category A punch item is raised automatically and the pressure test shall not proceed.${canQC ? '' : ' (View only)'}</div>
    <div class="small mt-2" id="ptMsg" role="status" aria-live="polite"></div>`;
}

// รหัสอ้างอิง punch ที่ออกจากข้อ checklist (ซ้ำไม่ได้ → ตอบ NO ซ้ำไม่เกิดรายการซ้ำ)
const ptKey = (t) => `${tp.test_pack_no}#PT-${t.section === 'doc' ? 'D' : 'P'}${t.seq}`;

// ออก punch Category A สำหรับข้อที่ตอบ NO (ถ้าเคยออกแล้วและถูก Cancelled ให้เปิดกลับ) คืน id ของ punch
async function raisePretestPunch(t, remark) {
  const key = ptKey(t);
  const { data: old, error: e0 } = await sb.from('punch_items').select('id,status').eq('source_key', key).maybeSingle();
  if (e0) throw e0;
  const label = `Pre-test ${t.section === 'doc' ? 'document' : 'preparation'} item ${t.seq}: ${t.text}`;
  if (old) {
    if (old.status === 'cancelled') {
      const { error } = await sb.from('punch_items').update({ status: 'open', cancel_by: null, cancel_date: null, cancel_remark: null, remarks: remark || null }).eq('id', old.id);
      if (error) throw error;
    }
    return old.id;
  }
  const { data: dr, error: e1 } = await sb.from('drawings').upsert({ test_pack_id: tpId, drawing_no: PT_DRAWING }, { onConflict: 'test_pack_id,drawing_no' }).select('id').single();
  if (e1) throw e1;
  const { data: last } = await sb.from('punch_items').select('item_no').eq('drawing_id', dr.id).order('item_no', { ascending: false }).limit(1);
  const { data: ins, error: e2 } = await sb.from('punch_items').insert({
    drawing_id: dr.id, item_no: (last?.[0]?.item_no || 0) + 1, deficiency: label, category: 'A', status: 'open', remarks: remark || null,
    source_key: key, punch_by: me.name, punch_date: today(), input_date: today(), created_by: me.id }).select('id').single();
  if (e2) throw e2;
  return ins.id;
}
// ยกเลิก punch ที่ออกไว้ (เฉพาะที่ยัง Open — ถ้า Close ไปแล้วคงไว้ตามประวัติ)
async function cancelPretestPunch(id) {
  const { error } = await sb.from('punch_items').update({ status: 'cancelled', cancel_by: me.name, cancel_date: today(), cancel_remark: 'Pre-test checklist answer changed' }).eq('id', id).eq('status', 'open');
  if (error) throw error;
}

// บันทึกคำตอบ 1 ข้อ (ตอบ NO → ออก punch · เปลี่ยนจาก NO → ยกเลิก punch) แล้วรีเฟรชหัวหน้า/แท็บ Punch/gate
async function savePretestAnswer(tid, answer, remark) {
  const t = pretest.tpl.find(x => x.id === tid), prev = pretest.ans.get(tid);
  let punchId = prev?.punch_item_id ?? null;
  if (answer === 'no') punchId = await raisePretestPunch(t, remark);
  else if (prev?.answer === 'no' && punchId) await cancelPretestPunch(punchId);
  const { data, error } = await sb.from('pretest_items').upsert({ test_pack_id: tpId, template_id: tid, answer, remark: remark || null,
    punch_item_id: punchId, answered_by: me.name, answered_at: new Date().toISOString() }, { onConflict: 'test_pack_id,template_id' }).select().single();
  if (error) throw error;
  pretest.ans.set(tid, data);
  await reloadItems(); renderHead(); renderPunch(); renderSoon(); renderPretest();
}

// เหตุการณ์: เลือก YES/NO/N/A หรือแก้หมายเหตุ (ผูกครั้งเดียวที่กล่องแท็บ)
function bindPretest() {
  const box = $('tab-pretest'), msg = (t, ok = true) => { const e = $('ptMsg'); if (e) { e.textContent = t; e.className = 'small mt-2 ' + (ok ? 'text-success' : 'text-danger'); } };
  box.addEventListener('change', async (e) => {
    if (!canQC) return;
    const radio = e.target.closest('[data-pt]'), rem = e.target.closest('[data-ptr]');
    const tid = Number(radio?.dataset.pt ?? rem?.dataset.ptr); if (!tid) return;
    const row = box.querySelector(`[data-ptr="${tid}"]`);
    const answer = radio ? radio.value : pretest.ans.get(tid)?.answer; if (!answer) return;
    box.querySelectorAll('input').forEach(i => i.disabled = true); msg('Saving…');
    try { await savePretestAnswer(tid, answer, row.value.trim()); msg('Saved'); }
    catch (err) { renderPretest(); msg('Could not save: ' + (err.message || err), false); }
  });
}
