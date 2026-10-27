// นำเข้าชุดข้อมูลเสริมเข้า Supabase: ISO INDEX · Content checklist · Pre-test checklist (CT8) + Test Package / Drawing / Punch ของ CT3 และ CT5
//   CT8 : All_CT-8.xlsx (ตารางรวมของไฟล์ CT8 ทั้ง 13 ใบ)  -> test_packs(เฉพาะที่ยังไม่มี) · iso_lines · pack_documents · pretest_items
//   CT3 : tools/data/ct3/*.json (คู่มือ tools/data/AGENT_GUIDE.md) -> projects · test_packs · punch_reports · drawings · punch_items · iso_lines · pack_documents
//   CT5 : tools/data/ct5/*.json                                    -> projects · test_packs · punch_reports · drawings · punch_items · iso_lines
//
//   ตรวจก่อน (ไม่เขียนข้อมูล):  node tools/import_datasets.mjs
//   นำเข้าจริง              :  node tools/import_datasets.mjs --commit
//   ตัวเลือก: --xlsx "<path All_CT-8.xlsx>" · --only ct8|ct3|ct5 (ค่าเริ่มต้น = ทั้งหมด)
//   ต้องรัน sql/05–08 ใน Supabase ก่อน (pretest ต้องมี sql/07) — ใช้ SUPABASE_URL / SUPABASE_SECRET_KEY จาก .env (ในเครื่องเท่านั้น)
//   นำเข้าซ้ำได้: ข้อมูลหัว pack / คำตอบ pretest / punch ที่มีอยู่แล้ว "ไม่ถูกเขียนทับ" (ป้องกันงานที่ผู้ใช้แก้ในเว็บ) · iso_lines และ pack_documents อัปเดตตามไฟล์
import { readFileSync, existsSync } from 'node:fs';
import { loadBook, readSheet, excelDate } from './lib/xlsx_min.mjs';

const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const commit = process.argv.includes('--commit'), only = arg('--only');
const XLSX_PATH = arg('--xlsx') || 'D:/ฝึกงาน/file_puch_list/All_CT-8.xlsx';
const want = (k) => !only || only === k;
const J = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'));

// ---------- ตัวช่วย ----------
const nz = (v) => (v == null || String(v).trim() === '' || /^[-/\s]*$/.test(String(v))) ? null : String(v).trim();   // ว่าง / "-" / "/" = null
const txt = (v) => (v == null || String(v).trim() === '') ? null : String(v).trim();                                  // ว่างเท่านั้น = null ("-" เก็บไว้)
const intOrNull = (v) => { const n = parseInt(String(v ?? ''), 10); return Number.isFinite(n) ? n : null; };
const numOrNull = (v) => { const n = parseFloat(String(v ?? '').replace(/,/g, '')); return Number.isFinite(n) ? n : null; };
// ทำให้ทุกแถวมีคีย์ครบเท่ากัน (PostgREST ไม่รับ batch ที่คีย์ไม่เท่ากัน)
const uniform = (rows) => { const keys = [...new Set(rows.flatMap(r => Object.keys(r)))]; return rows.map(r => Object.fromEntries(keys.map(k => [k, r[k] ?? null]))); };
// source_key ที่ซ้ำในชุดเดียวกันให้ต่อท้าย ~2, ~3 (ข้อมูลต้นทางมีเลข item ซ้ำใน pack เดียวกัน)
function dedupeKeys(rows, field = 'source_key') {
  const seen = new Map();
  return rows.map(r => { const n = (seen.get(r[field]) || 0) + 1; seen.set(r[field], n); return n === 1 ? r : { ...r, [field]: `${r[field]}~${n}` }; });
}

// รวมผลที่อ่านได้ทั้งหมดไว้ที่เดียว แล้วค่อยเขียนทีเดียวตอนท้าย
const out = { projects: [], packs: [], reports: [], drawings: [], punch: [], iso: [], docs: [], pretest: [] };
const log = (...a) => console.log(...a);

