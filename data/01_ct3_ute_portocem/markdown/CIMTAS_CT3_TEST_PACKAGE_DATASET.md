# CIMTAS_CT3 — UTE Portocem Modular Project (Test Package Dataset)

ชุดข้อมูลระบบ **Test Package** ของโครงการ **CIMTAS_CT3 (UTE Portocem)** ครอบคลุม Unit 1 ทั้ง **25 Modules** สกัดข้อมูลตรงจากไฟล์ต้นทาง 4 ประเภทในโฟลเดอร์ `29. Piping/2.TEST PACKAGE/Line check/Unit 1/`:
1. `1.Line check cover sheet`
2. `2.Test pack content check list`
3. `3.Test pack ISO metric index`
4. `4.Punch list`

---

## 📊 สรุปจำนวนข้อมูลในระบบ (Database Summary)

- **Master Test Packages (`tb_test_pack`)**: **25** Packages (Module A1-1 ถึง F3-2)
- **Isometric Drawings & Spools (`tb_test_pack_iso`)**: **195** รายการ
- **Process Punch List Items (`tb_test_pack_punch`)**: **111** รายการ
- **Content Checklist Sections (`tb_test_pack_checklist`)**: **100** รายการ

---

## 1. ตาราง Master Test Package (`tb_test_pack`)
| Field Name | Type | ตัวอย่างข้อมูล | คำอธิบาย |
| :--- | :--- | :--- | :--- |
| `project_no` | string | `CT3` | รหัสโครงการ |
| `project_name` | string | `UTE PORTOCEM M501 JAC MODULAR PROJECT` | ชื่อโครงการ |
| `client` | string | `CIMTAS (NINGBO) STEEL PROCESSING CO., LTD` | เจ้าของงาน / ลูกค้า |
| `contractor` | string | `BJCHI` | ผู้รับเหมา |
| `module_name` | string | `A1-1` | ชื่อโมดูล |
| `unit_no` | string | `1` | หมายเลขยูนิต |
| `test_pack_no` | string | `CT3-TP-LINECHECK-A1-1` | หมายเลข Test Package |
| `description` | string | `Line Check & Test Package Dossier` | คำอธิบายแพ็กเกจ |
| `system_name` | string | `Piping System` | ชื่อระบบ |
| `piping_system` | string | `PIPING` | ระบบงานท่อ |
| `rev_no` | string | `0` | ครั้งที่แก้ไข (Revision) |
| `rev_description` | string | `ISSUED FOR REVIEW` | รายละเอียด Revision |
| `rev_date` | string | `2025-02-03` | วันที่ออกเอกสาร |
| `prepared_by` | string | `Parinya T.` | ผู้จัดทำ (QC Inspector) |
| `reviewed_by` | string | `Prawit T.` | ผู้ตรวจสอบ (QC Supervisor) |
| `approved_by` | string | `Phisit P.` | ผู้อนุมัติ (Client Rep) |
| `inspection_date` | string | `2025-02-17` | วันที่ตรวจ |
| `location` | string | `BJCHI` | สถานที่ประกอบ |
| `status` | string | `Active` | สถานะของ Test Package |

---

## 2. ตาราง Isometric Drawings & Spools (`tb_test_pack_iso`)
สกัดจากไฟล์ `3.Test pack ISO metric index.xlsx` ครบถ้วนทุกคอลัมน์:
- `Project Name`
- `Test Package No.`
- `Description`
- `Module Name`
- `System Name`
- `Piping System`
- **ISOMETRIC DRAWING**: `DRAWING No.`, `SHT.`, `REV.`
- **PID DRAWING**: `DRAWING No.`, `SHT.`, `REV.`
- `MODULE No.`
- `LINE No.`
- `SPOOL No.`
- `FLUID`
- `DESIGN PRESSURE (Mpag / bar)`
- `DESIGN TEMPERATURE (˚C)`
- `TEST PRESSURE (bar)`
- `TEST TYPE`
- `MATERIAL`
- `INSULATION SPEC`
- `INSULATION THK(MM)`
- `PIPE NPD (IN)`
- `REMARK`

### ตัวอย่างข้อมูลในตาราง ISO Drawing:
| Test Package No | Module | ISOMETRIC DWG | SHT | REV | PID DWG | LINE No | SPOOL No | FLUID | MATERIAL | REMARK |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `CT3-TP-LINECHECK-A1-1` | A1-1 | `G1-S4452` | 1 | 1 | - | - | `DSA-200` | SEAL AIR | A312 Gr.TP304 | - |
| `CT3-TP-LINECHECK-A1-1` | A1-1 | `G1-S4453` | 1 | 1 | - | - | `DSA-201` | SEAL AIR | A312 Gr.TP304 | - |
| `CT3-TP-LINECHECK-A1-1` | A1-1 | `G1-S4454` | 1 | 2 | - | - | `DLOS-200` | LUBE OIL SUPPLY | A312 Gr.TP304 | - |
| `CT3-TP-LINECHECK-A1-1` | A1-1 | `G1-S4455` | 1 | 3 | - | - | `DLOR-200` | LUBE OIL RETURN | A106 Gr.B | - |
| `CT3-TP-LINECHECK-A1-3` | A1-3 | `G1-S4037` | 1 | 2 | - | - | `ABAL-006` | LOW PRESS, BLEED AIR | A106 Gr.B | - |
| `CT3-TP-LINECHECK-D1-2` | D1-2 | `G1-S4530` | 1/1 | 1 | - | - | `DG-625` | FUEL GAS | A312 Gr.TP304 | - |

---

