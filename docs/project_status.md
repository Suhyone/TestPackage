# BJCHI QA/QC ERP — สรุปความคืบหน้า งานที่ต้องทำ และกฎการทำงาน

อัปเดต: 2026-10-26 · ความคืบหน้ารวมโดยประมาณ **35–40%** ของแผนใน `page_roadmap.md` (ประมาณการ ไม่ใช่ตัววัดที่แน่นอน)
ข้อสำคัญ: หน้าใหม่ทั้งหมดยังไม่ได้ทดสอบกับข้อมูลจริงหลังล็อกอิน — ตรวจแล้วจากโค้ด ข้อมูลจำลอง และหน้า login เท่านั้น

## 1. ความคืบหน้า

### ฐานข้อมูล (Supabase)
- รัน `sql/01–08` ครบ · ข้อมูลจริง: 3 โครงการ (CT8, CT3, CT5), 58 Test Packages, ISO 508, Content checklist 295, Pre-test 380, Punch 181, Drawings 307
- ตัวนำเข้ารันซ้ำได้ ไม่เขียนทับสิ่งที่แก้ในเว็บ
- `sql/09_viewer_role.sql` (role อ่านอย่างเดียว + จำกัดการอัปโหลดรูปเฉพาะ admin/qc/officer) — **เขียนแล้ว ยังไม่ได้รัน**

### หน้าที่ใช้งานได้
| หน้า | สถานะ |
|---|---|
| Login · Dashboard · Admin (Users, Category/Discipline) | ใช้ได้ |
| Punch List (แบบย่อ) · Advanced Grid (admin) | ใช้ได้ |
| Test Packages (Register) | ใช้ได้ — ชิปสถานะ, ตัวกรอง, Export CSV, เพิ่ม pack |
| Test Package Detail | Info · Contents · ISO/Spool · Pre-test · Punch (พิมพ์รายงาน) · Sign-off ใช้ได้ · **Pressure test ยังเป็นแท็บเตรียมไว้** |
| Data Guide | ใช้ได้ |

### รอบนำเข้า CT9 + โหมดหน้างาน (2026-10-27)
- `tools/import_ct9.mjs` (dry-run ผ่าน: 21 pack, ISO 242 แถว, punch 10, Contents 315, Pre-test 602) — **ยังไม่ `--commit`** รอผู้ใช้ยืนยัน (ดู "ผู้ใช้ต้องทำเอง" ข้อ 7) · ตัวอ่านไฟล์ร่วมอยู่ที่ `tools/lib/ct_pack_reader.mjs` (CT8 importer ใช้ตัวเดียวกัน ผล dry-run CT8 เท่าเดิมทุกบรรทัด)
- หน้าใหม่ **Field mode**: `field.php` (เลือก Module/pack) · `field_pack.php?id=` (① Pre-test ② Punch ③④ ลิงก์ไป Pressure test/Sign-off ของหน้าออฟฟิศ) · ร่างกันหาย `field_draft.js` (localStorage; รูปที่ยังไม่อัปโหลดไม่ถูกเก็บ) · CSS แท็บเล็ต 768–1199px
- ยังไม่ได้ทดสอบหน้า Field หลังล็อกอินกับข้อมูลจริง

### ความคืบหน้าตามเฟส
| เฟส | ประมาณ | เหลือ |
|---|---|---|
| 1 แกนหลัก Test Package | ~90% | Pressure test, Excel ของรายงาน Punch |
| 2 ทดสอบและเอกสารประกอบ | ~20% | Pressure Test Record, อัปโหลดไฟล์แนบ Contents, ตัวเลือก Drawing จาก ISO, Module Overview |
| 3 ใช้งานเต็มรูปแบบ | ~5% | My Tasks, Dossier PDF, หน้านำเข้า Excel, Audit Log, Master data, Profile/403/404 |

### งานที่ทำในรอบ QA/UX (เสร็จแล้ว)
- สร้างเอเจนต์ทดสอบ `.claude/agents/qa-ux-tester.md` (อ่านอย่างเดียว) และตรวจ 3 รอบ
- แก้ 10 ข้อรอบ 1: gate Pressure test ไม่ขึ้นเขียวเมื่อไม่รู้สถานะ, ข้อความ/remark ของ Pre-test, วันที่ตามเวลาเครื่อง (ไม่ใช่ UTC), role `viewer` เมื่อไม่มี profile, `friendlyErr()` แปลง error, contrast ปุ่ม, confirm ปุ่มปิด/เปิดใหม่/ยกเลิก, ลำดับปุ่ม, คำศัพท์ "Closed"/"Open A"/"Open B", `lang="en"`, aria-label, ปุ่มสูง 44px บนมือถือ
- แก้ปัญหาใหม่รอบ 2–3: contrast ปุ่ม outline (YES), ข้อความจางในตาราง, role viewer ใน SQL + dropdown, error ดิบที่เหลือ, ช่องโหว่อัปโหลดรูปของ viewer, ข้อความ upload ที่ถูกกลืน
- ปรับตาราง Punch List และ Test Packages ให้เหมือนกัน (ข้อมูลสั้นกึ่งกลาง · ข้อความยาวชิดซ้าย · หัวตารางเข้มเท่ากัน)

