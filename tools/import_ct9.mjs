// นำเข้าไฟล์ Test Package (.xlsx) ของโครงการ CT9 เข้า Supabase (โครงสร้างโฟลเดอร์ <module>/<pack>/<ไฟล์>.xlsx)
//   Sheet1 (PRESSURE TEST INFORMATION)   -> projects + test_packs
//   Sheet6 (PROCESS PUNCH-LIST)          -> punch_reports + drawings + punch_items
//   ISO INDEX (ทุกชีตที่ชื่อขึ้นต้น ISO INDEX) -> iso_lines   (pack ใหญ่แบ่งเป็นหลายชีต เช่น ISO INDEX, -2 … -5)
//   Sheet2 (CONTENT CHECK LIST)          -> pack_documents   (verify = ว่าง: ในไฟล์ไม่มีเครื่องหมายเลือก YES / N/A ให้ QC ยืนยันในเว็บ)
//   Sheet5 (PRESSURE TEST PACK CHECKLIST) -> pretest_items    (เฉพาะข้อที่มีเครื่องหมาย "/" ใต้ YES / NO / N/A)
//   อ่านชีตตาม "ชื่อ/ป้ายข้อความ" ไม่ใช่ตำแหน่ง (บางไฟล์ SECTION #7 มาก่อน #6)
//
//   ตรวจก่อน (ไม่เขียนข้อมูล):  node tools/import_ct9.mjs "<โฟลเดอร์ CT9>"
//   นำเข้าจริง              :  node tools/import_ct9.mjs "<โฟลเดอร์ CT9>" --commit
//   ต้องรัน sql/05–08 (และ 07 สำหรับ pretest) ก่อน — ใช้ SUPABASE_URL / SUPABASE_SECRET_KEY จาก .env (ในเครื่องเท่านั้น)
//   นำเข้าซ้ำได้: ข้อมูลที่มีแล้ว "ไม่ถูกเขียนทับ" (กันงานที่ผู้ใช้แก้ในเว็บ) ยกเว้น iso_lines ที่อัปเดตตามไฟล์ · ไม่อัปโหลด PDF
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { loadBook, readSheet, excelDate } from './lib/xlsx_min.mjs';
import { readWorkbook, norm, next } from './lib/ct_pack_reader.mjs';

const folder = process.argv[2], commit = process.argv.includes('--commit');
if (!folder) { console.error('ระบุโฟลเดอร์ CT9'); process.exit(1); }
const log = (...a) => console.log(...a);
const txt = (v) => (v == null || String(v).replace(/\s+/g, ' ').trim() === '') ? null : String(v).replace(/\s+/g, ' ').trim();
const nz = (v) => { const t = txt(v); return (t == null || /^[-/]+$/.test(t)) ? null : t; };
const isNo = (v) => /^\d+$/.test(String(v ?? '').trim());

// หาไฟล์ .xlsx ทุกระดับ (ข้ามไฟล์ชั่วคราว ~$)
function walk(dir) {
  return readdirSync(dir).flatMap(f => { const p = join(dir, f); return statSync(p).isDirectory() ? walk(p) : (/\.xlsx$/i.test(f) && !f.startsWith('~$') ? [p] : []); });
}

// ---------- Sheet5: คำตอบ Pre-test (ตำแหน่งคอลัมน์หาจากป้าย YES / NO / N/A) ----------
function readPretest(sheet) {
  const rows = [...sheet.entries()].sort((a, b) => a[0] - b[0]);
  const head = rows.find(([, c]) => Object.values(c).filter(v => norm(v) === 'YES').length >= 2);
  if (!head) return [];
  const triple = (from) => {
    const cols = Object.entries(head[1]).filter(([c, v]) => +c >= from && ['YES', 'NO', 'N/A'].includes(norm(v))).sort((a, b) => a[0] - b[0]).slice(0, 3).map(([c]) => +c);
    return { yes: cols[0], no: cols[1], na: cols[2] };
  };
  const yesCols = Object.entries(head[1]).filter(([, v]) => norm(v) === 'YES').map(([c]) => +c).sort((a, b) => a - b);
  const doc = triple(yesCols[0]), prep = triple(yesCols[1]);
  const remarkCol = rows.map(([, c]) => Object.entries(c).find(([, v]) => norm(v) === 'REMARKS')?.[0]).find(Boolean);
  const mark = (c, t) => c[t.yes] === '/' ? 'yes' : c[t.no] === '/' ? 'no' : c[t.na] === '/' ? 'na' : null;
  const out = [];
  for (const [r, c] of rows) {
    if (r <= head[0]) continue;
    if (isNo(c[1]) && c[4]) { const a = mark(c, doc); if (a) out.push({ section: 'doc', seq: +c[1], answer: a, remark: null }); }
    const prepNo = Object.entries(c).find(([k, v]) => +k > yesCols[0] && +k < prep.yes - 15 && isNo(v));       // เลขข้อของฝั่งขวา (คอลัมน์ 21 ในฟอร์ม)
    if (prepNo && c[+prepNo[0] + 3]) { const a = mark(c, prep); if (a) out.push({ section: 'prep', seq: +prepNo[1], answer: a, remark: remarkCol ? txt(c[+remarkCol]) : null }); }
  }
  return out;
}

