// Dashboard แยกตามงาน (module): แต่ละงานเป็นการ์ดของตัวเอง มีตัวเลขสรุปและปุ่มเข้าหน้างานนั้น
// เพิ่มงานใหม่: 1) เพิ่มรายการใน MODULES ด้านล่าง  2) เพิ่มกลุ่มเมนูของงานนั้นใน includes/sidebar.php
//   key        รหัสงาน (ใช้เป็น id ของการ์ด)
//   title/sub  ชื่องาน / คำอธิบายสั้น      icon  ไอคอน Font Awesome 5      roles  (ไม่บังคับ) สิทธิ์ที่เห็นงานนี้ ไม่ใส่ = ทุกสิทธิ์
//   href(me)   ลิงก์เข้าหน้างาน (ตามสิทธิ์ผู้ใช้)
//   load()     คืน { tiles: [{ label, n, cls }], progress?: { done, total, label } } — แต่ละงานโหลดอิสระ งานหนึ่งพังไม่กระทบงานอื่น
const MODULES = [
  {
    key: 'test_package', title: 'Test Package', sub: 'Punch List', icon: 'fa-clipboard-check',
    href: () => 'qc_list.php',
    async load() {
      const sts = ['open', 'close', 'cancelled'], cls = { open: 'bg-s-open', close: 'bg-s-approved', cancelled: 'bg-s-cancelled' };
      const label = { open: 'Open', close: 'Closed', cancelled: 'Cancelled' };
      const res = await Promise.all(sts.map(st => sb.from('punch_items').select('id', { count: 'exact', head: true }).eq('status', st)));
      const bad = res.find(r => r.error); if (bad) throw bad.error;
      const n = Object.fromEntries(sts.map((st, i) => [st, res[i].count ?? 0]));
      const live = n.open + n.close;                                       // ไม่นับ Cancelled ในอัตราความคืบหน้า
      return { tiles: sts.map(st => ({ label: label[st], n: n[st], cls: cls[st] })),
               progress: { done: n.close, total: live, label: 'Closed' } };
    },
  },
];

// โครงการ์ดของ 1 งาน (ตัวเลขเป็น "-" ระหว่างโหลด)
const cardHtml = (m, me) => `<section class="card module-card mb-3" id="mod-${m.key}">
  <div class="card-header d-flex align-items-center flex-wrap" style="gap:8px">
    <i class="fas ${m.icon} text-info"></i><h5 class="card-title mb-0 mr-1"><b>${esc(m.title)}</b>${m.sub ? ` <span class="text-muted font-weight-normal">· ${esc(m.sub)}</span>` : ''}</h5>
    <a href="${m.href(me)}" class="btn btn-sm btn-info ml-auto">Open <i class="fas fa-arrow-right"></i></a></div>
  <div class="card-body"><div class="row mod-tiles"><div class="col-12 text-muted"><span class="spinner-border spinner-border-sm mr-2"></span>Loading...</div></div><div class="mod-progress mt-3"></div></div></section>`;

// เติมตัวเลข/แถบความคืบหน้าลงการ์ด
function paint(m, d) {
  const el = document.getElementById('mod-' + m.key);
  el.querySelector('.mod-tiles').innerHTML = d.tiles.map(t =>
    `<div class="col-md-4 col-12 mb-2"><div class="stat-box ${t.cls}"><div><div class="n">${t.n.toLocaleString()}</div><div class="t">${esc(t.label)}</div></div></div></div>`).join('');
  const p = d.progress;
  el.querySelector('.mod-progress').innerHTML = p && p.total ? (() => {
    const pct = Math.round(p.done * 100 / p.total);
    return `<div class="d-flex justify-content-between small text-muted mb-1"><span>${esc(p.label)}</span><span>${p.done.toLocaleString()} / ${p.total.toLocaleString()} (${pct}%)</span></div>
      <div class="progress" style="height:10px" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="${esc(p.label)}"><div class="progress-bar bg-success" style="width:${pct}%"></div></div>` })() : '';
}

appReady.then(({ me }) => {
  const mods = MODULES.filter(m => !m.roles || m.roles.includes(me.role));
  document.getElementById('modules').innerHTML = mods.map(m => cardHtml(m, me)).join('');
  mods.forEach(m => m.load().then(d => paint(m, d)).catch(e => {          // โหลดแต่ละงานอิสระ
    document.querySelector(`#mod-${m.key} .mod-tiles`).innerHTML = `<div class="col-12 text-danger small">Could not load: ${esc(friendlyErr(e))}</div>`;
  }));
});