## 2. สิ่งที่ต้องทำ

### ผู้ใช้ต้องทำเอง (ต้องล็อกอิน)
1. รัน `sql/09_viewer_role.sql` ใน Supabase SQL Editor
2. ล็อกอินเปิดทุกหน้าใหม่กับข้อมูลจริง (Contents, ISO, Pre-test, Data Guide, Punch, Sign-off) บนโน้ตบุ๊กและมือถือ 375px แล้วแจ้งสิ่งผิดปกติ
3. ทดสอบ Pre-test: ตอบ NO → ได้ punch A 1 รายการ, กดซ้ำไม่เพิ่ม, เปลี่ยนเป็น YES → punch เป็น Cancelled
4. ทดสอบด้วย 3–4 บัญชี (admin / QC / officer / viewer) ว่าปุ่มและสิทธิ์ถูกต้อง
5. ตัดสินใจ 3 เรื่อง: (ก) สถานะ Test Package มีกี่ขั้น ใครเปลี่ยน (ข) Pre-test ใช้แม่แบบเดียวทุก pack หรือแยก hydro/pneumatic (ค) ลูกค้า CIMTAS ล็อกอินดูเองหรือไม่ — ถ้าใช่ใช้ role viewer
6. ตรวจชื่อ pack `CT4-TP-MD-1.2-2` ใน CT5 ว่าพิมพ์ผิดหรือไม่

7. ยืนยันไฟล์ CT9 ก่อนนำเข้า: `MD-2.2/MD-2.2-2/CT8-TP-MD-2.2-2.xlsx` ข้างในเป็นโครงการ CT8 (ตัวนำเข้าข้ามไว้) · `MD-1.1/MD-1.1-2/CT8-TP-MD-1.1-2.xlsx` ชื่อไฟล์เป็น CT8 แต่ข้อมูลเป็น CT9 (นำเข้า) · FFS-001 ช่อง Module เป็น "See line List" (ใช้ชื่อโฟลเดอร์ FFS) · แล้วสั่ง `node tools/import_ct9.mjs "data/1.)Package  Test CT9" --commit`
8. Contents (Sheet2) ของ CT9 ไม่มีเครื่องหมายเลือก YES/N/A ในไฟล์ → นำเข้าเป็นยังไม่ยืนยัน ให้ QC ติ๊กในเว็บ

### งานพัฒนา เรียงตามความสำคัญ
1. **Pressure Test Record** — ล็อกถ้า pre-test ไม่ผ่านหรือ punch A ยังเปิด
2. ปัญหา QA ที่ค้าง: contrast ลิงก์/`btn-primary`/`.text-muted`, แถวตาราง qc_list เป็น tab stop 900 ตัว (ใช้ roving tabindex), `data_guide.php` ซ่อนแค่เมนู (ยังเปิดได้ถ้ารู้ URL), ช่องค้นหา/radio Pre-test ไม่มี label, default role ผู้ใช้ใหม่ยังเป็น officer, ปุ่ม NO ใช้สี Bootstrap เดิม, แถว NO แยกด้วยสีอย่างเดียว
3. ปรับตารางในหน้ารายละเอียด Test Package และ Advanced Grid ให้เข้ากับมาตรฐานตารางใหม่
4. เฟส 2: อัปโหลดไฟล์แนบ Contents, ตัวเลือก Drawing จาก ISO, Module Overview
5. เฟส 3: My Tasks, Dossier PDF, หน้านำเข้า Excel, Audit Log, Master data, Profile
6. ล้างคอมเมนต์ล้าสมัยใน `qc_list.php` และ `test_package.php`
7. data CT8: pre-test 10 ข้อที่ว่างในไฟล์ต้นฉบับ (ยังเป็น "ยังไม่ตอบ") · CT3: punch 6 รายการเลข item ซ้ำใน pack เดียวกัน (เก็บไว้ทั้งหมด)

## 3. กฎการทำงาน

### กฎธุรกิจ (จากฟอร์ม CT8)
- สถานะ punch มี 3 ตัว: `Open` (O) · `Closed` (C) · `Cancelled` (N) — ห้ามเพิ่มสถานะอื่น
- Category A = ห้ามทำงานต่อจนกว่าจะปิด · Category B = ทำต่อได้ตามดุลยพินิจ PM
- ลำดับงาน: เจ้าหน้าที่แก้ + ถ่ายรูป → Submit Fix (ยัง Open) → QC ตรวจ: ผ่าน = Close Item / ไม่ผ่าน = Reject Fix (ยัง Open) · QC ยกเลิก = Cancelled · Reopen ได้
- Pre-test ตอบ NO → ระบบสร้าง punch Category A อัตโนมัติ 1 รายการ (ผูกด้วย `source_key` ไม่ซ้ำ) → ห้ามทดสอบแรงดันจนกว่า punch A จะปิดและแก้คำตอบเป็น YES/N/A
- เปลี่ยนจาก NO เป็นคำตอบอื่น → punch ที่ยัง Open ถูกเปลี่ยนเป็น Cancelled (ไม่ลบ) · ที่ Closed แล้วคงไว้ตามประวัติ
- Gate Pressure test: ไม่อนุญาตถ้ามี punch A เปิด หรือ pre-test ไม่ครบ/มี NO หรือไม่สามารถตรวจสถานะได้
- สิทธิ์: admin (ทุกอย่าง) · qc (แก้/ปิด/ยกเลิก/เพิ่ม) · officer (Submit Fix) · viewer (อ่านอย่างเดียว) — ฝั่งหน้าเว็บซ่อนปุ่ม แต่ต้องบังคับซ้ำที่ RLS เสมอ

