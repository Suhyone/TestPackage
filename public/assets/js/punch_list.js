// Punch List: ตารางเดียว จัดกลุ่ม Test Pack > Drawing > Item (AG Grid)
// ชื่อที่แสดงของประเภทงานที่ Drawing
const TYPE_LABEL = { welded: 'Welded', non_welded: 'Non-welded' };
// สถานะกลางของหน้า: rows=รายการที่โหลด, drawings, packs, ค่าตัวกรอง f (g1/g2 = ชั้นจัดกลุ่ม)
const state = { rows: [], drawings: new Map(), packs: [], roundCount: {},
                categories: [], disciplines: [],
                f: { project: '', skid: '', status: '', category: '', discipline: '', type: 'all', q: '', g1: 'test_pack_no', g2: '' } };
// me=ผู้ใช้ที่ล็อกอิน, gridApi=ตัวควบคุมตาราง, canQC=สิทธิ์ QC/admin, loadSeq=กันผลโหลดเก่าทับผลใหม่
let me, gridApi, canQC = false, loadSeq = 0;

// ---------- helpers ----------
// สร้างรายการ <option> พร้อมตัวเลือก "ทั้งหมด"
const opts = (all, list) => `<option value="">${all}</option>` + list.map(v => `<option>${esc(v)}</option>`).join('');

// ---------- init ----------
// เริ่มหน้า: โหลด master data + รายการ Test Pack, เติมตัวกรอง, ผูกเหตุการณ์, สร้างตาราง แล้วโหลดข้อมูล
async function init() {
  prefillProjectSelect();                                                   // แสดง Project No. ที่จำไว้ทันที ไม่รอข้อมูล
  ({ me } = await appReady);
  if (me.role !== 'admin') { location.replace('qc_list.php'); return; }     // QC / เจ้าหน้าที่ใช้หน้าแบบย่อ qc_list.php
  canQC = ['admin', 'qc'].includes(me.role);
  if (canQC) $('btnAdd').classList.remove('d-none');

  const [cats, discs, packs] = await Promise.all([
    sb.from('categories').select('*').order('sort_order'),
    sb.from('disciplines').select('*').order('sort_order'),
    fetchAll(() => sb.from('test_packs').select('id,project_no,test_pack_no,skid').order('test_pack_no')),
  ]);
  state.categories = cats.data || []; state.disciplines = discs.data || [];
  state.packs = packs;

  const projects = [...new Set(packs.map(p => p.project_no))].sort();
  state.f.project = fillProjectSelect(projects);                      // Project No. อยู่ที่ header ข้างปุ่ม Home (ใช้ค่าที่จำไว้)
  fillSkids();
  $('fStatus').innerHTML = '<option value="">All</option>' + Object.entries(STATUS).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('');
  $('fCategory').innerHTML = opts('All', state.categories.map(c => c.code));
  $('fDiscipline').innerHTML = opts('All', state.disciplines.map(d => d.name));

  $('fProject').onchange = () => { state.f.project = $('fProject').value; state.f.skid = ''; fillSkids(); loadData(); };
  $('fSkid').onchange = () => { state.f.skid = $('fSkid').value; loadData(); };
  $('fStatus').onchange = () => { state.f.status = $('fStatus').value; applyFilters(); };
  $('fCategory').onchange = () => { state.f.category = $('fCategory').value; applyFilters(); };
  $('fDiscipline').onchange = () => { state.f.discipline = $('fDiscipline').value; applyFilters(); };
  $('gGroup1').value = state.f.g1; $('gGroup2').value = state.f.g2;
  buildTable();
  if (canQC) resetNewRow({ project_no: state.f.project || undefined });
  await loadData();
}
// เติมรายการ Skid ตาม Project ที่เลือก
function fillSkids() {
  const inProj = state.packs.filter(p => !state.f.project || p.project_no === state.f.project);
  $('fSkid').innerHTML = opts('All Skids', [...new Set(inProj.map(p => p.skid).filter(Boolean))].sort());
}

// ---------- โหลดข้อมูลตาม Project/Skid (ฝั่งเซิร์ฟเวอร์) ----------
// โหลด punch items ตาม Project/Skid (แบ่งหน้าดึงพร้อมกัน) แล้วเตรียมข้อมูลและแสดงตาราง
async function loadData() {
  const seq = ++loadSeq, bar = $('loadBar'), fill = bar.firstElementChild;
  bar.classList.remove('d-none'); fill.style.width = '5%';
  try {
    const mk = () => {
      let q = sb.from('punch_items').select(SELECT, { count: 'exact' });
      if (state.f.project) q = q.eq('drawings.test_packs.project_no', state.f.project);
      if (state.f.skid) q = q.eq('drawings.test_packs.skid', state.f.skid);
      return q.order('id');
    };
    const first = await mk().range(0, 999);
    if (first.error) throw first.error;
    let raw = first.data; const total = first.count ?? raw.length;
    const pages = [];
    for (let from = 1000; from < total; from += 1000) pages.push(from);
    for (let i = 0; i < pages.length; i += 5) {                     // ดึงทีละ 5 หน้าพร้อมกัน
      const res = await Promise.all(pages.slice(i, i + 5).map(f => mk().range(f, f + 999)));
      for (const r of res) { if (r.error) throw r.error; raw = raw.concat(r.data); }
      fill.style.width = (10 + 85 * raw.length / total) + '%';
    }
    if (seq !== loadSeq) return;

    state.drawings = new Map();
    state.rows = raw.map(({ drawings: d, ...it }) => {
      const tp = d.test_packs;
      state.drawings.set(d.id, { id: d.id, drawing_no: d.drawing_no, work_type: d.work_type,
        report_path: d.report_path, report_note: d.report_note, test_pack_id: d.test_pack_id });
      return { ...it, drawing_no: d.drawing_no, work_type: d.work_type || 'none',
               test_pack_no: tp.test_pack_no, skid: tp.skid, project_no: tp.project_no };
    }).sort((a, b) => a.test_pack_no.localeCompare(b.test_pack_no) || a.drawing_no.localeCompare(b.drawing_no)
                    || (a.item_no ?? 0) - (b.item_no ?? 0));

    state.roundCount = {};
    const rounds = await fetchAll(() => sb.from('punch_rounds').select('id,punch_item_id').order('id'));
    rounds.forEach(r => state.roundCount[r.punch_item_id] = (state.roundCount[r.punch_item_id] || 0) + 1);
    state.rows.forEach(r => r.rc = state.roundCount[r.id] || 0);

    applyFilters();
  } catch (e) { alertErr(e); }
  finally { fill.style.width = '100%'; setTimeout(() => bar.classList.add('d-none'), 300); }
}

