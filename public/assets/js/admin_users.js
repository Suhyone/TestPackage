// โหลดรายชื่อผู้ใช้ + แผนก (เฉพาะ admin) สร้างแถวแก้ไขได้ — เปลี่ยนค่าแล้วบันทึกลงตาราง profiles ทันที
appReady.then(async ({ me }) => {
  if (me.role !== 'admin') { document.getElementById('userRows').innerHTML = '<tr><td colspan="3">Admin only</td></tr>'; return; }
  const [{ data: users }, { data: discs }] = await Promise.all([
    sb.from('profiles').select('*').order('full_name'), sb.from('disciplines').select('name').order('sort_order')]);
  const roles = [['admin', 'Admin'], ['qc', 'QA/QC'], ['officer', 'Officer']];
  document.getElementById('userRows').innerHTML = users.map(u => `<tr data-id="${u.id}">
    <td><input class="form-control form-control-sm f-name" value="${esc(u.full_name)}"></td>
    <td><select class="form-control form-control-sm f-role">${roles.map(([v, l]) => `<option value="${v}" ${u.role === v ? 'selected' : ''}>${l}</option>`).join('')}</select></td>
    <td><select class="form-control form-control-sm f-disc"><option value="">—</option>${discs.map(d => `<option ${u.discipline === d.name ? 'selected' : ''}>${esc(d.name)}</option>`).join('')}</select></td></tr>`).join('');
  document.getElementById('userRows').addEventListener('change', async (e) => {
    const tr = e.target.closest('tr');
    const { error } = await sb.from('profiles').update({
      full_name: tr.querySelector('.f-name').value, role: tr.querySelector('.f-role').value,
      discipline: tr.querySelector('.f-disc').value || null }).eq('id', tr.dataset.id);
    if (error) alert(error.message);
  });
});
