<?php
// Mantiene, consulta y destruye la sesión PHP.
// GET sesion.php -> {auth, user} si hay sesión activa (refresca last_activity).
// POST sesion.php?accion=logout -> destruye la sesión y borra la cookie.
require_once __DIR__ . '/../../config/cors.php';
inclusijob_session_cookie_params();
session_start();
inclusijob_cors_headers('GET, POST, OPTIONS', 'Content-Type');

$accion = $_GET["accion"] ?? "";

if (($_SERVER["REQUEST_METHOD"] ?? '') === "POST" && $accion === "logout") {
    $_SESSION = [];

    if (ini_get("session.use_cookies")) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', [
            "expires" => time() - 42000,
            "path" => $params["path"],
            "domain" => $params["domain"],
            "secure" => $params["secure"],
            "httponly" => $params["httponly"],
            "samesite" => $params["samesite"] ?? INCLUSIJOB_SESSION_SAMESITE,
        ]);
    }

    session_destroy();

    echo json_encode([
        "success" => true,
        "message" => "Sesion cerrada"
    ]);
    exit;
}

if (!isset($_SESSION["user"])) {
    echo json_encode([
        "auth" => false
    ]);
    exit;
}

if (!isset($_SESSION["session_timeout"])) {
    $_SESSION["session_timeout"] = 86400; // 1 día
}

if (!isset($_SESSION["last_activity"])) {
    $_SESSION["last_activity"] = time();
}

$inactiveTime = time() - $_SESSION["last_activity"];

if ($inactiveTime > $_SESSION["session_timeout"]) {
    $_SESSION = [];

    if (ini_get("session.use_cookies")) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', [
            "expires" => time() - 42000,
            "path" => $params["path"],
            "domain" => $params["domain"],
            "secure" => $params["secure"],
            "httponly" => $params["httponly"],
            "samesite" => $params["samesite"] ?? INCLUSIJOB_SESSION_SAMESITE,
        ]);
    }

    session_destroy();

    echo json_encode([
        "auth" => false,
        "message" => "Sesion expirada"
    ]);
    exit;
}

// Se actualiza después de validar el timeout: 30 minutos de inactividad real.
$_SESSION["last_activity"] = time();

require_once __DIR__ . "/../../Conexion.php";
$conn = conectarbd();
$idUsuario = (int)($_SESSION["user"]["id"] ?? 0);

if ($idUsuario > 0) {
    $sql = "SELECT
                u.id_usuario,
                u.nombres,
                u.apellidos,
                u.correo,
                u.foto_perfil,
                u.id_rol,
                r.nombre_rol
            FROM usuarios u
            INNER JOIN rol r ON u.id_rol = r.id_rol
            WHERE u.id_usuario = ?
            LIMIT 1";

    $stmt = mysqli_prepare($conn, $sql);
    if ($stmt) {
        mysqli_stmt_bind_param($stmt, "i", $idUsuario);
        mysqli_stmt_execute($stmt);
        $res = mysqli_stmt_get_result($stmt);
        $user = mysqli_fetch_assoc($res);

        if ($user) {
            $_SESSION["user"] = [
                "id" => (int)$user["id_usuario"],
                "rol" => $user["nombre_rol"],
                "nombre" => trim(($user["nombres"] ?? "") . " " . ($user["apellidos"] ?? "")),
                "nombres" => $user["nombres"],
                "apellido" => $user["apellidos"],
                "correo" => $user["correo"],
                "foto_perfil" => $user["foto_perfil"],
                "avatar" => $user["foto_perfil"],
                "id_rol" => (int)$user["id_rol"],
            ];
        }
    }
}

echo json_encode([
    "auth" => true,
    "user" => $_SESSION["user"]
]);