// ============ CT8 : All_CT-8.xlsx ============
async function readCt8() {
  if (!existsSync(XLSX_PATH)) { log(`ข้าม CT8: ไม่พบ ${XLSX_PATH}`); return; }
  const book = loadBook(XLSX_PATH);
  const sheet = (name) => {
    const s = book.sheets.find(x => x.name === name); if (!s) throw new Error('ไม่พบชีต ' + name);
    const rows = readSheet(book, s.file), head = rows.get(1) || {};
    return [...rows.entries()].filter(([r]) => r > 1).sort((a, b) => a[0] - b[0]).map(([, c]) => Object.fromEntries(Object.entries(head).map(([k, h]) => [h, c[k] ?? null])));
  };
  const heads = sheet('TestPackages');
  const projects = new Map();
  for (const h of heads) {
    projects.set(h.Project_No, { project_no: h.Project_No, project_name: h.Project_Name, client: h.Client });
    out.packs.push({
      project_no: h.Project_No, test_pack_no: h.Test_Package_No, module_no: h.Module_No, location: h.Location, piping_system: h.Piping_System, piping_name: h.Piping_Name,
      pid_no: h.PID_No, test_medium: h.Test_Medium, insulation_spec: h.Insulation_Spec, insulation_thk: h.Insulation_Thk, design_pressure: h.Design_Pressure,
      design_temp: h.Design_Temp, fluid_code: h.Fluid_Code, pipe_material: h.Pipe_Material, test_pressure: h.Test_Pressure, holding_time_min: numOrNull(h.Holding_Time),
      rev_no: h.Rev_No, rev_description: h.Rev_Description, rev_date: excelDate(h.Rev_Date), prepared_by: h.Rev_Prepared_By, review_by: h.Rev_Review_By, approved_by: h.Rev_Approved_By,
      signed_prepared_name: nz(h.Sign_Prepared_By), signed_prepared_date: excelDate(h.Sign_Prepared_Date), contractor: 'BJCHI',
    });
  }
  out.projects.push(...projects.values());
  const P = (no) => ({ project_no: 'CT8', test_pack_no: no });

  // ISO INDEX (110 แถว): คีย์ = pack + ชีตต้นทาง + แถวต้นทาง
  out.iso.push(...sheet('ISO_Index').map(r => ({ ...P(r.Test_Package_No), source_key: `${r.Test_Package_No}#${r.Index_Sheet}#${r.Source_Row}`, item_no: intOrNull(r.No),
    iso_drawing_no: txt(r.Iso_Drawing_No), iso_sht: txt(r.Iso_Sht), iso_rev: txt(r.Iso_Rev), pid_drawing_no: nz(r.PID_Drawing_No), pid_sht: nz(r.PID_Sht), pid_rev: nz(r.PID_Rev),
    module_no: txt(r.Module_No), line_no: txt(r.Line_No), spool_no: txt(r.Spool_No), fluid: txt(r.Fluid), design_pressure: txt(r.Design_Pressure_MPag_bar), design_temp: txt(r.Design_Temp_C),
    test_pressure: txt(r.Test_Pressure), test_type: txt(r.Test_Type), material: txt(r.Material), insulation_spec: txt(r.Insulation_Spec), insulation_thk: txt(r.Insulation_Thk_mm),
    pipe_npd: txt(r.Pipe_NPD_in), remark: txt(r.Remark) })));

  // Content checklist (Sheet2) รวมกับชื่อหมวดจากใบคั่น SECTION (Section_Sheets)
  const secs = new Map(sheet('Section_Sheets').map(r => [`${r.Test_Package_No}|${r.Section_No}`, r]));
  out.docs.push(...sheet('Content_Checklist').map(r => { const s = secs.get(`${r.Test_Package_No}|${r.Section_No}`);
    return { ...P(r.Test_Package_No), section_no: intOrNull(r.Section_No), title: txt(s?.Description), content: txt(r.Content), verify: r.Verify_YES === 'YES' ? 'YES' : 'N/A', marker: txt(s?.Section_Marker) }; }));

  // Pre-test checklist (Sheet5): Status YES / NO / N/A -> yes / no / na   (เทียบกับแม่แบบด้วยลำดับข้อ)
  const ans = (s) => ({ YES: 'yes', NO: 'no', 'N/A': 'na' })[String(s).toUpperCase()] || null;
  for (const r of sheet('Doc_Checklist')) if (ans(r.Status)) out.pretest.push({ ...P(r.Test_Package_No), section: 'doc', seq: intOrNull(r.Item_No), answer: ans(r.Status), remark: null });
  for (const r of sheet('Test_Prep_Checklist')) if (ans(r.Status)) out.pretest.push({ ...P(r.Test_Package_No), section: 'prep', seq: intOrNull(r.Item_No), answer: ans(r.Status), remark: txt(r.Remarks) });
  log(`CT8 : pack ${heads.length} · iso ${out.iso.length} · content ${out.docs.length} · pretest ${out.pretest.length}`);
}