// ---------- ISO INDEX: ตำแหน่งคอลัมน์หาจากป้ายหัวตาราง ----------
function readIso(sheetName, rows, packNo) {
  const all = [...rows.entries()].sort((a, b) => a[0] - b[0]);
  const top = all.find(([, c]) => Object.values(c).some(v => norm(v).startsWith('ISOMETRIC DRAWING')));
  if (!top) return [];
  const sub = all.find(([r]) => r > top[0]);                                  // แถวย่อย: DRAWING No. / SHT. / REV. ของ ISO และ PID, SPEC / THK
  const col = (label) => +(Object.entries(top[1]).find(([, v]) => norm(v).replace(/\s+/g, ' ').startsWith(label))?.[0] ?? 0);
  const subCols = (label) => Object.entries(sub[1]).filter(([, v]) => norm(v).startsWith(label)).map(([c]) => +c).sort((a, b) => a - b);
  const dwg = subCols('DRAWING NO'), sht = subCols('SHT'), rev = subCols('REV'), spec = subCols('SPEC')[0], thk = subCols('THK')[0];
  const C = { no: 1, module: col('MODULE'), line: col('LINE'), spool: col('SPOOL'), fluid: col('FLUID'), dp: col('DESIGN PRESSURE'), dt: col('DESIGN TEMPERATURE'),
    tp: col('TEST PRESSURE'), type: col('TEST TYPE'), mat: col('MATERIAL'), npd: col('PIPE NPD'), remark: col('REMARK') };
  return all.filter(([r, c]) => r > sub[0] && isNo(c[C.no]) && (c[dwg[0]] || c[C.spool] || c[C.line])).map(([r, c]) => ({
    source_key: `CT9|${packNo}#${sheetName}#${r}`, item_no: +c[C.no],
    iso_drawing_no: txt(c[dwg[0]]), iso_sht: txt(c[sht[0]]), iso_rev: txt(c[rev[0]]), pid_drawing_no: nz(c[dwg[1]]), pid_sht: nz(c[sht[1]]), pid_rev: nz(c[rev[1]]),
    module_no: txt(c[C.module]), line_no: txt(c[C.line]), spool_no: txt(c[C.spool]), fluid: txt(c[C.fluid]), design_pressure: txt(c[C.dp]), design_temp: txt(c[C.dt]),
    test_pressure: txt(c[C.tp]), test_type: txt(c[C.type]), material: txt(c[C.mat]), insulation_spec: txt(c[spec]), insulation_thk: txt(c[thk]), pipe_npd: txt(c[C.npd]), remark: txt(c[C.remark]) }));
}

