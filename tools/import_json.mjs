// นำเข้า tb_test_pack_punch.json เข้า Supabase
//   dry-run (ค่าเริ่มต้น):  node tools/import_json.mjs "D:\Dowload\tb_test_pack_punch.json"
//   นำเข้าจริง:
//     $env:SUPABASE_URL="https://xxxx.supabase.co"; $env:SUPABASE_SERVICE_KEY="service_role key"
//     node tools/import_json.mjs "D:\Dowload\tb_test_pack_punch.json" --commit
// service_role key ใช้ในเครื่องเท่านั้น ห้ามใส่ในเว็บหรือ commit
import { readFileSync, existsSync } from 'node:fs';

const file = process.argv[2];
const commit = process.argv.includes('--commit');
if (!file) { console.error('ระบุพาธไฟล์ JSON'); process.exit(1); }

const rows = JSON.parse(readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));

const VALID_CATEGORY = new Set(['A', 'A1', 'B', 'C']);
const DISCIPLINE_FIX = { Enginerring: 'Engineering' };
const clean = (v) => {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === '' || /^please input/i.test(s) ? null : s;
};
// "09/14/22 00:00:00" (MM/DD/YY) -> "2022-09-14"
const toDate = (v) => {
  const m = clean(v)?.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (!m) return null;
  const y = m[3].length === 2 ? 2000 + +m[3] : +m[3];
  return `${y}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`;
};

const stats = { rows: rows.length, badCategory: {}, noDiscipline: 0, status: {} };
const packs = new Map();     // key project|pack
const drawings = new Map();  // key pack|drawing
const items = [];

for (const r of rows) {
  const project = clean(r.project_no), packNo = clean(r.test_pack_no);
  const dwg = clean(r.drawing_no) || '(ไม่ระบุ Drawing)';
  if (!project || !packNo) { stats.skipped = (stats.skipped || 0) + 1; continue; }

  const pk = `${project}|${packNo}`;
  if (!packs.has(pk)) packs.set(pk, { project_no: project, test_pack_no: packNo, skid: clean(r.skid) });
  const dk = `${pk}|${dwg}`;
  if (!drawings.has(dk)) drawings.set(dk, { _pack: pk, drawing_no: dwg, sheet: clean(r.sheet) });

  let category = clean(r.category), remarks = clean(r.remarks);
  if (category && !VALID_CATEGORY.has(category)) {
    stats.badCategory[category] = (stats.badCategory[category] || 0) + 1;
    remarks = [remarks, `[หมวดเดิมในไฟล์: ${category}]`].filter(Boolean).join(' ');
    category = null;
  }
  let discipline = clean(r.discipline);
  discipline = discipline ? (DISCIPLINE_FIX[discipline] || discipline) : null;
  if (!discipline) stats.noDiscipline++;

  const cancelled = r.punch_state === 'Cancelled';
  const status = cancelled ? 'cancelled' : toDate(r.complete_client_date) ? 'close' : 'open';   // สถานะตามฟอร์ม: open / close / cancelled
  stats.status[status] = (stats.status[status] || 0) + 1;

  items.push({
    legacy_id: r.test_pack_punch_id, _drawing: dk, item_no: r.item ?? null,
    category, deficiency: clean(r.deficiency), discipline, status,
    punch_by: clean(r.punch_by), punch_date: toDate(r.punch_date), input_date: toDate(r.input_date),
    bjc_by: clean(r.complete_bjc_by), bjc_date: toDate(r.complete_bjc_date),
    client_by: clean(r.complete_client_by), client_date: toDate(r.complete_client_date),
    remarks, cancel_by: clean(r.cancle_by), cancel_date: toDate(r.cancle_date),
    cancel_remark: clean(r.cancle_remark),
  });
}

console.log({ ...stats, testPacks: packs.size, drawings: drawings.size, skids: new Set([...packs.values()].map(p => p.skid)).size, items: items.length });
if (!commit) { console.log('\n(dry-run) ไม่ได้เขียนข้อมูล — เติม --commit เพื่อนำเข้าจริง'); process.exit(0); }

// อ่านค่าจาก .env (โฟลเดอร์โปรเจกต์) หรือ environment variable
const envFile = new URL('../.env', import.meta.url);
const fileEnv = existsSync(envFile) ? Object.fromEntries(readFileSync(envFile, 'utf8').split(/\r?\n/)
  .filter(l => l.includes('=') && !l.trim().startsWith('#'))
  .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; })) : {};
const URL_ = process.env.SUPABASE_URL || fileEnv.SUPABASE_URL;
const KEY = process.env.SUPABASE_SECRET_KEY || fileEnv.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_KEY;
if (!URL_ || !KEY) { console.error('ไม่พบ SUPABASE_URL / SUPABASE_SECRET_KEY ใน .env'); process.exit(1); }

async function upsert(table, onConflict, data) {
  const out = [];
  for (let i = 0; i < data.length; i += 1000) {
    const res = await fetch(`${URL_}/rest/v1/${table}?on_conflict=${onConflict}`, {
      method: 'POST',
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json',
                 Prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify(data.slice(i, i + 1000)),
    });
    if (!res.ok) throw new Error(`${table}: ${res.status} ${await res.text()}`);
    out.push(...await res.json());
    process.stdout.write(`\r${table}: ${Math.min(i + 1000, data.length)}/${data.length}   `);
  }
  console.log();
  return out;
}

const packRows = await upsert('test_packs', 'project_no,test_pack_no', [...packs.values()]);
const packId = new Map(packRows.map(p => [`${p.project_no}|${p.test_pack_no}`, p.id]));

const dwgRows = await upsert('drawings', 'test_pack_id,drawing_no',
  [...drawings.values()].map(({ _pack, ...d }) => ({ ...d, test_pack_id: packId.get(_pack) })));
const dwgId = new Map(dwgRows.map(d => [`${d.test_pack_id}|${d.drawing_no}`, d.id]));

await upsert('punch_items', 'legacy_id', items.map(({ _drawing, ...it }) => {
  const [project, pack, ...rest] = _drawing.split('|');
  return { ...it, drawing_id: dwgId.get(`${packId.get(`${project}|${pack}`)}|${rest.join('|')}`) };
}));
console.log('เสร็จสิ้น');
