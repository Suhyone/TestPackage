// ===================================================================
// punch_photos.js — ฟังก์ชันจัดการ "รูปถ่าย" ที่ใช้ร่วมกัน
//   ใช้โดย: punch_detail.js (แผงรายละเอียด 🔍) และ punch_list.js (ฟอร์มเพิ่มตำหนิ)
//   พึ่งพา : sb (Supabase client จาก app.js), ที่เก็บไฟล์ bucket 'punch-photos'
//   แก้เรื่อง: ขนาด/คุณภาพรูปที่อัปโหลด, ปุ่ม "เลือกไฟล์ / ถ่ายรูป", วิธีเปิดดูรูป
// ===================================================================

// ข้อจำกัดต่อการเลือกรูป: จำนวนรูปสูงสุดต่อกล่อง และขนาดไฟล์ต้นฉบับสูงสุด (MB)
const PHOTO_MAX_FILES = 10, PHOTO_MAX_MB = 25;
// ถอดรหัสรูปเป็น bitmap (ลอง createImageBitmap ก่อน แล้วค่อย <img> เผื่อเบราว์เซอร์/ชนิดไฟล์ไม่รองรับ) ถอดไม่ได้ = null
async function decodeImage(file) {
  try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch { /* ลองวิธีถัดไป */ }
  const url = URL.createObjectURL(file);
  try {
    return await new Promise((ok, no) => { const im = new Image(); im.onload = () => ok(im); im.onerror = no; im.src = url; });
  } catch { return null; } finally { URL.revokeObjectURL(url); }
}
// ย่อรูปให้ด้านยาวสุดไม่เกิน max พิกเซล แล้วแปลงเป็น JPEG (ประหยัดพื้นที่ + อัปโหลดเร็ว) — ย่อไม่ได้ (เช่น HEIC) จะอัปโหลดไฟล์เดิม
async function resizeImage(file, max = 1600) {
  if (!file.type.startsWith('image/')) return file;
  const bmp = await decodeImage(file); if (!bmp) return file;
  const w = bmp.naturalWidth || bmp.width, h = bmp.naturalHeight || bmp.height, k = Math.min(1, max / Math.max(w, h));
  const c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close?.();
  const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.82));
  return blob || file;
}
// ย่อรูปแล้วอัปโหลดขึ้น Storage bucket punch-photos คืนรายการ path ของไฟล์ที่อัปโหลด (onProgress(เสร็จแล้ว, ทั้งหมด) แสดงความคืบหน้า)
async function uploadPhotos(files, folder, onProgress) {
  const paths = [];
  for (const f of files) {
    const blob = await resizeImage(f);
    const ext = blob.type === 'image/jpeg' ? 'jpg' : ((f.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin');
    const path = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await sb.storage.from('punch-photos').upload(path, blob, { contentType: blob.type || f.type || 'application/octet-stream' });
    if (error) throw Object.assign(new Error(error.message), { friendly: `Upload of "${f.name || 'photo'}" failed: ${friendlyErr(error)}` });
    paths.push(path); onProgress?.(paths.length, files.length);
  }
  return paths;
}
// แปลง path ใน Storage เป็นลิงก์ชั่วคราว (1 ชม.) เพื่อแสดง/เปิดรูป — ผลเรียงตาม paths เสมอ (path ที่สร้างลิงก์ไม่ได้จะเป็นค่าว่าง)
async function signed(paths) {
  if (!paths?.length) return [];
  const { data } = await sb.storage.from('punch-photos').createSignedUrls(paths, 3600);
  const by = Object.fromEntries((data || []).map(d => [d.path, d.signedUrl]));
  return paths.map(p => by[p] || '');
}
// ตัวเลือกรูป: ปุ่ม "เลือกไฟล์" + ปุ่ม "ถ่ายรูป" (บนมือถือ/แท็บเล็ตเปิดกล้องหลังโดยตรง) + ลากไฟล์มาวางได้
// สะสมได้หลายรูป พร้อมภาพย่อและปุ่มลบ · คืนค่า { files, clear() }
function makePicker(host) {
  const files = [];
  host.innerHTML = `<div class="pk-drop">
      <div class="btn-group btn-group-sm mb-1">
        <button type="button" class="btn btn-outline-secondary pk-file"><i class="fas fa-folder-open"></i> Choose files</button>
        <button type="button" class="btn btn-outline-info pk-cam"><i class="fas fa-camera"></i> Take photo</button></div>
      <span class="small text-muted ml-1 pk-hint">or drag photos here</span>
      <input type="file" accept="image/*" multiple hidden class="pk-in-file">
      <input type="file" accept="image/*" capture="environment" hidden class="pk-in-cam">
      <div class="pk-thumbs"></div><div class="small text-danger pk-err"></div></div>`;
  const drop = host.querySelector('.pk-drop'), thumbs = host.querySelector('.pk-thumbs'), err = host.querySelector('.pk-err');
  let urls = [];
  const paint = () => {
    urls.forEach(URL.revokeObjectURL);
    urls = files.map(f => URL.createObjectURL(f));
    thumbs.innerHTML = files.map((f, i) => `<span class="pk-thumb"><img src="${urls[i]}" alt="Photo ${i + 1}"><button type="button" data-i="${i}" title="Remove photo" aria-label="Remove photo ${i + 1}">&times;</button></span>`).join('');
  };
  const add = (list) => {
    const msgs = [];
    for (const f of list) {
      if (!f.type.startsWith('image/')) msgs.push(`"${f.name}" is not an image`);
      else if (f.size > PHOTO_MAX_MB * 1048576) msgs.push(`"${f.name}" is larger than ${PHOTO_MAX_MB} MB`);
      else if (files.length >= PHOTO_MAX_FILES) { msgs.push(`Maximum ${PHOTO_MAX_FILES} photos`); break; }
      else files.push(f);
    }
    err.textContent = msgs.join(' · '); paint();
  };
  host.querySelector('.pk-file').onclick = () => host.querySelector('.pk-in-file').click();
  host.querySelector('.pk-cam').onclick = () => host.querySelector('.pk-in-cam').click();
  host.querySelectorAll('input[type=file]').forEach(inp => inp.addEventListener('change', () => { add([...inp.files]); inp.value = ''; }));
  thumbs.addEventListener('click', (e) => { const b = e.target.closest('button[data-i]'); if (b) { files.splice(+b.dataset.i, 1); err.textContent = ''; paint(); } });
  drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('over'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('over'));
  drop.addEventListener('drop', (e) => { e.preventDefault(); drop.classList.remove('over'); add([...e.dataTransfer.files]); });
  return { get files() { return files; }, clear() { files.length = 0; err.textContent = ''; paint(); } };
}