// ---------- ตัวกรองฝั่งเบราว์เซอร์ + สรุป ----------
// แถวนี้ผ่านตัวกรองฝั่งเบราว์เซอร์หรือไม่ (ประเภท/Category/Discipline/ค้นหา/ตัวกรองหัวคอลัมน์) ยกเว้นสถานะ
function matchBase(r) {          // ทุกเงื่อนไขยกเว้น "สถานะ"
  const f = state.f;
  if (f.type !== 'all' && r.work_type !== f.type) return false;
  if (f.category && r.category !== f.category) return false;
  if (f.discipline && r.discipline !== f.discipline) return false;
  for (const k in state.colFilters) if (!state.colFilters[k].has(colKey(k, r))) return false;
  if (f.q) {
    const hay = `${r.test_pack_no} ${r.drawing_no} ${r.skid || ''} ${r.deficiency || ''} ${r.punch_by || ''} ${r.remarks || ''}`.toLowerCase();
    if (!f.q.split(/\s+/).every(w => hay.includes(w))) return false;
  }
  return true;
}
// สร้างการ์ดสรุปจำนวนตามสถานะ กดเพื่อกรองสถานะ
function renderStats() {
  const base = state.rows.filter(matchBase), c = {};
  base.forEach(i => c[i.status] = (c[i.status] || 0) + 1);
  $('statRow').innerHTML = [['', 'All', 'bg-s-all', base.length], ...Object.entries(STATUS).map(([k, v]) => [k, v.label, v.cls, c[k] || 0])]
    .map(([k, label, cls, n]) => `<button class="btn btn-sm qc-chip ${cls} ${state.f.status === k ? 'on' : ''}" data-st="${k}" aria-pressed="${state.f.status === k}">${label} <b>${n.toLocaleString()}</b></button>`).join('');
  $('statRow').querySelectorAll('.qc-chip').forEach(b => b.onclick = () => {
    const k = b.dataset.st; state.f.status = (state.f.status === k) ? '' : k;
    $('fStatus').value = state.f.status; applyFilters();
  });
}

// ---------- ตาราง (AG Grid Community) แบบ Access/Excel ----------
// AG Grid ฟรีไม่มี row grouping / set filter จึงทำเอง: หัวกลุ่มเป็นแถวเต็มความกว้างที่แสดงยอดรวมตรงคอลัมน์,
// ตัวกรองหัวคอลัมน์แบบ checkbox, แถวบันทึกใหม่ (pinned bottom) และตัวนำทาง record
// เก็บสถานะพับ/ขยายของกลุ่มที่ผู้ใช้กดเอง
const openState = new Map();   // key กลุ่ม -> true/false (ที่ผู้ใช้กดเอง)
// sortModel=คอลัมน์ที่เรียงอยู่, lastTree=โครงกลุ่มล่าสุด, topOpen=ค่าเริ่มต้นเปิด/พับกลุ่มบนสุด, curRecId=record ที่เลือกอยู่
let sortModel = null, lastTree = null, topOpen = false, curRecId = null;
let order = [];                // id ของ record ตามลำดับที่แสดง (รวมที่ถูกพับ)
let keyPath = new Map();       // id -> [key กลุ่มที่ครอบอยู่]
state.colFilters = {};         // field -> Set(ค่าที่เลือกไว้)

// แถวที่ผ่านตัวกรองทั้งหมด (รวมสถานะ)
const visibleRows = () => state.rows.filter(r => matchBase(r) && (!state.f.status || r.status === state.f.status));
// เรียงตาม Test Pack > Drawing > Item
const baseCmp = (a, b) => a.test_pack_no.localeCompare(b.test_pack_no) || a.drawing_no.localeCompare(b.drawing_no) || (a.item_no ?? 0) - (b.item_no ?? 0);
// ค่าในคอลัมน์เป็นข้อความ ใช้เทียบกับตัวกรองหัวคอลัมน์
const colKey = (f, r) => r[f] == null ? '' : String(r[f]);
// ข้อความที่แสดงของค่าในกล่องตัวกรอง
const colLabel = (f, k) => k === '' ? '(blank)' : f === 'status' ? (STATUS[k]?.label || k) : /_date$/.test(f) ? fmtDate(k) : k;

// ตัวเทียบสำหรับเรียงตามคอลัมน์ (ค่าว่างไปท้ายเสมอ)
function cmpField(f, dir) {
  return (a, b) => {
    const x = a[f], y = b[f], nx = x == null || x === '', ny = y == null || y === '';
    if (nx || ny) return nx && ny ? 0 : nx ? 1 : -1;               // ค่าว่างไปท้ายเสมอ
    const c = typeof x === 'number' ? x - y : String(x).localeCompare(String(y), 'th');
    return dir === 'asc' ? c : -c;
  };
}
// ตัวเทียบลำดับของกลุ่ม (สถานะ/Category ตามลำดับที่กำหนด)
function cmpGroup(field) {
  const cat = Object.fromEntries(state.categories.map((c, i) => [c.code, i]));
  const st = Object.fromEntries(Object.keys(STATUS).map((k, i) => [k, i]));
  return ([a], [b]) => {
    if (a === '' || b === '') return a === b ? 0 : a === '' ? 1 : -1;
    if (field === 'status') return st[a] - st[b];
    if (field === 'category') return (cat[a] ?? 99) - (cat[b] ?? 99);
    if (field === 'drawing_id') return (state.drawings.get(a)?.drawing_no || '').localeCompare(state.drawings.get(b)?.drawing_no || '') || a - b;
    return String(a).localeCompare(String(b), 'th');
  };
}

