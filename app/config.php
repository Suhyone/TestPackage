<?php
declare(strict_types=1);
// อ่านค่าจากไฟล์ .env (หรือ environment variable) — ส่งออกเฉพาะ URL + publishable key ให้หน้าเว็บ
// SUPABASE_SECRET_KEY ห้ามส่งไปที่เบราว์เซอร์ (ใช้เฉพาะ tools/import_json.mjs)
// อ่านไฟล์ .env ทีละบรรทัดเก็บลง $env (ข้ามบรรทัดว่างและบรรทัดคอมเมนต์)
$env = [];
$file = ROOT_PATH . '/.env';
if (is_file($file)) {
    foreach (file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        $line = trim($line);
        if ($line === '' || $line[0] === '#' || !str_contains($line, '=')) continue;
        [$k, $v] = explode('=', $line, 2);
        $env[trim($k)] = trim($v, " \t\"'");
    }
}
// ฟังก์ชันอ่านค่า: ดูใน .env ก่อน แล้วค่อย environment variable แล้วค่าเริ่มต้น
$get = fn(string $k, string $d = '') => $env[$k] ?? (getenv($k) ?: $d);

// ค่าที่ส่งต่อให้ header.php (ไม่รวม secret key)
return [
    'supabase_url'      => $get('SUPABASE_URL'),
    'supabase_anon_key' => $get('SUPABASE_PUBLISHABLE_KEY') ?: $get('SUPABASE_ANON_KEY'),
    'app_name'          => 'BJCHI QA/QC',
];
