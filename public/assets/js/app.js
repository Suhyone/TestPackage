// ตัวกลางของทุกหน้า: Supabase client, ตรวจล็อกอิน, role, เมนู
// สร้าง Supabase client จากค่าที่ header.php ส่งมา (ทุกหน้าใช้ตัวแปร sb นี้)
const sb = window.supabase.createClient(APP_CONFIG.url, APP_CONFIG.anonKey);
window.sb = sb;

// ชื่อที่แสดงของแต่ละสิทธิ์
const ROLE_LABEL = { admin: 'Admin', qc: 'QA/QC', officer: 'Officer', viewer: 'View only' };
// หน้า login ไม่ต้องตรวจสิทธิ์/โหลดโปรไฟล์
const isPublicPage = document.body.classList.contains('login-page');

// ตรวจล็อกอิน + โหลดโปรไฟล์/สิทธิ์ แล้วใส่ชื่อ ปุ่มออกจากระบบ ตัวกรองเมนู — สคริปต์ของแต่ละหน้ารอ appReady ก่อนเริ่มทำงาน
window.appReady = (async () => {
  const { data: { session } } = await sb.auth.getSession();
  if (isPublicPage) return { session };
  if (!session) { location.href = 'login.php'; return new Promise(() => {}); }

  const { data: profile } = await sb.from('profiles').select('*').eq('id', session.user.id).single();
  // ไม่มีโปรไฟล์ = อ่านอย่างเดียว (viewer) ไม่ใช่ officer กันเห็นปุ่มที่ไม่มีสิทธิ์
  const me = { id: session.user.id, email: session.user.email,
               name: profile?.full_name || session.user.email, role: profile?.role || 'viewer', noProfile: !profile };
  window.ME = me;

  const $ = (id) => document.getElementById(id);
  $('userName').textContent = me.name;
  $('roleBadge').textContent = ROLE_LABEL[me.role] || me.role;
  // เมนูตามสิทธิ์: .role-admin เฉพาะ admin, .role-nonadmin เฉพาะ QC/เจ้าหน้าที่
  document.querySelectorAll(me.role === 'admin' ? '.role-admin' : '.role-nonadmin').forEach(e => e.classList.remove('d-none'));
  if (me.noProfile) console.warn('No profile found for this user — ask an admin to set a role.');
  $('logoutBtn').addEventListener('click', async (e) => {
    e.preventDefault(); await sb.auth.signOut(); location.href = 'login.php';
  });
  $('menuFilter')?.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    document.querySelectorAll('.nav-sidebar .nav-item').forEach(li =>
      li.style.display = li.textContent.toLowerCase().includes(q) ? '' : 'none');
  });
  return { session, me };
})();

// ---------- ขนาดตัวอักษร (Aa) ----------
// ปุ่มในเมนู Aa ที่แถบด้านบน: เลือกแล้วจำไว้ในเครื่องและโหลดหน้าใหม่ (ตารางที่คำนวณความสูงแถวจากขนาดตัวอักษรจะได้ขนาดถูกต้อง) · รูปแบบตัวอักษรทั้งหมดกำหนดที่ต้นไฟล์ app.css
// ปุ่มเป็น toggle button (aria-pressed) — ตัวที่ใช้อยู่ = true · ถ้าเขียน localStorage ไม่ได้ จะตั้ง data-fs ทันทีโดยไม่โหลดหน้าใหม่ (ใช้ได้ในรอบนี้เท่านั้น ตารางที่คำนวณความสูงแถวไว้แล้วจะยังไม่ปรับ)
(() => {
  const root = document.documentElement, btns = [...document.querySelectorAll('[data-fsbtn]')];
  const mark = (cur) => btns.forEach(b => { const on = b.dataset.fsbtn === cur; b.classList.toggle('active', on); b.setAttribute('aria-pressed', on); });
  mark(root.getAttribute('data-fs') || '');
  btns.forEach(b => b.addEventListener('click', () => {
    const v = b.dataset.fsbtn;
    try { localStorage.setItem('bjchiFs', v); location.reload(); return; } catch { /* ไม่มีที่เก็บ — ใช้เฉพาะรอบนี้ */ }
    if (v) root.setAttribute('data-fs', v); else root.removeAttribute('data-fs');
    mark(v);
  }));
})();

// สเกลตามขนาดตัวอักษรที่ผู้ใช้เลือก (Aa): 1 = 16px · ใช้คูณความสูงแถวของ AG Grid (tp_register.js, punch_list.js)
window.uiScale = () => (parseFloat(getComputedStyle(document.documentElement).fontSize) / 16) || 1;