### กฎการเขียนโค้ด
- PHP 8.3+, ทุกไฟล์ PHP มี `declare(strict_types=1)` · Node 18+ สำหรับตัวนำเข้า
- `SUPABASE_SECRET_KEY` ใช้เฉพาะตัวนำเข้าในเครื่อง ห้ามอยู่ใน `public/` หรือส่งให้เบราว์เซอร์ · `.env`, `app/`, `sql/`, `tools/` ห้ามเข้าถึงผ่านเว็บ (document root = `public/`)
- ข้อมูลจากผู้ใช้ที่ใส่ใน innerHTML ต้องผ่าน `esc()` · ข้อความ error ที่แสดงผู้ใช้ต้องผ่าน `friendlyErr()` (ของดิบอยู่ใน console)
- วันที่บันทึกลง DB ใช้ `today()` (วันตามเวลาเครื่อง) ห้ามใช้ `toISOString().slice(0,10)`
- SQL รันตามลำดับเลข รันซ้ำได้ (idempotent) · ตัวนำเข้ารัน dry-run ก่อน `--commit` เสมอ และต้องไม่เขียนทับสิ่งที่แก้ในเว็บ
- แก้ขั้นตอนตรวจ/แก้/ปิดงาน ที่ `punch_detail.js` · คอมเมนต์ในโค้ดให้ตรงกับสิ่งที่ทำจริง
- หลังแก้ทุกครั้งรัน: `php -l` ทุกไฟล์ PHP และ `node --check` ทุกไฟล์ JS/`.mjs`

### กฎ UX/UI (มาตรฐานกลาง)
- ปุ่มหลัก 1 ปุ่มต่อหน้า/แท็บ = `btn-info` ทึบ · ปุ่มรอง = outline · ส่งออก/ลิงก์ = `btn-outline-secondary` · ปุ่มทำลาย = `btn-outline-danger` + confirm ทุกครั้ง
- ใช้สีจาก token `--s-*` ใน `app.css` ไม่ใช้ hex ซ้ำใน inline · contrast ต้อง ≥ 4.5:1 (WCAG AA) · ห้ามใช้สีอย่างเดียวบอกสถานะ
- คำศัพท์: สถานะ punch = Open / Closed / Cancelled · ชิป pack = Open A / Open B / All closed / No punch items / Blocked · Open A · ชื่อหน้า "Punch List" ชื่อเดียวทั้งระบบ · UI เป็นอังกฤษทั้งหมด (`lang="en"`)
- ตาราง: ข้อมูลสั้น (เลขที่ จำนวน สถานะ วันที่) และหัวตารางจัดกึ่งกลาง · ข้อความยาว (Description, Piping name) ชิดซ้าย · ฟอนต์ 13px · แถวสูง 42px · หัวตารางเข้ม
- ทุกหน้าต้องมี loading, empty state (บอกขั้นตอนต่อไป), error state (ภาษาคนอ่านเข้าใจ)
- มือถือ 375px: ไม่มี scroll แนวนอน · ปุ่มแตะ ≥ 44px · ช่องกรอก 16px (กัน iOS ซูม)
- a11y: label ผูกกับ input, ปุ่มไอคอนมี `aria-label`, focus เห็นชัด · progressive disclosure — ซ่อนของขั้นสูงไว้ ไม่อัดแน่น

### กฎการทดสอบ
- ใช้ `qa-ux-tester` (`.claude/agents/qa-ux-tester.md`) ตรวจหลังแก้งาน: Static → Logic → UX/UI → เปิดดูจริง · รายงานเป็นไทย ไม่เกิน 10 ข้อ/รอบ พร้อมไฟล์:บรรทัดและวิธีแก้
- เอเจนต์ห้ามแก้ไฟล์ ห้ามเขียน DB ห้ามรัน `--commit` ห้ามกรอกรหัสผ่าน · หน้าที่ต้องล็อกอินรีวิวจากโค้ด และต้องระบุว่า "ยังไม่ได้เปิดดูจริง"
- รายงานตามจริง: ผ่าน / ไม่ผ่าน / ตรวจไม่ได้ — ห้ามบอกว่าผ่านถ้าไม่ได้รัน
- เปิดเซิร์ฟเวอร์ทดสอบ: `php -S localhost:8000 -t public` (หรือผ่าน `.claude/launch.json` ชื่อ `puchlish-php`) แล้วคืน viewport เป็น desktop ทุกครั้ง