// ============ CT3 : JSON (คู่มือ AGENT_GUIDE.md) ============
function readCt3() {
  const packs = J('./data/ct3/tb_test_pack.json'), iso = J('./data/ct3/tb_test_pack_iso.json'), punch = J('./data/ct3/tb_test_pack_punch.json'), chk = J('./data/ct3/tb_test_pack_checklist.json');
  const before = { iso: out.iso.length, punch: out.punch.length };
  out.projects.push({ project_no: 'CT3', project_name: packs[0].project_name, client: packs[0].client });
  for (const p of packs) out.packs.push({ project_no: 'CT3', test_pack_no: p.test_pack_no, module_no: p.block_module_no || p.module_name, location: p.location, piping_system: p.piping_system,
    piping_name: p.description, rev_no: p.rev_no, rev_description: p.rev_description, rev_date: p.rev_date, prepared_by: p.prepared_by, review_by: p.reviewed_by, approved_by: p.approved_by,
    unit_no: p.unit_no, contractor: p.contractor, test_stage: p.test_stage });
  const first = new Map();
  for (const u of punch) if (!first.has(u.report_no)) first.set(u.report_no, u);
  for (const [no, u] of first) out.reports.push({ project_no: 'CT3', test_pack_no: no, inspection_date: u.inspection_date, process_discipline: u.process_discipline, test_stage: u.test_stage });
  out.iso.push(...iso.map(r => ({ project_no: 'CT3', test_pack_no: r.test_package_no, source_key: `CT3|${r.test_package_no}#${r.item_no}`, item_no: r.item_no,
    iso_drawing_no: txt(r.iso_drawing_no), iso_sht: txt(r.iso_sht), iso_rev: txt(r.iso_rev), pid_drawing_no: txt(r.pid_drawing_no), pid_sht: txt(r.pid_sht), pid_rev: txt(r.pid_rev), module_no: txt(r.module_no),
    line_no: txt(r.line_no), spool_no: txt(r.spool_no), fluid: txt(r.fluid), design_pressure: txt(r.design_pressure_mpag_bar), design_temp: txt(r.design_temperature_c), test_pressure: txt(r.test_pressure_bar),
    test_type: txt(r.test_type), material: txt(r.material), insulation_spec: txt(r.insulation_spec), insulation_thk: txt(r.insulation_thk_mm), pipe_npd: txt(r.pipe_npd_in), remark: txt(r.remark) })));
  out.punch.push(...dedupeKeys(punch.map(u => ({ project_no: 'CT3', test_pack_no: u.report_no, source_key: `CT3|${u.report_no}#${u.item_no}`, item_no: u.item_no, drawing_no: u.drawing_no || '(no drawing)',
    deficiency: u.punch_list_description, category: ['A', 'B'].includes(u.category) ? u.category : null, status: u.status === 'CLOSED' ? 'close' : 'open', discipline: 'Piping',
    bjc_by: u.punch_closing_prod_sup, qci_by: u.punch_closing_qci, client_by: u.punch_closing_client_rep, remarks: u.remarks, punch_date: u.inspection_date }))));
  out.docs.push(...chk.map(r => ({ project_no: 'CT3', test_pack_no: r.test_package_no, section_no: intOrNull(r.section_no), title: null, content: txt(r.content_list),
    verify: r.verify_status === 'YES' ? 'YES' : 'N/A', marker: null })));
  log(`CT3 : pack ${packs.length} · iso ${out.iso.length - before.iso} · punch ${out.punch.length - before.punch} · content ${chk.length}`);
}

