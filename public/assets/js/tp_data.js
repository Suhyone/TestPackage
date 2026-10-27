// ===================================================================
// tp_data.js — แท็บ Contents และ ISO / Spool ของหน้ารายละเอียด Test Package
//   Contents    : Sheet2 TEST PACK CONTENT CHECK LIST — หัวข้อเอกสารของ pack ตอบ YES / N/A + หมายเหตุ (QC / admin แก้ได้)
//   ISO / Spool : ISO INDEX — isometric / line / spool ของ pack (อ่านอย่างเดียว · ค้นหาได้)
//   ตารางที่ใช้ : pack_documents · iso_lines   (สร้างโดย sql/08_datasets_iso_contents.sql · ข้อมูลนำเข้าด้วย tools/import_datasets.mjs)
//   พึ่งพา      : tp_detail.js (tpId, canQC, me) · punch_common.js ($) · app.js (sb, esc)
//   ต้องโหลดก่อน tp_detail.js (tp_detail.js เรียก loadData / renderData / bindData)
// ===================================================================

// docs = หัวข้อ Content checklist · iso = รายการ ISO · missing = true เมื่อยังไม่ได้รัน sql/08
const packData = { docs: [], iso: [], missing: false };

// โหลดข้อมูลของ pack นี้ (ถ้าตารางยังไม่มี = ยังไม่ได้รัน sql/08)
async function loadData() {
  const [d, i] = await Promise.all([
    sb.from('pack_documents').select('*').eq('test_pack_id', tpId).order('section_no'),
    sb.from('iso_lines').select('*').eq('test_pack_id', tpId).order('item_no').order('id'),
  ]);
  packData.missing = !!(d.error || i.error);
  packData.docs = d.data || [];
  packData.iso = i.data || [];
}

// กล่องคำอธิบายวิธีใช้ของแต่ละแท็บ (ย่อ/ขยายได้)
const howTo = (id, lines) => `<details class="mb-3"><summary class="small text-info" style="cursor:pointer">How to use this tab</summary>
  <ul class="small text-muted mb-0 mt-1 pl-4" id="${id}">${lines.map(l => `<li>${l}</li>`).join('')}</ul></details>`;
const setupHtml = `<div class="alert alert-warning py-2 small mb-0" role="status">Run <code>sql/08_datasets_iso_contents.sql</code> in the Supabase SQL Editor, then import the data with <code>node tools/import_datasets.mjs --commit</code>.</div>`;

// ---------- Contents ----------
function renderContents() {
  const box = $('tab-contents');
  if (packData.missing) { box.innerHTML = setupHtml; return; }
  const docs = packData.docs, n = (v) => docs.filter(d => d.verify === v).length;
  if (!docs.length) { box.innerHTML = `<div class="text-muted small py-3">No content checklist for this package yet. Import it from the dataset (<code>tools/import_datasets.mjs</code>).</div>`; return; }
  const dis = canQC ? '' : ' disabled';
  const radio = (d, v, cls) => `<label class="btn btn-sm btn-outline-${cls}${d.verify === v ? ' active' : ''}${canQC ? '' : ' disabled'}">
    <input type="radio" name="dc_${d.id}" value="${v}" data-dc="${d.id}"${d.verify === v ? ' checked' : ''}${dis}>${v}</label>`;
  box.innerHTML = `${howTo('dcHow', [
      'Each row is one section (SECTION #1–#15) of the test package dossier. YES = the document is included, N/A = not applicable for this package.',
      'QC / admin can change YES / N/A and add a remark — every change is saved immediately.',
      'The section sheet title (from the SECTION divider sheet) is shown under the checklist text when it differs.' ])}
    <div class="d-flex flex-wrap align-items-center mb-2" style="gap:6px">
      <span class="badge-status bg-s-approved">YES ${n('YES')}</span><span class="badge-status bg-s-all">N/A ${n('N/A')}</span><span class="small text-muted">${docs.length} sections</span></div>
    <div class="table-responsive"><table class="table table-sm mb-0"><thead><tr><th style="width:56px">No.</th><th>Content</th><th style="width:130px" class="text-center">Verify</th><th style="width:28%">Remarks</th></tr></thead><tbody>
    ${docs.map(d => `<tr><td>${d.section_no}</td>
      <td>${esc(d.content || d.title || '')}${d.title && d.content && d.title.toLowerCase() !== d.content.toLowerCase() ? `<div class="small text-muted">${esc(d.title)}</div>` : ''}${d.marker ? `<div class="small text-muted">Section sheet: ${esc(d.marker)}</div>` : ''}</td>
      <td class="text-center"><div class="btn-group btn-group-toggle">${radio(d, 'YES', 'success')}${radio(d, 'N/A', 'secondary')}</div></td>
      <td><input class="form-control form-control-sm" data-dcr="${d.id}" value="${esc(d.remark ?? '')}" aria-label="Remarks for section ${d.section_no}"${dis}></td></tr>`).join('')}
    </tbody></table></div><div class="small mt-2" id="dcMsg" role="status" aria-live="polite"></div>`;
}

