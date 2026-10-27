// ตัวช่วยที่ใช้ร่วมกันของหน้า Punch List (admin: punch_list.js) และหน้างานตรวจ/งานของฉัน (qc_list.js)
// สถานะของ punch item: ชื่อที่แสดง + คลาสสี (bg-s-* ใน app.css)
// ตามฟอร์ม Punch List ของโครงการ: O = Open, C = Close, N = Cancelled (ห้ามเพิ่มสถานะอื่น) — code = ตัวย่อในฟอร์ม ใช้ตอน Export
const STATUS = {
  open:      { label: 'Open',      code: 'O', cls: 'bg-s-open' },
  close:     { label: 'Closed',    code: 'C', cls: 'bg-s-approved' },
  cancelled: { label: 'Cancelled', code: 'N', cls: 'bg-s-cancelled' },
};
// สีป้าย Category (A=แดง, A1=เหลือง, B=ฟ้า, C=เขียว)
const CAT_CLS = { A: 'danger', A1: 'warning', B: 'info', C: 'success' };
// ชื่อ pack พิเศษของ External punch (ตำหนิที่ไม่อยู่ใน Test Package ใด) — โครงการละ 1 pack · ซ่อนจาก Register และไม่นับใน gate ทดสอบแรงดัน (sql/10_external_punch.sql)
const EXTERNAL_PACK = "EXTERNAL";
// ชื่อที่แสดงของ pack (EXTERNAL → ป้าย External)
const packLabel = (no) => no === EXTERNAL_PACK ? "<span class=\"badge badge-secondary\">External</span>" : esc(no);
// ทางลัดสำหรับ document.getElementById
const $ = (id) => document.getElementById(id);
// วันที่วันนี้รูปแบบ YYYY-MM-DD (ใช้บันทึกวันที่ลงฐานข้อมูล)
// ใช้วันตามเวลาเครื่อง (ไม่ใช่ UTC) กันวันที่คลาดไป 1 วันช่วงเช้ามืดเวลาไทย
const today = () => new Date().toLocaleDateString('sv-SE');
// แสดงข้อความผิดพลาดให้ผู้ใช้ (ข้อความอ่านง่าย ของดิบอยู่ใน console)
const alertErr = (e) => alert(friendlyErr(e));
// แถบ Undo มุมล่างของจอ: บอกสิ่งที่เพิ่งทำ + ปุ่ม Undo อยู่ 8 วินาที (ใช้แทนหน้าต่างยืนยันกับการกระทำที่ย้อนได้ เช่น ปิดงาน / เปิดใหม่)
function showUndo(text, undo) {
  let bar = $("undoBar");
  if (!bar) { bar = document.createElement("div"); bar.id = "undoBar"; bar.setAttribute("role", "status"); bar.setAttribute("aria-live", "polite"); document.body.appendChild(bar); }
  clearTimeout(showUndo.t);
  bar.innerHTML = `<span class="undo-text"></span><button type="button" class="btn btn-sm btn-warning undo-btn"><i class="fas fa-undo"></i> Undo</button>`;
  bar.querySelector(".undo-text").textContent = text;
  const hide = () => bar.classList.remove("show");
  bar.querySelector(".undo-btn").onclick = async (e) => { e.currentTarget.disabled = true; clearTimeout(showUndo.t); try { await undo(); bar.querySelector(".undo-text").textContent = "Undone"; } catch (err) { alertErr(err); } showUndo.t = setTimeout(hide, 1500); };
  bar.classList.add("show"); showUndo.t = setTimeout(hide, 8000);
}
// ดึงข้อมูลทีละ 1,000 แถว (ข้อจำกัดของ Supabase) จนครบ
async function fetchAll(build) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await build().range(from, from + 999);
    if (error) throw error;
    out.push(...data);
    if (data.length < 1000) return out;
  }
}
// คำสั่ง select ดึง item พร้อม drawing และ test pack ในครั้งเดียว
const SELECT = '*, drawings!inner(id,drawing_no,work_type,report_path,report_note,test_pack_id,' +
               'test_packs!inner(test_pack_no,skid,project_no))';

// ---------- diff ของข้อความ (ประวัติการแก้ Description แบบ git diff) ----------
// เทียบทีละ "คำ" (ตัดที่ช่องว่าง/เครื่องหมาย) ถ้าข้อความแทบไม่มีช่องว่าง (เช่น ภาษาไทยติดกัน) ใช้ทีละตัวอักษรแทน · ข้อความยาวมากถูกเทียบทั้งก้อน กันหน้าค้าง
// คืนลิสต์ [{ t: 'same' | 'del' | 'add', s: ข้อความ }] ส่วนที่ติดกันชนิดเดียวกันถูกรวมแล้ว
function diffWords(a, b) {
  a = String(a ?? ''); b = String(b ?? '');
  const split = (x) => x.split(/(\s+|[.,;:()/\-])/).filter(t => t !== '');
  let A = split(a), B = split(b);
  if (A.filter(t => t.trim()).length < 3 && B.filter(t => t.trim()).length < 3 && (a.length > 12 || b.length > 12)) { A = Array.from(a); B = Array.from(b); }
  const out = [], push = (t, s) => { if (!s) return; const l = out.at(-1); if (l && l.t === t) l.s += s; else out.push({ t, s }); };
  if (A.length * B.length > 40000) { if (a !== b) { push('del', a); push('add', b); } else push('same', a); return out; }
  const n = A.length, m = B.length, L = Array.from({ length: n + 1 }, () => new Int16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = A[i] === B[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (A[i] === B[j]) { push('same', A[i]); i++; j++; }
    else if (L[i + 1][j] >= L[i][j + 1]) push('del', A[i++]); else push('add', B[j++]);
  }
  while (i < n) push('del', A[i++]); while (j < m) push('add', B[j++]);
  return out;
}
// diff เป็น HTML (ทุกส่วนผ่าน esc) — ส่วนที่ลบ = <del> ขีดฆ่า+พื้นแดง · ส่วนที่เพิ่ม = <ins> ขีดเส้นใต้+พื้นเขียว (ไม่ใช้สีอย่างเดียวบอกการเปลี่ยน)
const diffHtml = (a, b) => diffWords(a, b).map(p => p.t === 'del' ? `<del class="diff-del">${esc(p.s)}</del>` : p.t === 'add' ? `<ins class="diff-add">${esc(p.s)}</ins>` : esc(p.s)).join('');
