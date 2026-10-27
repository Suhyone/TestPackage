# BJCHI QA/QC — Test Package > Punch List

PHP **8.3+** (หน้าเว็บ) + Supabase (ฐานข้อมูล / Auth / Storage) + AG Grid Community

## โครงโฟลเดอร์
```
puchlish/
├─ .env                 ค่าลับ (Supabase URL/คีย์) — อยู่นอก public/ เว็บเข้าไม่ถึง  (ตัวอย่าง: .env.example)
├─ app/                 โค้ดฝั่ง PHP ที่ไม่เปิดให้เบราว์เซอร์เข้าตรง ๆ
│  ├─ bootstrap.php     บังคับ PHP 8.3 + กำหนด ROOT_PATH / APP_PATH
│  ├─ config.php        อ่าน .env ส่งเฉพาะ URL + publishable key ให้หน้าเว็บ
│  └─ includes/         header · sidebar · footer · add_modal (ส่วนที่ทุกหน้าใช้ร่วมกัน)
├─ public/              ← document root ของเว็บ (เปิดได้เฉพาะในนี้)
│  ├─ index.php login.php test_packages.php test_package.php qc_list.php punch_list.php admin_users.php admin_master.php
│  └─ assets/ css/ js/  สไตล์และสคริปต์ของแต่ละหน้า
├─ sql/                 สคริปต์ฐานข้อมูล เรียงตามลำดับที่ต้องรัน (01 → 16) ; one_off/ = รันครั้งเดียวตามต้องการ
├─ tools/               นำเข้าข้อมูล (import_punch_xlsx.mjs = ไฟล์ Excel CT8, import_datasets.mjs = ISO/Contents/Pre-test ของ CT8 + ข้อมูล CT3/CT5 จาก tools/data, import_json.mjs = ข้อมูลเก่า) + tools/lib
└─ docs/                เอกสาร: test_package_flow.md (ขั้นตอนงาน), page_roadmap.md (แผนหน้าที่จะทำต่อ)
```

## ติดตั้ง / รัน
1. สร้างโปรเจกต์ Supabase → **SQL Editor** รันไฟล์ใน `sql/` ตามลำดับเลข:
   `01_schema` → `02_status_open_close_cancelled` → `03_qc_permissions` → `04_v_punch_items` → `05_ct8_migration` → `06_test_package_register` → `07_pretest_checklist` → `08_datasets_iso_contents` → `09_viewer_role` (ไม่บังคับ — ผู้ใช้อ่านอย่างเดียว) → `10_external_punch` (ซ่อน pack EXTERNAL จาก Register) → `11_fix_pending` (ป้าย Fix submitted + ชิป Waiting for QC / To fix) → `12_pressure_test` (บันทึกผลทดสอบแรงดัน + gate ล็อกที่ฐานข้อมูล) → `13_hardening` (กันแก้ผลทดสอบเดิม + officer แก้ได้เฉพาะช่องส่งงานแก้) → `14_signatures` (รูปลายเซ็นใน Sign-off) → `15_followups` (จำกัดการอ่านรูปลายเซ็นเฉพาะ admin/qc/officer + คำแนะนำตรวจแถวทดสอบแรงดันเก่า) → `16_punch_item_history` (ประวัติการแก้ Description แบบ diff)
   (`05` ลบข้อมูลเก่าของโครงการ C-31902-4 และปรับโครงสร้างสำหรับไฟล์ CT8 — อ่านหัวไฟล์ก่อนรัน)
2. คัดลอก `.env.example` เป็น `.env` แล้วใส่ค่าจาก Supabase > Project Settings > API
   (`SUPABASE_SECRET_KEY` ใช้ในเครื่องเฉพาะตัวนำเข้า ห้ามเผยแพร่)
3. สร้างผู้ใช้ที่ Authentication > Users แล้วตั้งสิทธิ์ในหน้า Administrator > Users (หรือใช้ `sql/one_off/create_users.sql`)
4. นำเข้าไฟล์ Excel (ตรวจก่อนด้วย dry-run):
   ```
   node tools/import_punch_xlsx.mjs "D:\ฝึกงาน\file_puch_list"
   node tools/import_punch_xlsx.mjs "D:\ฝึกงาน\file_puch_list" --commit
   node tools/import_datasets.mjs            # ตรวจ ISO / Contents / Pre-test ของ CT8 + ข้อมูล CT3 / CT5 (ไม่เขียนข้อมูล)
   node tools/import_datasets.mjs --commit   # นำเข้าจริง (รันซ้ำได้ ไม่เขียนทับสิ่งที่แก้ในเว็บ)
   ```
5. รันเว็บ — **ต้องชี้ document root ไปที่ `public`**:
   ```
   php -S localhost:8000 -t public
   ```
   แล้วเปิด http://localhost:8000/login.php