// ---------- ISO / Spool ----------
// คำค้นปัจจุบันของตาราง ISO (คงไว้เมื่อวาดใหม่)
let isoQuery = '';
function renderIso() {
  const box = $('tab-iso');
  if (packData.missing) { box.innerHTML = setupHtml; return; }
  const rows = packData.iso;
  if (!rows.length) { box.innerHTML = `<div class="text-muted small py-3">No ISO index for this package yet. Import it from the dataset (<code>tools/import_datasets.mjs</code>).</div>`; return; }
  const drawings = new Set(rows.map(r => r.iso_drawing_no).filter(Boolean));
  const types = [...new Set(rows.map(r => r.test_type).filter(Boolean))];
  box.innerHTML = `${howTo('isoHow', [
      'One row per spool / line on an isometric drawing of this package (from the ISO INDEX sheet). The list is read-only.',
      'Type in the search box to filter by drawing, line, spool, fluid or material.',
      '<b>Test type</b>: P = Pneumatic, H = Hydrostatic; the pressure columns follow the package conditions (Info tab).',
      'Use the Drawing No. here when you add a punch item for this package.' ])}
    <div class="d-flex flex-wrap align-items-center mb-2" style="gap:8px">
      <span class="badge-status bg-s-all">${rows.length} lines</span><span class="badge-status bg-s-all">${drawings.size} drawings</span>
      ${types.map(t => `<span class="badge badge-light border">${esc(t)}</span>`).join('')}
      <div class="input-group input-group-sm ml-auto" style="max-width:280px"><div class="input-group-prepend"><span class="input-group-text"><i class="fas fa-search"></i></span></div>
        <input id="isoSearch" class="form-control" placeholder="Search drawing / line / spool" value="${esc(isoQuery)}" aria-label="Search ISO lines"></div></div>
    <div class="table-responsive" style="max-height:60vh"><table class="table table-sm table-hover mb-0" style="font-size:.85rem"><thead class="thead-light" style="position:sticky;top:0"><tr>
      <th>No.</th><th>Iso. drawing</th><th>Sht.</th><th>Rev.</th><th>Line No.</th><th>Spool No.</th><th>Fluid</th><th>Design P</th><th>Design T</th><th>Test P</th><th>Type</th><th>Material</th><th>NPD</th></tr></thead>
      <tbody id="isoRows"></tbody></table></div><div class="small text-muted mt-2" id="isoCount"></div>`;
  fillIsoRows();
}
// วาดเฉพาะแถวที่ตรงคำค้น
function fillIsoRows() {
  const q = isoQuery.trim().toLowerCase();
  const hit = packData.iso.filter(r => !q || [r.iso_drawing_no, r.line_no, r.spool_no, r.fluid, r.material].some(v => (v || '').toLowerCase().includes(q)));
  $('isoRows').innerHTML = hit.map(r => `<tr><td>${esc(r.item_no ?? '')}</td><td>${esc(r.iso_drawing_no)}</td><td>${esc(r.iso_sht)}</td><td>${esc(r.iso_rev)}</td><td>${esc(r.line_no)}</td>
    <td>${esc(r.spool_no)}</td><td>${esc(r.fluid)}</td><td>${esc(r.design_pressure)}</td><td>${esc(r.design_temp)}</td><td>${esc(r.test_pressure)}</td><td>${esc(r.test_type)}</td><td>${esc(r.material)}</td><td>${esc(r.pipe_npd)}</td></tr>`).join('');
  $('isoCount').textContent = hit.length === packData.iso.length ? '' : `Showing ${hit.length} of ${packData.iso.length} lines`;
}

// วาดทั้งสองแท็บ
function renderData() { renderContents(); renderIso(); }

// เหตุการณ์: เลือก YES / N/A หรือแก้หมายเหตุ (บันทึกทันที) · พิมพ์ค้นหา ISO (ผูกครั้งเดียวที่กล่องแท็บ)
function bindData() {
  const box = $('tab-contents'), msg = (t, ok = true) => { const e = $('dcMsg'); if (e) { e.textContent = t; e.className = 'small mt-2 ' + (ok ? 'text-success' : 'text-danger'); } };
  box.addEventListener('change', async (e) => {
    if (!canQC) return;
    const radio = e.target.closest('[data-dc]'), rem = e.target.closest('[data-dcr]');
    const id = Number(radio?.dataset.dc ?? rem?.dataset.dcr); if (!id) return;
    const patch = radio ? { verify: radio.value } : { remark: rem.value.trim() || null };
    box.querySelectorAll('input').forEach(i => i.disabled = true); msg('Saving…');
    try {
      const { data, error } = await sb.from('pack_documents').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id).select().single();
      if (error) throw error;
      packData.docs = packData.docs.map(d => d.id === id ? data : d); renderContents(); msg('Saved');
    } catch (err) { renderContents(); msg('Could not save: ' + friendlyErr(err), false); }
  });
  $('tab-iso').addEventListener('input', (e) => { if (e.target.id === 'isoSearch') { isoQuery = e.target.value; fillIsoRows(); } });
}
