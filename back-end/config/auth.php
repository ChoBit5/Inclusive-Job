<?php
// Guardia compartida para endpoints no públicos (todas las features).
// Los roles se normalizan a minúsculas porque `rol.nombre_rol` está capitalizado en BD.
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
    // 401 si no hay sesión; refresca last_activity.
    function requerirSesion(): array
    {
        inclusijob_session_cookie_params();
        if (session_status() !== PHP_SESSION_ACTIVE) {
            session_start();
        }

        if (!isset($_SESSION["user"]) || empty($_SESSION["user"]["id"])) {
            http_response_code(401);
            echo json_encode(["success" => false, "message" => "Sesión no válida. Inicia sesión nuevamente."]);
            exit;
        }

        $_SESSION["last_activity"] = time();
        return $_SESSION["user"];
    }
}

if (!function_exists('requerirRol')) {
    // 403 si el rol de la sesión no está permitido.
    function requerirRol(array $roles): array
    {
        $user = requerirSesion();
        $canonico = inclusijob_rol_canonico($user["rol"] ?? '');
        $permitidos = array_map('inclusijob_rol_canonico', $roles);

        if (!in_array($canonico, $permitidos, true)) {
            http_response_code(403);
            echo json_encode(["success" => false, "message" => "No tienes permisos para acceder a este recurso."]);
            exit;
        }

        return $user;
    }
}
