# แผนหน้าที่จะทำต่อ — Test Package (อิงจากฟอร์ม CT8-TP-*.xlsx)

ฟอร์ม 1 ไฟล์ = 1 Test Package ประกอบด้วยชีตที่เป็น "หน้า/ขั้นตอน" ของระบบได้ตรงตัว:

| ชีตในฟอร์ม | คืออะไร | หน้าในระบบ |
|---|---|---|
| Cover + Sheet1 (PRESSURE TEST INFORMATION) | ข้อมูลหลักของ pack: ระบบท่อ, ของไหล, ความดัน, เวลาค้าง, ประวัติแก้ไขเอกสาร, ลายเซ็น | **Test Package > Info** |
| Sheet2 (TEST PACK CONTENT CHECK LIST) | รายการเอกสาร 15 หัวข้อ YES / N/A | **Test Package > Contents** |
| SECTION #1–#15 | ใบคั่นของเอกสารแนบแต่ละหัวข้อ (P&ID, line list, WHS, NDE, …) | แนบไฟล์ในหน้า Contents |
| ISO INDEX | รายการ isometric / spool / line (ความดันออกแบบ ความดันทดสอบ วัสดุ) | **Test Package > ISO / Spool** |
| Sheet5 (PRESSURE TEST PACK CHECKLIST) | เช็กลิสต์เอกสาร 17 ข้อ + เตรียมทดสอบ 13 ข้อ (YES/NO/N/A) | **Test Package > Pre-test Checklist** |
| Sheet6 (PROCESS PUNCH-LIST) | ใบ Punch List (Category A/B, OPEN/CLOSED, Prod Sup/QCI/Client) | **Punch List** (มีแล้ว) + หน้าพิมพ์ฟอร์ม |
| SECTION #10 / ผลทดสอบ | บันทึกผลทดสอบแรงดัน | **Pressure Test** |

กฎสำคัญจากฟอร์ม: ถ้าเช็กลิสต์มีข้อใดเป็น **NO** ต้องเปิด Punch List และ **ห้ามทดสอบแรงดัน** จนกว่า Category A จะปิดหมด

## หน้าที่มีแล้ว
Login · Dashboard · **Test Packages (Register)** · **Test Package Detail** (แท็บ Info · Contents · ISO · Pre-test · Punch · Sign-off ใช้งานได้ · Data Guide) · Punch List (QC list) · Advanced Grid · Admin: Users · Admin: Category/Discipline

## ลำดับที่แนะนำให้ทำ

### เฟส 1 — แกนหลักของ Test Package (ทำก่อน)
1. ✅ **Test Package Register** — ตารางรายการ pack ทั้งหมด: TP No., Module, ระบบท่อ, ของไหล, ความดันทดสอบ, สถานะ, จำนวน punch ที่ยังเปิด (แยก A/B) · กรอง Module / ระบบ / สถานะ · คลิกเข้า pack
2. ◐ **Test Package Detail** (ทำแล้ว: Info · Contents · ISO · Pre-test · Punch · Sign-off · เหลือ: Pressure test) — หน้าเดียวต่อ pack แบบแท็บ ตามชีตในฟอร์ม: Info · Contents · ISO/Spool · Pre-test · Punch · Pressure test · Sign-off (ทุกแท็บอยู่ใน pack เดียวกัน ไม่ต้องกระโดดหน้า)
3. ✅ (โค้ดเสร็จ รอรัน sql/07 และทดสอบกับข้อมูลจริง) **Pre-test Checklist** — ฟอร์มติ๊ก YES/NO/N/A ทีละข้อ · ข้อที่เป็น NO สร้าง punch item ให้อัตโนมัติ · แสดงป้ายว่า "พร้อมทดสอบ / ยังไม่พร้อม"
4. ✅ (โค้ดเสร็จ — punch_report.php?id=, Print/PDF แล้ว ยังไม่มี Excel) **Punch List Report (พิมพ์)** — หน้าจัดรูปแบบ A4 เหมือน Sheet6 มีลายเซ็นท้ายฟอร์ม + ปุ่ม Print/PDF/Excel ส่งลูกค้า

