// ===================================================================
// punch_report.js — รายงาน PROCESS PUNCH-LIST แบบพิมพ์ A4 (punch_report.php?id=...) ตามฟอร์ม CT8 Sheet6
//   ข้อมูล : test_packs · projects · punch_reports (หัวใบ + ลายเซ็น 4 ช่อง) · v_punch_items (รายการ ไม่รวม Cancelled)
//   พิมพ์  : ปุ่ม Print / Save as PDF เรียก window.print() — ซ่อนเมนู/ปุ่มด้วย @media print ใน app.css
//   พึ่งพา : punch_common.js ($, STATUS, alertErr) · app.js (sb, appReady, esc, fmtDate)
// ===================================================================
const rpId = Number(new URLSearchParams(location.search).get('id'));

// แถวหัวใบแบบ "ป้าย: ค่า" (ค่าว่างแสดงเส้นเปล่า)
const hdr = (label, v) => `<td class="rp-l">${esc(label)}</td><td class="rp-v">${esc(v ?? '')}</td>`;

// ช่องลายเซ็น 1 ช่อง (ชื่อ / ตำแหน่ง / ลายเซ็น / วันที่)
const sigBox = (head, name, pos, date) => `<td class="rp-sig"><div class="rp-sig-h">${esc(head)}</div>
  <div>NAME : ${esc(name ?? '')}</div><div>POSITION : ${esc(pos ?? '')}</div><div class="rp-sign-line">SIGNATURE :</div><div>DATE : ${esc(date ? fmtDate(date) : '')}</div></td>`;

async function initReport() {
  await appReady;
  if (!rpId) return $('notFound').classList.remove('d-none');
  const { data: tp } = await sb.from('test_packs').select('*').eq('id', rpId).maybeSingle();
  if (!tp) return $('notFound').classList.remove('d-none');
  const [proj, rep, its] = await Promise.all([
    sb.from('projects').select('*').eq('project_no', tp.project_no).maybeSingle(),
    sb.from('punch_reports').select('*').eq('test_pack_id', rpId).maybeSingle(),
    sb.from('v_punch_items').select('*').eq('test_pack_id', rpId).neq('status', 'cancelled').order('drawing_no').order('item_no'),
  ]);
  const p = proj.data || {}, r = rep.data || {}, rows = its.data || [];
  document.title = `Punch List ${tp.test_pack_no}`;
  $('rpBack').href = 'test_package.php?id=' + rpId + '#punch';

  $('rpSheet').innerHTML = `
    <h5 class="text-center font-weight-bold mb-2">PROCESS PUNCH-LIST</h5>
    <table class="rp-head"><tr>${hdr('Client', p.client)}${hdr('Report No.', tp.test_pack_no)}</tr>
      <tr>${hdr('Project title', p.project_name)}${hdr('Inspection date', r.inspection_date ? fmtDate(r.inspection_date) : '')}</tr>
      <tr>${hdr('Block / Module', tp.module_no)}${hdr('Test stage', r.test_stage)}</tr>
      <tr>${hdr('Test package no.', tp.test_pack_no)}${hdr('Process discipline', r.process_discipline)}</tr>
      <tr>${hdr('Piping system', tp.piping_system)}${hdr('Pages', r.pages)}</tr></table>
    <table class="rp-table"><thead><tr><th>Item</th><th>Drawing No.</th><th>Description</th><th>Cat.</th><th>Status</th><th>Prod Sup.</th><th>QCI</th><th>Client Rep.</th></tr></thead>
      <tbody>${rows.map(i => `<tr><td class="text-center">${esc(i.item_no ?? '')}</td><td>${esc(i.drawing_no)}</td><td>${esc(i.deficiency)}</td>
        <td class="text-center">${esc(i.category ?? '')}</td><td class="text-center">${esc(STATUS[i.status]?.label || i.status)}</td>
        <td>${esc(i.bjc_by ?? '')}</td><td>${esc(i.qci_by ?? '')}</td><td>${esc(i.client_by ?? '')}</td></tr>`).join('')
        || '<tr><td colspan="8" class="text-center text-muted">No punch items</td></tr>'}</tbody></table>
    <p class="rp-note">Category A = must be closed before the pressure test. Category B = at the project manager's discretion.</p>
    <div class="rp-sec-h">REVIEW &amp; WITNESS.</div>
    <table class="rp-sigs"><tr>
      ${sigBox('COMPLETED BY.', r.completed_name, r.completed_position, r.completed_date)}
      ${sigBox('BJCHI.', r.bjchi_name, r.bjchi_position, r.bjchi_date)}
      ${sigBox('CIMTAS.', r.cimtas_name, r.cimtas_position, r.cimtas_date)}
      ${sigBox('REPRESENTATIVE.', r.representative_name, r.representative_position, r.representative_date)}</tr></table>`;
}
$('rpPrint').addEventListener('click', () => window.print());
initReport().catch(alertErr);
