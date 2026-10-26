<?php
declare(strict_types=1);

/*
 * bootstrap.php — จุดเริ่มต้นฝั่ง PHP (header.php เรียกเป็นอย่างแรก)
 *   - บังคับ PHP 8.3 ขึ้นไป
 *   - กำหนดตำแหน่งโฟลเดอร์: ROOT_PATH = โฟลเดอร์โปรเจกต์ (มีไฟล์ .env) · APP_PATH = app/ (โค้ดที่ไม่เปิดให้เบราว์เซอร์เข้าถึงตรง ๆ)
 * เว็บเซิร์ฟเวอร์ต้องชี้ document root ไปที่โฟลเดอร์ public/ เท่านั้น  (php -S localhost:8000 -t public)
 */
const MIN_PHP_VERSION_ID = 80300;

// ถ้า PHP เก่ากว่า 8.3 หยุดพร้อมข้อความที่เข้าใจง่าย (ไม่ปล่อยให้พังกลางหน้า)
if (PHP_VERSION_ID < MIN_PHP_VERSION_ID) {
    http_response_code(500);
    exit('PHP 8.3 or newer is required (found ' . PHP_VERSION . ').');
}

// ตำแหน่งโฟลเดอร์หลัก (กำหนดครั้งเดียว ใช้ทุกไฟล์)
defined('APP_PATH')  || define('APP_PATH', __DIR__);
defined('ROOT_PATH') || define('ROOT_PATH', dirname(__DIR__));
