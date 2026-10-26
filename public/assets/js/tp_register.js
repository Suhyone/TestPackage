// ===================================================================
// tp_register.js — หน้า Test Packages (Register): รายการ Test Package ทั้งหมด
//   ข้อมูล : view v_test_packs (sql/06_test_package_register.sql) — จำนวน punch แยก A/B และสถานะ punch ของแต่ละ pack
//   กรอง   : Project (ที่ header) + Module + Piping system + ชิปสถานะ punch + ค้นหาข้อความ — กรองฝั่งเบราว์เซอร์ (ข้อมูลหลักพันแถว)
//   คลิกแถว: เข้าหน้ารายละเอียด test_package.php?id=...
//   พึ่งพา : punch_common.js ($, fetchAll, alertErr, today), tp_common.js (PSTATE) และ app.js (sb, appReady, esc, fmtDate)
// ===================================================================

// rows = ข้อมูลทั้งหมดจาก view · f = ค่าตัวกรองที่เลือกอยู่
const rs = { rows: [], f: { project: '', module: '', system: '', state: '', q: '' } };
let me, canQC = false, gridApi;

// ---------- เริ่มหน้า ----------
// โหลดรายการ pack ทั้งหมด (ถ้ายังไม่มี view แสดงข้อความให้รัน SQL) แล้วสร้างตัวกรอง ตาราง และผูกเหตุการณ์
async function init() {
  ({ me } = await appReady);
  canQC = me.role === 'qc' || me.role === 'admin';
  if (canQC) $('btnAdd').classList.remove('d-none');
  buildGrid();
  try {
    rs.rows = await fetchAll(() => sb.from('v_test_packs').select('*').order('module_no').order('test_pack_no'));
  } catch (e) { $('setupMsg').classList.remove('d-none'); console.error(e); return; }

  // Project No. อยู่ที่ header ข้างปุ่ม Home
  const projects = [...new Set(rs.rows.map(r => r.project_no))].sort();
  $('fProject').innerHTML = '<option value="">All</option>' + projects.map(p => `<option>${esc(p)}</option>`).join('');
  $('newProjectList').innerHTML = projects.map(p => `<option value="${esc(p)}">`).join('');
  $('projectBox').classList.replace('d-none', 'd-flex');
  $('fProject').onchange = () => { rs.f.project = $('fProject').value; fillFilters(); applyFilters(); };
  bindEvents(); fillFilters(); applyFilters();
}

// เติมรายการ Module / Piping system ตาม Project ที่เลือก (คงค่าที่เลือกไว้ถ้ายังมีอยู่)
function fillFilters() {
  const inProj = rs.rows.filter(r => !rs.f.project || r.project_no === rs.f.project);
  const uniq = (k) => [...new Set(inProj.map(r => r[k]).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));
  const fill = (id, key, all) => {
    const list = uniq(key);
    if (!list.includes(rs.f[key === 'module_no' ? 'module' : 'system'])) rs.f[key === 'module_no' ? 'module' : 'system'] = '';
    $(id).innerHTML = `<option value="">${all}</option>` + list.map(v => `<option>${esc(v)}</option>`).join('');
    $(id).value = rs.f[key === 'module_no' ? 'module' : 'system'];
  };
  fill('fModule', 'module_no', 'All modules'); fill('fSystem', 'piping_system', 'All systems');
}

