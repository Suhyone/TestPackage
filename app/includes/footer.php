<?php declare(strict_types=1); $public = $public ?? false; ?>
<?php /* ปิดโครงหน้าที่ header.php เปิดไว้ (เฉพาะหน้าปกติ) */ ?>
<?php if (!$public): ?>
    </div></section>
  </div>
</div>
<?php endif; ?>
<?php /* ไลบรารีส่วนกลาง: jQuery, Bootstrap, AdminLTE และ Supabase client */ ?>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.6.0/jquery.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/4.6.1/js/bootstrap.bundle.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/admin-lte/3.2.0/js/adminlte.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.0/dist/umd/supabase.min.js"></script>
<?php /* app.js ทำงานทุกหน้า: สร้าง Supabase client, ตรวจล็อกอิน, ใส่ชื่อ/สิทธิ์ผู้ใช้ */ ?>
<script src="assets/js/app.js"></script>
<?php /* สคริปต์เฉพาะหน้า (ตั้งค่าด้วย $pageScripts ในแต่ละหน้า) */ ?>
<?php foreach (($pageScripts ?? []) as $s): ?>
<script src="<?= htmlspecialchars($s) ?>"></script>
<?php endforeach; ?>
</body>
</html>