// ----- สร้างโครงกลุ่ม -> แถวที่แสดง -----
// จัดแถวเป็นโครงกลุ่มซ้อนกันตามชั้นจัดกลุ่มที่เลือก
function buildTree(rows, keys, level, parent) {
  if (level >= keys.length) return { items: sortModel ? [...rows].sort(cmpField(sortModel.field, sortModel.dir)) : rows };
  const field = keys[level], m = new Map();
  for (const r of rows) { const v = r[field] ?? ''; if (!m.has(v)) m.set(v, []); m.get(v).push(r); }
  return { groups: [...m].sort(cmpGroup(field)).map(([v, rs]) => {
    const key = `${parent}/${field}=${v}`;
    return { _type: 'grp', _field: field, _val: v, _level: level, _key: key, rows: rs, ...buildTree(rs, keys, level + 1, key) };
  }) };
}
// กลุ่มนี้เปิดอยู่ไหม (ถ้าผู้ใช้ไม่เคยกดจะใช้ค่าเริ่มต้น)
const isOpenK = (key, level) => openState.has(key) ? openState.get(key) : (level === 0 ? topOpen : true);
let inlineMode = false, inlineFirst = new Map(), pendingFirst = null;   // inline: ชื่อ Test Pack อยู่บรรทัดเดียวกับรายการแรก
// แปลงโครงกลุ่มเป็นรายการแถวที่แสดงจริง (เฉพาะกลุ่มที่เปิด) พร้อมเก็บลำดับ record
function flatten(node, visible, path, out) {
  if (node.items) {
    for (const it of node.items) {
      order.push(it.id); keyPath.set(it.id, path);
      if (visible) { if (pendingFirst) { inlineFirst.set(it.id, pendingFirst); pendingFirst = null; } out.push(it); }
    }
    return;
  }
  for (const g of node.groups) {
    const open = isOpenK(g._key, g._level);
    g._inline = inlineMode && g._level === 0;
    if (visible && g._inline && open) pendingFirst = g._key;        // ขยายอยู่: ไม่แทรกแถวหัวกลุ่ม ใช้แถวรายการแรกแทน
    else if (visible) out.push(g);
    flatten(g, visible && open, [...path, g._key], out);
  }
}
// สร้างแถวที่ส่งให้ตารางจากแถวที่ผ่านตัวกรอง
function buildDisplay(rows) {
  const keys = [state.f.g1, state.f.g2].filter((k, i, a) => k && a.indexOf(k) === i && (i === 0 || state.f.g1));
  lastTree = buildTree(rows, keys, 0, '');
  topOpen = !lastTree.groups || lastTree.groups.length <= 3;
  order = []; keyPath = new Map(); inlineFirst = new Map(); pendingFirst = null;
  inlineMode = keys.length === 1 && keys[0] === 'test_pack_no';
  const out = []; flatten(lastTree, true, [], out); return out;
}

// ----- หัวกลุ่ม: ยอดรวมอยู่ใต้คอลัมน์ที่ตรงกัน -----
// คอลัมน์ที่มียอดรวมแสดงในแถวหัวกลุ่ม
const SUM_COLS = ['discipline', 'status', 'punch_by', 'punch_date', 'bjc_date', 'client_date', 'rc', 'remarks'];
// ตัวสร้างยอดรวมของแต่ละคอลัมน์ (สถานะ = % เสร็จ, BJC/Client = จำนวนที่เสร็จ/ทั้งหมด, รอบ = ผลรวม)
const SUM = {
  // % งานเสร็จ = Approved / รายการที่ไม่ยกเลิก (แถบสีเหลืองคือส่วนที่แก้แล้วรอตรวจซ้ำ)
  status: (rows) => {
    const live = rows.filter(r => r.status !== 'cancelled');
    if (!live.length) return '<span class="text-muted">—</span>';
    const done = live.filter(r => r.status === 'close').length, pct = Math.round(done * 100 / live.length);
    return `<div class="pct" title="Closed ${done} of ${live.length} items">
      <div class="pct-bar"><i class="pct-done" style="width:${pct}%"></i></div><b>${pct}%</b></div>`;
  },
  bjc_date: (rows) => `<span>${rows.filter(r => r.bjc_date).length}<span class="text-muted">/${rows.length}</span></span>`,
  client_date: (rows) => `<span>${rows.filter(r => r.client_date).length}<span class="text-muted">/${rows.length}</span></span>`,
  rc: (rows) => rows.reduce((s, r) => s + (r.rc || 0), 0) || '',
};
// ข้อความ/ไอคอนของหัวกลุ่มแต่ละชนิด (Test Pack, Drawing, สถานะ ฯลฯ)
function groupLabel(d) {
  const first = d.rows[0], v = d._val;
  if (d._field === 'test_pack_no') return `<i class="fas fa-box-open text-info"></i> <b>${esc(v)}</b> <span class="badge badge-secondary">${esc(first?.skid || '')}</span>`;
  if (d._field === 'drawing_id') {
    const dw = state.drawings.get(v);
    const t = dw?.work_type ? `<span class="badge ${dw.work_type === 'welded' ? 'badge-warning' : 'badge-secondary'}">${TYPE_LABEL[dw.work_type]}</span>` : '<span class="badge badge-light border">Type not set</span>';
    return `<i class="fas fa-drafting-compass text-secondary"></i> <b>${esc(dw?.drawing_no)}</b> ${t}${dw?.report_path ? ' <i class="fas fa-paperclip text-muted"></i>' : ''}
      <a href="#" class="dwg-edit small ml-1" data-id="${v}"><i class="fas fa-cog"></i> Settings</a>`;
  }
  if (d._field === 'status') return `<span class="badge-status ${STATUS[v]?.cls}">${STATUS[v]?.label || esc(v)}</span>`;
  if (d._field === 'category') return v ? `<span class="badge badge-${CAT_CLS[v] || 'light'}">${esc(v)}</span>` : '<i class="text-muted">(not set)</i>';
  return `<b>${esc(colLabel(d._field, String(v))) || '<i class="text-muted">(not set)</i>'}</b>`;
}
// ตัวแสดงแถวหัวกลุ่ม (แถวเต็มความกว้าง) จัดความกว้างช่องยอดรวมให้ตรงกับคอลัมน์
class GroupRenderer {
  init(p) { this.api = p.api; this.pinned = p.pinned; this.el = document.createElement('div'); this.render(p.data); }
  getGui() { return this.el; }
  refresh(p) { this.render(p.data); return true; }
  render(d) {
    const open = isOpenK(d._key, d._level);
    this.el.className = `grp-row grp-l${Math.min(d._level, 2)}`; this.el.dataset.key = d._key; this.el.dataset.level = d._level;
    const caret = `<i class="fas fa-chevron-${open ? 'down' : 'right'} grp-caret"></i>`;
    const CENTER = ['item_no', 'category', 'status', 'rc'];          // คอลัมน์ที่เนื้อหาจัดกึ่งกลาง ให้ยอดรวมจัดตามเดียวกัน
    const cell = (c, html, cls = '') => `<div class="grp-cell ${CENTER.includes(c.getColId()) ? 'c ' : ''}${cls}" style="width:${c.getActualWidth()}px">${html}</div>`;
    if (this.pinned === 'right' || (this.pinned === 'left' && !d._inline)) { this.el.innerHTML = ''; return; }
    if (this.pinned === 'left') {                                    // คอลัมน์ที่ล็อกไว้: ชื่อ Test Pack / Skid / จำนวน Drawing
      const cols = this.api.getAllDisplayedColumns().filter(c => c.getPinned() === 'left');
      this.el.innerHTML = cols.map(c => {
        const id = c.getColId();
        if (id === 'test_pack_no') return cell(c, `${caret} <b>${esc(d._val)}</b>`, 'grp-name');
        if (id === 'skid') return cell(c, `<span class="badge badge-secondary">${esc(d.rows[0]?.skid || '')}</span>`);
        if (id === 'drawing_no') return cell(c, `<span class="text-muted small">${new Set(d.rows.map(r => r.drawing_id)).size} drawing</span>`);
        return cell(c, '');
      }).join('');
      return;
    }
    const cols = this.api.getAllDisplayedColumns().filter(c => !c.getPinned());
    if (d._inline) { this.el.innerHTML = cols.map(c => cell(c, SUM[c.getColId()]?.(d.rows) ?? '')).join(''); return; }
    let i = 0, labelW = 0;
    while (i < cols.length && !SUM_COLS.includes(cols[i].getColId())) labelW += cols[i++].getActualWidth();
    const cells = cols.slice(i).map(c => cell(c, SUM[c.getColId()]?.(d.rows) ?? '')).join('');
    this.el.innerHTML = `<div class="grp-label" style="width:${labelW}px;padding-left:${10 + d._level * 22}px">
      ${caret} ${groupLabel(d)}
      <span class="text-muted small ml-1">${d.rows.length} items</span></div>${cells}`;
  }
}
// ตัวหน่วงเวลาการวาดหัวกลุ่มใหม่ (รวมหลายคำสั่งเป็นรอบเดียว)
let grpRaf = 0;
// วาดแถวหัวกลุ่มใหม่เมื่อความกว้าง/การซ่อนคอลัมน์เปลี่ยน
function refreshGroupRows() {
  cancelAnimationFrame(grpRaf);
  grpRaf = requestAnimationFrame(() => {
    if (!gridApi) return;
    const nodes = []; gridApi.forEachNode(n => { if (n.data?._type) nodes.push(n); });
    if (nodes.length) gridApi.redrawRows({ rowNodes: nodes });
  });
}

