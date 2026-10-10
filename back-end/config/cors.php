<?php

/*
|--------------------------------------------------------------------------
| Frontend
|--------------------------------------------------------------------------

*/
const INCLUSIJOB_FRONTEND_ORIGIN = 'http://localhost:5173';
const INCLUSIJOB_FRONTEND_URL = INCLUSIJOB_FRONTEND_ORIGIN . '/';

/*
|--------------------------------------------------------------------------
| Backend

| INCLUSIJOB_BACKEND_BASE_PATH
*/
define('INCLUSIJOB_BACKEND_BASE_PATH', getenv('INCLUSIJOB_BACKEND_BASE_PATH') ?: '/back-inclusiveJob');

/*
|--------------------------------------------------------------------------
| Base de datos
|--------------------------------------------------------------------------
| INCLUSIJOB_DB_HOST, INCLUSIJOB_DB_USER, INCLUSIJOB_DB_PASSWORD, INCLUSIJOB_DB_NAME
*/
define('INCLUSIJOB_DB_HOST', getenv('INCLUSIJOB_DB_HOST') ?: 'localhost');
define('INCLUSIJOB_DB_USER', getenv('INCLUSIJOB_DB_USER') ?: 'root');
define('INCLUSIJOB_DB_PASSWORD', getenv('INCLUSIJOB_DB_PASSWORD') ?: '');
define('INCLUSIJOB_DB_NAME', getenv('INCLUSIJOB_DB_NAME') ?: 'inclusijob');

/*
|--------------------------------------------------------------------------
| Sesion / cookies
|--------------------------------------------------------------------------
*/
define('INCLUSIJOB_SESSION_SECURE', filter_var(getenv('INCLUSIJOB_SESSION_SECURE') ?: 'false', FILTER_VALIDATE_BOOLEAN));
define('INCLUSIJOB_SESSION_SAMESITE', getenv('INCLUSIJOB_SESSION_SAMESITE') ?: 'Lax');

function inclusijob_frontend_url(string $path = ''): string
{
    return INCLUSIJOB_FRONTEND_URL . ltrim($path, '/');
}

function inclusijob_backend_origin(): string
{
    $forwardedProto = $_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '';
    $isHttps = $forwardedProto === 'https'
        || (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (($_SERVER['SERVER_PORT'] ?? '') === '443');

    $scheme = $isHttps ? 'https' : 'http';
    $host = $_SERVER['HTTP_X_FORWARDED_HOST']
        ?? $_SERVER['HTTP_HOST']
        ?? ($_SERVER['SERVER_NAME'] ?? 'localhost');

    return $scheme . '://' . $host;
}

function inclusijob_backend_url(string $path = ''): string
{
    return inclusijob_backend_origin()
        . rtrim(INCLUSIJOB_BACKEND_BASE_PATH, '/')
        . '/'
        . ltrim($path, '/');
}

function inclusijob_session_cookie_params(): void
{
    session_set_cookie_params([
        'path' => '/',
        'httponly' => true,
        'secure' => INCLUSIJOB_SESSION_SECURE,
        'samesite' => INCLUSIJOB_SESSION_SAMESITE,
    ]);
}

function inclusijob_cors_headers(
    string $methods = 'GET, POST, OPTIONS',
    string $allowedHeaders = 'Content-Type, Authorization',
    string $contentType = 'application/json; charset=utf-8',
    int $optionsStatus = 204
): void {
    if ($contentType !== '') {
        header('Content-Type: ' . $contentType);
    }

    header('Access-Control-Allow-Origin: ' . INCLUSIJOB_FRONTEND_ORIGIN);
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Allow-Methods: ' . $methods);
    header('Access-Control-Allow-Headers: ' . $allowedHeaders);

    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
        http_response_code($optionsStatus);
        exit;
    }
}
