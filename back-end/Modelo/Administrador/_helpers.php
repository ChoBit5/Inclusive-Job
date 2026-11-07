<?php

require_once __DIR__ . '/../../Conexion.php';

function admin_db(): mysqli
{
    $con = conectarbd();
    mysqli_set_charset($con, 'utf8mb4');
    return $con;
}

function admin_stmt(mysqli $con, string $sql, string $types = '', mixed ...$params): ?mysqli_stmt
{
    $stmt = mysqli_prepare($con, $sql);
    if (!$stmt) return null;
    if ($types !== '' && !mysqli_stmt_bind_param($stmt, $types, ...$params)) {
        mysqli_stmt_close($stmt);
        return null;
    }
    if (!mysqli_stmt_execute($stmt)) {
        mysqli_stmt_close($stmt);
        return null;
    }
    return $stmt;
}

function admin_one(mysqli $con, string $sql, string $types = '', mixed ...$params): ?array
{
    $stmt = admin_stmt($con, $sql, $types, ...$params);
    if (!$stmt) return null;
    $result = mysqli_stmt_get_result($stmt);
    $row = $result ? mysqli_fetch_assoc($result) : null;
    mysqli_stmt_close($stmt);
    return $row ?: null;
}

function admin_all(mysqli $con, string $sql, string $types = '', mixed ...$params): array
{
    $stmt = admin_stmt($con, $sql, $types, ...$params);
    if (!$stmt) return [];
    $result = mysqli_stmt_get_result($stmt);
    $rows = [];
    while ($result && ($row = mysqli_fetch_assoc($result))) $rows[] = $row;
    mysqli_stmt_close($stmt);
    return $rows;
}

function admin_json_body(): array
{
    $body = json_decode((string)file_get_contents('php://input'), true);
    return is_array($body) ? $body : [];
}

function admin_like(string $value): string
{
    return '%' . addcslashes($value, "\\%_") . '%';
}

function admin_pdf_available(mixed $value): bool
{
    if ($value === null || $value === '') return false;
    $content = (string)$value;
    if (str_starts_with($content, '%PDF')) return true;
    if (!str_starts_with($content, 'uploads/')) return false;

    $path = realpath(__DIR__ . '/../../' . $content);
    $base = realpath(__DIR__ . '/../../uploads');
    if (!$path || !$base || !str_starts_with($path, $base) || !is_file($path)) return false;
    $handle = fopen($path, 'rb');
    if (!$handle) return false;
    $signature = fread($handle, 4);
    fclose($handle);
    return $signature === '%PDF';
}

function admin_output_pdf(mixed $value, string $filename): void
{
    if ($value === null || $value === '') {
        http_response_code(404);
        echo 'PDF no encontrado.';
        exit;
    }

    $content = (string)$value;
    if (str_starts_with($content, 'uploads/')) {
        $path = realpath(__DIR__ . '/../../' . $content);
        $base = realpath(__DIR__ . '/../../uploads');
        if (!$path || !$base || !str_starts_with($path, $base) || !is_file($path)) {
            http_response_code(404);
            echo 'PDF no encontrado.';
            exit;
        }
        $content = file_get_contents($path);
    }

    if (!str_starts_with((string)$content, '%PDF')) {
        http_response_code(415);
        echo 'El documento guardado no parece ser un PDF válido.';
        exit;
    }

    header('Content-Type: application/pdf');
    header('Content-Disposition: inline; filename="' . addslashes($filename) . '"');
    header('Cache-Control: no-store, no-cache, must-revalidate');
    header('Pragma: no-cache');
    echo $content;
    exit;
}
