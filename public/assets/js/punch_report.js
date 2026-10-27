// ===================================================================
// punch_report.js — รายงาน PROCESS PUNCH-LIST แบบพิมพ์ (punch_report.php?id=...) ตามเทมเพลตฟอร์ม CT8 (Sheet6) กระดาษ A3 แนวนอน
//   ข้อมูล : test_packs · projects · punch_reports (หัวใบ + ลายเซ็น 4 ช่อง + รูปลายเซ็น) · v_punch_items (รายการ ไม่รวม Cancelled)
//   หน้า   : รายการเกินหน้าไหน ขึ้นหน้าใหม่อัตโนมัติ — ทุกหน้ามีหัวฟอร์ม ตารางหัวคอลัมน์ นิยาม A/B และช่องลายเซ็นครบ เลขหน้า "n of N" ใส่ให้เอง
//            หน้าละ 25 แถวมาตรฐาน (แถวที่ข้อความยาวจนขึ้นบรรทัดใหม่กินที่มากขึ้น แถวที่เหลือเลื่อนไปหน้าถัดไป) แถวว่างเติมให้เต็มตารางเหมือนฟอร์มเปล่า
//            ช่องที่ไม่มีข้อมูลปล่อยว่าง (ไม่ใส่ขีด) ตามเทมเพลต
//   วันที่ : รูปแบบไทยตามเทมเพลต เช่น "17 ธันวาคม 2025" (เดือนไทย ปี ค.ศ.)
//   พิมพ์  : ปุ่ม Print / Save as PDF เรียก window.print() — ขนาดกระดาษ A3 แนวนอนกำหนดใน @media print ของ app.css · หน้าจอย่อให้พอดีความกว้างด้วย zoom
//   พึ่งพา : punch_common.js ($, alertErr) · punch_photos.js (signed) · app.js (sb, appReady, esc)
// ===================================================================
const rpId = Number(new URLSearchParams(location.search).get('id'));
const TH_MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
// วันที่แบบเทมเพลต: "17 ธันวาคม 2025" (รับ YYYY-MM-DD ไม่แปลงโซนเวลา) · ว่าง/ผิดรูปแบบ = ว่าง
const thDate = (d) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(d ?? '')); return m ? `${+m[3]} ${TH_MONTHS[+m[2] - 1]} ${m[1]}` : ''; };
const v = (x) => esc(x ?? '');                                  // ค่าว่างแสดงเป็นช่องว่าง

