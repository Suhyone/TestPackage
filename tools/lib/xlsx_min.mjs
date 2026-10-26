// อ่านไฟล์ .xlsx แบบเบา ๆ ไม่ต้องติดตั้งไลบรารี (xlsx = ไฟล์ zip ที่ข้างในเป็น XML)
// ใช้: const book = loadBook('file.xlsx'); const rows = readSheet(book, sheet.file);
import { readFileSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';

// อ่านไฟล์ zip ทั้งไฟล์ คืนฟังก์ชัน read(ชื่อไฟล์ในzip) -> ข้อความ  (ไฟล์ที่ Excel เปิดค้างไว้อ่านได้)
function openZip(path) {
  const buf = readFileSync(path);
  let e = buf.length - 22;
  while (e >= 0 && buf.readUInt32LE(e) !== 0x06054b50) e--;              // หา End Of Central Directory
  if (e < 0) throw new Error('ไม่ใช่ไฟล์ xlsx: ' + path);
  const n = buf.readUInt16LE(e + 10);
  let p = buf.readUInt32LE(e + 16);
  const entries = new Map();
  for (let i = 0; i < n; i++, p += 46 + 0) {
    if (buf.readUInt32LE(p) !== 0x02014b50) break;
    const nameLen = buf.readUInt16LE(p + 28), extraLen = buf.readUInt16LE(p + 30), commentLen = buf.readUInt16LE(p + 32);
    entries.set(buf.toString('utf8', p + 46, p + 46 + nameLen), { method: buf.readUInt16LE(p + 10), size: buf.readUInt32LE(p + 20), offset: buf.readUInt32LE(p + 42) });
    p += nameLen + extraLen + commentLen;
  }
  return (name) => {
    const f = entries.get(name); if (!f) return null;
    const o = f.offset, start = o + 30 + buf.readUInt16LE(o + 26) + buf.readUInt16LE(o + 28);
    const data = buf.subarray(start, start + f.size);
    return (f.method === 8 ? inflateRawSync(data) : data).toString('utf8');
  };
}

const dec = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&')
  .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).replace(/_x000D_/g, '');
const colNum = (ref) => ref.replace(/\d+/g, '').split('').reduce((n, c) => n * 26 + c.charCodeAt(0) - 64, 0);

// รายชื่อชีต + ตารางข้อความ (sharedStrings)
export function loadBook(path) {
  const rd = openZip(path);
  const wb = rd('xl/workbook.xml'), rels = rd('xl/_rels/workbook.xml.rels'), relMap = {};
  for (const m of rels.matchAll(/<Relationship [^>]*>/g)) {
    const id = /Id="([^"]+)"/.exec(m[0])?.[1], t = /Target="([^"]+)"/.exec(m[0])?.[1]; if (id) relMap[id] = t;
  }
  const sheets = [...wb.matchAll(/<sheet [^>]*>/g)].map(m => ({
    name: dec(/name="([^"]*)"/.exec(m[0])[1]),
    file: 'xl/' + relMap[/r:id="([^"]+)"/.exec(m[0])[1]].replace(/^\/?(xl\/)?/, ''),
  }));
  const sstXml = rd('xl/sharedStrings.xml');
  const sst = sstXml ? [...sstXml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map(m => dec([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map(x => x[1]).join(''))) : [];
  return { sheets, sst, rd };
}

// คืน Map แถว -> { เลขคอลัมน์: ข้อความ } (เฉพาะเซลล์ที่มีค่า)
export function readSheet(book, file) {
  const xml = book.rd(file), rows = new Map();
  for (const c of xml.matchAll(/<c ([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
    const attrs = c[1], body = c[2] || '', ref = /r="([A-Z]+\d+)"/.exec(attrs)?.[1]; if (!ref) continue;
    const t = /t="([^"]+)"/.exec(attrs)?.[1], v = /<v>([\s\S]*?)<\/v>/.exec(body)?.[1];
    let val = null;
    if (t === 's' && v != null) val = book.sst[+v];
    else if (t === 'inlineStr') val = dec([...body.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map(x => x[1]).join(''));
    else if (v != null) val = dec(v);
    if (val == null || String(val).trim() === '') continue;
    const r = +ref.replace(/[A-Z]+/, '');
    if (!rows.has(r)) rows.set(r, {});
    rows.get(r)[colNum(ref)] = String(val).trim();
  }
  return rows;
}

// วันที่แบบ Excel (เลขลำดับวัน) -> 'YYYY-MM-DD' ; ถ้าไม่ใช่ตัวเลขคืนค่าเดิม/null
export function excelDate(v) {
  if (v == null || v === '') return null;
  if (/^\d+(\.\d+)?$/.test(String(v))) return new Date(Date.UTC(1899, 11, 30) + Math.round(+v) * 86400000).toISOString().slice(0, 10);
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/.exec(String(v));            // dd/mm/yyyy
  return m ? `${m[3].length === 2 ? 2000 + +m[3] : m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : null;
}
