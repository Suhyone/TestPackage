# Test Package Datasets — QA/QC Pipeline & Web App Integration

ชุดข้อมูลระบบ **Test Package** สำหรับโครงการก่อสร้างโมดูลและงานท่อ (Piping QA/QC) สกัดและทำความสะอาดจากเน็ตเวิร์กแชร์ `\\192.168.100.12\qaqc` (Read-only extraction) พร้อมนำไปใช้งานกับ Web Application, Database (PostgreSQL / Supabase / SQLite) และ Data Science pipelines.

---

## 📁 โครงสร้างโฟลเดอร์ (Directory Structure)

```
data/
├── README.md                                    # เอกสารแนะนำและคู่มือการใช้งานชุดข้อมูลนี้
│
├── 01_ct3_ute_portocem/                         # โครงการ CIMTAS CT3 — UTE Portocem Modular Project
│   ├── markdown/
│   │   └── CT3_OVERVIEW.md                      # แคตตาล็อกและรายละเอียดของทั้ง 25 Modules
│   ├── json/
│   │   ├── tb_test_pack.json                    # ข้อมูล Header (25 Modules: A1-1 ถึง F3-2)
│   │   ├── tb_test_pack_iso.json                # ข้อมูล Isometric Drawings ทั้งหมด (195 รายการ)
│   │   ├── tb_test_pack_punch.json              # รายการ Punch Items (111 รายการ)
│   │   └── tb_test_pack_checklist.json          # รายการตรวจสอบ Content Checklist (100 รายการ)
│   └── excel_cleaned/
│       ├── CT3_Test_Package_Master_Cleaned.xlsx # ตาราง Excel คลีนแล้ว (4 ชีต)
│       └── CT3_Pressure_Test_Joint_Status.xlsx  # ตารางสถานะการทดสอบแรงดันระดับ Joint/Spool
│
├── 02_ct5_nrg_cedar_bayou/                      # โครงการ CIMTAS CT5 — NRG Cedar Bayou Project
│   ├── markdown/
│   │   └── CT5_OVERVIEW.md                      # สรุปโครงสร้าง Test Package เต็ม 15 หมวด (Sections)
│   ├── json/
│   │   ├── ct5_test_packs.json                  # พารามิเตอร์การทดสอบแรงดัน (21 แพ็กเกจ)
│   │   ├── ct5_drawings.json                    # Drawing / ISO Index
│   │   └── ct5_punches.json                     # รายการ Punch List
│   └── excel_cleaned/
│       └── CT5_Test_Package_Cleaned.xlsx        # สมุดงาน Excel คลีนแล้ว
│
└── 03_consolidated_master/                      # ชุดข้อมูล Master รวมทุกโครงการ
    ├── master_test_packs.json                   # แมปตรงกับ Supabase: public.test_packs (46 แถว)
    ├── master_drawings.json                     # แมปตรงกับ Supabase: public.drawings (398 แถว)
    ├── master_punch_items.json                  # แมปตรงกับ Supabase: public.punch_items (170 แถว)
    └── Test_Package_Master_Cleaned.xlsx         # Master Excel รวมทุกโครงการ (Multi-tab)
```

---

## 📊 สรุปปริมาณข้อมูลที่สกัดได้ (Extraction Summary)

| รายการ | CT3 (UTE Portocem) | CT5 (Cedar Bayou) | รวมทั้งหมด (Consolidated) |
| :--- | :---: | :---: | :---: |
| **จำนวน Test Packages** | **25** | **21** | **46** |
| **จำนวน Drawings / ISOs** | **195** | **203** | **398** |
| **จำนวน Punch Items** | **111** | **59** | **170** |
| **จำนวน Checklist Sections** | **100** | 15 Sections | **100** |
| **สถานะ Joint/Spool ติดตาม** | **163** | - | **163** |

---

## 🛠 วิธีนำข้อมูลเข้าใช้งาน (How to Use)

### 1. นำเข้าฐานข้อมูล Supabase ด้วย Script ที่มีอยู่:
```powershell
# รัน dry-run ตรวจสอบความถูกต้อง
node tools/import_json.mjs data/03_consolidated_master/master_punch_items.json

# นำเข้าจริงลงฐานข้อมูล
$env:SUPABASE_URL="https://xxxx.supabase.co"
$env:SUPABASE_SERVICE_KEY="your-service-role-key"
node tools/import_json.mjs data/03_consolidated_master/master_punch_items.json --commit
```

### 2. นำไปใช้งานใน Web Application (PHP / JavaScript):
```php
// ตัวอย่างการอ่านข้อมูล Master Test Packs ใน PHP
$testPacks = json_decode(file_get_contents(__DIR__ . '/../data/03_consolidated_master/master_test_packs.json'), true);
foreach ($testPacks as $pack) {
    echo $pack['test_pack_no'] . " - " . $pack['module_no'] . "\n";
}
```

### 3. เปิดดูหรือนำเข้า SQL ผ่าน Excel:
- เปิดไฟล์ `data/03_consolidated_master/Test_Package_Master_Cleaned.xlsx` ซึ่งมีตารางพร้อมใช้งาน หัวตารางชัดเจน คลีนเซลล์ว่างออกทั้งหมดแล้ว
