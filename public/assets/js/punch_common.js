// ตัวช่วยที่ใช้ร่วมกันของหน้า Punch List (admin: punch_list.js) และหน้างานตรวจ/งานของฉัน (qc_list.js)
// สถานะของ punch item: ชื่อที่แสดง + คลาสสี (bg-s-* ใน app.css)
// ตามฟอร์ม Punch List ของโครงการ: O = Open, C = Close, N = Cancelled (ห้ามเพิ่มสถานะอื่น) — code = ตัวย่อในฟอร์ม ใช้ตอน Export
const STATUS = {
  open:      { label: 'Open',      code: 'O', cls: 'bg-s-open' },
  close:     { label: 'Close',     code: 'C', cls: 'bg-s-approved' },
  cancelled: { label: 'Cancelled', code: 'N', cls: 'bg-s-cancelled' },
};
// สีป้าย Category (A=แดง, A1=เหลือง, B=ฟ้า, C=เขียว)
const CAT_CLS = { A: 'danger', A1: 'warning', B: 'info', C: 'success' };
// ทางลัดสำหรับ document.getElementById
const $ = (id) => document.getElementById(id);
// วันที่วันนี้รูปแบบ YYYY-MM-DD (ใช้บันทึกวันที่ลงฐานข้อมูล)
const today = () => new Date().toISOString().slice(0, 10);
// แสดงข้อความผิดพลาดให้ผู้ใช้
const alertErr = (e) => alert('Error: ' + (e.message || e));
// ดึงข้อมูลทีละ 1,000 แถว (ข้อจำกัดของ Supabase) จนครบ
async function fetchAll(build) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await build().range(from, from + 999);
    if (error) throw error;
    out.push(...data);
    if (data.length < 1000) return out;
  }
}
// คำสั่ง select ดึง item พร้อม drawing และ test pack ในครั้งเดียว
const SELECT = '*, drawings!inner(id,drawing_no,work_type,report_path,report_note,test_pack_id,' +
               'test_packs!inner(test_pack_no,skid,project_no))';