// ----- ตัวกรองที่หัวคอลัมน์ (แบบ checkbox เหมือน Excel/Access) -----
// กล่องตัวกรองหัวคอลัมน์ที่เปิดอยู่ (มีได้ทีละอัน)
let popupEl = null;
// ปิดกล่องตัวกรอง
function closePopup() { popupEl?.remove(); popupEl = null; document.removeEventListener('mousedown', outsidePopup, true); }
// คลิกนอกกล่องตัวกรองให้ปิด
function outsidePopup(e) { if (popupEl && !popupEl.contains(e.target) && !e.target.closest('.hdr-filter')) closePopup(); }

// เปิดกล่องกรองแบบเลือกค่า (ติ๊กถูก) ของคอลัมน์ พร้อมช่องค้นหาค่า
function openFilterPopup(f, anchor) {
  closePopup();
  const counts = new Map();
  state.rows.forEach(r => { const k = colKey(f, r); counts.set(k, (counts.get(k) || 0) + 1); });
  const numeric = ['item_no', 'rc'].includes(f);
  const keys = [...counts.keys()].sort((a, b) => a === '' ? -1 : b === '' ? 1 : numeric ? a - b : a.localeCompare(b, 'th'));
  const sel = new Set(state.colFilters[f] || keys);
  const el = popupEl = document.createElement('div'); el.className = 'filter-pop';
  el.innerHTML = `<input class="form-control form-control-sm mb-1" placeholder="Search values...">
    <label class="fp-all"><input type="checkbox"> (Select all)</label><div class="fp-list"></div>
    <div class="d-flex mt-2" style="gap:6px"><button class="btn btn-sm btn-info fp-ok">OK</button>
    <button class="btn btn-sm btn-outline-secondary fp-clear">Clear filter</button><button class="btn btn-sm btn-link fp-cancel ml-auto">Close</button></div>`;
  document.body.appendChild(el);
  const r = anchor.getBoundingClientRect();
  el.style.left = Math.max(4, Math.min(r.left, innerWidth - 270)) + 'px'; el.style.top = (r.bottom + 4) + 'px';

  const list = el.querySelector('.fp-list'), all = el.querySelector('.fp-all input'), q = el.querySelector('input');
  const shown = () => keys.filter(k => colLabel(f, k).toLowerCase().includes(q.value.trim().toLowerCase()));
  const paint = () => {
    const s = shown();
    list.innerHTML = s.slice(0, 300).map(k => `<label><input type="checkbox" data-k="${esc(k)}" ${sel.has(k) ? 'checked' : ''}> ${esc(colLabel(f, k))} <span class="text-muted">(${counts.get(k)})</span></label>`).join('')
      + (s.length > 300 ? `<div class="small text-muted p-1">Showing 300 of ${s.length} values — type to search</div>` : '');
    all.checked = s.length > 0 && s.every(k => sel.has(k));
  };
  list.addEventListener('change', (e) => { const k = e.target.dataset.k; if (k === undefined) return; e.target.checked ? sel.add(k) : sel.delete(k); all.checked = shown().every(x => sel.has(x)); });
  all.addEventListener('change', () => { shown().forEach(k => all.checked ? sel.add(k) : sel.delete(k)); paint(); });
  q.addEventListener('input', paint); paint(); q.focus();
  const done = () => { closePopup(); gridApi.refreshHeader(); applyFilters(); };
  el.querySelector('.fp-ok').onclick = () => { if (sel.size === keys.length) delete state.colFilters[f]; else state.colFilters[f] = new Set(sel); done(); };
  el.querySelector('.fp-clear').onclick = () => { delete state.colFilters[f]; done(); };
  el.querySelector('.fp-cancel').onclick = closePopup;
  setTimeout(() => document.addEventListener('mousedown', outsidePopup, true), 0);
}
// หัวคอลัมน์แบบกำหนดเอง: ชื่อ + ลูกศรเรียง + ไอคอนกรอง
class HeaderComp {
  init(p) {
    this.p = p; this.f = p.column.getColId();
    const el = this.el = document.createElement('div'); el.className = 'hdr-wrap';
    el.innerHTML = `<span class="hdr-label"></span><span class="hdr-sort"></span><i class="fas fa-filter hdr-filter" title="Filter this column"></i>`;
    el.querySelector('.hdr-label').textContent = p.displayName;
    if (p.enableSorting) el.addEventListener('click', (e) => { if (!e.target.closest('.hdr-filter')) p.progressSort(false); });
    el.querySelector('.hdr-filter').addEventListener('click', (e) => { e.stopPropagation(); openFilterPopup(this.f, e.currentTarget); });
    this.onSort = () => this.update(); p.column.addEventListener('sortChanged', this.onSort); this.update();
  }
  update() {
    const s = this.p.column.getSort();
    this.el.querySelector('.hdr-sort').textContent = s === 'asc' ? '▲' : s === 'desc' ? '▼' : '';
    this.el.querySelector('.hdr-filter').classList.toggle('on', !!state.colFilters[this.f]);
  }
  getGui() { return this.el; }
  refresh(p) { this.p = p; this.update(); return true; }
  destroy() { this.p.column.removeEventListener('sortChanged', this.onSort); }
}

