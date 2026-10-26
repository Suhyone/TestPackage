// ตัวกลางของทุกหน้า: Supabase client, ตรวจล็อกอิน, role, เมนู
// สร้าง Supabase client จากค่าที่ header.php ส่งมา (ทุกหน้าใช้ตัวแปร sb นี้)
const sb = window.supabase.createClient(APP_CONFIG.url, APP_CONFIG.anonKey);
window.sb = sb;

// ชื่อที่แสดงของแต่ละสิทธิ์
const ROLE_LABEL = { admin: 'Admin', qc: 'QA/QC', officer: 'Officer' };
// หน้า login ไม่ต้องตรวจสิทธิ์/โหลดโปรไฟล์
const isPublicPage = document.body.classList.contains('login-page');

// ตรวจล็อกอิน + โหลดโปรไฟล์/สิทธิ์ แล้วใส่ชื่อ ปุ่มออกจากระบบ ตัวกรองเมนู — สคริปต์ของแต่ละหน้ารอ appReady ก่อนเริ่มทำงาน
window.appReady = (async () => {
  const { data: { session } } = await sb.auth.getSession();
  if (isPublicPage) return { session };
  if (!session) { location.href = 'login.php'; return new Promise(() => {}); }

  const { data: profile } = await sb.from('profiles').select('*').eq('id', session.user.id).single();
  const me = { id: session.user.id, email: session.user.email,
               name: profile?.full_name || session.user.email, role: profile?.role || 'officer' };
  window.ME = me;

  const $ = (id) => document.getElementById(id);
  $('userName').textContent = me.name;
  $('roleBadge').textContent = ROLE_LABEL[me.role] || me.role;
  // เมนูตามสิทธิ์: .role-admin เฉพาะ admin, .role-nonadmin เฉพาะ QC/เจ้าหน้าที่
  document.querySelectorAll(me.role === 'admin' ? '.role-admin' : '.role-nonadmin').forEach(e => e.classList.remove('d-none'));
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

// helpers
// ฟังก์ชันช่วยที่ใช้ทุกหน้า: จัดรูปแบบวันที่ (fmtDate) และ escape HTML กัน XSS (esc)
window.fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : '';
window.esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
