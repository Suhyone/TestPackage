// ===================================================================
// punch_detail.js — แผงรายละเอียดของ punch item (เปิดเมื่อคลิกแถว)
//
// เส้นทางการทำงาน (ถ้าจะแก้ขั้นตอนตรวจ/แก้/ปิดงาน ให้แก้ที่ไฟล์นี้):
//   1) punch_list.js / qc_list.js — คลิกแถวเรียก openDetail(id)
//   2) openDetail(id) ในไฟล์นี้ — โหลดประวัติรอบจากตาราง punch_rounds + สร้างแผงด้านขวา (#detailPanel)
//   3) ปุ่มในแผง (Submit Fix / Close / Reject Fix / Add Photos / Cancel / Reopen) → addRound() หรือคำสั่งอัปเดตสถานะ
//        - addRound() บันทึกรอบใหม่ลง punch_rounds + อัปโหลดรูป (punch_photos.js) + (ถ้ามี) อัปเดต punch_items
//   4) patchRow() อัปเดตแถวในตาราง + ตัวเลขสรุป หลังบันทึกเสร็จ
//
// สถานะมีแค่ 3 ตัวตามฟอร์มโครงการ: Open (O) / Close (C) / Cancelled (N)
//   Open → เจ้าหน้าที่ส่งงานแก้ (บันทึกรอบ 'fix' + รูป สถานะยังเป็น Open) → QC ตรวจ: ผ่าน = Close / ไม่ผ่าน = รอบ 'recheck' fail (ยัง Open ต้องแก้ใหม่)
//   QC ยกเลิกได้ (Cancelled) และเปิดกลับได้ (Reopen → Open)
// สิทธิ์:  canQC (admin/qc) ตรวจ/ปิด/ยกเลิกได้ · officer ส่งงานแก้ได้ทุกงานที่ยัง Open (บังคับซ้ำที่ RLS ใน sql/01_schema.sql)
// พึ่งพา:  ตัวแปร/ฟังก์ชันส่วนกลางจากหน้าหลัก (state, me, canQC, STATUS, $, today, renderStats, applyFilters, alertErr)
//          และ punch_photos.js (makePicker, uploadPhotos, signed) — ไฟล์นี้มีแต่ function จึงโหลดก่อนหน้าหลักได้
// ===================================================================

// ---------- แผงรายละเอียด + วงจรตรวจแก้ ----------
// ปิดแผงรายละเอียด
function closeDetail() { $('detailPanel').classList.remove('show'); }
// อัปเดตข้อมูลของ item ในตาราง + ตัวเลขสรุป หลังบันทึกสำเร็จ
function patchRow(it, patch) {
  Object.assign(it, patch);
  renderStats();
  if (typeof gridApi !== 'undefined') { gridApi.applyTransaction({ update: [it] }); gridApi.redrawRows(); }   // หน้า qc_list.js ไม่มี AG Grid
}