// ============ CT5 : JSON ============
function readCt5() {
  const packs = J('./data/ct5/ct5_test_packs.json'), dr = J('./data/ct5/ct5_drawings.json'), pu = J('./data/ct5/ct5_punches.json');
  const hasData = new Set([...dr.map(d => d.test_pack_no), ...pu.map(p => p.test_pack_no)]);
  // แถวที่ไม่มี drawing / punch และไม่มีระบบท่อ = ไฟล์ที่ไม่ใช่ Test Package (เช่น Weld Map) ข้ามไว้
  const real = packs.filter(p => hasData.has(p.test_pack_no) || p.piping_system);
  const skipped = packs.filter(p => !real.includes(p)).map(p => p.test_pack_no);
  out.projects.push({ project_no: 'CT5', project_name: packs[0].project_name, client: packs[0].client });
  for (const p of real) out.packs.push({ project_no: 'CT5', test_pack_no: p.test_pack_no, module_no: p.module_no, piping_system: p.piping_system, piping_name: p.piping_name, pid_no: p.pid_no,
    test_medium: p.test_medium, test_pressure: p.test_pressure, design_pressure: p.design_pressure, design_temp: p.design_temp, holding_time_min: numOrNull(p.holding_time_min),
    prepared_by: p.prepared_by, review_by: p.reviewed_by, unit_no: p.unit, test_stage: p.stage });
  const stage = new Map(pu.map(p => [p.test_pack_no, p]));
  for (const [no, p] of stage) out.reports.push({ project_no: 'CT5', test_pack_no: no, inspection_date: null, process_discipline: p.discipline, test_stage: p.punch_stage });
  out.iso.push(...dedupeKeys(dr.map(d => ({ project_no: 'CT5', test_pack_no: d.test_pack_no, source_key: `CT5|${d.test_pack_no}#${d.item_no}`, item_no: d.item_no, iso_drawing_no: txt(d.drawing_no),
    iso_sht: txt(d.sheet), iso_rev: txt(d.rev), pid_drawing_no: txt(d.pid_no), module_no: txt(d.module_no) }))));
  out.punch.push(...dedupeKeys(pu.map(p => ({ project_no: 'CT5', test_pack_no: p.test_pack_no, source_key: `CT5|${p.test_pack_no}#${p.item_no}`, item_no: p.item_no, drawing_no: nz(p.drawing_no) || '(no drawing)',
    deficiency: p.deficiency, category: ['A', 'B'].includes(p.category) ? p.category : null, status: p.status === 'CLOSED' ? 'close' : 'open', discipline: p.discipline || 'Piping' }))));
  log(`CT5 : pack ${real.length} (ข้าม ${skipped.length}: ${skipped.join(', ') || '-'}) · iso ${dr.length} · punch ${pu.length}`);
}

if (want('ct8')) await readCt8();
if (want('ct3')) readCt3();
if (want('ct5')) readCt5();

// ---------- ตรวจความสมบูรณ์ก่อนเขียน ----------
const packKeys = new Set(out.packs.map(p => `${p.project_no}|${p.test_pack_no}`));
const orphan = (rows, name) => { const bad = [...new Set(rows.filter(r => !packKeys.has(`${r.project_no}|${r.test_pack_no}`)).map(r => `${r.project_no}|${r.test_pack_no}`))]; if (bad.length) log(`  ! ${name}: ไม่มี pack ในชุด -> ${bad.join(', ')}`); };
orphan(out.iso, 'iso'); orphan(out.docs, 'docs'); orphan(out.punch, 'punch'); orphan(out.pretest, 'pretest'); orphan(out.reports, 'reports');
const byProject = (rows) => Object.entries(rows.reduce((m, r) => (m[r.project_no] = (m[r.project_no] || 0) + 1, m), {})).map(([k, v]) => `${k}=${v}`).join(' ');
log(`\nสรุป : projects ${out.projects.length} · packs [${byProject(out.packs)}] · iso [${byProject(out.iso)}] · content [${byProject(out.docs)}] · pretest [${byProject(out.pretest)}] · punch [${byProject(out.punch)}]`);
if (!commit) { log('\n(dry-run) ยังไม่เขียนข้อมูล — เติม --commit เพื่อนำเข้าจริง'); process.exit(0); }

