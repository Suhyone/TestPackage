// ทดสอบการ "เพิ่ม Test Package" ด้วยข้อมูลทดสอบโครงการ ZZ-TEST (ไม่สร้าง punch / drawing)
//   สร้าง + ตรวจ : node tools/test_add_pack.mjs
//   ลบทิ้งทั้งหมด: node tools/test_add_pack.mjs --cleanup
// ใช้ SUPABASE_URL / SUPABASE_SECRET_KEY จาก .env (ในเครื่องเท่านั้น) — secret key ข้าม RLS จึงไม่ได้ทดสอบสิทธิ์ของผู้ใช้
// แตะเฉพาะแถวที่ project_no = 'ZZ-TEST' เท่านั้น
import { readFileSync, existsSync } from 'node:fs';

const PROJECT = 'ZZ-TEST';
const fileEnv = {};
if (existsSync('.env')) for (const l of readFileSync('.env', 'utf8').split(/\r?\n/)) {
  const m = l.match(/^\s*([A-Z_]+)\s*=\s*(.*)$/); if (m) fileEnv[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
}
const URL_ = process.env.SUPABASE_URL || fileEnv.SUPABASE_URL, KEY = process.env.SUPABASE_SECRET_KEY || fileEnv.SUPABASE_SECRET_KEY;
if (!URL_ || !KEY) { console.error('ไม่พบ SUPABASE_URL / SUPABASE_SECRET_KEY ใน .env'); process.exit(1); }
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };

const call = async (method, path, body, extra = {}) => {
  const res = await fetch(`${URL_}/rest/v1/${path}`, { method, headers: { ...H, ...extra }, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  let json = null; try { json = text ? JSON.parse(text) : null; } catch { /* ไม่ใช่ JSON */ }
  return { ok: res.ok, status: res.status, json, text };
};
const results = [];
const check = (name, pass, detail = '') => { results.push(pass); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`); };

if (process.argv.includes('--cleanup')) {
  const before = await call('GET', `test_packs?project_no=eq.${PROJECT}&select=id`);
  const del = await call('DELETE', `test_packs?project_no=eq.${PROJECT}`, null, { Prefer: 'return=minimal' });
  const delP = await call('DELETE', `projects?project_no=eq.${PROJECT}`, null, { Prefer: 'return=minimal' });
  console.log(`ลบ test_packs ${before.json?.length ?? '?'} แถว (${del.status}) · projects (${delP.status})`);
  process.exit(del.ok ? 0 : 1);
}

// 1) เหมือน createPack() ใน tp_register.js: upsert projects แล้ว insert test_packs
const up = await call('POST', 'projects?on_conflict=project_no', [{ project_no: PROJECT }], { Prefer: 'resolution=ignore-duplicates,return=minimal' });
check('upsert projects ZZ-TEST', up.ok, `HTTP ${up.status}`);

const packs = [
  { project_no: PROJECT, test_pack_no: 'ZZ-TEST-TP-001', module_no: 'A1-1', piping_system: 'ZZ-SYS-1', piping_name: 'Test pack with unit 1', unit_no: '1' },
  { project_no: PROJECT, test_pack_no: 'ZZ-TEST-TP-002', module_no: 'A1-2', piping_system: 'ZZ-SYS-2', piping_name: 'Test pack with unit 1', unit_no: '1' },
  { project_no: PROJECT, test_pack_no: 'ZZ-TEST-TP-003', module_no: null, piping_system: null, piping_name: 'Test pack without module/unit' },
];
for (const p of packs) {
  const r = await call('POST', 'test_packs?select=id', p, { Prefer: 'return=representation' });
  const exists = r.status === 409;   // รันซ้ำ: ชนกับ unique (project_no, test_pack_no)
  check(`insert ${p.test_pack_no}`, r.ok || exists, r.ok ? `id=${r.json?.[0]?.id}` : exists ? 'มีอยู่แล้ว (ข้าม)' : `HTTP ${r.status} ${r.text.slice(0, 160)}`);
}

// 2) เพิ่มซ้ำต้องถูกปฏิเสธ (UI กันไว้ที่ฝั่งหน้าเว็บ + DB กันด้วย unique)
const dup = await call('POST', 'test_packs', packs[0], { Prefer: 'return=minimal' });
check('เพิ่ม pack ซ้ำถูกปฏิเสธโดย DB', !dup.ok && dup.status === 409, `HTTP ${dup.status}`);

// 3) ตรวจจาก view ที่หน้าเว็บอ่านจริง (Register / Field)
const reg = await call('GET', `v_test_packs?project_no=eq.${PROJECT}&select=test_pack_no,module_no,piping_system,items_total,items_open&order=test_pack_no`);
check('v_test_packs เห็น 3 pack', reg.ok && reg.json?.length === 3, reg.ok ? JSON.stringify(reg.json) : `HTTP ${reg.status} ${reg.text.slice(0, 160)}`);
check('pack ใหม่ยังไม่มี punch (items_total = 0)', reg.ok && reg.json?.every(r => !r.items_total), '');

// 4) unit_no (ใช้ในตัวกรอง Unit→Module ของฟอร์ม Add punch)
const units = await call('GET', `test_packs?project_no=eq.${PROJECT}&select=test_pack_no,unit_no,module_no&order=test_pack_no`);
check('อ่าน unit_no/module_no จาก test_packs ได้', units.ok && units.json?.length === 3, units.ok ? JSON.stringify(units.json) : `HTTP ${units.status} ${units.text.slice(0, 160)}`);

// 5) ต้องไม่มี drawing / punch เกิดขึ้นเอง
const ids = (await call('GET', `test_packs?project_no=eq.${PROJECT}&select=id`)).json?.map(r => r.id) ?? [];
const dr = await call('GET', `drawings?test_pack_id=in.(${ids.join(',') || 0})&select=id`);
check('ไม่มี drawing เกิดขึ้นเอง', dr.ok && dr.json?.length === 0, `drawings=${dr.json?.length}`);

const failed = results.filter(x => !x).length;
console.log(`\nสรุป: ผ่าน ${results.length - failed} / ${results.length}${failed ? ` · ไม่ผ่าน ${failed}` : ''}`);
console.log('ลบข้อมูลทดสอบ: node tools/test_add_pack.mjs --cleanup');
process.exit(failed ? 1 : 0);
