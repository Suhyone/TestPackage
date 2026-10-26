// qc_list.js — Punch List แบบย่อ (QA/QC และเจ้าหน้าที่): ชิปสถานะ (Open/Close/Cancelled) + ค้นหา + ตาราง 6 คอลัมน์ (Test Package / Drawing / Item / Description / Category / Status)
// รายละเอียดทั้งหมดอยู่ในแผงขวา (openDetail ใน punch_detail.js) จึงต้องมี state / me / canQC / renderStats / applyFilters ชื่อเดียวกับหน้า admin
// โหลดข้อมูลแบบค่อยเป็นค่อยไป: หน้าแรก (1,000 แถว) แสดงทันที แล้วดึงหน้าที่เหลือเบื้องหลัง · วาดแถวเพิ่มอัตโนมัติเมื่อเลื่อนถึงท้ายตาราง (ไม่มีปุ่ม Show more)
const state = { rows: [], counts: {}, counted: new Map(), drawings: new Map(), packs: [], categories: [], disciplines: [], f: { project: '', skid: '', q: '' } };
let me, canQC = false, loadSeq = 0;
// สถานะที่เลือกอยู่ (เลือกได้อันเดียว; ว่าง = All)
const sel = new Set();
const CHIPS = Object.keys(STATUS);
// วาดแถวทีละ PAGE · IDLE_MAX = จำนวนแถวที่วาดล่วงหน้าเงียบ ๆ ตอนว่าง (เลื่อนแล้วลื่น) · loading = กำลังดึงหน้าที่เหลือเบื้องหลังอยู่ไหม
const PAGE = 150, IDLE_MAX = 900;
let viewRows = [], rendered = 0, ctx = { pack: null, dwg: null }, loading = false, loaded = 0, total = 0;

// ---------- init ----------
async function init() {
  ({ me } = await appReady);
  canQC = me.role === 'qc' || me.role === 'admin';                         // admin ใช้หน้านี้เหมือน QC (ตารางแบบเต็มอยู่ที่ punch_list.php เมนู Advanced Grid)
  $('pageHead').textContent = canQC ? 'Punch List' : 'Items to Fix';
  sel.add('open');                                                          // เริ่มที่งานที่ยัง Open
  const tpParam = new URLSearchParams(location.search).get('tp');          // มาจากหน้ารายละเอียด Test Package: ค้นหาด้วยเลข pack และแสดงทุกสถานะ
  if (tpParam) { sel.clear(); $('qSearch').value = tpParam; state.f.q = tpParam.toLowerCase(); }                                                          // เริ่มที่งานที่ยัง Open
  if (canQC) { $('btnAdd').classList.remove('d-none'); $('btnCsv').classList.remove('d-none'); }

  const [cats, discs, packs] = await Promise.all([
    sb.from('categories').select('*').order('sort_order'),
    sb.from('disciplines').select('*').order('sort_order'),
    fetchAll(() => sb.from('test_packs').select('id,project_no,test_pack_no,skid').order('test_pack_no')),
  ]);
  state.categories = cats.data || []; state.disciplines = discs.data || [];
  state.packs = packs;

  const projects = [...new Set(packs.map(p => p.project_no))].sort();
  $('fProject').innerHTML = '<option value="">All</option>' + projects.map(p => `<option>${esc(p)}</option>`).join('');
  $('projectBox').classList.replace('d-none', 'd-flex');                    // Project No. อยู่ที่ header ข้างปุ่ม Home
  fillSkids();
  $('fProject').onchange = () => { state.f.project = $('fProject').value; state.f.skid = ''; fillSkids(); loadData(); };
  $('fSkid').onchange = () => { state.f.skid = $('fSkid').value; loadData(); };
  bindAdd();
  await loadData();
}
// เติมรายการ Skid ตาม Project ที่เลือก
function fillSkids() {
  const inProj = state.packs.filter(p => !state.f.project || p.project_no === state.f.project);
  const skids = [...new Set(inProj.map(p => p.skid).filter(Boolean))].sort();
  $('fSkid').innerHTML = '<option value="">All Skids</option>' + skids.map(s => `<option>${esc(s)}</option>`).join('');
}

