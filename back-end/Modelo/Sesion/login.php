<?php
// Inicia la sesión PHP del usuario: { correo, password }.
// Responde {success, rol, csrf}; cuenta desactivada, correo sin verificar
// (requiere_verificacion) y límite de intentos por IP (429).
require_once __DIR__ . '/../../config/cors.php';
inclusijob_session_cookie_params();
session_start();
inclusijob_cors_headers('POST, OPTIONS', 'Content-Type');

if (($_SERVER["REQUEST_METHOD"] ?? '') !== "POST") {
    http_response_code(405);
    echo json_encode(["success" => false, "message" => "Permiso denegado"]);
    exit;
}

// CSRF no bloqueante: se genera pero no se valida (igual que en origen).
if (!isset($_SESSION["csrf_token"])) {
    $_SESSION["csrf_token"] = bin2hex(random_bytes(32));
}

require_once __DIR__ . "/../../config/ratelimit.php";
$ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
if (inclusijob_rate_limited('login', $ip)) {
    http_response_code(429);
    echo json_encode(["success" => false, "message" => "Demasiados intentos, intenta mas tarde"]);
    exit;
}

require_once __DIR__ . "/../../Conexion.php";
$conn = conectarbd();

$data = json_decode((string)file_get_contents("php://input"), true);

if (!is_array($data)) {
    echo json_encode(["success" => false, "message" => "Solicitud inválida"]);
    exit;
}

$correo = trim((string)($data["correo"] ?? ""));
$password = (string)($data["password"] ?? "");

if ($correo === '' || $password === '') {
    echo json_encode(["success" => false, "message" => "Credenciales inválidas"]);
    exit;
}

if (strlen($correo) > 100 || strlen($password) > 128) {
    echo json_encode(["success" => false, "message" => "Credenciales inválidas"]);
    exit;
}

$sql = "SELECT
            u.id_usuario,
            u.nombres,
            u.apellidos,
            u.correo,
            u.contraseña,
            u.correo_validado,
            u.estado,
            u.id_rol,
            r.nombre_rol
        FROM usuarios u
        INNER JOIN rol r ON u.id_rol = r.id_rol
        WHERE u.correo = ?
        LIMIT 1";

$stmt = mysqli_prepare($conn, $sql);

if (!$stmt) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Error interno"]);
    exit;
}

mysqli_stmt_bind_param($stmt, "s", $correo);
mysqli_stmt_execute($stmt);

$res = mysqli_stmt_get_result($stmt);
$user = mysqli_fetch_assoc($res);

// Anti enumeración: correo inexistente y password incorrecta responden igual.
$passwordHash = (string)($user["contraseña"] ?? "");
$passwordOk = $user && password_verify($password, $passwordHash);
$legacyPasswordOk = $user && !$passwordOk && hash_equals($passwordHash, (string)$password);

if (!$user || (!$passwordOk && !$legacyPasswordOk)) {
    echo json_encode([
        "success" => false,
        "message" => "Credenciales inválidas"
    ]);
    exit;
}

// Migra contraseñas legacy en texto plano a hash bcrypt.
if ($legacyPasswordOk) {
    $nuevoHash = password_hash($password, PASSWORD_BCRYPT);
    $stmtHash = mysqli_prepare($conn, "UPDATE usuarios SET contraseña = ? WHERE id_usuario = ?");
    if ($stmtHash) {
        mysqli_stmt_bind_param($stmtHash, "si", $nuevoHash, $user["id_usuario"]);
        mysqli_stmt_execute($stmtHash);
    }
}

if ((int)$user["estado"] === 0) {
    echo json_encode([
        "success" => false,
        "message" => "Tu cuenta está desactivada. Contacta a soporte."
    ]);
    exit;
}

if ((int)$user["correo_validado"] === 0) {
    echo json_encode([
        "success" => false,
        "message" => "Debes verificar tu correo antes de iniciar sesión.",
        "requiere_verificacion" => true,
        "correo" => $user["correo"]
    ]);
    exit;
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
$_SESSION["session_timeout"] = 1800; // 30 minutos de inactividad

echo json_encode([
    "success" => true,
    "rol" => $user["nombre_rol"],
    "csrf" => $_SESSION["csrf_token"]
]);
