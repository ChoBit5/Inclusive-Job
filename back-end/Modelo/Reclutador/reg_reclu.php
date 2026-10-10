<?php

declare(strict_types=1);

require_once __DIR__ . '/../../config/cors.php';
inclusijob_cors_headers('POST, OPTIONS', 'Content-Type');
header("X-Content-Type-Options: nosniff");
header("X-Frame-Options: DENY");
header("Referrer-Policy: no-referrer");

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    http_response_code(405);
    echo json_encode([
        "success" => false,
        "message" => "Permiso denegado"
    ]);
    exit;
}

require_once __DIR__ . "/../../Conexion.php";
require_once __DIR__ . "/reclu.php";
require_once __DIR__ . "/../../config/mailer.php";
require_once __DIR__ . "/../../config/ratelimit.php";

try {
    /*
    |--------------------------------------------------------------------------
    | RATE LIMITING: 10 intentos cada 5 minutos por IP
    |--------------------------------------------------------------------------
    */
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    if (inclusijob_rate_limited('reg_reclu', $ip)) {
        http_response_code(429);
        echo json_encode(["success" => false, "message" => "Demasiados intentos, intenta mas tarde"]);
        exit;
    }

    $contentType = $_SERVER["CONTENT_TYPE"] ?? "";
    if (stripos($contentType, "application/json") === false) {
        http_response_code(415);
        echo json_encode(["success" => false, "message" => "Contenido invalido"]);
        exit;
    }

    $rawInput = file_get_contents("php://input");
    if ($rawInput === false || trim($rawInput) === '') {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Solicitud vacia"]);
        exit;
    }
    $data = json_decode($rawInput, true);
    if (json_last_error() !== JSON_ERROR_NONE || !is_array($data)) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "JSON invalido"]);
        exit;
    }

    $nombres  = trim((string)($data["nombres"] ?? ""));
    $correo   = trim((string)($data["correo"] ?? ""));
    $password = (string)($data["password"] ?? "");
    $telefono = trim((string)($data["telefono"] ?? ""));

    if ($nombres === '' || $correo === '' || $password === '' || $telefono === '') {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Faltan datos"]);
        exit;
    }

    if (strlen($nombres) < 3 || strlen($nombres) > 60) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Datos invalidos"]);
        exit;
    }
    if (strlen($correo) > 100) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Datos invalidos"]);
        exit;
    }
    if (strlen($password) < 8 || strlen($password) > 128) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Datos invalidos"]);
        exit;
    }
    if (strlen($telefono) < 7 || strlen($telefono) > 15) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Datos invalidos"]);
        exit;
    }
    if (!filter_var($correo, FILTER_VALIDATE_EMAIL)) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Datos invalidos"]);
        exit;
    }
    if (!preg_match("/^[\\p{L}\\s.-]{3,60}$/u", $nombres)) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Datos invalidos"]);
        exit;
    }
    if (!preg_match('/^[0-9]{7,15}$/', $telefono)) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Datos invalidos"]);
        exit;
    }
    if (
        !preg_match('/[A-Z]/', $password) ||
        !preg_match('/[a-z]/', $password) ||
        !preg_match('/[0-9]/', $password) ||
        !preg_match('/[\W_]/', $password)
    ) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Datos invalidos"]);
        exit;
    }

    $con = conectarbd();
    if (!$con) {
        throw new Exception("No fue posible conectar a la base de datos");
    }

    $result = registrarReclutador($con, $nombres, $correo, $password, $telefono);

    if (!$result["success"]) {
        http_response_code(400);
        echo json_encode($result);
        $con->close();
        exit;
    }

    $codigo = (string)($result["codigo"] ?? "");
    try {
        inclusijob_send_verification_code($correo, $codigo);
    } catch (Throwable $mailError) {
        // Limpia el token pendiente recien creado para no dejar codigos huérfanos.
        $stmtClean = $con->prepare("DELETE FROM tokens WHERE tipo = 'registro_pendiente' AND JSON_UNQUOTE(JSON_EXTRACT(token, '$.correo')) = ? AND JSON_UNQUOTE(JSON_EXTRACT(token, '$.codigo')) = ?");
        if ($stmtClean) {
            $stmtClean->bind_param("ss", $correo, $codigo);
            $stmtClean->execute();
            $stmtClean->close();
        }
        error_log("[REGISTRO_RECLUTADOR_MAIL] " . $mailError->getMessage());
        http_response_code(500);
        echo json_encode(["success" => false, "message" => $mailError->getMessage()]);
        $con->close();
        exit;
    }

    $con->close();
    http_response_code(201);
    echo json_encode([
        "success" => true,
        "correo" => $correo,
        "message" => "Te enviamos un codigo de verificacion por correo. Vence en 15 minutos."
    ]);
} catch (Throwable $e) {
    error_log("[REGISTRO_RECLUTADOR] " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Error interno del servidor"]);
}
