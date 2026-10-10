<?php
// Base compartida del portal del reclutador (parcial, feature 23).
// Solo lo que necesita la pantalla empresa; cada feature añade sus funciones.
// La sesión y el rol los impone config/auth.php (requerirRol), no un chequeo manual.
require_once __DIR__ . '/../../config/auth.php';

if (!function_exists('reclutador_headers')) {
    function reclutador_headers($methods = 'GET, POST, OPTIONS') {
        inclusijob_cors_headers($methods, 'Content-Type, Authorization');
    }
}

if (!function_exists('reclutador_responder')) {
    // Mismo formato del origen: success + ok + message + data.
    function reclutador_responder($ok, $message, $data = null, $http = 200, $extra = []) {
        http_response_code($http);
        if (ob_get_length()) ob_clean();

        echo json_encode(array_merge([
            'success' => $ok,
            'ok' => $ok,
            'message' => $message,
            'data' => $data,
        ], $extra), JSON_UNESCAPED_UNICODE);
        exit;
    }
}

if (!function_exists('reclutador_usuario_id')) {
    // 401 sin sesión, 403 rol distinto (vía requerirRol). Refresca last_activity.
    function reclutador_usuario_id() {
        $user = requerirRol(['reclutador']);
        return (int)($user['id'] ?? 0);
    }
}

if (!function_exists('reclutador_id_desde_usuario')) {
    // Sin fila en reclutadores responde el 404 del origen, salvo $crear=true
    // (feature 22), que crea con id_empresas NULL y puesto "Reclutador".
    function reclutador_id_desde_usuario($con, $id_usuario, $crear = false) {
        $stmt = mysqli_prepare($con, 'SELECT id_reclutador FROM reclutadores WHERE id_usuario = ? LIMIT 1');
        if (!$stmt) {
            reclutador_responder(false, 'No se pudo validar el perfil de reclutador.', null, 500);
        }
        mysqli_stmt_bind_param($stmt, 'i', $id_usuario);
        mysqli_stmt_execute($stmt);
        $res = mysqli_stmt_get_result($stmt);
        $row = $res ? mysqli_fetch_assoc($res) : null;
        mysqli_stmt_close($stmt);

        if ($row) {
            return (int)$row['id_reclutador'];
        }

        if (!$crear) {
            reclutador_responder(false, 'No se encontro el perfil de reclutador.', null, 404);
        }

        $puesto = 'Reclutador';
        $insert = mysqli_prepare($con, 'INSERT INTO reclutadores (puesto, id_usuario, id_empresas) VALUES (?, ?, NULL)');
        if (!$insert) {
            reclutador_responder(false, 'No se pudo crear el perfil de reclutador.', null, 500);
        }
        mysqli_stmt_bind_param($insert, 'si', $puesto, $id_usuario);

        if (!mysqli_stmt_execute($insert)) {
            mysqli_stmt_close($insert);
            reclutador_responder(false, 'No se pudo crear el perfil de reclutador.', null, 500);
        }

        $id_reclutador = (int)mysqli_insert_id($con);
        mysqli_stmt_close($insert);

        return $id_reclutador;
    }
}

if (!function_exists('reclutador_json_body')) {
    function reclutador_json_body() {
        $input = json_decode(file_get_contents('php://input'), true);
        return is_array($input) ? $input : [];
    }
}
