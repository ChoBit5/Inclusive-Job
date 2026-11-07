<?php

// Guardia compartida para endpoints no publicos (todas las features).
// Los roles se normalizan a minusculas porque el nombre del rol esta capitalizado en BD.
require_once __DIR__ . '/cors.php';

if (!function_exists('inclusijob_estado_activo')) {
    function inclusijob_estado_activo($estado): bool
    {
        return is_numeric($estado) && (int)$estado === 1;
    }
}

if (!function_exists('inclusijob_usuario_activo')) {
    function inclusijob_usuario_activo(int $idUsuario): bool
    {
        if ($idUsuario < 1) {
            return false;
        }

        $conn = @mysqli_connect(
            INCLUSIJOB_DB_HOST,
            INCLUSIJOB_DB_USER,
            INCLUSIJOB_DB_PASSWORD,
            INCLUSIJOB_DB_NAME
        );

        if (!$conn) {
            error_log('No fue posible validar el estado de la sesión.');
            return false;
        }

        mysqli_set_charset($conn, 'utf8mb4');
        $stmt = mysqli_prepare($conn, 'SELECT estado FROM usuarios WHERE id_usuario = ? LIMIT 1');
        if (!$stmt) {
            mysqli_close($conn);
            error_log('No fue posible preparar la validación del estado de la sesión.');
            return false;
        }

        mysqli_stmt_bind_param($stmt, 'i', $idUsuario);
        mysqli_stmt_execute($stmt);
        $resultado = mysqli_stmt_get_result($stmt);
        $usuario = $resultado ? mysqli_fetch_assoc($resultado) : null;
        mysqli_stmt_close($stmt);
        mysqli_close($conn);

        return $usuario !== null && inclusijob_estado_activo($usuario['estado'] ?? null);
    }
}

if (!function_exists('inclusijob_destruir_sesion')) {
    function inclusijob_destruir_sesion(): void
    {
        $_SESSION = [];

        if (ini_get('session.use_cookies')) {
            $params = session_get_cookie_params();
            setcookie(session_name(), '', [
                'expires' => time() - 42000,
                'path' => $params['path'],
                'domain' => $params['domain'],
                'secure' => $params['secure'],
                'httponly' => $params['httponly'],
                'samesite' => $params['samesite'] ?? INCLUSIJOB_SESSION_SAMESITE,
            ]);
        }

        if (session_status() === PHP_SESSION_ACTIVE) {
            session_destroy();
        }
    }
}

if (!function_exists('inclusijob_rol_canonico')) {
    function inclusijob_rol_canonico($rol): string
    {
        $r = strtolower(trim((string)$rol));
        if ($r === 'administrador' || $r === 'admin') return 'administrador';
        if ($r === 'postulante' || $r === 'candidato' || $r === 'aspirante') return 'postulante';
        if ($r === 'reclutador' || $r === 'empresa' || $r === 'empleador') return 'reclutador';
        return $r;
    }
}

if (!function_exists('requerirSesion')) {
    // 401 si no hay sesion; refresca last_activity.
    function requerirSesion(array $compatibilidad = []): array
    {
        inclusijob_session_cookie_params();
        if (session_status() !== PHP_SESSION_ACTIVE) {
            session_start();
        }

        if (!isset($_SESSION['user']) || empty($_SESSION['user']['id'])) {
            http_response_code(401);
            $respuesta = [
                "success" => false,
                "message" => "Sesi\u{00f3}n no v\u{00e1}lida. Inicia sesi\u{00f3}n nuevamente.",
                "ok" => false,
                "msg" => "Sesi\u{00f3}n no v\u{00e1}lida. Inicia sesi\u{00f3}n nuevamente.",
            ];
            if (($compatibilidad['include_auth'] ?? false) === true) {
                $respuesta['auth'] = false;
            }
            echo json_encode($respuesta);
            exit;
        }

        if (!inclusijob_usuario_activo((int)$_SESSION['user']['id'])) {
            inclusijob_destruir_sesion();
            http_response_code(401);
            $respuesta = [
                "success" => false,
                "message" => "Tu sesión ya no está activa. Inicia sesión nuevamente.",
                "ok" => false,
                "msg" => "Tu sesión ya no está activa. Inicia sesión nuevamente.",
            ];
            if (($compatibilidad['include_auth'] ?? false) === true) {
                $respuesta['auth'] = false;
            }
            echo json_encode($respuesta);
            exit;
        }

        $_SESSION['last_activity'] = time();
        return $_SESSION['user'];
    }
}

if (!function_exists('requerirRol')) {
    // 403 si el rol de la sesion no esta permitido.
    function requerirRol(array $roles, array $compatibilidad = []): array
    {
        $user = requerirSesion($compatibilidad);
        $canonico = inclusijob_rol_canonico($user['rol'] ?? '');
        $permitidos = array_map('inclusijob_rol_canonico', $roles);

        if (!in_array($canonico, $permitidos, true)) {
            http_response_code(403);
            $respuesta = [
                "success" => false,
                "message" => 'No tienes permisos para acceder a este recurso.',
                "ok" => false,
                "msg" => 'No tienes permisos para acceder a este recurso.',
            ];
            if (($compatibilidad['include_auth'] ?? false) === true) {
                $respuesta['auth'] = false;
            }
            echo json_encode($respuesta);
            exit;
        }

        return $user;
    }
}
