<?php
// Login con Google: valida el credential con el helper compartido y abre
// sesión igual que login.php. Solo usuarios ya registrados (404 si no existe).
require_once __DIR__ . '/../../config/cors.php';
inclusijob_session_cookie_params();
session_start();
inclusijob_cors_headers('POST, OPTIONS', 'Content-Type');
header("Cross-Origin-Opener-Policy: same-origin-allow-popups");

function reply(bool $ok, string $msg, array $extra = [], int $code = 200): void
{
    http_response_code($code);
    echo json_encode(array_merge(["success" => $ok, "message" => $msg], $extra));
    exit;
}

if (($_SERVER["REQUEST_METHOD"] ?? '') !== "POST") {
    reply(false, "Método no permitido", [], 405);
}

$body = json_decode((string)file_get_contents("php://input"), true);
$credential = trim((string)(is_array($body) ? ($body["credential"] ?? "") : ""));

if ($credential === "") {
    reply(false, "Token de Google requerido", [], 400);
}

require_once __DIR__ . "/../../config/google.php";
try {
    $google = inclusijob_verify_google_credential($credential);
} catch (Throwable $e) {
    $msg = $e->getMessage();
    $code = str_contains($msg, 'no configurado') ? 500 : 401;
    reply(false, $msg, [], $code);
}

$email = $google['email'];

if ($email === "") {
    reply(false, "Google no devolvió un correo válido", [], 422);
}

require_once __DIR__ . "/../../Conexion.php";
$conn = conectarbd();

if (!$conn) {
    reply(false, "No se pudo conectar a la base de datos", [], 500);
}

$sql = "SELECT
            u.id_usuario,
            u.nombres,
            u.apellidos,
            u.correo,
            u.contraseña,
            u.estado,
            u.correo_validado,
            u.id_rol,
            r.nombre_rol
        FROM usuarios u
        INNER JOIN rol r ON u.id_rol = r.id_rol
        WHERE u.correo = ?
        LIMIT 1";

$stmt = mysqli_prepare($conn, $sql);

if (!$stmt) {
    reply(false, "Error interno al preparar consulta", [], 500);
}

mysqli_stmt_bind_param($stmt, "s", $email);
mysqli_stmt_execute($stmt);
$user = mysqli_fetch_assoc(mysqli_stmt_get_result($stmt));

if (!$user) {
    reply(false, "No existe una cuenta con este correo de Google. Regístrate primero.", [
        "not_registered" => true
    ], 404);
}

if ((int)$user["estado"] === 0) {
    reply(false, "Tu cuenta está desactivada. Contacta a soporte.", [], 403);
}

session_regenerate_id(true);

$_SESSION["user"] = [
    "id" => $user["id_usuario"],
    "rol" => $user["nombre_rol"],
    "nombre" => $user["nombres"],
    "apellido" => $user["apellidos"]
];

$_SESSION["login_time"] = time();
$_SESSION["last_activity"] = time();
$_SESSION["session_timeout"] = 1800;

if (!isset($_SESSION["csrf_token"])) {
    $_SESSION["csrf_token"] = bin2hex(random_bytes(32));
}

reply(true, "Sesión iniciada con Google", [
    "rol" => $user["nombre_rol"],
    "requiere_password" => str_starts_with($user["contraseña"] ?? "", "$2y$")
        ? false
        : true,
    "csrf" => $_SESSION["csrf_token"]
]);