// เปิดแผงรายละเอียดของ item: แสดงประวัติรอบ/รูป และปุ่มตามสิทธิ์
async function openDetail(id) {
  const it = state.rows.find(i => i.id === id); if (!it) return;
  const { data: rounds } = await sb.from('punch_rounds').select('*').eq('punch_item_id', id).order('created_at');
  const urls = await Promise.all((rounds || []).map(r => signed(r.photo_paths)));
  // ประวัติการแก้คำอธิบาย (sql/16) — ไม่มีตาราง (ยังไม่รัน) = ไม่แสดงส่วนนี้ และเตือนผู้แก้ว่าจะไม่มีประวัติ
  const hq = await sb.from('punch_item_history').select('*').eq('punch_item_id', id).eq('field', 'deficiency').order('changed_at', { ascending: false });
  const histOk = !hq.error, hist = hq.data || [];
  const KIND = { defect: 'Defect tagged', fix: 'Fix submitted', recheck: 'QC recheck' };
  const isOpen = it.status === 'open';
  const last = (rounds || []).at(-1);
  // สิทธิ์ของผู้ใช้ปัจจุบันต่อ item นี้ (แก้เงื่อนไขการแสดงปุ่มที่นี่; ฝั่งฐานข้อมูลบังคับซ้ำที่ RLS ใน sql/01_schema.sql)
  const canFix = (canQC || me.role === 'officer') && isOpen;
  const canClose = canQC && isOpen;
  const canReject = canClose && (last?.kind === 'fix' || !!it.fix_pending);   // มีงานแก้ที่รอ QC ตรวจ (รวมกรณี Undo การปิดงานแล้วกลับมารอ QC)

  // โครง HTML ของแผง (แก้หน้าตา/ข้อความ/ปุ่มที่นี่; id ของปุ่มถูกผูกเหตุการณ์ไว้ด้านล่าง)
  $('detailPanel').innerHTML = `
    <div class="p-3 border-bottom d-flex justify-content-between">
      <div><div class="small text-muted">Skid ${esc(it.skid || '-')}<br>${esc(it.drawing_no)} · Item ${esc(it.item_no ?? '-')} · Cat ${esc(it.category ?? '-')}</div>
      <div id="dDescView" class="my-1"><div class="d-flex align-items-start"><h6 class="mb-0 mr-2" id="dDescText">${esc(it.deficiency || '(no description)')}</h6>
        ${canQC ? `<button type="button" class="btn btn-xs btn-outline-secondary" id="btnEditDesc" title="Edit description" aria-label="Edit description"><i class="fas fa-pen"></i></button>` : ''}</div></div>
      <div id="dDescEdit" class="desc-edit my-1 d-none">
        <textarea id="dDescInput" class="form-control form-control-sm" rows="3" aria-label="Punch item description"></textarea>
        <div class="mt-1"><button type="button" class="btn btn-sm btn-info" id="btnDescSave">Save</button>
          <button type="button" class="btn btn-sm btn-outline-secondary" id="btnDescCancel">Cancel</button>
          <span class="small text-muted ml-1">Ctrl+Enter = save · Esc = cancel</span></div>
        ${histOk ? '' : '<div class="small text-warning mt-1">Run sql/16 to keep an edit history.</div>'}
        <div class="small text-danger mt-1" id="dDescErr" role="alert"></div></div>
      <span class="badge-status ${STATUS[it.status].cls}">${STATUS[it.status].label}</span>
      <span class="small text-muted ml-2">${esc(it.discipline || '')}</span></div>
      <button class="close" id="dClose" aria-label="Close panel">&times;</button></div>
    <div class="p-3">
      <h6>History</h6>
      ${(rounds || []).map((r, i) => `<div class="round-card ${r.kind} ${r.result || ''}">
        <b>Round ${r.round_no} · ${KIND[r.kind]}${r.result ? (r.result === 'pass' ? ' — Passed' : ' — Rejected') : r.kind === 'recheck' ? ' — Status note' : ''}</b>
        <div class="small text-muted">${esc(r.by_name || '')} · ${new Date(r.created_at).toLocaleString('en-GB')}</div>
        ${r.note ? `<div>${esc(r.note)}</div>` : ''}
        <div>${urls[i].filter(Boolean).map(u => `<a href="${u}" target="_blank" rel="noopener"><img class="thumb" src="${u}" alt="Photo"></a>`).join('')}</div></div>`).join('')
        || '<div class="text-muted small">No photos or history yet</div>'}
      ${(canFix || canClose) ? `<hr><div class="form-group"><label class="small">${canClose ? 'Photos (optional)' : 'Photos after fix'}</label>
        <div id="dPhotos"></div>
        <textarea id="dNote" class="form-control form-control-sm mt-2" rows="2" placeholder="Note"></textarea></div>` : ''}
      ${canFix ? `<button class="btn btn-warning btn-sm mb-1" id="btnFix"><i class="fas fa-wrench"></i> Submit Fix</button>` : ''}
      ${canClose ? `<button class="btn btn-success btn-sm mb-1" id="btnPass"><i class="fas fa-check"></i> Close Item</button>` : ''}
      ${canReject ? `<button class="btn btn-danger btn-sm mb-1" id="btnFail"><i class="fas fa-times"></i> Reject Fix</button>` : ''}
      ${canQC && isOpen ? `<hr><label class="small">Add more defect photos</label>
        <div id="dDefectPhotos" class="mb-1"></div>
        <button class="btn btn-outline-info btn-sm" id="btnDefect"><i class="fas fa-camera"></i> Save Defect Photos</button>` : ''}
      ${canQC && isOpen ? `<hr><button class="btn btn-outline-secondary btn-sm" id="btnCancel">Cancel Item</button>` : ''}
      ${canQC && !isOpen ? `<hr><button class="btn btn-outline-secondary btn-sm" id="btnReopen"><i class="fas fa-undo"></i> Reopen</button>` : ''}
      <hr><h6>Details</h6>
      <table class="table table-sm table-borderless small mb-0">
        <tr><td class="text-muted">Test Package No.</td><td>${it.test_pack_no === EXTERNAL_PACK ? "External (no Test Package)" : esc(it.test_pack_no)}</td></tr>
        <tr><td class="text-muted">Punched by</td><td>${esc(it.punch_by || '-')} · ${fmtDate(it.punch_date) || '-'}</td></tr>
        <tr><td class="text-muted">Fix submitted</td><td>${esc(it.bjc_by || '-')} · ${fmtDate(it.bjc_date) || '-'}</td></tr>
        <tr><td class="text-muted">Closed</td><td>${esc(it.client_by || '-')} · ${fmtDate(it.client_date) || '-'}</td></tr>
        ${it.remarks ? `<tr><td class="text-muted">Remarks</td><td>${esc(it.remarks)}</td></tr>` : ''}
        ${it.cancel_remark ? `<tr><td class="text-muted">Cancel reason</td><td>${esc(it.cancel_remark)}</td></tr>` : ''}
      </table>
      ${hist.length ? `<hr><h6>Description history</h6><div class="desc-history">${hist.map(h => `<div class="dh-item small"><div class="text-muted">${esc(h.changed_by_name || 'unknown')} · ${new Date(h.changed_at).toLocaleString('en-GB')}</div><div>${diffHtml(h.old_value, h.new_value)}</div></div>`).join('')}</div>` : ''}
    </div>`;
  $('detailPanel').classList.add('show');
  $('dClose').onclick = closeDetail;

  // แก้ PUNCH-LIST DESCRIPTION (QC / admin ทุกสถานะ) — บันทึกประวัติโดย trigger ใน sql/16 · อัปเดตเมื่อค่ายังเป็นค่าที่เห็นตอนเปิดแก้เท่านั้น กันเขียนทับการแก้ของคนอื่นเงียบ ๆ
  const descBox = (edit) => { $('dDescView').classList.toggle('d-none', edit); $('dDescEdit').classList.toggle('d-none', !edit); };
  $('btnEditDesc')?.addEventListener('click', () => { $('dDescInput').value = it.deficiency || ''; $('dDescErr').textContent = ''; descBox(true); $('dDescInput').focus(); });
  const descCancel = () => descBox(false);
  const descSave = async () => {
    if (!canQC) return;
    const oldV = it.deficiency ?? '', newV = $('dDescInput').value.trim();
    if (!newV) { $('dDescErr').textContent = 'The description cannot be empty.'; return; }
    if (newV === oldV) return descCancel();                                    // ไม่เปลี่ยน = ปิดเฉย ๆ
    $('btnDescSave').disabled = true; $('dDescErr').textContent = '';
    try {
      let q = sb.from('punch_items').update({ deficiency: newV }).eq('id', id);
      q = oldV === '' ? q.is('deficiency', null) : q.eq('deficiency', oldV);
      const { data, error } = await q.select('id');
      if (error) throw error;
      if (!data?.length) {                                                     // มีคนแก้ไปก่อน → โหลดค่าล่าสุดมาแสดง ไม่ทับ
        const cur = await sb.from('punch_items').select('deficiency').eq('id', id).maybeSingle();
        if (cur.data) { patchRow(it, { deficiency: cur.data.deficiency }); applyFilters(); }
        await openDetail(id); alert('Someone else just changed this description. The latest text is shown — please review and edit again if needed.'); return;
      }
      patchRow(it, { deficiency: newV }); applyFilters(); await openDetail(id);
    } catch (e) { $('btnDescSave').disabled = false; $('dDescErr').textContent = friendlyErr(e); }
  };
  $('btnDescSave')?.addEventListener('click', descSave);
  $('btnDescCancel')?.addEventListener('click', descCancel);
  $('dDescInput')?.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.preventDefault(); descCancel(); } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); descSave(); } });

  // เลขรอบ: ตำหนิใหม่ = รอบใหม่ · งานแก้หลังการตรวจ (ไม่ผ่าน / ปิดแล้วเปิดใหม่ / Undo) = รอบใหม่ · นอกนั้นอยู่รอบเดียวกัน (fix → recheck)
  const nextNo = (kind) => !last ? 1 : (kind === 'defect' || (kind === 'fix' && last.kind === 'recheck')) ? last.round_no + 1 : last.round_no;
  // บันทึกหมายเหตุสถานะลงประวัติ (เช่น "Closure undone") เป็นรอบ recheck ที่ไม่มีผล — ประวัติจะไม่ค้างว่า Passed ทั้งที่งานเปิดอยู่ · ล้มเหลวไม่ขวางการทำงานหลัก
  async function noteRound(text) {
    try {
      const { data } = await sb.from('punch_rounds').select('round_no').eq('punch_item_id', id).order('created_at', { ascending: false }).limit(1);
      const r = await sb.from('punch_rounds').insert({ punch_item_id: id, round_no: data?.[0]?.round_no ?? 1, kind: 'recheck', result: null, photo_paths: [], note: text, by_user: me.id, by_name: me.name });
      if (r.error) console.error(r.error);
    } catch (e) { console.error(e); }
  }

  // บันทึก 1 รอบ: อัปโหลดรูป → เพิ่มแถวใน punch_rounds → (ถ้ามี upd) อัปเดต punch_items (สถานะ/วันที่/ผู้ทำ) → อัปเดตตาราง
  async function addRound(kind, result, files, note, upd, after) {
    const btns = [...$('detailPanel').querySelectorAll('button')], lbl = new Map(btns.map(b => [b, b.innerHTML]));
    const clicked = document.activeElement;
    btns.forEach(b => b.disabled = true);                                 // กันกดซ้ำระหว่างอัปโหลดรูป
    try {
      const paths = files?.length ? await uploadPhotos([...files], `items/${id}`, (n, t) => { if (clicked?.tagName === 'BUTTON') clicked.textContent = `Uploading photo ${n}/${t}...`; }) : [];
      const { error } = await sb.from('punch_rounds').insert({
        punch_item_id: id, round_no: nextNo(kind), kind, result, photo_paths: paths,
        note: note || null, by_user: me.id, by_name: me.name });
      if (error) throw error;
      const patch = { rc: (it.rc || 0) + 1 };
      if (upd) { const u = await sb.from('punch_items').update(upd).eq('id', id); if (u.error) throw u.error; Object.assign(patch, upd); }
      patchRow(it, patch); applyFilters(); openDetail(id); after?.();
    } catch (e) { alertErr(e); btns.forEach(b => { b.disabled = false; b.innerHTML = lbl.get(b); }); }
  }
  // fix_pending (sql/11): ตั้งค่าเฉพาะเมื่อฐานข้อมูลมีคอลัมน์นี้ (state.fpOn) — ไม่งั้นคำสั่งอัปเดตจะล้ม
  const fp = (v) => ('fix_pending' in it) ? { fix_pending: v } : {};
  // ย้อนค่าของ item กลับ (ใช้กับ Undo) แล้วรีเฟรชตาราง/แผง
  async function revert(prev, logText) {
    const { error } = await sb.from('punch_items').update(prev).eq('id', id);
    if (error) throw error;
    if (logText) await noteRound(logText);
    patchRow(it, prev); applyFilters(); openDetail(id);
  }
  const pickFix = $('dPhotos') ? makePicker($('dPhotos')) : null;
  const pickDefect = $('dDefectPhotos') ? makePicker($('dDefectPhotos')) : null;
  const photos = () => pickFix?.files, note = () => $('dNote')?.value;
  // "Submit Fix": รอบ fix + บันทึกวันที่/ผู้แก้ (สถานะยังเป็น Open รอ QC ตรวจ)
  $('btnFix')?.addEventListener('click', () => {
    if (!photos()?.length && !confirm('No photo attached. Submit the fix anyway?')) return;
    addRound('fix', null, photos(), note(), { bjc_date: today(), bjc_by: me.name, ...fp(true) });
  });
  // "Close Item": รอบ recheck ผ่าน → สถานะ Close   |   "Reject Fix": รอบ recheck ไม่ผ่าน → ยัง Open (ต้องแก้ใหม่)
  $('btnPass')?.addEventListener('click', () => {                    // ปิดทันที (ไม่ถามยืนยัน) + แถบ Undo ย้อนกลับได้ 8 วินาที
    const wasPending = !!it.fix_pending;
    addRound('recheck', 'pass', photos(), note(), { status: 'close', client_date: today(), client_by: me.name, ...fp(false) }, () =>
      showUndo(`Item ${it.item_no ?? ''} closed`, () => revert({ status: 'open', client_date: null, client_by: null, ...fp(wasPending) }, 'Closure undone')));
  });
  $('btnFail')?.addEventListener('click', () => addRound('recheck', 'fail', photos(), note(), ('fix_pending' in it) ? fp(false) : null));
  // "Save Defect Photos": QC เพิ่มรูปตำหนิรอบใหม่ (ไม่เปลี่ยนสถานะ)
  $('btnDefect')?.addEventListener('click', () => {
    const f = pickDefect.files; if (!f.length) return alert('Choose or take a photo first');
    addRound('defect', null, f, null, null);
  });
  // "Cancel Item": สถานะ → Cancelled พร้อมเหตุผล
  $('btnCancel')?.addEventListener('click', async () => {
    const reason = (prompt('Reason for cancelling (required):') || '').trim(); if (!reason) return;
    const patch = { status: 'cancelled', cancel_by: me.name, cancel_date: today(), cancel_remark: reason, ...fp(false) };
    const { error } = await sb.from('punch_items').update(patch).eq('id', id);
    if (error) return alertErr(error);
    patchRow(it, patch); applyFilters(); openDetail(id);
  });
  // "Reopen": Close/Cancelled → Open (ล้างข้อมูลปิดงาน/ยกเลิก)
  $('btnReopen')?.addEventListener('click', async () => {
    const prev = { status: it.status, client_date: it.client_date ?? null, client_by: it.client_by ?? null, cancel_by: it.cancel_by ?? null, cancel_date: it.cancel_date ?? null, cancel_remark: it.cancel_remark ?? null, ...fp(!!it.fix_pending) };
    const patch = { status: 'open', client_date: null, client_by: null, cancel_by: null, cancel_date: null, cancel_remark: null, ...fp(false) };
    const { error } = await sb.from('punch_items').update(patch).eq('id', id);
    if (error) return alertErr(error);
    await noteRound('Reopened');
    patchRow(it, patch); applyFilters(); openDetail(id);
    showUndo(`Item ${it.item_no ?? ''} reopened`, () => revert(prev, 'Reopen undone'));
  });
}
