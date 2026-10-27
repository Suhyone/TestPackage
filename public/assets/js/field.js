// ===================================================================
// field.js — หน้า Field mode (field.php): รายการ Test Package แบบการ์ดใหญ่สำหรับแท็บเล็ตหน้างาน
//   ข้อมูล : v_test_packs (ชื่อ pack/ระบบ/จำนวน punch/สถานะ) + v_pretest_status (ความคืบหน้า Pre-test) — ถ้ายังไม่รัน sql/07 จะแสดงการ์ดโดยไม่มีแถบ Pre-test
//   กรอง   : Project No. (ช่องบนแถบด้านบน จำข้ามหน้า) · Module · คำค้น · สถานะ (All / To do = Pre-test ยังไม่ครบหรือมี punch ค้าง / Blocked = มี punch A ค้าง)
//   พึ่งพา : app.js (sb, appReady, esc, fillProjectSelect, friendlyErr) · punch_common.js ($, alertErr) · field_draft.js (watchOnline)
// ===================================================================
const fd = { packs: [], pre: new Map(), project: '', module: '', q: '', filter: 'all', canQC: false };

// สถานะรวมของ pack ใบหนึ่ง: blocked (punch A ค้าง) / todo (Pre-test ไม่ครบ หรือมี punch ค้าง) / done
function packStatus(p) {
  const pre = fd.pre.get(p.id);
  if (p.open_a > 0) return 'blocked';
  if ((pre && !pre.ready) || p.items_open > 0) return 'todo';
  return 'done';
}
const STATUS_UI = {
  blocked: { cls: 'fd-s-blocked', icon: 'fa-ban', text: 'Blocked — Category A open' },
  todo: { cls: 'fd-s-todo', icon: 'fa-hourglass-half', text: 'To do' },
  done: { cls: 'fd-s-done', icon: 'fa-check-circle', text: 'Ready to test' },
};

function visible() {
  const q = fd.q.trim().toLowerCase();
  return fd.packs.filter(p => (!fd.project || p.project_no === fd.project) && (!fd.module || p.module_no === fd.module)
    && (fd.filter === 'all' || (fd.filter === 'blocked' ? packStatus(p) === 'blocked' : packStatus(p) !== 'done'))
    && (!q || [p.test_pack_no, p.piping_system, p.piping_name, p.module_no].some(v => String(v ?? '').toLowerCase().includes(q))));
}

// ชิป Module (นับจำนวน pack ของโครงการที่เลือก)
function renderModules() {
  const base = fd.packs.filter(p => !fd.project || p.project_no === fd.project);
  const mods = [...new Set(base.map(p => p.module_no).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));
  if (fd.module && !mods.includes(fd.module)) fd.module = '';
  $('fdModules').innerHTML = [['', 'All modules', base.length], ...mods.map(m => [m, m, base.filter(p => p.module_no === m).length])]
    .map(([v, label, n]) => `<button type="button" class="btn fd-mod${fd.module === v ? ' on' : ''}" data-m="${esc(v)}" aria-pressed="${fd.module === v}">${esc(label)} <span class="badge badge-light">${n}</span></button>`).join('');
}

function renderList() {
  const rows = visible();
  $('fdEmpty').classList.toggle('d-none', !!rows.length);
  $('fdList').innerHTML = rows.map(p => {
    const st = packStatus(p), ui = STATUS_UI[st], pre = fd.pre.get(p.id);
    const done = pre ? pre.total - pre.unanswered : null;
    const pct = pre && pre.total ? Math.round(done / pre.total * 100) : 0;
    return `<a class="card fd-card ${ui.cls}" href="field_pack.php?id=${p.id}" aria-label="Open ${esc(p.test_pack_no)}">
      <div class="card-body">
        <div class="d-flex align-items-start"><div class="fd-no">${esc(p.test_pack_no)}</div><span class="fd-state ml-auto"><i class="fas ${ui.icon}"></i> ${esc(ui.text)}</span></div>
        <div class="text-muted fd-sub">${esc([p.module_no, p.piping_system, p.piping_name].filter(Boolean).join(' · '))}</div>
        ${pre ? `<div class="fd-prog" role="img" aria-label="Pre-test ${done} of ${pre.total} answered"><div style="width:${pct}%"></div></div>
          <div class="fd-meta">Pre-test ${done}/${pre.total}${pre.no_count ? ` · <b class="text-danger">${pre.no_count} NO</b>` : ''}</div>` : ''}
        <div class="fd-meta">Punch open <b>${p.items_open}</b>${p.open_a ? ` (<b class="text-danger">A ${p.open_a}</b>)` : ''} · Total ${p.items_total}</div>
      </div></a>`;
  }).join('');
}

async function init() {
  const { me } = await appReady;
  fd.canQC = me.role === 'qc' || me.role === 'admin';
  watchOnline($('fdNet'));
  const [packs, pre] = await Promise.all([
    sb.from('v_test_packs').select('id,project_no,test_pack_no,module_no,piping_system,piping_name,items_total,items_open,open_a,punch_state').order('test_pack_no'),
    sb.from('v_pretest_status').select('test_pack_id,total,no_count,unanswered,ready'),
  ]);
  $('fdLoading').classList.add('d-none');
  if (packs.error) { $('fdList').innerHTML = `<div class="alert alert-danger">${esc(friendlyErr(packs.error))}</div>`; return; }
  fd.packs = (packs.data || []).filter(p => p.test_pack_no !== EXTERNAL_PACK);   // ซ่อน pack พิเศษของ punch นอก Test Package
  fd.pre = new Map((pre.data || []).map(r => [r.test_pack_id, r]));       // pre.error (ยังไม่รัน sql/07) → ไม่มีแถบ Pre-test
  const projects = [...new Set(fd.packs.map(p => p.project_no))].sort();
  fd.project = fillProjectSelect(projects);
  $('fProject').addEventListener('change', () => { fd.project = $('fProject').value; renderModules(); renderList(); });
  renderModules(); renderList();
  $('fdModules').addEventListener('click', (e) => { const b = e.target.closest('[data-m]'); if (!b) return; fd.module = b.dataset.m; renderModules(); renderList(); });
  $('fdSearch').addEventListener('input', (e) => { fd.q = e.target.value; renderList(); });
  $('fdFilter').addEventListener('change', (e) => { fd.filter = e.target.value; renderList(); });
}
init().catch(alertErr);