// ---------- Project No. (header) จำข้ามหน้า ----------
// จำโครงการที่เลือกไว้ (localStorage) ใช้ร่วมกันทุกหน้าที่มีช่อง Project No. (Punch List · Test Packages · Advanced Grid) และจำรายชื่อโครงการล่าสุด
// เพื่อให้ช่องแสดงค่าเดิมทันทีตอนเปิดหน้า ไม่ต้องรอโหลดข้อมูล แล้วค่อยปรับเมื่อข้อมูลจริงมาถึง
const PROJ_KEY = 'bjchiProject', PROJ_LIST = 'bjchiProjects';
const lsGet = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch { /* ไม่มีที่เก็บ — ข้าม */ } };
window.projPref = { get: () => lsGet(PROJ_KEY) || '', set: (v) => lsSet(PROJ_KEY, v || '') };
// เติมช่อง Project No. จากรายชื่อ เลือกค่าที่จำไว้ (ถ้ายังมีอยู่) แสดงช่อง แล้วคืนค่าที่เลือก ('' = All)
window.fillProjectSelect = (projects) => {
  const box = document.getElementById('projectBox'), sel = document.getElementById('fProject'); if (!box || !sel) return '';
  lsSet(PROJ_LIST, JSON.stringify(projects));
  const saved = window.projPref.get(), cur = projects.includes(saved) ? saved : '';
  if (saved && !cur) window.projPref.set('');                              // โครงการที่จำไว้ไม่มีแล้ว
  sel.innerHTML = '<option value="">All</option>' + projects.map(p => `<option>${window.esc(p)}</option>`).join('');
  sel.value = cur;
  box.classList.replace('d-none', 'd-flex');
  if (!sel.dataset.pref) { sel.dataset.pref = '1'; sel.addEventListener('change', () => window.projPref.set(sel.value)); }   // เลือกใหม่ = จำไว้
  return cur;
};
// เรียกตอนเริ่มหน้า (ก่อนรอข้อมูล): ใช้รายชื่อที่จำไว้เติมช่องทันที
window.prefillProjectSelect = () => { try { const l = JSON.parse(lsGet(PROJ_LIST)); if (Array.isArray(l) && l.length) return window.fillProjectSelect(l); } catch { /* ไม่มีรายชื่อที่จำไว้ */ } return ''; };

// helpers
// ฟังก์ชันช่วยที่ใช้ทุกหน้า: จัดรูปแบบวันที่ (fmtDate) และ escape HTML กัน XSS (esc)
window.fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : '';
// แปลง error ดิบของ Supabase/เครือข่ายเป็นข้อความที่คนอ่านเข้าใจ (ของดิบเก็บใน console)
window.friendlyErr = (e) => {
  console.error(e);
  if (e?.friendly) return e.friendly;                              // ข้อความที่ผู้เขียนโค้ดเตรียมไว้ให้ผู้ใช้แล้ว (เช่น ชื่อไฟล์ที่อัปโหลดไม่สำเร็จ)
  const m = String(e?.message || e || ''), c = e?.code || '';
  if (/^GATE:/.test(m)) return m.replace(/^GATE:\s*/, '');                                // ข้อความจาก trigger ในฐานข้อมูล (เช่น gate ทดสอบแรงดัน) เขียนเป็นภาษาคนอยู่แล้ว
  if (c === '42501' || /row-level security|permission denied/i.test(m)) return "You don't have permission to do this.";
  if (c === '23514' || /pressure_tests_(pass_rule|gauge_valid|values_ok)/.test(m)) {                // check constraint ของตาราง pressure_tests (sql/13)
    if (/pass_rule/.test(m)) return 'This test cannot be marked Passed: the max pressure or holding time is below the required value.';
    if (/gauge_valid/.test(m)) return 'The gauge calibration due date must not be earlier than the test date.';
    if (/values_ok/.test(m)) return 'Pressure readings and holding time cannot be negative.';
  }
  if (c === '23505' || /duplicate key/i.test(m)) return 'This record already exists.';
  if (/failed to fetch|network|timeout/i.test(m)) return 'Connection problem. Please check your internet and try again.';
  if (/JWT|expired/i.test(m)) return 'Your session has expired. Please sign in again.';
  return 'Something went wrong. Please try again, or contact an admin if it keeps happening.';
};
window.esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
