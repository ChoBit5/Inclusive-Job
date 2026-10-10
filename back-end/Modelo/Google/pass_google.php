<?php

require_once __DIR__ . '/../../config/cors.php';
inclusijob_cors_headers('POST, OPTIONS', 'Content-Type, Authorization');

require_once __DIR__ . "/../../Conexion.php";
require_once __DIR__ . "/../../config/google.php";

try {
    if (($_SERVER["REQUEST_METHOD"] ?? '') !== "POST") {
        http_response_code(405);
        echo json_encode(["success" => false, "message" => "Metodo no permitido"]);
        exit;
    }

    $con = conectarbd();

    $input = json_decode((string)file_get_contents("php://input"), true);

    if (!is_array($input)) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "JSON inválido"]);
        exit;
    }

    $id_usuario = isset($input["id_usuario"]) ? (int)$input["id_usuario"] : 0;
    $password   = trim((string)($input["password"] ?? ""));
    $credential = trim((string)($input["credential"] ?? ""));

    if ($id_usuario <= 0) {
        echo json_encode(["success" => false, "message" => "ID de usuario inválido"]);
        exit;
    }

    if ($password === "") {
        echo json_encode(["success" => false, "message" => "Contraseña vacía"]);
        exit;
    }

    if ($credential === "") {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Token de Google requerido"]);
        exit;
    }

    $passwordRegex = "/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,64}$/";

    if (!preg_match($passwordRegex, $password)) {
        echo json_encode([
            "success" => false,
            "message" => "La contraseña no cumple requisitos de seguridad"
        ]);
        exit;
    }

    try {
        $google = inclusijob_verify_google_credential($credential);
    } catch (Throwable $e) {
        $msg = $e->getMessage();
        $code = str_contains($msg, 'no configurado') ? 500 : 401;
        http_response_code($code);
        echo json_encode(["success" => false, "message" => $msg]);
        exit;
    }

    $stmt = mysqli_prepare($con, "SELECT id_usuario, correo FROM usuarios WHERE id_usuario = ? LIMIT 1");
    mysqli_stmt_bind_param($stmt, "i", $id_usuario);
    mysqli_stmt_execute($stmt);
    $res = mysqli_stmt_get_result($stmt);
    $usuario = $res ? mysqli_fetch_assoc($res) : null;
    mysqli_stmt_close($stmt);

    if (!$usuario) {
        echo json_encode(["success" => false, "message" => "Usuario no encontrado"]);
        exit;
    }

    if (strtolower(trim((string)$usuario["correo"])) !== $google["email"]) {
        http_response_code(403);
        echo json_encode(["success" => false, "message" => "El token de Google no coincide con este usuario"]);
        exit;
    }

    $hash = password_hash($password, PASSWORD_BCRYPT);

    if (!$hash) {
        echo json_encode(["success" => false, "message" => "Error al generar hash"]);
        exit;
    }

    $update = mysqli_prepare($con,
        "UPDATE usuarios
         SET contraseña = ?, correo_validado = 1
         WHERE id_usuario = ?
         LIMIT 1"
    );

    mysqli_stmt_bind_param($update, "si", $hash, $id_usuario);

    if (!mysqli_stmt_execute($update)) {
        mysqli_stmt_close($update);
        echo json_encode(["success" => false, "message" => "No se pudo actualizar la contraseña"]);
        exit;
    }

    mysqli_stmt_close($update);

    echo json_encode([
        "success" => true,
        "message" => "Contraseña actualizada correctamente",
        "id_usuario" => $id_usuario
    ]);
} catch (Throwable $e) {
    error_log("update_password_google: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Error interno del servidor"]);
}