// ---------- กรอง ----------
// แถวนี้ผ่านตัวกรองหรือไม่ (skipState = ไม่นับชิปสถานะ ใช้คำนวณตัวเลขบนชิป)
function matches(r, skipState = false) {
  const f = rs.f;
  if (f.project && r.project_no !== f.project) return false;
  if (f.module && r.module_no !== f.module) return false;
  if (f.system && r.piping_system !== f.system) return false;
  if (!skipState && f.state && r.punch_state !== f.state) return false;
  if (f.q) {
    const hay = `${r.test_pack_no} ${r.module_no || ''} ${r.piping_system || ''} ${r.piping_name || ''} ${r.test_medium || ''}`.toLowerCase();
    if (!f.q.split(/\s+/).every(w => hay.includes(w))) return false;
  }
  return true;
}
// กรอง → ส่งเข้าตาราง → อัปเดตชิป/ข้อความสรุป
function applyFilters() {
  const rows = rs.rows.filter(r => matches(r));
  gridApi.setGridOption('rowData', rows);
  renderChips();
  $('rowInfo').textContent = `${rows.length.toLocaleString()} of ${rs.rows.length.toLocaleString()} packages`;
}
// ชิปสถานะ: All + 4 สถานะ พร้อมจำนวน กดซ้ำเพื่อยกเลิก
function renderChips() {
  const base = rs.rows.filter(r => matches(r, true)), c = {};
  base.forEach(r => c[r.punch_state] = (c[r.punch_state] || 0) + 1);
  const items = [['', 'All packages', 'bg-s-all', base.length], ...Object.entries(PSTATE).map(([k, v]) => [k, v.label, v.cls, c[k] || 0])];
  $('chipRow').innerHTML = items.map(([k, label, cls, n]) =>
    `<div class="col"><div class="stat-box ${cls} ${rs.f.state === k ? 'active-filter' : ''}" data-st="${k}" role="radio" tabindex="0" aria-checked="${rs.f.state === k}">
       <div><div class="n">${n.toLocaleString()}</div><div class="t">${esc(label)}</div></div></div></div>`).join('');
  $('chipRow').querySelectorAll('.stat-box').forEach(b => {
    const pick = () => { rs.f.state = (rs.f.state === b.dataset.st) ? '' : b.dataset.st; applyFilters(); };
    b.onclick = pick; b.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } };
  });
}

// ---------- ตาราง ----------
// ป้ายตัวเลข punch: มากกว่า 0 ใส่สี (A = แดง, B = เหลือง) เท่ากับ 0 แสดงเป็นเทา
const countPill = (n, cls) => n > 0 ? `<span class="badge-status ${cls}">${n}</span>` : '<span class="text-muted">0</span>';
// สร้างตาราง AG Grid: คอลัมน์ทั้งหมด + คลิกแถวเพื่อเข้าหน้ารายละเอียด
function buildGrid() {
  gridApi = agGrid.createGrid($('tpGrid'), {
    rowData: [], getRowId: (p) => String(p.data.id), rowHeight: 42,
    overlayNoRowsTemplate: '<span class="text-muted">No test packages match the filters</span>',
    defaultColDef: { sortable: true, resizable: true },
    columnDefs: [
      { headerName: 'Test Package No.', field: 'test_pack_no', width: 230, pinned: 'left',
        cellRenderer: (p) => `<a href="test_package.php?id=${p.data.id}"><b>${esc(p.value)}</b></a>` },
      { headerName: 'Module', field: 'module_no', width: 100 },
      { headerName: 'Piping system', field: 'piping_system', width: 150 },
      { headerName: 'Piping name', field: 'piping_name', flex: 1, minWidth: 220 },
      { headerName: 'Test medium', field: 'test_medium', width: 130 },
      { headerName: 'Test pressure', field: 'test_pressure', width: 120, headerTooltip: 'bar (g)' },
      { headerName: 'Open A', field: 'open_a', width: 95, type: 'numericColumn', cellRenderer: (p) => countPill(p.value, 'bg-s-rework'), headerTooltip: 'Open punch, Category A' },
      { headerName: 'Open B', field: 'open_b', width: 95, type: 'numericColumn', cellRenderer: (p) => countPill(p.value, 'bg-s-fixed'), headerTooltip: 'Open punch, Category B' },
      { headerName: 'Closed', field: 'items_closed', width: 95, type: 'numericColumn' },
      { headerName: 'Total', field: 'items_total', width: 85, type: 'numericColumn' },
      { headerName: 'Punch status', field: 'punch_state', width: 165,
        valueFormatter: (p) => PSTATE[p.value]?.label || '',
        cellRenderer: (p) => PSTATE[p.value] ? `<span class="badge-status ${PSTATE[p.value].cls}" title="${esc(PSTATE[p.value].hint)}">${esc(PSTATE[p.value].label)}</span>` : '' },
      { headerName: 'Inspection date', field: 'inspection_date', width: 135, valueFormatter: (p) => fmtDate(p.value) },
    ],
    onRowClicked: (e) => { if (!e.event.target.closest('a')) location.href = 'test_package.php?id=' + e.data.id; },
  });
}

