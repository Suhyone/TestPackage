// จัดการ Category / Discipline (เฉพาะ admin): โหลดรายการ แก้ไข เพิ่ม ลบ แล้ววาดตารางใหม่
appReady.then(async ({ me }) => {
  if (me.role !== 'admin') { document.querySelector('.row').innerHTML = '<div class="col">Admin only</div>'; return; }
  const $ = (id) => document.getElementById(id);
  async function load() {
    const [{ data: cats }, { data: discs }] = await Promise.all([
      sb.from('categories').select('*').order('sort_order'), sb.from('disciplines').select('*').order('sort_order')]);
    $('catRows').innerHTML = cats.map(c => `<tr data-code="${esc(c.code)}"><td><b>${esc(c.code)}</b></td>
      <td><input class="form-control form-control-sm f-desc" value="${esc(c.description)}"></td>
      <td><input type="number" class="form-control form-control-sm f-sort" value="${c.sort_order}"></td></tr>`).join('');
    $('discRows').innerHTML = discs.map(d => `<tr><td>${esc(d.name)}</td><td class="text-right">
      <button class="btn btn-xs btn-outline-danger del-disc" data-name="${esc(d.name)}">Delete</button></td></tr>`).join('');
  }
  $('catRows').addEventListener('change', async (e) => {
    const tr = e.target.closest('tr');
    const { error } = await sb.from('categories').update({ description: tr.querySelector('.f-desc').value, sort_order: +tr.querySelector('.f-sort').value }).eq('code', tr.dataset.code);
    if (error) alert(error.message);
  });
  $('addCat').onclick = async () => { const code = $('newCat').value.trim(); if (!code) return;
    const { error } = await sb.from('categories').insert({ code, sort_order: 99 }); if (error) alert(error.message); $('newCat').value = ''; load(); };
  $('addDisc').onclick = async () => { const name = $('newDisc').value.trim(); if (!name) return;
    const { error } = await sb.from('disciplines').insert({ name, sort_order: 99 }); if (error) alert(error.message); $('newDisc').value = ''; load(); };
  $('discRows').addEventListener('click', async (e) => { const b = e.target.closest('.del-disc'); if (!b || !confirm('Delete?')) return;
    const { error } = await sb.from('disciplines').delete().eq('name', b.dataset.name); if (error) alert(error.message); load(); });
  load();
});
