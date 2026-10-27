// ถ้าล็อกอินอยู่แล้วให้ข้ามไปหน้า Dashboard
appReady.then(({ session }) => { if (session) location.href = 'index.php'; });
// ส่งฟอร์มล็อกอินผ่าน Supabase Auth: สำเร็จไป index.php ผิดพลาดแสดงข้อความ
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const err = document.getElementById('loginErr'); err.classList.add('d-none');
  const { error } = await sb.auth.signInWithPassword({
    email: document.getElementById('email').value.trim(),
    password: document.getElementById('password').value,
  });
  if (error) { err.textContent = 'Sign in failed. Please check your email and password.'; err.classList.remove('d-none'); return; }
  location.href = 'index.php';
});
