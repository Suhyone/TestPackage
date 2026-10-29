// ข้อมูลจำลองสำหรับเดโม โครงการ "DEMO" (4 Test Package ครบทุกสถานะ: พร้อมทดสอบ / ติด gate / กำลังทำ / ยังไม่เริ่ม)
//   สร้าง (ล้างของเก่าของ DEMO ก่อนแล้วสร้างใหม่) : node tools/seed_demo.mjs
//   ลบข้อมูลเดโมทั้งหมด                           : node tools/seed_demo.mjs --cleanup
// ใช้ SUPABASE_URL / SUPABASE_SECRET_KEY จาก .env (ในเครื่องเท่านั้น) · แตะเฉพาะแถวที่ project_no = 'DEMO' เท่านั้น
// ต้องรัน sql/01–08 ก่อน (ใช้ pretest_template จาก sql/07) · ไม่สร้างรูป / ลายเซ็น / Pressure test (ไว้ให้ทำสดตอนเดโม)
import { readFileSync, existsSync } from 'node:fs';

const PROJECT = 'DEMO';
const fileEnv = {};
if (existsSync('.env')) for (const l of readFileSync('.env', 'utf8').split(/\r?\n/)) {
  const m = l.match(/^\s*([A-Z_]+)\s*=\s*(.*)$/); if (m) fileEnv[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
}
const URL_ = process.env.SUPABASE_URL || fileEnv.SUPABASE_URL, KEY = process.env.SUPABASE_SECRET_KEY || fileEnv.SUPABASE_SECRET_KEY;
if (!URL_ || !KEY) { console.error('ไม่พบ SUPABASE_URL / SUPABASE_SECRET_KEY ใน .env'); process.exit(1); }
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };

async function api(method, path, body, prefer) {
  const res = await fetch(`${URL_}/rest/v1/${path}`, { method, headers: { ...H, ...(prefer ? { Prefer: prefer } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path.split('?')[0]}: ${res.status} ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}
// PostgREST ต้องการคีย์ตรงกันทุกแถว: เติมคีย์ที่ขาดด้วยค่าใน defaults (ถ้ามี) ไม่เช่นนั้น null
const insert = (table, rows, defaults = {}) => {
  const keys = [...new Set(rows.flatMap(r => Object.keys(r)))];
  return api('POST', table, rows.map(r => Object.fromEntries(keys.map(k => [k, r[k] ?? defaults[k] ?? null]))), 'return=representation');
};

async function cleanup() {
  const packs = await api('GET', `test_packs?project_no=eq.${PROJECT}&select=id`);
  await api('DELETE', `test_packs?project_no=eq.${PROJECT}`, null, 'return=minimal');   // cascade: drawings, punch_items, rounds, pretest, iso, report
  await api('DELETE', `projects?project_no=eq.${PROJECT}`, null, 'return=minimal');
  return packs.length;
}

if (process.argv.includes('--cleanup')) {
  console.log(`ลบ test_packs ของ ${PROJECT} ${await cleanup()} แถว (และข้อมูลที่ผูกอยู่) · projects`);
  process.exit(0);
}

const day = (offset) => { const d = new Date(); d.setDate(d.getDate() + offset); return d.toISOString().slice(0, 10); };
const QC = 'Demo QC', SUP = 'Demo Supervisor', CLIENT = 'Demo Client Rep';

const removed = await cleanup();
if (removed) console.log(`ล้างข้อมูล DEMO เดิม ${removed} pack`);

await api('POST', 'projects?on_conflict=project_no', [{ project_no: PROJECT, project_name: 'DEMO - Internal Line Check (Unit 1)', client: 'DEMO CLIENT' }], 'resolution=merge-duplicates,return=minimal');

const tpl = await api('GET', 'pretest_template?select=id,section,seq,text&order=section,seq');
if (!tpl.length) throw new Error('ไม่พบ pretest_template — ต้องรัน sql/07_pretest_checklist.sql ก่อน');
const tplOf = (section, seq) => tpl.find(t => t.section === section && t.seq === seq);

const base = { project_no: PROJECT, unit_no: '1', contractor: 'BJCHI', test_stage: 'Pressure Test', location: 'On Module', test_medium: 'Nitrogen (N2)',
  fluid_code: 'N2', pipe_material: 'A106-B', design_pressure: '7.0', design_temp: '65', test_pressure: '10.5', holding_time_min: 30 };
const defs = [
  { ...base, test_pack_no: 'DEMO-TP-A1-1', module_no: 'A1-1', piping_system: '27A0B', piping_name: 'NITROGEN SUPPLY PIPING' },
  { ...base, test_pack_no: 'DEMO-TP-A1-2', module_no: 'A1-2', piping_system: '27A0C', piping_name: 'LUBE OIL RETURN PIPING', test_medium: 'Air', fluid_code: 'LO' },
  { ...base, test_pack_no: 'DEMO-TP-B1-1', module_no: 'B1-1', piping_system: '45A0A', piping_name: 'INSTRUMENT AIR PIPING', test_medium: 'Air', fluid_code: 'IA' },
  { ...base, test_pack_no: 'DEMO-TP-C1-1', module_no: 'C1-1', piping_system: '45A0C', piping_name: 'COOLING WATER PIPING', test_medium: 'Water', fluid_code: 'CW' },
];
const packs = await insert('test_packs?select=id,test_pack_no', defs);
const pid = Object.fromEntries(packs.map(p => [p.test_pack_no, p.id]));

// ใบ Punch List (หัวฟอร์ม) + ISO lines ของ 3 pack แรก
const live = ['DEMO-TP-A1-1', 'DEMO-TP-A1-2', 'DEMO-TP-B1-1'];
await insert('punch_reports', live.map((n, i) => ({ test_pack_id: pid[n], inspection_date: day(-7 + i), process_discipline: 'PIPING', test_stage: 'Pressure Test', pages: '1 of 1' })));
await insert('iso_lines', live.flatMap((n) => [1, 2, 3, 4].map((k) => ({
  test_pack_id: pid[n], item_no: k, iso_drawing_no: `ISO-${n.slice(8)}-0${k}`, iso_sht: `${k} OF 4`, iso_rev: '0', module_no: n.slice(8),
  line_no: `${n.slice(8).replace('-', '')}L10${k}`, spool_no: `SP-${k}`, fluid: 'N2', design_pressure: '7.0', design_temp: '65', test_pressure: '10.5',
  test_type: 'P', material: 'A106-B', pipe_npd: String([2, 3, 4, 6][k - 1]), source_key: `DEMO#${n}#ISO${k}` }))));

// drawings
const dwgDefs = [
  ['DEMO-TP-A1-1', 'ISO-A1-1-01'], ['DEMO-TP-A1-1', 'ISO-A1-1-02'],
  ['DEMO-TP-A1-2', 'ISO-A1-2-01'], ['DEMO-TP-A1-2', 'PRE-TEST CHECKLIST'],
  ['DEMO-TP-B1-1', 'ISO-B1-1-01'],
];
const dwgs = await insert('drawings?select=id,drawing_no,test_pack_id', dwgDefs.map(([n, d]) => ({ test_pack_id: pid[n], drawing_no: d, work_type: d === 'PRE-TEST CHECKLIST' ? null : 'welded' })));
const did = (n, d) => dwgs.find(x => x.test_pack_id === pid[n] && x.drawing_no === d).id;

// punch items — ข้อความตัวอย่างจากฟอร์ม Internal Punch List จริง (U-bolt / Liner plate)
const closed = (o) => ({ status: 'close', punch_by: QC, punch_date: day(-10), input_date: day(-10), bjc_by: SUP, bjc_date: day(-6), qci_by: QC, qci_date: day(-5), client_by: CLIENT, client_date: day(-4), ...o });
const open = (o) => ({ status: 'open', punch_by: QC, punch_date: day(-3), input_date: day(-3), discipline: 'Piping', ...o });
const items = await insert('punch_items?select=id,drawing_id,item_no,status', [
  // pack 1 — ปิดครบ (พร้อมทดสอบ)
  closed({ drawing_id: did('DEMO-TP-A1-1', 'ISO-A1-1-01'), item_no: 1, category: 'A', discipline: 'Piping', deficiency: 'U-bolt ต้องมีแก็บด้านบน 5 mm' }),
  closed({ drawing_id: did('DEMO-TP-A1-1', 'ISO-A1-1-01'), item_no: 2, category: 'B', discipline: 'Piping', deficiency: 'ใส่ U-Bolt' }),
  closed({ drawing_id: did('DEMO-TP-A1-1', 'ISO-A1-1-02'), item_no: 1, category: 'B', discipline: 'Piping', deficiency: 'ใส่ Linner plate 0.2 mm' }),
  // pack 2 — มี Category A เปิดอยู่ (ติด gate) + งานแก้ส่งแล้วรอ QC ตรวจ
  open({ drawing_id: did('DEMO-TP-A1-2', 'ISO-A1-2-01'), item_no: 1, category: 'A', deficiency: 'U-bolt ต้องมีแก็บด้านล่าง 14 mm', bjc_by: SUP, bjc_date: day(-1), fix_pending: true }),
  open({ drawing_id: did('DEMO-TP-A1-2', 'ISO-A1-2-01'), item_no: 2, category: 'B', deficiency: 'U-bolt ต้องมีแก็บด้านข้าง 10 mm\nน๊อตของ U-Bolt ต้องอยู่บน 1 ตัว ล่าง 1 ตัว' }),
  closed({ drawing_id: did('DEMO-TP-A1-2', 'ISO-A1-2-01'), item_no: 3, category: 'B', discipline: 'Piping', deficiency: 'ใส่ U-Bolt' }),
  // pack 3 — กำลังทำ มี B เปิด 2 รายการ
  open({ drawing_id: did('DEMO-TP-B1-1', 'ISO-B1-1-01'), item_no: 1, category: 'B', deficiency: 'U-bolt ต้องมีแก็บด้านบน 1 mm' }),
  open({ drawing_id: did('DEMO-TP-B1-1', 'ISO-B1-1-01'), item_no: 2, category: 'B', deficiency: 'ใส่ Linner plate 0.2 mm' }),
], { fix_pending: false });

// Pre-test: pack 1 = YES ครบ · pack 2 = YES ยกเว้น 2 ข้อที่ NO (ออก punch A ตามกติกาของระบบ) · pack 3 = ตอบ doc 1–12 · pack 4 = ยังไม่ตอบ
const ptItem = (n, t, answer, extra = {}) => ({ test_pack_id: pid[n], template_id: t.id, answer, answered_by: QC, answered_at: new Date(Date.now() - 86400000).toISOString(), ...extra });
const allYes = (n) => tpl.map(t => ptItem(n, t, 'yes'));

const noKeys = [['doc', 6, 'Gauge calibration certificate not yet received'], ['prep', 8, 'Two pipe supports not fitted']];
const noPunches = await insert('punch_items?select=id,source_key', noKeys.map(([sec, seq, remark], i) => {
  const t = tplOf(sec, seq);
  return { drawing_id: did('DEMO-TP-A1-2', 'PRE-TEST CHECKLIST'), item_no: i + 1, category: 'A', status: 'open', remarks: remark,
    deficiency: `Pre-test ${sec === 'doc' ? 'document' : 'preparation'} item ${seq}: ${t.text}`,
    source_key: `DEMO-TP-A1-2#PT-${sec === 'doc' ? 'D' : 'P'}${seq}`, punch_by: QC, punch_date: day(-3), input_date: day(-3) };
}));
const pt2 = tpl.map(t => {
  const k = noKeys.findIndex(([sec, seq]) => sec === t.section && seq === t.seq);
  return k < 0 ? ptItem('DEMO-TP-A1-2', t, 'yes') : ptItem('DEMO-TP-A1-2', t, 'no', { remark: noKeys[k][2], punch_item_id: noPunches[k].id });
});
await insert('pretest_items', [
  ...allYes('DEMO-TP-A1-1'), ...pt2,
  ...tpl.filter(t => t.section === 'doc' && t.seq <= 12).map(t => ptItem('DEMO-TP-B1-1', t, 'yes')),
]);

// ประวัติรอบของ punch ที่ปิดแล้ว / ส่งแก้แล้ว
const byKey = (dn, no, n) => items.find(i => i.drawing_id === did(n, dn) && i.item_no === no).id;
const rounds = [];
for (const [n, dn, no] of [['DEMO-TP-A1-1', 'ISO-A1-1-01', 1], ['DEMO-TP-A1-1', 'ISO-A1-1-01', 2], ['DEMO-TP-A1-1', 'ISO-A1-1-02', 1], ['DEMO-TP-A1-2', 'ISO-A1-2-01', 3]]) {
  const id = byKey(dn, no, n);
  rounds.push({ punch_item_id: id, round_no: 1, kind: 'defect', note: 'Found during internal line check', by_name: QC },
    { punch_item_id: id, round_no: 2, kind: 'fix', note: 'Corrected on site', by_name: SUP },
    { punch_item_id: id, round_no: 3, kind: 'recheck', result: 'pass', note: 'Verified OK', by_name: QC });
}
const fx = byKey('ISO-A1-2-01', 1, 'DEMO-TP-A1-2');
rounds.push({ punch_item_id: fx, round_no: 1, kind: 'defect', note: 'Found during internal line check', by_name: QC },
  { punch_item_id: fx, round_no: 2, kind: 'fix', note: 'Gap adjusted — please recheck', by_name: SUP });
await insert('punch_rounds', rounds);

console.log(`สร้างข้อมูลเดโมโครงการ ${PROJECT} แล้ว:`);
console.log('  DEMO-TP-A1-1  พร้อมทดสอบ  : Pre-test YES 30/30 · punch ปิดครบ 3');
console.log('  DEMO-TP-A1-2  ติด gate    : Pre-test NO 2 ข้อ (punch A อัตโนมัติ) · punch A เปิด 1 (ส่งแก้แล้วรอ QC) · B เปิด 1');
console.log('  DEMO-TP-B1-1  กำลังทำ     : Pre-test ตอบ 12/30 · punch B เปิด 2');
console.log('  DEMO-TP-C1-1  ยังไม่เริ่ม   : ไม่มี Pre-test / punch');
console.log('ลบทั้งหมด: node tools/seed_demo.mjs --cleanup');
