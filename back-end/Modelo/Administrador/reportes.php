<?php

require_once __DIR__ . '/_auth.php';
require_once __DIR__ . '/_helpers.php';
require_once __DIR__ . '/../../config/sanitize.php';

admin_headers('GET, POST, OPTIONS');
admin_usuario_id();
$con = admin_db();

function admin_reporte(mysqli $con, int $id): ?array
{
    return admin_one($con, 'SELECT rv.id_reporte, rv.id_vacante, rv.motivo, rv.fecha_reporte,
        v.titulo_puesto, v.estado AS estado_vacante, r.id_usuario AS id_usuario_reclutador,
        CONCAT(COALESCE(u.nombres, ""), " ", COALESCE(u.apellidos, "")) AS usuario_reportante,
        u.correo AS correo_reportante FROM reporte_vacante rv
        JOIN vacantes v ON v.id_vacante = rv.id_vacante
        JOIN reclutadores r ON r.id_reclutador = v.id_reclutador
        JOIN usuarios u ON u.id_usuario = rv.id_usuario WHERE rv.id_reporte = ? LIMIT 1', 'i', $id);
}

function admin_notificar_reporte(mysqli $con, array $reporte, string $accion, string $comentario = ''): void
{
    $idUsuario = (int)($reporte['id_usuario_reclutador'] ?? 0);
    if ($idUsuario < 1) return;
    $titulo = inclusijob_limpio($reporte['titulo_puesto'] ?? 'tu vacante');
    $motivo = inclusijob_limpio($reporte['motivo'] ?? '');
    $comentario = inclusijob_limpio($comentario);
    $suspendida = $accion === 'vacante_eliminada';
    $texto = $suspendida
        ? "Administración revisó un reporte sobre \"$titulo\" y suspendió la vacante."
        : "El reporte sobre \"$titulo\" fue revisado y descartado por administración.";
    if ($comentario !== '') $texto .= ' Motivo del administrador: ' . $comentario;
    $payload = json_encode([
        'text' => $texto,
        'tipo' => 'reporte_vacante',
        'accion' => $accion,
        'reporte' => [
            'id_reporte' => (int)$reporte['id_reporte'],
            'motivo' => $motivo,
            'fecha_reporte' => $reporte['fecha_reporte'] ?? null,
            'usuario_reportante' => trim((string)$reporte['usuario_reportante']),
            'comentario_admin' => $comentario,
        ],
        'vacante' => [
            'id_vacante' => (int)$reporte['id_vacante'],
            'titulo_puesto' => $titulo,
        ],
    ], JSON_UNESCAPED_UNICODE);
    $stmt = admin_stmt($con, 'INSERT INTO chabots
        (tipo_interaccion, mensaje_usuario, respuesta_ia, resultado, calificacion, archivo_cv, id_usuario)
        VALUES (?, ?, ?, ?, NULL, NULL, ?)', 'ssssi',
        $suspendida ? 'reporte_reprimenda' : 'reporte_resuelto',
        $suspendida ? 'Administración suspendió una vacante reportada' : 'Administración descartó un reporte de vacante',
        $payload,
        $suspendida ? 'reporte_vacante_eliminada_admin' : 'reporte_ignorado_admin',
        $idUsuario);
    if ($stmt) mysqli_stmt_close($stmt);
}

try {
    $metodo = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    $accion = $_GET['accion'] ?? '';
    if ($metodo === 'GET' && $accion === 'listar') {
        $buscar = trim((string)($_GET['buscar'] ?? ''));
        $estado = trim((string)($_GET['estado'] ?? ''));
        $pagina = max(1, (int)($_GET['pagina'] ?? 1));
        $limite = max(1, min(100, (int)($_GET['limite'] ?? 15)));
        $offset = ($pagina - 1) * $limite;
        $conditions = [];
        $params = [];
        $types = '';
        if ($buscar !== '') {
            $conditions[] = '(v.titulo_puesto LIKE ? OR e.nombre_empresas LIKE ? OR u.correo LIKE ? OR u.nombres LIKE ? OR u.apellidos LIKE ? OR rv.motivo LIKE ?)';
            $like = admin_like($buscar);
            array_push($params, $like, $like, $like, $like, $like, $like);
            $types .= 'ssssss';
        }
        if ($estado !== '' && $estado !== 'todas') {
            $conditions[] = 'v.estado = ?';
            $params[] = $estado;
            $types .= 's';
        }
        $where = $conditions ? 'WHERE ' . implode(' AND ', $conditions) : '';
        $from = 'FROM reporte_vacante rv JOIN vacantes v ON v.id_vacante = rv.id_vacante
            JOIN reclutadores r ON r.id_reclutador = v.id_reclutador
            JOIN empresas e ON e.id_empresas = r.id_empresas
            JOIN usuarios u ON u.id_usuario = rv.id_usuario';
        $totalRow = admin_one($con, "SELECT COUNT(*) AS total $from $where", $types, ...$params);
        if (!$totalRow) admin_responder(false, 'No se pudieron obtener los reportes. Intenta de nuevo.', null, 500);
        $rows = admin_all($con, "SELECT rv.id_reporte AS id, rv.id_reporte, rv.motivo, rv.fecha_reporte,
            rv.id_vacante, rv.id_usuario, v.titulo_puesto, v.titulo_puesto AS vacante,
            v.estado AS estado_vacante, e.id_empresas, e.nombre_empresas,
            e.nombre_empresas AS empresa, u.nombres, u.apellidos, u.correo,
            u.correo AS usuario, CONCAT(u.nombres, ' ', u.apellidos) AS usuario_nombre
            $from $where ORDER BY rv.fecha_reporte DESC, rv.id_reporte DESC LIMIT ? OFFSET ?",
            $types . 'ii', ...array_merge($params, [$limite, $offset]));
        foreach ($rows as &$row) {
            foreach (['id', 'id_reporte', 'id_vacante', 'id_usuario', 'id_empresas'] as $key) $row[$key] = (int)$row[$key];
        }
        unset($row);
        $total = (int)$totalRow['total'];
        admin_responder(true, 'Reportes obtenidos.', [
            'reportes' => $rows,
            'total' => $total,
            'pagina' => $pagina,
            'limite' => $limite,
            'total_paginas' => (int)ceil($total / $limite),
        ]);
    }

    if ($metodo === 'POST' && $accion === 'ignorar') {
        $id = (int)($_GET['id'] ?? 0);
        if (!$id) admin_responder(false, 'ID requerido.', null, 400);
        $reporte = admin_reporte($con, $id);
        if (!$reporte) admin_responder(false, 'Reporte no encontrado.', null, 404);
        $stmt = admin_stmt($con, 'DELETE FROM reporte_vacante WHERE id_reporte = ?', 'i', $id);
        if (!$stmt || mysqli_stmt_affected_rows($stmt) < 1) admin_responder(false, 'No se pudo ignorar el reporte.', null, 409);
        if ($stmt) mysqli_stmt_close($stmt);
        admin_notificar_reporte($con, $reporte, 'ignorado');
        admin_responder(true, 'Reporte ignorado.');
    }

    if ($metodo === 'POST' && $accion === 'eliminar_vacante') {
        $id = (int)($_GET['id'] ?? 0);
        if (!$id) admin_responder(false, 'ID requerido.', null, 400);
        $body = admin_json_body();
        $comentario = inclusijob_limpio($body['explicacion'] ?? $body['comentario_admin'] ?? $body['motivo_admin'] ?? '');
        if ($comentario === '') admin_responder(false, 'La explicación del administrador es requerida.', null, 400);
        if (mb_strlen($comentario) > 500) admin_responder(false, 'La explicación debe tener máximo 500 caracteres.', null, 400);
        $reporte = admin_reporte($con, $id);
        if (!$reporte) admin_responder(false, 'Reporte no encontrado.', null, 404);
        $idVacante = (int)$reporte['id_vacante'];
        mysqli_begin_transaction($con);
        $stmtVacante = admin_stmt($con, "UPDATE vacantes SET estado = 'eliminada' WHERE id_vacante = ?", 'i', $idVacante);
        $stmtReportes = admin_stmt($con, 'DELETE FROM reporte_vacante WHERE id_vacante = ?', 'i', $idVacante);
        if (!$stmtVacante || !$stmtReportes) {
            if ($stmtVacante) mysqli_stmt_close($stmtVacante);
            if ($stmtReportes) mysqli_stmt_close($stmtReportes);
            mysqli_rollback($con);
            admin_responder(false, 'No se pudo suspender la vacante reportada.', null, 500);
        }
        mysqli_stmt_close($stmtVacante);
        mysqli_stmt_close($stmtReportes);
        admin_notificar_reporte($con, $reporte, 'vacante_eliminada', $comentario);
        mysqli_commit($con);
        admin_responder(true, 'Vacante suspendida.', ['id_vacante' => $idVacante]);
    }

    admin_responder(false, 'Acción no reconocida.', null, 400);
} catch (Throwable $e) {
    if (isset($con) && $con instanceof mysqli) @mysqli_rollback($con);
    error_log('reportes.php: ' . $e->getMessage());
    admin_responder(false, 'No se pudo procesar la solicitud. Intenta de nuevo.', null, 500);
}