// ----- ตัวแก้ไขแบบพิมพ์แล้วมีรายการแนะนำ (แถวบันทึกใหม่) -----
// ช่องพิมพ์ที่มีรายการแนะนำ (datalist) ใช้กับแถวบันทึกใหม่
class AutoEditor {
  init(p) {
    this.wrap = document.createElement('div'); this.wrap.className = 'auto-editor';
    const id = 'dl' + Math.random().toString(36).slice(2);
    this.input = document.createElement('input'); this.input.className = 'form-control form-control-sm'; this.input.setAttribute('list', id);
    this.input.value = p.value ?? '';
    const dl = document.createElement('datalist'); dl.id = id;
    dl.innerHTML = (p.list ? p.list(p.data) : []).map(v => `<option value="${esc(v)}">`).join('');
    this.wrap.append(this.input, dl);
  }
  getGui() { return this.wrap; }
  afterGuiAttached() { this.input.focus(); this.input.select(); }
  getValue() { return this.input.value.trim(); }
}

// ----- แถวบันทึกใหม่ -----
// ข้อมูลแถวบันทึกใหม่ (แถวสีเขียวล่างสุด) และรายการ Drawing ของ Test Pack ที่เลือก
let newRow = { _new: true }, newRowDrawings = [];
// รายการ Test Pack ภายใต้ Project ที่เลือก (ใช้เป็นรายการแนะนำ)
const packsInScope = () => state.packs.filter(p => !state.f.project || p.project_no === state.f.project);
// ล้างแถวบันทึกใหม่ (เก็บค่าบางช่องไว้เพื่อกรอกแถวต่อไปได้เร็ว)
function resetNewRow(keep = {}) {
  newRow = { _new: true, ...keep }; gridApi.setGridOption('pinnedBottomRowData', [newRow]);
}
// โหลดรายการ Drawing ของ Test Pack ที่พิมพ์ในแถวบันทึกใหม่
async function loadNewRowDrawings(pack) {
  newRowDrawings = [];
  if (!pack) return;
  const { data } = await sb.from('drawings').select('drawing_no').eq('test_pack_id', pack.id).order('drawing_no');
  newRowDrawings = (data || []).map(d => d.drawing_no);
}
// บันทึกแถวใหม่ลงฐานข้อมูล (สร้าง Drawing ใหม่ถ้ายังไม่มี) แล้วกระโดดไปที่แถวนั้น
async function saveNewRow() {
  const d = newRow, pack = state.packs.find(p => p.test_pack_no === (d.test_pack_no || '').trim());
  const dno = (d.drawing_no || '').trim();
  if (!pack) return alert('Enter a valid Test Package No. (type and pick from the list)');
  if (!dno) return alert('Enter the Drawing No.');
  if (!(d.deficiency || '').trim()) return alert('Enter the punch item description');
  try {
    let { data: dwg, error: e1 } = await sb.from('drawings').select('*').eq('test_pack_id', pack.id).eq('drawing_no', dno).maybeSingle();
    if (e1) throw e1;
    if (!dwg) { const r = await sb.from('drawings').insert({ test_pack_id: pack.id, drawing_no: dno }).select().single(); if (r.error) throw r.error; dwg = r.data; }
    state.drawings.set(dwg.id, { id: dwg.id, drawing_no: dno, work_type: dwg.work_type, report_path: dwg.report_path, report_note: dwg.report_note, test_pack_id: pack.id });
    const ins = await sb.from('punch_items').insert({
      drawing_id: dwg.id, item_no: +d.item_no || nextItemNo(dwg.id), category: d.category || null, discipline: d.discipline || null,
      deficiency: d.deficiency.trim(), status: 'open', punch_by: me.name, punch_date: today(), input_date: today(), created_by: me.id }).select().single();
    if (ins.error) throw ins.error;
    const row = { ...ins.data, drawing_no: dno, work_type: dwg.work_type || 'none', test_pack_no: pack.test_pack_no, skid: pack.skid, project_no: pack.project_no, rc: 0 };
    state.rows.push(row); state.rows.sort(baseCmp);
    resetNewRow({ test_pack_no: pack.test_pack_no, project_no: pack.project_no, skid: pack.skid, drawing_no: dno, category: d.category, discipline: d.discipline });
    applyFilters(); const i = order.indexOf(row.id); if (i >= 0) gotoRecord(i);
  } catch (e) { alertErr(e); }
}