// ---------- อ่านไฟล์ 1 ใบ ----------
function readPack(path) {
  const base = readWorkbook(path);                                            // Sheet1 + Sheet6 (ตัวอ่านเดียวกับ CT8)
  const book = loadBook(path), sheetRows = (s) => readSheet(book, s.file);
  const byName = (re) => book.sheets.filter(s => re.test(s.name));
  const packNo = base.pack.test_pack_no;
  const s2 = byName(/^Sheet2$/)[0], s5 = byName(/^Sheet5$/)[0];
  const secTitle = new Map(byName(/^SECTION #\d+$/).map(s => [+s.name.replace(/\D/g, ''), txt(next(sheetRows(s), 'DESCRIPTION'))]));
  const docs = s2 ? [...sheetRows(s2).entries()].filter(([, c]) => isNo(c[1]) && c[3]).sort((a, b) => a[0] - b[0])
    .map(([, c]) => ({ section_no: +c[1], title: secTitle.get(+c[1]) ?? null, content: txt(c[3]), verify: null, marker: null })) : [];
  const iso = byName(/^ISO INDEX/).flatMap(s => readIso(s.name, sheetRows(s), packNo));
  const pretest = s5 ? readPretest(sheetRows(s5)) : [];
  return { ...base, docs, iso, pretest, sheets: book.sheets.map(s => s.name) };
}

// ---------- อ่านทุกไฟล์ ----------
const files = walk(folder).sort();
const data = [], problems = [];
for (const f of files) {
  const rel = relative(folder, f);
  try {
    const d = { file: rel, ...readPack(f) };
    // ไฟล์ที่ข้อมูลข้างในเป็นโครงการอื่น (เช่น CT8 ที่ถูกคัดลอกมาปนในโฟลเดอร์) ไม่นำเข้า — กันไปทับ/ผูกข้อมูลกับ pack ของ CT8
    if (d.pack.project_no !== 'CT9') { problems.push(`ข้าม ${rel}: project_no = ${d.pack.project_no} / pack ${d.pack.test_pack_no} ไม่ใช่ CT9 (ไม่นำเข้า)`); continue; }
    // บาง pack (เช่น FFS-001) ช่อง Module เป็นข้อความอื่น → ใช้ชื่อโฟลเดอร์ระดับบนสุดเป็น module
    if (!/^(MD|SD|FFS)\b/i.test(String(d.pack.module_no ?? ''))) { const top = rel.split(/[\\/]/)[0]; problems.push(`module_no "${d.pack.module_no}" → ใช้ชื่อโฟลเดอร์ ${top}: ${d.pack.test_pack_no}`); d.pack.module_no = top; }
    data.push(d);
  } catch (e) { problems.push(`ข้าม ${rel}: ${e.message}`); }
}
const seen = new Map();
for (const d of data) {
  const k = `${d.pack.project_no}|${d.pack.test_pack_no}`;
  if (seen.has(k)) problems.push(`pack ซ้ำ ${k}: ${seen.get(k)} และ ${d.file}`); else seen.set(k, d.file);
  if (!/^CT9/i.test(String(d.pack.test_pack_no))) problems.push(`เลข pack ไม่ขึ้นต้น CT9: ${d.pack.test_pack_no} (ไฟล์ ${d.file})`);
  const dt = d.report.inspection_date; if (dt && dt > new Date().toISOString().slice(0, 10)) problems.push(`วันตรวจอยู่ในอนาคต ${dt}: ${d.pack.test_pack_no}`);
  if (!/CT9/i.test(d.file.split(/[\\/]/).pop())) problems.push(`ชื่อไฟล์ไม่มี CT9: ${d.file}`);
  if (d.docs.length !== 15) problems.push(`Sheet2 ได้ ${d.docs.length} ข้อ (ควร 15): ${d.pack.test_pack_no}`);
  if (!d.iso.length) problems.push(`ไม่พบแถว ISO INDEX: ${d.pack.test_pack_no}`);
  const ll = ['test_pressure', 'design_pressure', 'design_temp', 'pipe_material', 'fluid_code'].filter(k => /see line/i.test(String(d.pack[k] ?? '')));
  if (ll.length) problems.push(`"See line list" ใน ${ll.join(', ')}: ${d.pack.test_pack_no}`);
}

log(`ไฟล์ ${files.length} · อ่านได้ ${data.length}\n`);
const mod = new Map();
for (const d of data) {
  const m = mod.get(d.pack.module_no) || { packs: 0, iso: 0, punch: 0, answered: 0 };
  m.packs++; m.iso += d.iso.length; m.punch += d.items.length; m.answered += d.pretest.length; mod.set(d.pack.module_no, m);
  log(`${String(d.pack.test_pack_no).padEnd(24)} ${String(d.pack.module_no).padEnd(7)} ${String(d.pack.piping_system).padEnd(12)} iso ${String(d.iso.length).padStart(3)} · punch ${d.items.length} · pretest ${String(d.pretest.length).padStart(2)}/30 · วันตรวจ ${d.report.inspection_date ?? '-'}`);
}
log('\nต่อ module:'); for (const [m, v] of [...mod].sort()) log(`  ${String(m).padEnd(8)} packs ${v.packs} · iso ${v.iso} · punch ${v.punch} · pretest ที่ตอบ ${v.answered}`);
log(`\nรวม packs ${data.length} · iso ${data.reduce((n, d) => n + d.iso.length, 0)} · punch ${data.reduce((n, d) => n + d.items.length, 0)} · content ${data.reduce((n, d) => n + d.docs.length, 0)} · pretest ${data.reduce((n, d) => n + d.pretest.length, 0)}`);
if (problems.length) { log(`\nข้อสังเกต/ข้อยกเว้น (${problems.length}):`); problems.forEach(p => log('  - ' + p)); }
if (!commit) { log('\n(dry-run) ยังไม่เขียนข้อมูล — เติม --commit เพื่อนำเข้าจริง'); process.exit(0); }

// ---------- เขียนลง Supabase ----------
const envFile = new URL('../.env', import.meta.url);
const fileEnv = existsSync(envFile) ? Object.fromEntries(readFileSync(envFile, 'utf8').split(/\r?\n/).filter(l => l.includes('=') && !l.trim().startsWith('#'))
  .map(l => { const k = l.indexOf('='); return [l.slice(0, k).trim(), l.slice(k + 1).trim().replace(/^["']|["']$/g, '')]; })) : {};
const URL_ = process.env.SUPABASE_URL || fileEnv.SUPABASE_URL, KEY = process.env.SUPABASE_SECRET_KEY || fileEnv.SUPABASE_SECRET_KEY;
if (!URL_ || !KEY) { console.error('ไม่พบ SUPABASE_URL / SUPABASE_SECRET_KEY ใน .env'); process.exit(1); }
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };
const uniform = (rows) => { const keys = [...new Set(rows.flatMap(r => Object.keys(r)))]; return rows.map(r => Object.fromEntries(keys.map(k => [k, r[k] ?? null]))); };

// mode: 'merge' = อัปเดตทับ · 'ignore' = ถ้ามีแล้วไม่แตะ
async function upsert(table, onConflict, rows, mode = 'ignore') {
  if (!rows.length) return;
  for (let i = 0; i < rows.length; i += 500) {
    const res = await fetch(`${URL_}/rest/v1/${table}?on_conflict=${onConflict}`, { method: 'POST',
      headers: { ...H, Prefer: `resolution=${mode}-duplicates,return=minimal` }, body: JSON.stringify(uniform(rows.slice(i, i + 500))) });
    if (!res.ok) throw new Error(`${table}: ${res.status} ${await res.text()}`);
  }
  log(`  ${table}: ${rows.length} (${mode})`);
}
async function get(path) {
  const res = await fetch(`${URL_}/rest/v1/${path}`, { headers: H });
  if (!res.ok) throw new Error(`${path}: ${res.status} ${await res.text()}`);
  return res.json();
}
const drop = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));

await upsert('projects', 'project_no', [...new Map(data.map(d => [d.project.project_no, drop(d.project)])).values()]);
await upsert('test_packs', 'project_no,test_pack_no', data.map(d => drop({ ...d.pack, contractor: 'BJCHI' })));
const packId = new Map((await get('test_packs?select=id,project_no,test_pack_no&project_no=eq.CT9&limit=5000')).map(r => [r.test_pack_no, r.id]));
const pid = (d) => packId.get(d.pack.test_pack_no);
await upsert('punch_reports', 'test_pack_id', data.map(d => ({ test_pack_id: pid(d), ...drop(d.report) })));
await upsert('iso_lines', 'source_key', data.flatMap(d => d.iso.map(r => ({ test_pack_id: pid(d), ...r }))), 'merge');
await upsert('pack_documents', 'test_pack_id,section_no', data.flatMap(d => d.docs.map(r => ({ test_pack_id: pid(d), ...r }))));

// drawings: เลขแบบจาก punch + ISO INDEX (ใช้เป็นตัวเลือก Drawing ตอนเพิ่ม punch)
const dwg = new Map();
for (const d of data) {
  for (const it of d.items) dwg.set(`${pid(d)}|${it.drawing_no}`, { test_pack_id: pid(d), drawing_no: it.drawing_no });
  for (const r of d.iso) if (r.iso_drawing_no && r.iso_drawing_no !== '-') dwg.set(`${pid(d)}|${r.iso_drawing_no}`, { test_pack_id: pid(d), drawing_no: r.iso_drawing_no, sheet: r.iso_sht });
}
await upsert('drawings', 'test_pack_id,drawing_no', [...dwg.values()]);
const dwgId = new Map((await get('drawings?select=id,test_pack_id,drawing_no&limit=20000')).map(r => [`${r.test_pack_id}|${r.drawing_no}`, r.id]));
await upsert('punch_items', 'source_key', data.flatMap(d => d.items.map(({ drawing_no, ...it }) => ({ ...it, drawing_id: dwgId.get(`${pid(d)}|${drawing_no}`) }))));

// pretest: ต้องมีแม่แบบจาก sql/07
const answers = data.flatMap(d => d.pretest.map(r => ({ d, ...r })));
if (answers.length) {
  const tpl = await get('pretest_template?select=id,section,seq').catch(() => null);
  if (!tpl?.length) log('  ! ข้าม pretest: ยังไม่มี pretest_template — รัน sql/07_pretest_checklist.sql แล้วนำเข้าใหม่');
  else {
    const tid = new Map(tpl.map(t => [`${t.section}|${t.seq}`, t.id]));
    await upsert('pretest_items', 'test_pack_id,template_id', answers.map(a => ({ test_pack_id: pid(a.d), template_id: tid.get(`${a.section}|${a.seq}`), answer: a.answer, remark: a.remark, answered_by: 'import CT9 xlsx' })).filter(r => r.template_id && r.test_pack_id));
  }
}
log('เสร็จสิ้น');
