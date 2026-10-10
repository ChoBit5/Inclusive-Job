<?php
// Limitador por IP compartido (login.php, reg_pos.php, reg_reclu.php).
// 10 intentos cada 5 minutos por defecto. Devuelve true si se debe rechazar (429).
function inclusijob_rate_limited(string $name, string $ip, int $max = 10, int $windowSeconds = 300): bool
{
    $safe = preg_replace('/[^a-z0-9_]/i', '', $name);
    $file = sys_get_temp_dir() . "/inclusijob_rl_" . $safe . "_" . md5($ip);

    $attempts = [];
    if (file_exists($file)) {
        $attempts = json_decode((string)file_get_contents($file), true) ?? [];
    }

    $now = time();
    $attempts = array_values(array_filter($attempts, fn($t) => ($now - (int)$t) < $windowSeconds));

    if (count($attempts) >= $max) {
        return true;
    }

    $attempts[] = $now;
    file_put_contents($file, json_encode($attempts));
    return false;
}