### เฟส 2 — ทดสอบและเอกสารประกอบ
5. **Pressure Test Record** — วันที่ทดสอบ, เกจและใบสอบเทียบ, ความดันที่อ่านได้, เวลาค้าง, ผล PASS/FAIL, แนบกราฟ/รายงาน · ปุ่มเริ่มทดสอบถูกล็อกถ้า pre-test ไม่ผ่านหรือ punch A ยังเปิด
6. **Contents + เอกสารแนบ** — ติ๊กหัวข้อ 15 ข้อ, อัปโหลดไฟล์ต่อหัวข้อ (เก็บใน Storage) · แสดงขาดอะไรอยู่
7. **ISO / Spool Register** — นำเข้า ISO INDEX (isometric, line no., spool no.) · ใช้เป็นรายการให้เลือก "Drawing No." ตอนเพิ่ม punch (ตอนนี้พิมพ์เอง)
8. **Module Overview** — ภาพรวมต่อ Block/Module (MD-1.1, 1.2, 2.1, …): กี่ pack, กี่ % ทดสอบแล้ว, punch เปิดเท่าไร สำหรับผู้บริหาร/PM

### เฟส 3 — ใช้งานจริงเต็มรูปแบบ
9. **My Tasks** — กล่องงานของเจ้าหน้าที่: รายการที่ถูกมอบหมาย เรียงตาม Category · ของ QC: รอตรวจซ้ำ
10. **Test Package Dossier (PDF)** — รวมทุกชีต (cover → sections → punch → ผลทดสอบ) เป็นไฟล์เดียวเหมือนที่ส่งอยู่ปัจจุบัน
11. **Import / Export** — หน้านำเข้าไฟล์ Excel ในเว็บ (แทนสคริปต์) พร้อมตรวจก่อนนำเข้า
12. **Audit Log** — ใครแก้อะไรเมื่อไร (สถานะ punch, ผลทดสอบ, ลายเซ็น)
13. **Master Data เพิ่มเติม** — ของไหล (Fluid code), วัสดุท่อ, test medium, รายชื่อผู้เซ็น (ชื่อ/ตำแหน่ง) · ต่อยอดจากหน้า Category/Discipline
14. **หน้าระบบ** — Profile/เปลี่ยนรหัสผ่าน, 403/404

## ตารางฐานข้อมูลที่ต้องเพิ่มเมื่อถึงเฟสนั้น
| เฟส | ตาราง/คอลัมน์ |
|---|---|
| 1 | `pretest_items` (pack, หมวด document/preparation, ข้อ, ข้อความ, YES/NO/N/A, remarks) + แม่แบบรายการ 17+13 ข้อ · สถานะของ pack ใน `test_packs` (draft / checklist / punch / ready / tested / complete) |
| 2 | `pressure_tests` (pack, วันที่, เกจ, ค่าที่อ่าน, เวลาค้าง, ผล, ไฟล์) · `pack_documents` (pack, section 1–15, verify YES/N/A, ไฟล์) · `iso_lines` (pack, isometric, sheet, rev, line no., spool no., fluid, ความดัน/อุณหภูมิ, test type H/P, วัสดุ) |
| 3 | `audit_log` · `fluid_codes`, `pipe_materials`, `signatories` |

## เสนอหน้าตาเมนู
```
Dashboard
Test Package
  ├─ Register           (เฟส 1)
  ├─ Punch List         (มีแล้ว)
  ├─ Pre-test Checklist (เฟส 1)
  ├─ Pressure Test      (เฟส 2)
  ├─ ISO / Spool        (เฟส 2)
  └─ Module Overview    (เฟส 2)
My Tasks                (เฟส 3)
Reports                 (Punch report พิมพ์ · Dossier PDF)
Administrator           (Users · Category/Discipline · Master data)
```

## สิ่งที่ควรตัดสินใจก่อนเริ่มเฟส 1
- สถานะของ Test Package มีกี่ขั้น และใครเป็นคนเปลี่ยน (QC อย่างเดียว หรือรวม Engineering/Client)
- Pre-test checklist 17+13 ข้อเป็นแม่แบบเดียวกันทุก pack หรือต่างตามชนิด pack (hydro / pneumatic) — ตอนนี้ใช้ชุดเดียว (pretest_template.test_type เตรียมไว้แยกภายหลัง)
- ลูกค้า (CIMTAS) เข้าระบบดูเองหรือไม่ — ถ้าใช่ต้องมี role "client" อ่านอย่างเดียว
