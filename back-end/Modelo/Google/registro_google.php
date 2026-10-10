<?php

require_once __DIR__ . '/../../config/cors.php';
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

require_once __DIR__ . "/../../config/google.php";

$body = json_decode((string)file_get_contents("php://input"), true);
$credential = trim((string)(is_array($body) ? ($body["credential"] ?? "") : ""));
$tipo = trim((string)(is_array($body) ? ($body["tipo"] ?? "") : ""));

if ($credential === "" || $tipo === "") {
    reply(false, "Datos incompletos", [], 400);
}

$roles = ["postulante" => 2, "reclutador" => 3];
if (!isset($roles[$tipo])) {
    reply(false, "Tipo de usuario inválido", [], 422);
}
$idRol = $roles[$tipo];

try {
    $google = inclusijob_verify_google_credential($credential);
} catch (Throwable $e) {
    $msg = $e->getMessage();
    $code = str_contains($msg, 'no configurado') ? 500 : 401;
    reply(false, $msg, [], $code);
}

$email = $google['email'];
$nombre = $google['name'] !== '' ? $google['name'] : 'Usuario';
$foto = $google['picture'];

if ($email === "") {
    reply(false, "Google no devolvió un correo válido", [], 422);
}

$partes = explode(" ", $nombre, 2);
$nombres = $partes[0] !== '' ? $partes[0] : 'Usuario';
$apellidos = $partes[1] ?? "Google";

$conexionFile = __DIR__ . "/../../Conexion.php";
if (!file_exists($conexionFile)) {
    reply(false, "Archivo de conexión no encontrado", [], 500);
}
require_once $conexionFile;

if (!function_exists("conectarbd")) {
    reply(false, "Función conectarbd no definida", [], 500);
}

$con = conectarbd();
if (!$con) {
    reply(false, "No se pudo conectar a la base de datos", [], 500);
}

$stmtCheck = mysqli_prepare($con, "SELECT id_usuario, id_rol FROM usuarios WHERE correo = ?");
mysqli_stmt_bind_param($stmtCheck, "s", $email);
mysqli_stmt_execute($stmtCheck);
$row = mysqli_fetch_assoc(mysqli_stmt_get_result($stmtCheck));

if ($row) {
    reply(true, "El usuario ya se encuentra registrado", [
        "exists" => true,
        "id_usuario" => (int)$row["id_usuario"],
        "rol" => $tipo,
        "requiere_password" => true,
    ]);
}

$passHash = password_hash("GOOGLE_AUTH_" . bin2hex(random_bytes(16)), PASSWORD_BCRYPT);

$sqlUser = "INSERT INTO usuarios (nombres, apellidos, correo, contraseña, foto_perfil, id_rol, correo_validado) VALUES (?, ?, ?, ?, ?, ?, 1)";
$stmtUser = mysqli_prepare($con, $sqlUser);
mysqli_stmt_bind_param($stmtUser, "sssssi", $nombres, $apellidos, $email, $passHash, $foto, $idRol);

if (!mysqli_stmt_execute($stmtUser)) {
    reply(false, "Error al registrar: " . mysqli_error($con), [], 500);
}

$idUsuario = (int)mysqli_insert_id($con);

if ($tipo === "postulante") {
    $stmtPerfil = mysqli_prepare($con, "INSERT INTO postulantes (id_usuario) VALUES (?)");
} else {
    $stmtPerfil = mysqli_prepare($con, "INSERT INTO reclutadores (id_usuario, id_empresas) VALUES (?, NULL)");
}
mysqli_stmt_bind_param($stmtPerfil, "i", $idUsuario);

if (!mysqli_stmt_execute($stmtPerfil)) {
    $stmtRollback = mysqli_prepare($con, "DELETE FROM usuarios WHERE id_usuario = ?");
    mysqli_stmt_bind_param($stmtRollback, "i", $idUsuario);
    mysqli_stmt_execute($stmtRollback);
    reply(false, "Error al crear perfil: " . mysqli_error($con), [], 500);
}

reply(true, "Registro exitoso", [
    "exists" => false,
    "id_usuario" => $idUsuario,
    "rol" => $tipo,
    "requiere_password" => true,
], 201);