// ----- ตัวนำทาง record -----
// อัปเดตเลข record ปัจจุบัน/จำนวนทั้งหมดในตัวนำทาง
function updateNav() {
  const i = curRecId != null ? order.indexOf(curRecId) : -1;
  $('navPos').value = i >= 0 ? i + 1 : ''; $('navTotal').textContent = `of ${order.length.toLocaleString()}`;
}
// ไปยัง record ลำดับที่ระบุ (เปิดกลุ่มที่ครอบอยู่ เลื่อนตาราง และเลือกแถว)
function gotoRecord(idx) {
  if (!order.length) return;
  idx = Math.max(0, Math.min(order.length - 1, idx));
  const id = order[idx]; curRecId = id;
  (keyPath.get(id) || []).forEach(k => openState.set(k, true));
  applyFilters();
  setTimeout(() => {
    const node = gridApi.getRowNode('i' + id);
    if (node) { gridApi.ensureNodeVisible(node, 'middle'); node.setSelected(true); }
    updateNav();
  }, 0);
}

// จุดรวมการแสดงผล: กรอง → จัดกลุ่ม → ส่งเข้าตาราง → อัปเดตการ์ดสรุป/ตัวนำทาง
function applyFilters() {
  const rows = visibleRows();
  renderStats();
  gridApi.setGridOption('rowData', buildDisplay(rows));
  gridApi.refreshCells({ columns: ['test_pack_no'], force: true });
  const packs = new Set(rows.map(r => r.test_pack_no)).size;
  $('rowInfo').textContent = `${rows.length.toLocaleString()} items · ${packs.toLocaleString()} Test Packages`;
  updateNav();
}
// ขยายหรือพับทุกกลุ่ม
function setAllGroups(open) {
  openState.clear();
  const walk = (n) => (n.groups || []).forEach(g => { if (open || g._level === 0) openState.set(g._key, open); walk(g); });
  if (lastTree) walk(lastTree);
  applyFilters();
}