// หัว + ข้อมูลโครงการ + หัวตาราง (ซ้ำทุกหน้า)
function pageHtml(c) {
  const info = (l1, v1, l2, v2) => `<tr><td class="rp-l">${l1}</td><td class="rp-l">${v(v1)}</td><td class="rp-l">${l2}</td><td class="rp-l">${v2 === null ? '<span class="rp-pg"></span>' : v(v2)}</td></tr>`;
  return `<div class="rp-frame">
    <div class="rp-top">
      <div class="rp-logo-l"><img src="assets/img/report_logo_bjchi.png" alt="BJCHI"></div>
      <div class="rp-title">PROCESS PUNCH-LIST</div>
      <div class="rp-logo-r">${c.clientLogo ? '<img src="assets/img/report_logo_client.png" alt="Client">' : ''}</div>
    </div>
    <div class="rp-gap"></div>
    <table class="rp-info"><colgroup><col style="width:152.5pt"><col style="width:533pt"><col style="width:142pt"><col></colgroup>
      ${info('CLIENT:', c.client, 'REPORT NO.', c.reportNo)}
      ${info('PROJECT NO:', c.projectNo, 'PAGES:', null)}
      ${info('PROJECT NAME:', c.projectName, "INSPC' DATE:", thDate(c.inspDate))}
      ${info('BLOCK/MODULE NAME/NO:', c.module, 'LOCATION:', c.location)}
      ${info('PROCESS DISCIPLINE', c.discipline, 'TEST STAGE:', c.stage)}
    </table>
    <div class="rp-gap"></div>
    <table class="rp-list rp-head">${COLS}
      <thead><tr><th rowspan="2">ITEM NO.</th><th rowspan="2">DRAWING NO.</th><th rowspan="2">PUNCH-LIST DESCRIPTION</th><th rowspan="2">CATEGORY<br>"A" "B"</th><th rowspan="2">STATUS<br>OPEN / CLOSED</th>
        <th colspan="3">PUNCH CLOSING ACTION AND VERIFICATION</th><th rowspan="2">REMARKS</th></tr>
        <tr><th>PROD SUP.</th><th>QCI</th><th>CLIENT REP.</th></tr></thead></table>
    <div class="rp-body"><table class="rp-list rp-rows">${COLS}<tbody></tbody></table></div>
    <div class="rp-defs-h">PUNCH-LIST DEFINITION OF TERMS</div>
    <div class="rp-defs"><div class="rp-defa">"A" : Any subsequent operation or process cannot be performed until punch is closed.</div>
      <div class="rp-defb">"B" : Subsequent operation can be proceeding with discretion of project manager</div></div>
    <div class="rp-gap2"></div>
    <div class="rp-band">REVIEW &amp; WITNESS.</div>
    <table class="rp-sigs"><colgroup><col style="width:44.5pt"><col style="width:194.5pt"><col style="width:43pt"><col style="width:216pt"><col style="width:282pt"><col></colgroup>
      <tr><th colspan="2">COMPLETED BY.</th><th colspan="2">BJCHI.</th><th>CIMTAS.</th><th>REPRESENTATIVE.</th></tr>
      ${sigRow('NAME :', c.sigs.map(s => v(s.name)))}
      ${sigRow('POSITION :', c.sigs.map(s => v(s.position)))}
      ${sigRow('SIGNATURE :', c.sigs.map(s => s.img ? `<img class="rp-sig-img" src="${s.img}" alt="Signature">` : ''), 'rp-sigrow')}
      ${sigRow('DATE :', c.sigs.map(s => thDate(s.date)))}
    </table>
  </div><div class="rp-foot">${v(c.reportNo)}</div>`;
}
// ความกว้างคอลัมน์ของตาราง (pt) — รวม 1072pt ตามเทมเพลต: ลำดับ 44.5 · แบบ 108 · รายละเอียด 367 · Cat 55.5 · Status 86.4 · 3 ช่องยืนยัน 71 · หมายเหตุ ที่เหลือ
const COLS = '<colgroup><col style="width:44.5pt"><col style="width:108pt"><col style="width:367.2pt"><col style="width:55.5pt"><col style="width:86.4pt"><col style="width:70.9pt"><col style="width:70.9pt"><col style="width:70.9pt"><col></colgroup>';
// แถวลายเซ็น 1 บรรทัด: ช่อง 1-2 มีป้าย+ค่าแยกเซลล์, ช่อง 3-4 เป็นเซลล์เดียว (ป้ายซ้าย ค่าตรงกลาง) ตามเทมเพลต
function sigRow(label, vals, cls = '') {
  const one = (val) => `<div class="rp-fl"><span class="rp-sl">${label}</span><span class="rp-sv">${val}</span></div>`;
  return `<tr class="${cls}"><td class="rp-sl">${label}</td><td class="rp-sv">${vals[0]}</td><td class="rp-sl">${label}</td><td class="rp-sv">${vals[1]}</td><td>${one(vals[2])}</td><td>${one(vals[3])}</td></tr>`;
}

// แถวรายการ 1 แถว (ค่าว่างปล่อยว่าง)
const rowHtml = (i) => `<tr><td class="rp-c">${v(i.item_no)}</td><td class="rp-c">${v(i.drawing_no)}</td><td class="rp-d">${v(i.deficiency)}</td><td class="rp-c">${v(i.category)}</td>
  <td class="rp-c">${i.status === 'close' ? 'CLOSED' : i.status === 'open' ? 'OPEN' : v(i.status ? String(i.status).toUpperCase() : '')}</td>
  <td class="rp-c">${v(i.bjc_by)}</td><td class="rp-c">${v(i.qci_by)}</td><td class="rp-c">${v(i.client_by)}</td><td class="rp-d">${v(i.remarks)}</td></tr>`;