// ---------- ส่งออก CSV ----------
// ส่งออกรายการที่กรองอยู่ (UTF-8 มี BOM เปิดใน Excel ได้ภาษาไม่เพี้ยน)
function exportCsv() {
  const cols = [['project_no', 'Project'], ['test_pack_no', 'Test Package No.'], ['module_no', 'Module'], ['piping_system', 'Piping system'], ['piping_name', 'Piping name'],
    ['test_medium', 'Test medium'], ['design_pressure', 'Design pressure'], ['test_pressure', 'Test pressure'], ['open_a', 'Open A'], ['open_b', 'Open B'],
    ['items_closed', 'Closed'], ['items_total', 'Total'], ['punch_state', 'Punch status'], ['inspection_date', 'Inspection date']];
  const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [cols.map(c => q(c[1])).join(','), ...rs.rows.filter(r => matches(r)).map(r => cols.map(([k]) => q(k === 'punch_state' ? PSTATE[r[k]]?.label : r[k])).join(','))].join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
  a.download = `test_packages_${today()}.csv`; a.click(); URL.revokeObjectURL(a.href);
}

// ---------- เพิ่ม Test Package ใหม่ ----------
// แสดงข้อความผิดพลาดในหน้าต่างเพิ่ม pack
const showNewErr = (m) => { const e = $('newErr'); e.textContent = m; e.classList.toggle('d-none', !m); };
// ตรวจข้อมูล → บันทึกลง test_packs (สร้าง project ถ้ายังไม่มี) → ไปหน้ารายละเอียดเพื่อกรอกต่อ
async function createPack() {
  const v = (id) => $(id).value.trim();
  const project = v('newProject'), no = v('newTp');
  showNewErr('');
  if (!project || !no) return showNewErr('Project No. and Test Package No. are required.');
  if (rs.rows.some(r => r.project_no === project && r.test_pack_no === no)) return showNewErr('This Test Package already exists.');
  $('newSave').disabled = true;
  try {
    await sb.from('projects').upsert({ project_no: project }, { onConflict: 'project_no', ignoreDuplicates: true });   // ตาราง projects ยังไม่มีก็ข้ามได้
    const { data, error } = await sb.from('test_packs').insert({ project_no: project, test_pack_no: no,
      module_no: v('newModule') || null, piping_system: v('newSystem') || null, piping_name: v('newName') || null }).select('id').single();
    if (error) throw error;
    location.href = 'test_package.php?id=' + data.id;
  } catch (e) { showNewErr(e.message || String(e)); $('newSave').disabled = false; }
}

// ---------- เหตุการณ์ ----------
// ผูกช่องค้นหา ตัวกรอง ปุ่มส่งออก และหน้าต่างเพิ่ม pack
function bindEvents() {
  let t;
  $('qSearch').addEventListener('input', (e) => { clearTimeout(t); t = setTimeout(() => { rs.f.q = e.target.value.trim().toLowerCase(); applyFilters(); }, 200); });
  $('fModule').onchange = () => { rs.f.module = $('fModule').value; applyFilters(); };
  $('fSystem').onchange = () => { rs.f.system = $('fSystem').value; applyFilters(); };
  $('btnCsv').onclick = exportCsv;
  $('btnAdd').onclick = () => { ['newTp', 'newModule', 'newSystem', 'newName'].forEach(i => $(i).value = ''); $('newProject').value = rs.f.project; showNewErr(''); $('newSave').disabled = false; window.jQuery('#tpModal').modal('show'); };
  $('newSave').onclick = createPack;
}

// เริ่มทำงานของหน้า
init().catch(alertErr);