// สร้างตาราง AG Grid: คอลัมน์ ตัวแสดงผล และเหตุการณ์ (คลิกเซลล์/ปุ่ม 🔍 → openDetail ใน punch_detail.js)
function buildTable() {
  const ed = canQC, noSort = () => 0;                 // เรียงเอง (ดู sortModel) ไม่ให้ AG สลับแถวหัวกลุ่ม
  const col = (o) => ({ sortable: true, comparator: noSort, headerComponent: HeaderComp, ...o });
  const dFmt = (p) => fmtDate(p.value);
  const edit = (p) => !!p.node.rowPinned || ed;       // แถวบันทึกใหม่แก้ได้ทุกคนที่เห็น
  const newOnly = (p) => p.node.rowPinned === 'bottom';
  gridApi = agGrid.createGrid($('punchTable'), {
    rowData: [], pinnedBottomRowData: ed ? [newRow] : [], embedFullWidthRows: true,
    getRowId: (p) => p.data._new ? 'new' : (p.data._key || 'i' + p.data.id),
    isFullWidthRow: (p) => !!p.rowNode.data?._type, fullWidthCellRenderer: GroupRenderer,
    getRowHeight: (p) => p.data?._type ? Math.round(38 * uiScale()) : undefined,   // หัวกลุ่มสูงตามขนาดตัวอักษร (Aa)
    getRowClass: (p) => p.data?._new ? 'new-row' : p.data?._type ? '' : 'st-' + p.data.status + (p.data.status === 'cancelled' ? ' row-cancelled' : ''),
    rowSelection: 'single', isRowSelectable: (p) => !p.data?._type, stopEditingWhenCellsLoseFocus: true,
    overlayNoRowsTemplate: '<span class="text-muted">No items match the filters</span>',
    defaultColDef: { resizable: true },
    columnDefs: [
      col({ headerName: 'Test Package No.', field: 'test_pack_no', width: 265, pinned: 'left', editable: newOnly, cellEditor: AutoEditor,
            cellEditorParams: { list: () => packsInScope().map(p => p.test_pack_no) },
            cellRenderer: (p) => {
              if (p.node.rowPinned) return esc(p.value ?? '');
              const k = inlineFirst.get(p.data.id);
              if (k) return `<span class="pk-toggle" data-k="${esc(k)}"><i class="fas fa-chevron-down grp-caret"></i> <b>${esc(p.value)}</b></span>`;
              return inlineMode ? `<span class="text-muted pk-sub">${esc(p.value)}</span>` : esc(p.value);
            } }),
      col({ headerName: 'Skid', hide: true, field: 'skid', width: 90, pinned: 'left' }),
      col({ headerName: 'Drawing No.', field: 'drawing_no', width: 170, pinned: 'left', editable: newOnly, cellEditor: AutoEditor,
            cellEditorParams: { list: () => newRowDrawings } }),
      { colId: '_view', headerName: '', width: 74, pinned: 'left', sortable: false, suppressMovable: true,
        cellRenderer: (p) => p.node.rowPinned ? '<button class="btn btn-xs btn-success row-save"><i class="fas fa-plus"></i> Save</button>'
          : '<button class="btn btn-xs btn-outline-info row-open" title="Open details / photos"><i class="fas fa-search-plus"></i></button>' },
      col({ headerName: 'Item', hide: true, field: 'item_no', headerClass: 'hdr-center', width: 90, editable: edit, type: 'numericColumn', cellEditor: 'agNumberCellEditor' }),
      col({ headerName: 'Category', field: 'category', headerClass: 'hdr-center', width: 95, editable: edit, cellStyle: { textAlign: 'center' },
            cellEditor: 'agSelectCellEditor', cellEditorParams: { values: ['', ...state.categories.map(c => c.code)] },
            cellRenderer: (p) => p.value ? `<span class="badge badge-${CAT_CLS[p.value] || 'light'}">${esc(p.value)}</span>` : '',
            headerTooltip: 'Fix priority' }),
      col({ headerName: 'Punch Item Description', field: 'deficiency', flex: 1, minWidth: 300, editable: edit,
            wrapText: true, autoHeight: true, cellClass: 'pl-desc', cellEditor: 'agLargeTextCellEditor', cellEditorPopup: true,
            cellRenderer: (p) => p.node.rowPinned && !p.value ? '<span class="text-muted">* Type a new punch item here, then press Save</span>' : esc(p.value) }),
      col({ headerName: 'Discipline', hide: true, field: 'discipline', width: 135, editable: edit,
            cellEditor: 'agSelectCellEditor', cellEditorParams: { values: ['', ...state.disciplines.map(d => d.name)] } }),
      col({ headerName: 'Status', field: 'status', headerClass: 'hdr-center', width: 125, cellStyle: { textAlign: 'center' },
            cellRenderer: (p) => p.value ? `<span class="badge-status ${STATUS[p.value]?.cls}">${STATUS[p.value]?.label}</span>` : '' }),
      col({ headerName: 'Punched by', hide: true, field: 'punch_by', width: 115, editable: ed && ((p) => !p.node.rowPinned) }),
      col({ headerName: 'Punch date', hide: true, field: 'punch_date', width: 120, valueFormatter: dFmt }),
      col({ headerName: 'Fix date', hide: true, field: 'bjc_date', width: 120, valueFormatter: dFmt }),
      col({ headerName: 'Closed date', hide: true, field: 'client_date', width: 115, valueFormatter: dFmt }),
      col({ headerName: 'Rounds', hide: true, field: 'rc', headerClass: 'hdr-center', width: 85, cellStyle: { textAlign: 'center' },
            cellRenderer: (p) => p.value ? `<i class="fas fa-camera text-info"></i> ${p.value}` : '' }),
      col({ headerName: 'Remarks', hide: true, field: 'remarks', width: 170, editable: ed && ((p) => !p.node.rowPinned) }),
    ],
    onSortChanged: () => {
      const s = gridApi.getColumnState().find(c => c.sort);
      sortModel = s ? { field: s.colId, dir: s.sort } : null; applyFilters();
    },
    onSelectionChanged: () => { const r = gridApi.getSelectedRows()[0]; if (r) { curRecId = r.id; updateNav(); } },
    onColumnResized: (e) => { if (e.finished) refreshGroupRows(); },
    onColumnVisible: refreshGroupRows, onColumnMoved: refreshGroupRows, onGridSizeChanged: refreshGroupRows,
    onCellClicked: (e) => {
      const f = e.colDef.field || e.colDef.colId;
      if (e.node.rowPinned) {                                         // แถวบันทึกใหม่
        if (e.event.target.closest('.row-save')) return saveNewRow();
        if (['test_pack_no', 'drawing_no', 'item_no', 'category', 'deficiency', 'discipline'].includes(f))
          e.api.startEditingCell({ rowIndex: 0, rowPinned: 'bottom', colKey: f });
        return;
      }
      const tg = e.event?.target?.closest?.('.pk-toggle');
      if (tg) { const k = tg.dataset.k; openState.set(k, !isOpenK(k, 0)); applyFilters(); return; }
      if (e.data?._type) return;
      openDetail(e.data.id);                                          // คลิกแถวเปิดรายละเอียด (แก้ไขเซลล์ = ดับเบิลคลิก)
    },
    onCellValueChanged: async (e) => {
      const f = e.colDef.field;
      if (e.node.rowPinned) {                                         // แก้ไขแถวใหม่ (ยังไม่บันทึกลงฐานข้อมูล)
        if (f === 'test_pack_no') {
          const pack = state.packs.find(p => p.test_pack_no === e.newValue);
          Object.assign(newRow, { project_no: pack?.project_no, skid: pack?.skid, drawing_no: '' });
          await loadNewRowDrawings(pack); e.api.refreshCells({ rowNodes: [e.node], force: true });
        }
        return;
      }
      if (e.node.__reverting) { e.node.__reverting = false; return; }
      let v = e.newValue; if (v === '' || v === undefined) v = null;
      const { error } = await sb.from('punch_items').update({ [f]: v }).eq('id', e.data.id);
      if (error) { alertErr(error); e.node.__reverting = true; e.node.setDataValue(f, e.oldValue); return; }
      e.data[f] = v;
      if (f === 'category' || f === 'discipline') applyFilters(); else renderStats();
    },
  });

  // พับ/ขยายกลุ่ม + ตั้งค่า Drawing
  $('punchTable').addEventListener('click', (e) => {
    const a = e.target.closest('.dwg-edit');
    if (a) { e.preventDefault(); e.stopPropagation(); openDwgModal(+a.dataset.id); return; }
    const g = e.target.closest('.grp-row');
    if (g) { const k = g.dataset.key; openState.set(k, !isOpenK(k, +g.dataset.level)); applyFilters(); }
  });

  // เมนูเลือกคอลัมน์
  $('colMenu').innerHTML = gridApi.getColumns().filter(c => c.getColId() !== '_view')
    .map(c => `<label class="d-block mb-1"><input type="checkbox" data-f="${c.getColId()}" ${c.isVisible() ? 'checked' : ''}> ${esc(c.getColDef().headerName)}</label>`).join('');
  $('colMenu').addEventListener('change', (e) => gridApi.setColumnsVisible([e.target.dataset.f], e.target.checked));
  $('colMenu').addEventListener('click', (e) => e.stopPropagation());
}

// ส่งออกรายการที่กรองอยู่เป็นไฟล์ CSV (เปิดใน Excel ได้ ภาษาไทยไม่เพี้ยน)
function exportCsv() {
  const cols = [['project_no', 'Project No.'], ['skid', 'Skid'], ['test_pack_no', 'Test Package No.'], ['drawing_no', 'Drawing No.'], ['item_no', 'Item'],
    ['category', 'Category'], ['deficiency', 'Deficiency'], ['discipline', 'Discipline'], ['status', 'Status'], ['punch_by', 'Punch by'],
    ['punch_date', 'Punch date'], ['bjc_date', 'BJC complete'], ['client_date', 'Client complete'], ['remarks', 'Remarks']];
  const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [cols.map(c => q(c[1])).join(','), ...visibleRows().map(r => cols.map(([f]) => q(f === 'status' ? STATUS[r.status].code : r[f])).join(','))].join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
  a.download = `punch_list_${today()}.csv`; a.click(); URL.revokeObjectURL(a.href);
}

