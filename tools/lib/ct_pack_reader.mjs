// ตัวอ่านไฟล์ Test Package (.xlsx) ใช้ร่วมกันระหว่าง import_punch_xlsx.mjs (CT8) และ import_ct9.mjs (CT9)
//   readWorkbook(path) -> { project, pack, report, items }  อ่านจากชีต PRESSURE TEST INFORMATION + PROCESS PUNCH-LIST ตามป้ายข้อความ
import { loadBook, readSheet, excelDate } from './xlsx_min.mjs';

// ---------- ช่วยอ่านชีตแบบอิงป้ายข้อความ (ไม่ผูกกับเลขแถว จึงทนต่อฟอร์มที่เลื่อนแถว) ----------
export const norm = (s) => s.replace(/\s+/g, ' ').trim().toUpperCase();
export const hasTitle = (rows, title) => [...rows.values()].some(c => Object.values(c).some(v => norm(v) === title));
// ค่าที่อยู่ขวามือของป้าย (nth=1 ค่าแรก, 2 = ค่าถัดไป เช่นหน่วย)
export function next(rows, label, nth = 1) {
  for (const [, cols] of rows) for (const [c, v] of Object.entries(cols)) if (norm(v).startsWith(label)) {
    const right = Object.entries(cols).filter(([cc]) => +cc > +c).sort((a, b) => a[0] - b[0]);
    return right[nth - 1]?.[1] ?? null;
  }
  return null;
}
export const clean = (v) => (v == null || /^[-/\s]*$/.test(v)) ? null : v;
export const num = (v) => { const n = parseFloat(String(v ?? '').replace(/,/g, '')); return Number.isFinite(n) ? n : null; };
const discipline = (v) => v ? v.charAt(0).toUpperCase() + v.slice(1).toLowerCase() : null;