// ---------- เขียนลง Supabase ----------
const envFile = new URL('../.env', import.meta.url);
const fileEnv = existsSync(envFile) ? Object.fromEntries(readFileSync(envFile, 'utf8').split(/\r?\n/).filter(l => l.includes('=') && !l.trim().startsWith('#'))
  .map(l => { const k = l.indexOf('='); return [l.slice(0, k).trim(), l.slice(k + 1).trim().replace(/^["']|["']$/g, '')]; })) : {};
const URL_ = process.env.SUPABASE_URL || fileEnv.SUPABASE_URL, KEY = process.env.SUPABASE_SECRET_KEY || fileEnv.SUPABASE_SECRET_KEY;
if (!URL_ || !KEY) { console.error('ไม่พบ SUPABASE_URL / SUPABASE_SECRET_KEY ใน .env'); process.exit(1); }
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };

// mode: 'merge' = อัปเดตทับ · 'ignore' = ถ้ามีแล้วไม่แตะ
async function upsert(table, onConflict, rows, mode = 'merge') {
  if (!rows.length) return;
  for (let i = 0; i < rows.length; i += 500) {
    const res = await fetch(`${URL_}/rest/v1/${table}?on_conflict=${onConflict}`, { method: 'POST',
      headers: { ...H, Prefer: `resolution=${mode === 'merge' ? 'merge' : 'ignore'}-duplicates,return=minimal` }, body: JSON.stringify(uniform(rows.slice(i, i + 500))) });
    if (!res.ok) throw new Error(`${table}: ${res.status} ${await res.text()}`);
  }
  log(`  ${table}: ${rows.length} (${mode})`);
}
async function get(path) {
  const res = await fetch(`${URL_}/rest/v1/${path}`, { headers: H });
  if (!res.ok) throw new Error(`${path}: ${res.status} ${await res.text()}`);
  return res.json();
}

await upsert('projects', 'project_no', [...new Map(out.projects.map(p => [p.project_no, p])).values()], 'ignore');
await upsert('test_packs', 'project_no,test_pack_no', out.packs, 'ignore');
const packId = new Map((await get('test_packs?select=id,project_no,test_pack_no')).map(r => [`${r.project_no}|${r.test_pack_no}`, r.id]));
const pid = (r) => packId.get(`${r.project_no}|${r.test_pack_no}`);
const strip = ({ project_no, test_pack_no, ...rest }) => rest;

await upsert('punch_reports', 'test_pack_id', out.reports.map(r => ({ test_pack_id: pid(r), ...strip(r) })), 'ignore');
await upsert('iso_lines', 'source_key', out.iso.map(r => ({ test_pack_id: pid(r), ...strip(r) })));
await upsert('pack_documents', 'test_pack_id,section_no', out.docs.map(r => ({ test_pack_id: pid(r), ...strip(r) })));

// drawings + punch_items (CT3 / CT5)
const dwg = new Map();
for (const p of out.punch) dwg.set(`${pid(p)}|${p.drawing_no}`, { test_pack_id: pid(p), drawing_no: p.drawing_no });
for (const r of out.iso.filter(r => r.project_no !== 'CT8' && r.iso_drawing_no && r.iso_drawing_no !== '-')) dwg.set(`${pid(r)}|${r.iso_drawing_no}`, { test_pack_id: pid(r), drawing_no: r.iso_drawing_no, sheet: r.iso_sht });
await upsert('drawings', 'test_pack_id,drawing_no', [...dwg.values()], 'ignore');
const dwgId = new Map((await get('drawings?select=id,test_pack_id,drawing_no&limit=10000')).map(r => [`${r.test_pack_id}|${r.drawing_no}`, r.id]));
await upsert('punch_items', 'source_key', out.punch.map(({ drawing_no, ...r }) => ({ drawing_id: dwgId.get(`${pid(r)}|${drawing_no}`), ...strip(r) })), 'ignore');

// pretest (CT8): ต้องมีแม่แบบจาก sql/07
if (out.pretest.length) {
  const tpl = await get('pretest_template?select=id,section,seq').catch(() => null);
  if (!tpl?.length) log('  ! ข้าม pretest: ยังไม่มีตาราง/แม่แบบ pretest_template — รัน sql/07_pretest_checklist.sql แล้วนำเข้าใหม่ (--only ct8)');
  else {
    const tid = new Map(tpl.map(t => [`${t.section}|${t.seq}`, t.id]));
    const rows = out.pretest.map(r => ({ test_pack_id: pid(r), template_id: tid.get(`${r.section}|${r.seq}`), answer: r.answer, remark: r.remark, answered_by: 'import All_CT-8.xlsx' })).filter(r => r.template_id && r.test_pack_id);
    await upsert('pretest_items', 'test_pack_id,template_id', rows, 'ignore');
  }
}
log('เสร็จสิ้น');
