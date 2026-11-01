<?php

// Guardia compartida para endpoints no publicos (todas las features).
// Los roles se normalizan a minusculas porque el nombre del rol esta capitalizado en BD.
require_once __DIR__ . '/cors.php';

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