// ---------- Drawing: ประเภทงาน + Report ----------
// Drawing ที่กำลังตั้งค่าอยู่ในหน้าต่าง
let curDwg = null;
// เปิดหน้าต่างตั้งค่า Drawing (ประเภท Welded/Non-welded + Report)
function openDwgModal(id) {
  curDwg = state.drawings.get(id); if (!curDwg) return;
  $('dwgTitle').textContent = curDwg.drawing_no;
  $('dwgType').value = curDwg.work_type || ''; $('dwgType').disabled = !canQC;
  $('dwgNote').value = curDwg.report_note || ''; $('dwgNote').disabled = !canQC;
  $('dwgRptFile').value = ''; $('dwgRptFile').disabled = !canQC; $('dwgSave').classList.toggle('d-none', !canQC);
  $('dwgWeldBox').classList.toggle('d-none', $('dwgType').value !== 'welded');
  $('dwgRptLink').innerHTML = '';
  if (curDwg.report_path) signed([curDwg.report_path]).then(([u]) => $('dwgRptLink').innerHTML = `<a href="${u}" target="_blank"><i class="fas fa-file"></i> Open current report</a>`);
  window.jQuery('#dwgModal').modal('show');
}
// เลือก Welded แล้วแสดงช่อง Report/หมายเหตุ
$('dwgType').addEventListener('change', () => $('dwgWeldBox').classList.toggle('d-none', $('dwgType').value !== 'welded'));
// บันทึกประเภท/Report ของ Drawing ลงฐานข้อมูล แล้วรีเฟรชตาราง
$('dwgSave').addEventListener('click', async () => {
  const d = curDwg, patch = { work_type: $('dwgType').value || null, report_note: $('dwgNote').value || null };
  $('dwgSave').disabled = true;
  try {
    const f = $('dwgRptFile').files[0];
    if (f && patch.work_type === 'welded') {
      const path = `reports/${d.id}/${Date.now()}_${f.name.replace(/[^\w.\-]/g, '_')}`;
      const up = await sb.storage.from('punch-photos').upload(path, f); if (up.error) throw up.error;
      patch.report_path = path;
    }
    const { error } = await sb.from('drawings').update(patch).eq('id', d.id); if (error) throw error;
    Object.assign(d, patch);
    const updates = state.rows.filter(r => r.drawing_id === d.id);
    updates.forEach(r => r.work_type = patch.work_type || 'none');
    applyFilters();
    window.jQuery('#dwgModal').modal('hide');
  } catch (e) { alertErr(e); } finally { $('dwgSave').disabled = false; }
});

// ---------- events ----------
// แท็บประเภทงาน (ทั้งหมด/Welded/Non-welded/ยังไม่ระบุ) → กรองตาราง
document.querySelectorAll('#typeTabs .nav-link').forEach(a => a.addEventListener('click', (e) => {
  e.preventDefault();
  document.querySelectorAll('#typeTabs .nav-link').forEach(x => x.classList.remove('active')); a.classList.add('active');
  state.f.type = a.dataset.type; applyFilters();
}));
// ช่องค้นหา: รอผู้ใช้หยุดพิมพ์ 0.25 วินาทีก่อนกรอง
let qTimer;
$('qSearch').addEventListener('input', (e) => { clearTimeout(qTimer); qTimer = setTimeout(() => { state.f.q = e.target.value.trim().toLowerCase(); applyFilters(); }, 250); });
// ปุ่มแถบเครื่องมือ: ขยาย/พับทุกกลุ่ม และโหมดกระชับ
$('btnExpand').onclick = () => setAllGroups(true);
$('btnCollapse').onclick = () => setAllGroups(false);
$('btnDensity').onclick = () => { document.body.classList.toggle('compact-table'); gridApi.resetRowHeights(); };
// ปุ่มเพิ่มตำหนิ + ฟอร์ม (punch_add.js)
bindAdd();
// ปุ่มล้างตัวกรองทั้งหมด (ถ้ามี Project/Skid ที่เลือกไว้จะโหลดข้อมูลใหม่)
$('btnReset').onclick = () => {
  Object.assign(state.f, { status: '', category: '', discipline: '', type: 'all', q: '' });
  ['fStatus', 'fCategory', 'fDiscipline'].forEach(i => $(i).value = ''); $('qSearch').value = '';
  state.colFilters = {}; gridApi.refreshHeader();
  document.querySelectorAll('#typeTabs .nav-link').forEach(x => x.classList.toggle('active', x.dataset.type === 'all'));
  if (state.f.project || state.f.skid) { state.f.project = state.f.skid = ''; $('fProject').value = ''; projPref.set(''); fillSkids(); loadData(); } else applyFilters();
};
// ปุ่ม Export CSV และตัวเลือกจัดกลุ่มชั้นที่ 1/2
$('btnCsv').onclick = exportCsv;
$('gGroup1').onchange = () => { state.f.g1 = $('gGroup1').value; openState.clear(); applyFilters(); };
$('gGroup2').onchange = () => { state.f.g2 = $('gGroup2').value; openState.clear(); applyFilters(); };
// ตัวนำทาง record: แรก/ก่อนหน้า/ถัดไป/สุดท้าย/พิมพ์เลข/บันทึกใหม่
const navIdx = () => curRecId != null ? order.indexOf(curRecId) : -1;
$('navFirst').onclick = () => gotoRecord(0);
$('navPrev').onclick = () => gotoRecord(navIdx() < 0 ? 0 : navIdx() - 1);
$('navNext').onclick = () => gotoRecord(navIdx() + 1);
$('navLast').onclick = () => gotoRecord(order.length - 1);
$('navPos').addEventListener('keydown', (e) => { if (e.key === 'Enter') gotoRecord((+e.target.value || 1) - 1); });
$('navNew').onclick = () => { if (canQC) gridApi.startEditingCell({ rowIndex: 0, rowPinned: 'bottom', colKey: 'test_pack_no' }); };

// เริ่มทำงานของหน้า
init().catch(alertErr);