// ---------- โหลดข้อมูล ----------
// ใช้ view v_punch_items (sql/04_v_punch_items.sql) ที่ให้ฐานข้อมูลเรียง Test Package > Drawing > Item ให้ตั้งแต่ต้น
// → แต่ละชุดที่ดึงมาต่อท้ายตารางได้เลย ไม่ต้องเรียงใหม่ แถวบนสุดจึงนิ่ง (ถ้ายังไม่ได้สร้าง view จะถอยไปใช้วิธีเดิม: ดึงครบก่อนแล้วเรียงทีเดียว)
let viewOk = true;
// เงื่อนไขร่วมของทุกคำสั่ง: Project + Skid (ชื่อคอลัมน์ต่างกันระหว่าง view กับตารางเดิม)
function scoped(q) {
  if (state.f.project) q = q.eq(viewOk ? 'project_no' : 'drawings.test_packs.project_no', state.f.project);
  if (state.f.skid) q = q.eq(viewOk ? 'skid' : 'drawings.test_packs.skid', state.f.skid);
  return q;
}
// จำนวนตามสถานะนับจากฐานข้อมูลโดยตรง (ไม่ต้องโหลดแถวทั้งหมด — งานจริงมีหลายหมื่นรายการ)
async function loadCounts() {
  const res = await Promise.all(CHIPS.map(k => scoped(viewOk
    ? sb.from('v_punch_items').select('id', { count: 'exact', head: true }).eq('status', k)
    : sb.from('punch_items').select('id, drawings!inner(test_packs!inner(project_no,skid))', { count: 'exact', head: true }).eq('status', k))));
  state.counts = {}; CHIPS.forEach((k, i) => state.counts[k] = res[i].count || 0);
  state.counted = new Map();                       // id -> สถานะที่นับไปแล้ว (renderStats ใช้ปรับตัวเลขเมื่อสถานะเปลี่ยน)
}
// แปลงแถวดิบจากฐานข้อมูลเป็นแถวของหน้า และจำ drawing ไว้ใน state.drawings
function mapRows(raw) {
  return raw.map((r) => {
    if (viewOk) {
      state.drawings.set(r.drawing_id, { id: r.drawing_id, drawing_no: r.drawing_no, work_type: r.work_type, test_pack_id: r.test_pack_id });
      return { ...r, work_type: r.work_type || 'none' };
    }
    const { drawings: d, ...it } = r, tp = d.test_packs;
    state.drawings.set(d.id, { id: d.id, drawing_no: d.drawing_no, work_type: d.work_type, test_pack_id: d.test_pack_id });
    return { ...it, drawing_no: d.drawing_no, work_type: d.work_type || 'none', test_pack_no: tp.test_pack_no, skid: tp.skid, project_no: tp.project_no };
  });
}
const rowCmp = (a, b) => a.test_pack_no.localeCompare(b.test_pack_no) || a.drawing_no.localeCompare(b.drawing_no) || (a.item_no ?? 0) - (b.item_no ?? 0);
// โหลดแถวของสถานะที่เลือก (ไม่เลือก = ทุกสถานะ): หน้าแรกแสดงทันที แล้วดึงหน้าที่เหลือเบื้องหลังทีละ 4 หน้า ต่อท้ายตารางเรื่อย ๆ (ไม่แตะแถวที่แสดงอยู่แล้ว)
async function loadData() {
  const seq = ++loadSeq;
  loading = true; loaded = 0; total = 0; state.rows = []; state.drawings = new Map(); viewOk = true;
  applyFilters(); paintInfo();                                              // แสดงสถานะ "Loading..." ทันที
  try {
    const sts = sel.size ? [...sel] : CHIPS;
    const mk = () => viewOk
      ? scoped(sb.from('v_punch_items').select('*', { count: 'exact' }).in('status', sts)).order('test_pack_no').order('drawing_no').order('item_no').order('id')
      : scoped(sb.from('punch_items').select(SELECT, { count: 'exact' }).in('status', sts)).order('id');
    let first = await mk().range(0, 999);
    if (first.error && /v_punch_items|schema cache|does not exist/i.test(first.error.message || '')) { viewOk = false; first = await mk().range(0, 999); }   // ยังไม่มี view → วิธีเดิม
    await loadCounts();
    if (first.error) throw first.error;
    if (seq !== loadSeq) return;
    total = first.count ?? first.data.length;
    const byId = new Map();
    const merge = (raw) => {                                                // รวมแถวใหม่ (กันซ้ำด้วย id) แล้วต่อท้ายตาราง
      mapRows(raw).forEach(r => byId.set(r.id, r));
      state.rows = [...byId.values()];
      state.rows.forEach(r => { if (!state.counted.has(r.id)) state.counted.set(r.id, r.status); });
      loaded = byId.size;
    };
    merge(first.data);
    const pages = []; for (let from = 1000; from < total; from += 1000) pages.push(from);
    if (viewOk) { extend(); }                                               // เรียงจากฐานข้อมูลแล้ว: แสดงได้เลย
    for (let i = 0; i < pages.length; i += 4) {
      const res = await Promise.all(pages.slice(i, i + 4).map(f => mk().range(f, f + 999)));
      if (seq !== loadSeq) return;
      for (const r of res) if (r.error) throw r.error;
      merge(res.flatMap(r => r.data));
      if (viewOk) extend();
    }
    if (!viewOk) { state.rows.sort(rowCmp); applyFilters(); }               // วิธีเดิม: เรียงทีเดียวตอนครบ
  } catch (e) { alertErr(e); }
  finally { if (seq === loadSeq) { loading = false; paintInfo(); } }
}
// มีแถวใหม่ต่อท้าย: คำนวณรายการที่ผ่านตัวกรองใหม่ (ลำดับส่วนต้นเหมือนเดิมเสมอ) แล้วเติมตารางถ้าท้ายตารางอยู่ใกล้สายตา — ไม่วาดใหม่ทั้งตาราง
function extend() {
  renderStats();
  const body = $('qcRows');
  viewRows = state.rows.filter(r => matchQ(r) && (!sel.size || sel.has(r.status)));
  if (body.querySelector('.qc-empty')) { body.innerHTML = ''; rendered = 0; ctx = { pack: null, dwg: null }; }   // เอาข้อความ Loading... ออก
  if (rendered === 0) appendRows(PAGE);
  paintInfo(); fill();
}
// ข้อความสถานะใต้ตาราง: "Loading X of Y..." และจำนวนที่แสดงอยู่
function paintInfo() {
  $('loadInfo').innerHTML = loading
    ? `<span class="spinner-border spinner-border-sm mr-1" role="status"></span>Loading ${loaded.toLocaleString()}${total ? ' of ' + total.toLocaleString() : ''}...`
    : '';
  $('rowInfo').textContent = `${rendered.toLocaleString()} of ${viewRows.length.toLocaleString()} items`;
}

