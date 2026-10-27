// ===================================================================
// field_draft.js — บันทึกร่างกันหาย + สถานะออนไลน์ สำหรับหน้า Field (แท็บเล็ตหน้างาน)
//   เก็บร่างใน localStorage ของเครื่อง (key แยกตามผู้ใช้ + pack) — ไม่ใช่ระบบ offline เต็มรูปแบบ:
//     · คำตอบ Pre-test ที่ส่งไม่ได้ (เน็ตหลุด) รอส่งใหม่ได้ · ฟอร์ม punch ที่ยังไม่บันทึกกลับมาครบเมื่อเปิดใหม่
//     · รูปถ่ายที่ยังไม่อัปโหลด "ไม่ถูกเก็บ" ต้องเลือก/ถ่ายใหม่
//   ถ้าเขียน localStorage ไม่ได้ (โหมดส่วนตัว/เต็ม) จะทำงานต่อโดยไม่มีร่าง และ available() คืน false
//   ใช้โดย: field_pack.js · พึ่งพา: app.js (window.ME)
// ===================================================================
const FieldDraft = (() => {
  const key = (packId) => `bjchiFieldDraft:${window.ME?.id || 'anon'}:${packId}`;
  const read = (packId) => { try { return JSON.parse(localStorage.getItem(key(packId))) || {}; } catch { return {}; } };
  let ok = true;
  const write = (packId, v) => {
    try { localStorage.setItem(key(packId), JSON.stringify(v)); ok = true; } catch { ok = false; }
  };
  return {
    available: () => ok,
    // ค่าของหัวข้อหนึ่ง (เช่น 'pretest', 'punch') ของ pack นี้
    get: (packId, part) => read(packId)[part] ?? null,
    set: (packId, part, value) => { const d = read(packId); d[part] = value; write(packId, d); },
    clear: (packId, part) => { const d = read(packId); delete d[part]; if (Object.keys(d).length) write(packId, d); else { try { localStorage.removeItem(key(packId)); } catch { /* ข้าม */ } } },
  };
})();

// ป้ายออนไลน์/ออฟไลน์ (host = element ที่ใส่ป้าย) · onBack = เรียกเมื่อกลับมาออนไลน์ (เช่น ส่งร่างที่ค้าง)
function watchOnline(host, onBack) {
  const paint = () => {
    const on = navigator.onLine;
    host.innerHTML = on ? '<span class="badge badge-success"><i class="fas fa-wifi"></i> Online</span>'
                        : '<span class="badge badge-danger"><i class="fas fa-plane"></i> Offline — your entries are kept on this device</span>';
    host.classList.toggle('fd-offline', !on);
  };
  window.addEventListener('online', () => { paint(); onBack?.(); });
  window.addEventListener('offline', paint);
  paint();
}
