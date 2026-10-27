// ===================================================================
// tp_signature.js — รูปลายเซ็นในแท็บ Sign-off ของหน้ารายละเอียด Test Package
//   เพิ่มรูปได้ 2 วิธี: วาดลายเซ็นบนจอ (นิ้ว/ปากกา/เมาส์) หรืออัปโหลดรูป · ลบ/เปลี่ยนได้ · บันทึกทันทีที่เพิ่ม ไม่ต้องกด Save sign-off
//   เก็บ  : ไฟล์ในที่เก็บรูป bucket 'punch-photos' โฟลเดอร์ signatures/<pack id>/ · path เก็บในคอลัมน์ *_sig ของ test_packs / punch_reports (sql/14_signatures.sql)
//   แสดง  : รูปในแท็บนี้และในรายงาน Punch List แบบพิมพ์ (punch_report.js)
//   สิทธิ์: QC / admin เพิ่ม-ลบได้ · คนอื่นดูอย่างเดียว · ถ้ายังไม่รัน sql/14 จะไม่แสดงส่วนลายเซ็น (ไม่กระทบส่วนอื่น)
//   พึ่งพา: tp_detail.js (tp, tpId, canQC, saveTp, saveReport, valueOf, setMsg) · punch_photos.js (signed, decodeImage) · punch_common.js ($) · app.js (sb, esc, friendlyErr)
//   ต้องโหลดก่อน tp_detail.js
// ===================================================================

const SIG_MAX_W = 800, SIG_MAX_H = 300;           // ขนาดสูงสุดของรูปที่เก็บ (พิกเซล)
const sigEnabled = () => !!tp && ('signed_prepared_sig' in tp);

// กล่องลายเซ็น 1 ช่อง: ตัวอย่างรูป + ปุ่ม (field = ชื่อคอลัมน์ *_sig, t = 'tp' | 'rp')
function sigBoxHtml(field, t) {
  const v = valueOf(t, field) || '';
  return `<div class="sig-box mt-2" data-sigf="${field}" data-sigt="${t}">
    <div class="small text-muted mb-1">Signature image</div>
    <div class="sig-preview" data-sigprev="${field}"><span class="text-muted small">No signature</span></div>
    <input type="hidden" data-t="${t}" data-f="${field}" value="${esc(v)}">
    ${canQC ? `<div class="sig-actions mt-1">
      <button type="button" class="btn btn-sm btn-outline-info" data-sigdraw="${field}"><i class="fas fa-pen"></i> Draw</button>
      <label class="btn btn-sm btn-outline-info mb-0 sig-upload"><i class="fas fa-upload"></i> Upload<input type="file" accept="image/*" class="sr-only" data-sigfile="${field}"></label>
      <button type="button" class="btn btn-sm btn-outline-secondary${v ? '' : ' d-none'}" data-sigdel="${field}"><i class="fas fa-trash-alt"></i> Remove</button></div>` : ''}
  </div>`;
}
const sigBox = (field) => document.querySelector(`.sig-box[data-sigf="${field}"]`);

// แสดงรูปลายเซ็นที่บันทึกไว้ (ขอ signed URL ครั้งเดียวทุกรูป)
async function loadSigPreviews() {
  if (!sigEnabled()) return;
  const boxes = [...document.querySelectorAll('.sig-box')].map(b => ({ b, path: b.querySelector('input[type=hidden]').value })).filter(x => x.path);
  const urls = await signed(boxes.map(x => x.path));
  boxes.forEach((x, i) => { if (urls[i]) x.b.querySelector('.sig-preview').innerHTML = `<img src="${urls[i]}" alt="Signature" class="sig-img">`; });
}
// อัปเดตกล่องหลังเพิ่ม/ลบ (path ว่าง = ไม่มีรูป)
async function setSigBox(field, path) {
  const b = sigBox(field); if (!b) return;
  b.querySelector('input[type=hidden]').value = path || '';
  b.querySelector('[data-sigdel]')?.classList.toggle('d-none', !path);
  b.querySelector('.sig-preview').innerHTML = '<span class="text-muted small">No signature</span>';
  if (path) await loadSigPreviews();
}
// บันทึก path ลงฐานข้อมูลทันที
async function saveSigPath(field, t, path) {
  if (t === 'rp') await saveReport({ [field]: path || null }); else await saveTp({ [field]: path || null });
}
// ปรับภาพเป็น PNG พื้นขาว ขนาดไม่เกิน SIG_MAX_W x SIG_MAX_H
async function sigToBlob(source, w, h) {
  const k = Math.min(1, SIG_MAX_W / w, SIG_MAX_H / h), c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w * k)); c.height = Math.max(1, Math.round(h * k));
  const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(source, 0, 0, c.width, c.height);
  return new Promise(r => c.toBlob(r, 'image/png'));
}
// อัปโหลดรูป + บันทึก
async function storeSignature(field, t, blob) {
  const path = `signatures/${tpId}/${field}_${Date.now()}.png`;
  const { error } = await sb.storage.from('punch-photos').upload(path, blob, { contentType: 'image/png' });
  if (error) throw error;
  await saveSigPath(field, t, path);
  await setSigBox(field, path);
}