// ---------- กรอง + แสดงผล ----------
// ผ่านค่าค้นหาหรือไม่ (ไม่รวมสถานะ)
function matchQ(r) {
  if (!state.f.q) return true;
  const hay = `${r.test_pack_no} ${r.drawing_no} ${r.deficiency || ''}`.toLowerCase();
  return state.f.q.split(/\s+/).every(w => hay.includes(w));
}
// ชิปสถานะพร้อมจำนวน (ชิป "All" = ไม่เลือกสถานะใด) — ตัวเลขมาจากฐานข้อมูล แล้วปรับตามสถานะที่เพิ่งเปลี่ยน/เพิ่มในหน้านี้
function renderStats() {
  const c = { ...state.counts };
  state.rows.forEach(r => {
    const old = state.counted.get(r.id);
    if (old === r.status) return;
    if (old) c[old] = (c[old] || 1) - 1;
    c[r.status] = (c[r.status] || 0) + 1; state.counted.set(r.id, r.status);
  });
  state.counts = c;
  const all = CHIPS.reduce((n, k) => n + (c[k] || 0), 0);
  const chip = (k, label, cls, n) => `<button class="btn btn-sm qc-chip ${cls} ${(k ? sel.has(k) : !sel.size) ? 'on' : ''}" data-st="${k}" role="radio" aria-checked="${k ? sel.has(k) : !sel.size}">${label} <b>${n.toLocaleString()}</b></button>`;
  $('chipRow').innerHTML = chip('', 'All', 'bg-s-all', all) + CHIPS.map(k => chip(k, STATUS[k].label, STATUS[k].cls, c[k] || 0)).join('');
}
// HTML ของ 1 แถว: ทุกแถวแสดง Test Package/Drawing ครบ แต่ค่าที่ซ้ำกับแถวบนจะจาง (rep) และมีเส้นแบ่ง (หนา = Test Package ใหม่, บาง = Drawing ใหม่)
// data-label ใช้แสดงป้ายกำกับเมื่อจอแคบ (ตารางเปลี่ยนเป็นการ์ด ดู app.css)
function rowHtml(r) {
  const dwgKey = r.test_pack_no + '|' + r.drawing_id;
  const newPack = r.test_pack_no !== ctx.pack, newDwg = dwgKey !== ctx.dwg;
  ctx.pack = r.test_pack_no; ctx.dwg = dwgKey;
  return `<tr tabindex="0" role="button" class="qc-row st-${r.status} ${newPack ? 'first-pack' : newDwg ? 'new-dwg' : ''}" data-id="${r.id}">
    <td class="c-pack ${newPack ? '' : 'rep'}" data-label="Test Package No.">${newPack ? `<b>${esc(r.test_pack_no)}</b>` : esc(r.test_pack_no)}</td>
    <td class="c-dwg ${newDwg ? '' : 'rep'}" data-label="Drawing No.">${newDwg ? `<b>${esc(r.drawing_no)}</b>` : esc(r.drawing_no)}</td>
    <td class="c-item text-center text-muted">${esc(r.item_no ?? '')}</td>
    <td class="c-desc">${esc(r.deficiency || '(no description)')}</td>
    <td class="c-cat text-center">${r.category ? `<span class="badge badge-${CAT_CLS[r.category] || 'light'}">${esc(r.category)}</span>` : ''}</td>
    <td class="c-status text-center"><span class="badge-status ${STATUS[r.status].cls}" title="${STATUS[r.status].code}">${STATUS[r.status].label}</span></td></tr>`;
}
// วาดแถวเพิ่มจาก viewRows ต่อท้ายตาราง n แถว
function appendRows(n) {
  if (rendered >= viewRows.length) return;
  const chunk = viewRows.slice(rendered, rendered + n);
  $('qcRows').insertAdjacentHTML('beforeend', chunk.map(rowHtml).join(''));
  rendered += chunk.length; paintInfo();
}
// ท้ายตารางอยู่ใกล้พื้นที่ที่มองเห็นไหม (ทั้งกรณีตารางเลื่อนในกรอบ และกรณีหน้าเลื่อนปกติบนมือถือ)
function nearBottom() {
  const s = $('moreSentinel').getBoundingClientRect(), w = document.querySelector('.qc-wrap').getBoundingClientRect();
  return s.top < Math.min(w.bottom, innerHeight) + 300;
}
// เติมแถวจนกว่าท้ายตารางจะไกลพ้นสายตา แล้ววาดล่วงหน้าเงียบ ๆ ตอนว่าง (สูงสุด IDLE_MAX แถว)
function fill() {
  let guard = 0;
  while (rendered < viewRows.length && nearBottom() && guard++ < 40) appendRows(PAGE);
  const idle = window.requestIdleCallback || ((f) => setTimeout(f, 60));
  clearTimeout(fill.t);
  if (rendered < viewRows.length && rendered < IDLE_MAX) fill.t = idle(() => { appendRows(PAGE); fill(); });
}
// จุดรวมการแสดงผล: กรอง → ชิปสถานะ → วาดตารางใหม่ทั้งหมดจากบนสุด (ใช้เมื่อผู้ใช้เปลี่ยนตัวกรอง/สถานะ; ตอนโหลดเบื้องหลังใช้ extend() แทน)
function applyFilters() {
  renderStats();
  const body = $('qcRows');
  viewRows = state.rows.filter(r => matchQ(r) && (!sel.size || sel.has(r.status)));
  body.innerHTML = ''; rendered = 0; ctx = { pack: null, dwg: null };
  if (!viewRows.length) {
    body.innerHTML = loading ? '<tr class="qc-empty"><td colspan="6" class="text-center text-muted py-4"><span class="spinner-border spinner-border-sm mr-2"></span>Loading...</td></tr>'
      : `<tr class="qc-empty"><td colspan="6" class="text-center text-muted py-4">${state.rows.length ? 'No items in the selected status' : 'No items yet'}</td></tr>`;
  } else appendRows(PAGE);
  paintInfo(); fill();
}