## ข้อกำหนด
- PHP 8.3 ขึ้นไป (ตรวจที่ `app/bootstrap.php` ถ้าเก่ากว่าจะแจ้งข้อความชัดเจน) · ทุกไฟล์ PHP ใช้ `declare(strict_types=1)`
- Node.js 18+ สำหรับตัวนำเข้า (ไม่ต้องติดตั้งไลบรารีเพิ่ม)
- ขึ้นเซิร์ฟเวอร์จริง (Apache/Nginx): ตั้ง document root = `public/` และห้ามให้เข้าถึง `.env` / `app/` / `sql/` / `tools/`

## วงจรงาน
สถานะมี 3 ตัวตามฟอร์ม Punch List ของโครงการ: `Open` (O) · `Close` (C) · `Cancelled` (N)
เจ้าหน้าที่แก้ + ถ่ายรูป กด Submit Fix (สถานะยัง Open) → QC ตรวจ: ผ่าน = Close Item / ไม่ผ่าน = Reject Fix (ยัง Open ต้องแก้ใหม่) · QC ยกเลิก = Cancelled · Reopen ได้
Category มี 2 ระดับตามฟอร์ม CT8: A = ห้ามทำงานต่อจนกว่าจะปิด · B = ทำต่อได้ตามดุลยพินิจของ PM
ขั้นตอนทั้งหมดของ Test Package ดู `docs/test_package_flow.md`

## โครงไฟล์ฝั่งหน้าเว็บ (public/assets/js)
| ไฟล์ | หน้าที่ |
|---|---|
| `app.js` | ทุกหน้า: Supabase client, ตรวจล็อกอิน, สิทธิ์, ฟังก์ชันช่วย (fmtDate/esc) |
| `tp_register.js` | หน้า Test Packages (Register): รายการ pack, ชิปสถานะ punch, ตัวกรอง, เพิ่ม pack ใหม่ |
| `tp_detail.js` | หน้ารายละเอียด Test Package แบบแท็บ: Info · Punch · Sign-off · Pressure test |
| `tp_signature.js` | รูปลายเซ็นในแท็บ Sign-off (วาด / อัปโหลด / ลบ) + แสดงในรายงานพิมพ์ |
| `tp_pressure.js` | แท็บ Pressure test: บันทึกผลทดสอบแรงดัน (หลาย attempt) + gate ล็อก |
| `tp_data.js` | แท็บ Contents (YES/N/A) และ ISO / Spool ของหน้ารายละเอียด Test Package |
| `tp_common.js` | สถานะ punch ของ pack (blocked / open / clear / none) ใช้ร่วม Register และ Detail |
| `qc_list.js` | หน้า Punch List แบบย่อสำหรับ QA/QC และเจ้าหน้าที่ |
| `punch_list.js` | ตารางขั้นสูง (Advanced Grid): ตัวกรอง, จัดกลุ่ม, แถวบันทึกใหม่, ตัวนำทาง record |
| `punch_common.js` | ค่าและฟังก์ชันที่สองหน้า Punch List ใช้ร่วมกัน |
| `punch_add.js` | ฟอร์มเพิ่มตำหนิ |
| `punch_detail.js` | **แผงรายละเอียดจากไอคอน 🔍**: ประวัติรอบ/รูป, ส่งงานแก้ไข, ปิด/ไม่ผ่าน, เพิ่มรูปตำหนิ, ยกเลิก |
| `punch_photos.js` | ปุ่มเลือกไฟล์/ถ่ายรูป, ย่อรูป, อัปโหลด, ลิงก์รูป |

เส้นทางของไอคอน 🔍: ตาราง → `openDetail(id)` (`punch_detail.js`) → `addRound()` → ตาราง `punch_rounds` / `punch_items` → อัปเดตตาราง
ถ้าจะแก้ขั้นตอนตรวจ/แก้/ปิดงาน ให้แก้ที่ `punch_detail.js`

## ตัวอักษร (Typography)
กำหนดที่ต้นไฟล์ `public/assets/css/app.css` (ตัวแปร `--fs-*`, `--lh-*`) ที่เดียวทั้งเว็บ — เนื้อหา 16px, ข้อความรอง 14px, ตาราง 15px, เล็กสุด 13px, line-height 1.5 (แนวทาง WCAG 2.1)
ผู้ใช้เลือกขนาดได้ที่ปุ่ม **Aa** บนแถบด้านบน (Normal 16px / Large 18px / Extra large 20px) จำไว้ในเครื่อง ใช้ rem/ตัวแปรเสมอ ห้ามตั้ง font-size เป็น px กับข้อความเนื้อหา
