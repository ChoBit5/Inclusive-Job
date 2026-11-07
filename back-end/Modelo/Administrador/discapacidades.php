<?php

require_once __DIR__ . '/_auth.php';
require_once __DIR__ . '/_helpers.php';
require_once __DIR__ . '/../../config/sanitize.php';

admin_headers('GET, POST, OPTIONS');
admin_usuario_id();
$con = admin_db();

try {
    $metodo = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    $accion = $_GET['accion'] ?? '';
    if ($metodo === 'GET' && $accion === 'listar') {
        $rows = admin_all($con, 'SELECT id_tipo_discapacidad AS id_discapacidad,
            nombre_discapacidad AS nombre, descripcion FROM tipo_discapacidad
            ORDER BY nombre_discapacidad ASC');
        admin_responder(true, 'Discapacidades obtenidas.', [
            'discapacidades' => $rows,
            'total' => count($rows),
        ]);
    }

    if ($metodo === 'POST' && in_array($accion, ['crear', 'editar'], true)) {
        $body = admin_json_body();
        $nombre = inclusijob_limpio($body['nombre'] ?? '');
        $descripcion = inclusijob_limpio($body['descripcion'] ?? '');
        $id = (int)($_GET['id'] ?? 0);
        if ($accion === 'editar' && !$id) admin_responder(false, 'ID requerido.', null, 400);
        if ($nombre === '') admin_responder(false, 'Nombre requerido.', null, 400);
        if ($descripcion === '') admin_responder(false, 'Descripción requerida.', null, 400);
        $duplicateSql = 'SELECT id_tipo_discapacidad FROM tipo_discapacidad
            WHERE LOWER(nombre_discapacidad) = LOWER(?)' . ($accion === 'editar' ? ' AND id_tipo_discapacidad <> ?' : '') . ' LIMIT 1';
        $duplicate = $accion === 'editar'
            ? admin_one($con, $duplicateSql, 'si', $nombre, $id)
            : admin_one($con, $duplicateSql, 's', $nombre);
        if ($duplicate) admin_responder(false, 'Ya existe una discapacidad con ese nombre.', null, 409);

        if ($accion === 'crear') {
            $stmt = admin_stmt($con, 'INSERT INTO tipo_discapacidad (nombre_discapacidad, descripcion) VALUES (?, ?)', 'ss', $nombre, $descripcion);
            if (!$stmt) admin_responder(false, 'No se pudo crear la discapacidad. Intenta de nuevo.', null, 500);
            $newId = mysqli_insert_id($con);
            mysqli_stmt_close($stmt);
            admin_responder(true, 'Discapacidad creada.', ['id' => $newId]);
        }

        $stmt = admin_stmt($con, 'UPDATE tipo_discapacidad SET nombre_discapacidad = ?, descripcion = ? WHERE id_tipo_discapacidad = ?', 'ssi', $nombre, $descripcion, $id);
        if (!$stmt) admin_responder(false, 'No se pudo editar la discapacidad. Intenta de nuevo.', null, 500);
        $changed = mysqli_stmt_affected_rows($stmt);
        mysqli_stmt_close($stmt);
        if ($changed < 0) admin_responder(false, 'No se pudo editar la discapacidad.', null, 500);
        if (!admin_one($con, 'SELECT id_tipo_discapacidad FROM tipo_discapacidad WHERE id_tipo_discapacidad = ? LIMIT 1', 'i', $id)) {
            admin_responder(false, 'Discapacidad no encontrada.', null, 404);
        }
        admin_responder(true, 'Discapacidad editada.');
    }

    if ($metodo === 'POST' && $accion === 'eliminar') {
        $id = (int)($_GET['id'] ?? 0);
        if (!$id) admin_responder(false, 'ID requerido.', null, 400);
        $stmt = admin_stmt($con, 'DELETE FROM tipo_discapacidad WHERE id_tipo_discapacidad = ?', 'i', $id);
        if (!$stmt) admin_responder(false, 'No se pudo eliminar. Puede estar en uso.', null, 409);
        $changed = mysqli_stmt_affected_rows($stmt);
        mysqli_stmt_close($stmt);
        if ($changed < 1) admin_responder(false, 'Discapacidad no encontrada.', null, 404);
        admin_responder(true, 'Discapacidad eliminada.');
    }

    admin_responder(false, 'Acción no reconocida.', null, 400);
} catch (Throwable $e) {
    error_log('discapacidades.php: ' . $e->getMessage());
    admin_responder(false, 'No se pudo procesar la solicitud. Intenta de nuevo.', null, 500);
}