## 3. ตาราง Process Punch-List (`tb_test_pack_punch`)
สกัดจากไฟล์ `4.Punch list.xlsx` ครบถ้วนทุกคอลัมน์:
- `PROJECT NO:`
- `PROJECT NAME:`
- `REPORT NO.` (Test Package No)
- `INSPC' DATE:`
- `TEST STAGE:`
- `BLOCK/MODULE NAME/NO:`
- `UNIT NO.:`
- `LOCATION:`
- `PROCESS DISCIPLINE:`
- `ITEM NO.`
- `DRAWING NO.`
- `PUNCH-LIST DESCRIPTION`
- `CATEGORY "A" "B"`
- `STATUS OPEN`
- `STATUS CLOSED`
- `STATUS`
- `PUNCH CLOSING ACTION AND VERIFICATION (PROD SUP., QCI, CLIENT REP.)`
- `REMARKS`

### ตัวอย่างรายการ Punch Items:
| Report No | Module | Item | Drawing No | Description | Cat | Open | Closed | Status |
| :--- | :---: | :---: | :---: | :--- | :---: | :---: | :---: | :---: |
| `CT3-TP-LINECHECK-A1-1` | A1-1 | 1 | `G1-S4452` | Temporary support to be adjust linner plate to sit on full support no.04 | A | Y | Y | CLOSED |
| `CT3-TP-LINECHECK-A1-1` | A1-1 | 2 | `G1-S4453` | To rectify line to non slope. | A | Y | Y | CLOSED |
| `CT3-TP-LINECHECK-A1-1` | A1-1 | 3 | `G1-S4453` | Bolt / Nut to be torque. | A | Y | - | OPEN |
| `CT3-TP-LINECHECK-A1-1` | A1-1 | 4 | `G1-S4453` | Pipe surface to be clean. | A | Y | - | OPEN |
| `CT3-TP-LINECHECK-A1-2` | A1-2 | 1 | `G1-S4460` | Bolt /Nut To Be Torque. | A | Y | - | OPEN |
| `CT3-TP-LINECHECK-D1-2` | D1-2 | 1 | `G1-S4530` | Linner plate Damage to be change. | A | Y | Y | CLOSED |

---

## 4. ตาราง Content Check List (`tb_test_pack_checklist`)
สกัดจากไฟล์ `2.Test pack content check list.xlsx`:
- `Project Name`
- `Test Package No.`
- `Description`
- `Module Name`
- `System Name`
- `Piping System`
- `SECTION`
- `CONTENT LIST`
- `VERIFY STATUS` (`YES` / `N/A`)
- `VERIFY (YES)`
- `VERIFY (N/A)`

---

## 5. รายชื่อและสถิติรายโมดูล (All 25 Modules)
| ลำดับ | Module | Test Package No | Drawings (ISOs) | Punch Items | Checklist | สถานะ |
| :---: | :---: | :--- | :---: | :---: | :---: | :---: |
| 1 | **A1-1** | `CT3-TP-LINECHECK-A1-1` | 8 | 18 | 4 | Active |
| 2 | **A1-2** | `CT3-TP-LINECHECK-A1-2` | 3 | 8 | 4 | Active |
| 3 | **A1-3** | `CT3-TP-LINECHECK-A1-3` | 40 | 0 | 4 | Active |
| 4 | **A1-4** | `CT3-TP-LINECHECK-A1-4` | 4 | 10 | 4 | Active |
| 5 | **A2-3** | `CT3-TP-LINECHECK-A2-3` | 16 | 0 | 4 | Active |
| 6 | **A2-4** | `CT3-TP-LINECHECK-A2-4` | 5 | 0 | 4 | Active |
| 7 | **A3-3** | `CT3-TP-LINECHECK-A3-3` | 11 | 22 | 4 | Active |
| 8 | **B1-1** | `CT3-TP-LINECHECK-B1-1` | 6 | 0 | 4 | Active |
| 9 | **C1-1** | `CT3-TP-LINECHECK-C1-1` | 10 | 0 | 4 | Active |
| 10 | **C1-2** | `CT3-TP-LINECHECK-C1-2` | 7 | 10 | 4 | Active |
| 11 | **C2-1** | `CT3-TP-LINECHECK-C2-1` | 9 | 0 | 4 | Active |
| 12 | **C2-2** | `CT3-TP-LINECHECK-C2-2` | 3 | 5 | 4 | Active |
| 13 | **C3-1** | `CT3-TP-LINECHECK-C3-1` | 8 | 0 | 4 | Active |
| 14 | **C3-2** | `CT3-TP-LINECHECK-C3-2` | 1 | 0 | 4 | Active |
| 15 | **D1-2** | `CT3-TP-LINECHECK-D1-2` | 5 | 13 | 4 | Active |
| 16 | **D2-1** | `CT3-TP-LINECHECK-D2-1` | 9 | 0 | 4 | Active |
| 17 | **D2-2** | `CT3-TP-LINECHECK-D2-2` | 7 | 0 | 4 | Active |
| 18 | **D3-1** | `CT3-TP-LINECHECK-D3-1` | 3 | 0 | 4 | Active |
| 19 | **D3-2** | `CT3-TP-LINECHECK-D3-2` | 4 | 0 | 4 | Active |
| 20 | **F1-1** | `CT3-TP-LINECHECK-F1-1` | 10 | 5 | 4 | Active |
| 21 | **F1-2** | `CT3-TP-LINECHECK-F1-2` | 5 | 1 | 4 | Active |
| 22 | **F2-1** | `CT3-TP-LINECHECK-F2-1` | 5 | 1 | 4 | Active |
| 23 | **F2-2** | `CT3-TP-LINECHECK-F2-2` | 6 | 4 | 4 | Active |
| 24 | **F3-1** | `CT3-TP-LINECHECK-F3-1` | 5 | 8 | 4 | Active |
| 25 | **F3-2** | `CT3-TP-LINECHECK-F3-2` | 5 | 6 | 4 | Active |
