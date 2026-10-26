# Test Package — ขั้นตอนการทำงาน (อิงจากไฟล์ CT8-TP-*.xlsx)

```mermaid
flowchart TD
  A["Create test package<br/>Sheet1: system, medium, pressure"] --> B["Content checklist (Sheet2)<br/>15 sections, YES or N/A"]
  B --> C["Pre-test checklist (Sheet5)<br/>Documents and preparation"]
  C --> D{"Any item NO?"}
  D -- Yes --> P1["Raise PROCESS PUNCH-LIST (Sheet6)<br/>QC logs items, Category A or B"]
  P1 --> P2["Fix and photograph<br/>Officer submits fix"]
  P2 --> P3["Verify and close<br/>Prod Sup / QCI / Client Rep"]
  P3 -- Reject --> P2
  P3 -- All closed --> E
  D -- No --> E["Pressure test<br/>Hold 10 min at test pressure"]
  E --> F["Restore, clean, sign off<br/>Engineering / QC / Client"]
  F --> G(["Test package complete"])
```

หมายเหตุ: Category A = ห้ามทำงานต่อจนกว่าจะปิด · Category B = ทำต่อได้ตามดุลยพินิจของ PM
(จากฟอร์ม: "When above Status indicates NO a punch list must be raised by QC and Pressure Test shall not proceed")