// ---------- หน้าต่างวาดลายเซ็น ----------
let sigPad = null;
function ensureSigModal() {
  if ($('sigModal')) return;
  document.body.insertAdjacentHTML('beforeend', `<div class="modal fade" id="sigModal" tabindex="-1" role="dialog" aria-labelledby="sigTitle" aria-hidden="true"><div class="modal-dialog"><div class="modal-content">
    <div class="modal-header"><h5 class="modal-title" id="sigTitle">Draw signature</h5></div>
    <div class="modal-body"><canvas id="sigCanvas" width="1200" height="400" aria-label="Signature drawing area"></canvas>
      <div class="small text-muted mt-1">Sign inside the box with your finger, pen or mouse. Using a keyboard? Press Cancel, then use Upload instead.</div><div class="small text-danger mt-1" id="sigErr" role="alert"></div></div>
    <div class="modal-footer"><button type="button" class="btn btn-outline-secondary mr-auto" id="sigClear">Clear</button>
      <button type="button" class="btn btn-outline-secondary" id="sigCancel">Cancel</button><button type="button" class="btn btn-info" id="sigUse">Use this signature</button></div>
  </div></div></div>`);
  const cv = $('sigCanvas'), g = cv.getContext('2d');
  g.lineWidth = 6;   // canvas 1200x400 (แสดง 600 CSS px) คมบนจอ DPR สูง
   g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = '#111';
  const pt = (e) => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * cv.width / r.width, (e.clientY - r.top) * cv.height / r.height]; };
  let drawing = false;
  cv.addEventListener('pointerdown', (e) => { e.preventDefault(); drawing = true; sigPad.dirty = true; cv.setPointerCapture(e.pointerId); const [x, y] = pt(e); g.beginPath(); g.moveTo(x, y); g.lineTo(x + .01, y + .01); g.stroke(); });
  cv.addEventListener('pointermove', (e) => { if (!drawing) return; const [x, y] = pt(e); g.lineTo(x, y); g.stroke(); });
  const stop = () => { drawing = false; };
  cv.addEventListener('pointerup', stop); cv.addEventListener('pointercancel', stop);
  sigPad = { cv, g, dirty: false, clear() { g.clearRect(0, 0, cv.width, cv.height); this.dirty = false; $('sigErr').textContent = ''; } };
  $('sigClear').onclick = () => sigPad.clear();
  $('sigCancel').onclick = () => window.jQuery('#sigModal').modal('hide');
  $('sigUse').onclick = async () => {
    if (!sigPad.dirty) { $('sigErr').textContent = 'Please sign in the box first.'; return; }
    $('sigUse').disabled = true;
    try {
      const blob = await sigToBlob(sigPad.cv, sigPad.cv.width, sigPad.cv.height);
      await storeSignature(sigPad.field, sigPad.t, blob);
      window.jQuery('#sigModal').modal('hide'); setMsg('signMsg', 'Signature saved');
    } catch (e) { $('sigErr').textContent = 'Could not save: ' + friendlyErr(e); }
    finally { $('sigUse').disabled = false; }
  };
}

// ผูกปุ่มทั้งหมดครั้งเดียวที่กล่อง #signFields (สร้างใหม่ได้โดยไม่ต้องผูกซ้ำ)
function bindSignature() {
  const box = $('signFields');
  box.addEventListener('click', async (e) => {
    const draw = e.target.closest('[data-sigdraw]'), del = e.target.closest('[data-sigdel]');
    if (draw && canQC) {
      ensureSigModal(); const b = draw.closest('.sig-box');
      sigPad.field = b.dataset.sigf; sigPad.t = b.dataset.sigt; sigPad.clear();
      window.jQuery('#sigModal').modal({ backdrop: 'static', keyboard: false, show: true });
    } else if (del && canQC && confirm('Remove this signature image?')) {
      const b = del.closest('.sig-box');
      try { await saveSigPath(b.dataset.sigf, b.dataset.sigt, null); await setSigBox(b.dataset.sigf, ''); setMsg('signMsg', 'Signature removed'); }
      catch (err) { setMsg('signMsg', 'Could not remove: ' + friendlyErr(err), false); }
    }
  });
  box.addEventListener('change', async (e) => {
    const inp = e.target.closest('[data-sigfile]'); if (!inp || !canQC || !inp.files[0]) return;
    const b = inp.closest('.sig-box'), file = inp.files[0]; inp.value = '';
    if (!file.type.startsWith('image/')) return setMsg('signMsg', 'Please choose an image file.', false);
    setMsg('signMsg', 'Uploading signature…');
    try {
      const bmp = await decodeImage(file); if (!bmp) throw new Error('image');
      const blob = await sigToBlob(bmp, bmp.naturalWidth || bmp.width, bmp.naturalHeight || bmp.height); bmp.close?.();
      await storeSignature(b.dataset.sigf, b.dataset.sigt, blob); setMsg('signMsg', 'Signature saved');
    } catch (err) { setMsg('signMsg', 'Could not save: ' + (err.message === 'image' ? 'this image could not be read, try another file.' : friendlyErr(err)), false); }
  });
}
