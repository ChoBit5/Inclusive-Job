<?php
// Base compartida de los endpoints del administrador (parcial, feature 6).
// Solo lo que necesita el dashboard; cada feature añade sus funciones.
// La sesión y el rol los impone config/auth.php (requerirRol), no un chequeo manual.
require_once __DIR__ . '/../../config/auth.php';

if (!function_exists('admin_headers')) {
    function admin_headers($methods = 'GET, OPTIONS') {
        inclusijob_cors_headers($methods, 'Content-Type, Authorization');
    }
}

if (!function_exists('admin_responder')) {
    // Mismo formato del origen: success + message + data.
    function admin_responder($ok, $message, $data = null, $http = 200) {
        http_response_code($http);
        if (ob_get_length()) ob_clean();

        echo json_encode([
            'success' => $ok,
            'message' => $message,
            'data' => $data,
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
}

if (!function_exists('admin_usuario_id')) {
    // 401 sin sesión, 403 rol distinto (vía requerirRol). Refresca last_activity.
    function admin_usuario_id() {
        $user = requerirRol(['administrador']);
        return (int)($user['id'] ?? 0);
    }
}

if (!function_exists('admin_cuerpo_json')) {
    // Cuerpo JSON como array; {} o inválido → [].
    function admin_cuerpo_json() {
        $input = json_decode(file_get_contents('php://input'), true);
        return is_array($input) ? $input : [];
    }
}