// ---------- events ----------
// กดชิปสถานะ: เลือกได้ทีละอัน (All / Open / Close / Cancelled)
$('chipRow').addEventListener('click', (e) => {
  const b = e.target.closest('.qc-chip'); if (!b) return;
  const k = b.dataset.st;
  if ((k ? sel.has(k) : !sel.size)) return;                               // เลือกได้อันเดียว: กดอันที่เลือกอยู่แล้วไม่ทำอะไร
  sel.clear(); if (k) sel.add(k);
  renderStats(); loadData();                                                // เปลี่ยนสถานะ → โหลดแถวของสถานะนั้นจากฐานข้อมูล
});
// คลิกแถว → เปิดแผงรายละเอียด
$('qcRows').addEventListener('click', (e) => {
  const tr = e.target.closest('.qc-row'); if (!tr) return;
  $('qcRows').querySelectorAll('.qc-row.active').forEach(x => x.classList.remove('active')); tr.classList.add('active');
  openDetail(+tr.dataset.id);
});
// ใช้คีย์บอร์ดเปิดรายละเอียดได้ (Enter / Space)
$('qcRows').addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.qc-row')) { e.preventDefault(); e.target.click(); } });
// เลื่อนถึงท้ายตาราง → วาดเพิ่มอัตโนมัติ (sentinel ท้ายตาราง + ตัวเลื่อนทั้งของกรอบตารางและของหน้า)
new IntersectionObserver((es) => { if (es.some(e => e.isIntersecting)) fill(); }).observe($('moreSentinel'));
document.querySelector('.qc-wrap').addEventListener('scroll', fill, { passive: true });
addEventListener('scroll', fill, { passive: true }); addEventListener('resize', fill);
// Export CSV: รายการที่กรองอยู่ทั้งหมด (สถานะเป็นตัวย่อ O/C/N ตามฟอร์ม) — ต้องรอโหลดครบก่อน ไม่งั้นไฟล์จะไม่ครบ
$('btnCsv').onclick = () => {
  if (loading) return alert('Data is still loading. Please try again when loading has finished.');
  const cols = [['test_pack_no', 'Test Package No.'], ['drawing_no', 'Drawing No.'], ['item_no', 'Item'], ['deficiency', 'Punch Item Description'], ['category', 'Category'],
    ['discipline', 'Discipline'], ['status', 'Status'], ['punch_by', 'Punched by'], ['punch_date', 'Punch date'], ['bjc_date', 'Fix date'], ['client_date', 'Closed date'], ['remarks', 'Remarks']];
  const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [cols.map(c => q(c[1])).join(','), ...viewRows.map(r => cols.map(([f]) => q(f === 'status' ? STATUS[r.status].code : r[f])).join(','))].join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
  a.download = `punch_list_${today()}.csv`; a.click(); URL.revokeObjectURL(a.href);
};
// ช่องค้นหา: รอผู้ใช้หยุดพิมพ์ 0.25 วินาทีก่อนกรอง
let qTimer;
$('qSearch').addEventListener('input', (e) => { clearTimeout(qTimer); qTimer = setTimeout(() => { state.f.q = e.target.value.trim().toLowerCase(); applyFilters(); }, 250); });

// หลังเพิ่มตำหนิ (สถานะ Open) ถ้าชิป Open ไม่ได้เลือกอยู่ ให้เลือกเพิ่มเพื่อให้เห็นรายการที่เพิ่งเพิ่ม
function afterAdd() { if (sel.size && !sel.has('open')) { sel.clear(); sel.add('open'); loadData(); } else { state.rows.sort(rowCmp); applyFilters(); } }

init().catch(alertErr);
