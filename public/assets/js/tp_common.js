// ===================================================================
// tp_common.js — ค่าและฟังก์ชันที่หน้า Test Package ใช้ร่วมกัน (Register: tp_register.js · Detail: tp_detail.js)
//   โหลดหลัง punch_common.js
// ===================================================================

// สถานะ punch ของ pack ตามกฎของฟอร์ม: A ที่ยัง Open = ห้ามทดสอบแรงดัน · B ที่ Open = ทำต่อได้ตามดุลยพินิจ PM
// (กฎเดียวกับคอลัมน์ punch_state ใน view v_test_packs — sql/06_test_package_register.sql)
const PSTATE = {
  blocked: { label: 'Blocked · A open', cls: 'bg-s-rework',    hint: 'Category A punch still open — pressure test not allowed' },
  open:    { label: 'B open',           cls: 'bg-s-fixed',     hint: 'Only Category B punch open' },
  clear:   { label: 'All closed',       cls: 'bg-s-approved',  hint: 'All punch items closed' },
  none:    { label: 'No punch items',   cls: 'bg-s-cancelled', hint: 'No punch items raised' },
};
// หาสถานะ punch จากจำนวน { open_a, items_open, items_total }
const punchState = (c) => c.open_a > 0 ? 'blocked' : c.items_open > 0 ? 'open' : c.items_total > 0 ? 'clear' : 'none';
// ป้ายสถานะ punch (HTML)
const stateBadge = (s) => PSTATE[s] ? `<span class="badge-status ${PSTATE[s].cls}" title="${esc(PSTATE[s].hint)}">${esc(PSTATE[s].label)}</span>` : '';