// ---------- อ่านไฟล์ ----------
export function readWorkbook(path) {
  const book = loadBook(path), sheets = book.sheets.map(s => ({ ...s, rows: readSheet(book, s.file) }));
  const info = sheets.find(s => hasTitle(s.rows, 'PRESSURE TEST INFORMATION'));
  const punch = sheets.find(s => hasTitle(s.rows, 'PROCESS PUNCH-LIST'));
  if (!info || !punch) throw new Error('ไม่พบชีต PRESSURE TEST INFORMATION หรือ PROCESS PUNCH-LIST');
  const i = info.rows, p = punch.rows;

  const testPackNo = next(i, 'TEST PACKAGE NO') || next(i, 'REPORT NO');
  const pack = {
    project_no: next(i, 'PROJECT NO.'), test_pack_no: testPackNo, module_no: next(i, 'BLOCK/MODULE'), location: next(i, 'LOCATION'),
    piping_system: next(i, 'PIPING SYSTEM'), piping_name: next(i, 'PIPING NAME'), pid_no: next(i, 'P&ID NO'), test_medium: next(i, 'TEST MEDIUM'),
    insulation_spec: next(i, 'INSULATION SPEC'), insulation_thk: next(i, 'INSULATION THK'), design_pressure: next(i, 'DESIGN PRESSURE'),
    design_temp: next(i, 'DESIGN TEMP'), fluid_code: next(i, 'FLUID CODE'), pipe_material: next(i, 'PIPE MATERIAL'), test_pressure: next(i, 'TEST PRESSURE'),
    holding_time_min: num(next(i, 'HOLDING TIME')),
  };
  // ตารางแก้ไขเอกสาร (แถวที่มีป้าย REV.) : แถวข้อมูลอยู่เหนือป้าย
  const revHead = [...i.entries()].find(([, c]) => Object.values(c).some(v => norm(v) === 'REV.'));
  if (revHead) { const c = i.get(revHead[0] - 2) || {}; Object.assign(pack, { rev_no: c[1] ?? null, rev_description: c[3] ?? null, rev_date: excelDate(c[6]), prepared_by: c[7] ?? null, review_by: c[8] ?? null, approved_by: c[9] ?? null }); }
  // ลายเซ็นท้าย Sheet1: ชื่อใต้ "PREPARED BY" ; วันที่ในแถว DATE
  const sign = [...i.entries()].filter(([, c]) => Object.values(c).some(v => /^\(.*\)$/.test(v)));
  const nameRow = revHead ? [...i.entries()].find(([r, c]) => r > revHead[0] + 2 && c[1] && !/^[A-Z ]+BY$/.test(norm(c[1])) && !/^\(/.test(c[1]) && /[a-z]/i.test(c[1])) : null;
  const dateRow = [...i.entries()].filter(([, c]) => Object.values(c).some(v => norm(v) === 'DATE')).pop();   // แถว DATE ล่างสุด (ใต้ลายเซ็น)
  const dateAbove = dateRow ? i.get(dateRow[0] - 2) || {} : {};
  Object.assign(pack, { signed_prepared_name: nameRow?.[1][1] ?? null, signed_prepared_date: excelDate(dateAbove[1]),
    signed_inspector_name: clean(nameRow?.[1][5]), signed_inspector_date: excelDate(dateAbove[5]),
    signed_approved_name: clean(nameRow?.[1][7]), signed_approved_date: excelDate(dateAbove[7]) });
  void sign;

  const project = { project_no: pack.project_no, project_name: next(i, 'PROJECT NAME'), client: next(i, 'CLIENT') };
  const disc = discipline(next(p, 'PROCESS DISCIPLINE'));
  const report = {
    inspection_date: excelDate(next(p, "INSPC' DATE")), process_discipline: next(p, 'PROCESS DISCIPLINE'),
    test_stage: next(p, 'TEST STAGE'), pages: next(p, 'PAGES'),
  };
  // ลายเซ็นท้าย Sheet6: 4 ช่อง (COMPLETED BY / BJCHI / CIMTAS / REPRESENTATIVE) ตามลำดับคอลัมน์
  const rowsBy = (label) => [...p.entries()].filter(([, c]) => Object.values(c).some(v => norm(v) === label)).map(([r, c]) => [r, c]);
  const blocks = ['completed', 'bjchi', 'cimtas', 'representative'];
  for (const [field, label] of [['name', 'NAME :'], ['position', 'POSITION :'], ['date', 'DATE :']]) {
    const hit = rowsBy(label)[0]; if (!hit) continue;
    const cols = hit[1], labelCols = Object.entries(cols).filter(([, v]) => norm(v) === label).map(([c]) => +c).sort((a, b) => a - b);
    labelCols.forEach((lc, k) => {
      const nextLabel = labelCols[k + 1] ?? 999;
      const val = Object.entries(cols).find(([c, v]) => +c > lc && +c < nextLabel && norm(v) !== label)?.[1];
      report[`${blocks[k]}_${field}`] = field === 'date' ? excelDate(val) : clean(val ?? null);
    });
  }

  // รายการ punch: แถวที่คอลัมน์ 1 เป็นเลขลำดับ อยู่ระหว่างหัวตาราง (ITEM NO.) และ PUNCH-LIST DEFINITION OF TERMS
  const headRow = [...p.entries()].find(([, c]) => Object.values(c).some(v => norm(v) === 'ITEM NO.'))?.[0] ?? 0;
  const endRow = [...p.entries()].find(([, c]) => Object.values(c).some(v => norm(v).startsWith('PUNCH-LIST DEFINITION')))?.[0] ?? 9999;
  const items = [];
  for (const [r, c] of [...p.entries()].sort((a, b) => a[0] - b[0])) {
    if (r <= headRow || r >= endRow || !/^\d+$/.test(c[1] || '') || !(c[4] || c[9])) continue;
    const st = norm(c[29] || 'OPEN');
    items.push({
      item_no: +c[1], drawing_no: c[4] || '(no drawing)', deficiency: c[9] || null,
      category: ['A', 'B'].includes(norm(c[26] || '')) ? norm(c[26]) : null,
      status: st.startsWith('CLOSE') ? 'close' : st.startsWith('CANCEL') ? 'cancelled' : 'open',
      discipline: disc, bjc_by: c[33] || null, qci_by: c[36] || null, client_by: c[39] || null, remarks: c[42] || null,
      punch_date: report.inspection_date, source_key: `${testPackNo}#${+c[1]}`,
    });
  }
  return { project, pack, report, items };
}