const blankRow = () => '<tr><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>';

// สร้างทุกหน้า: ใส่รายการทีละแถวจนเต็มตาราง (วัดจากการแสดงผลจริง) แล้วขึ้นหน้าใหม่ · เติมแถวว่างให้เต็ม · ใส่เลขหน้า
function buildPages(rows, ctx) {
  const holder = $('rpSheet'); holder.innerHTML = ''; holder.style.zoom = '';
  const pages = [];
  const newPage = () => {
    const el = document.createElement('div'); el.className = 'rp-page'; el.innerHTML = pageHtml(ctx); holder.appendChild(el);
    const pg = { el, body: el.querySelector('.rp-body'), tbody: el.querySelector('.rp-rows tbody'), table: el.querySelector('.rp-rows') };
    pages.push(pg); return pg;
  };
  const fits = (pg) => pg.table.offsetHeight <= pg.body.clientHeight + 1.5;
  const tr = (html) => { const t = document.createElement('tbody'); t.innerHTML = html; return t.firstElementChild; };
  let pg = newPage();
  for (const r of rows) {
    const row = tr(rowHtml(r)); pg.tbody.appendChild(row);
    if (!fits(pg) && pg.tbody.children.length > 1) { pg.tbody.removeChild(row); pg = newPage(); pg.tbody.appendChild(row); }
  }
  pages.forEach((p, idx) => {                                            // เติมแถวว่างจนเต็มตาราง
    for (let n = 0; n < 60; n++) { const b = tr(blankRow()); p.tbody.appendChild(b); if (!fits(p)) { p.tbody.removeChild(b); break; } }
    p.el.querySelector('.rp-pg').textContent = `${idx + 1} of ${pages.length}`;
  });
  return pages.length;
}
// หน้าจอ: ย่อทั้งหน้ากระดาษให้พอดีความกว้าง (ตอนพิมพ์ CSS ตั้ง zoom 1 เอง)
function fitZoom() {
  const w = $('rpSheet').parentElement.clientWidth - 24, pageW = 420 / 25.4 * 96;
  $('rpSheet').style.zoom = Math.min(1, w / pageW);
}

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

  // รูปลายเซ็น (sql/14) — ไม่มีคอลัมน์/ไม่มีรูปก็ข้าม
  const keys = ['completed', 'bjchi', 'cimtas', 'representative'];
  const urls = {};
  try { const have = keys.filter(k => r[k + '_sig']); const u = await signed(have.map(k => r[k + '_sig'])); have.forEach((k, i) => { urls[k] = u[i] || null; }); } catch (e) { console.error(e); }
  const ctx = {
    client: p.client, reportNo: tp.test_pack_no, projectNo: tp.project_no, projectName: p.project_name, inspDate: r.inspection_date,
    module: tp.module_no, location: tp.location, discipline: r.process_discipline, stage: r.test_stage,
    clientLogo: /cimtas/i.test(p.client || ''),
    sigs: keys.map(k => ({ name: r[k + '_name'], position: r[k + '_position'], date: r[k + '_date'], img: urls[k] || '' })),
  };
  if (document.fonts?.ready) await document.fonts.ready;                // วัดความสูงแถวหลังโหลดฟอนต์
  buildPages(rows, ctx); fitZoom();
  addEventListener('resize', fitZoom);
}
// พิมพ์: รอให้รูป (โลโก้ + ลายเซ็น) โหลดครบก่อน กันหน้าที่รูปหาย
$('rpPrint').addEventListener('click', async () => {
  await Promise.all([...document.querySelectorAll('#rpSheet img')].map(i => (i.decode ? i.decode() : Promise.resolve()).catch(() => {})));
  window.print();
});
initReport().catch(alertErr);
