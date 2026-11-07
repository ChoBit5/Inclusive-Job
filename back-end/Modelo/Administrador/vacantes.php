<?php

require_once __DIR__ . '/_auth.php';
require_once __DIR__ . '/_helpers.php';

admin_headers('GET, POST, OPTIONS');
admin_usuario_id();
$con = admin_db();
$join = 'LEFT JOIN reclutadores r ON r.id_reclutador = v.id_reclutador
    LEFT JOIN usuarios u ON u.id_usuario = r.id_usuario
    LEFT JOIN empresas e ON e.id_empresas = r.id_empresas';
$select = "v.id_vacante, v.titulo_puesto, v.descripcion_puesto, v.requisitos, v.modalidad,
    v.salario_min, v.salario_max, v.estado, v.fecha_publicacion, v.fecha_cierre, v.id_reclutador,
    e.id_empresas, e.nombre_empresas AS empresa, e.nombre_empresas,
    u.id_usuario AS id_reclutador_usuario, u.nombres, u.apellidos,
    u.correo AS correo_reclutador,
    CONCAT(COALESCE(u.nombres, ''), ' ', COALESCE(u.apellidos, '')) AS reclutador";

try {
    $metodo = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    $accion = $_GET['accion'] ?? '';

    if ($metodo === 'GET' && $accion === 'listar') {
        $estado = $_GET['estado'] ?? 'todas';
        $modalidad = $_GET['modalidad'] ?? 'todas';
        $buscar = trim((string)($_GET['buscar'] ?? ''));
        $pagina = max(1, (int)($_GET['pagina'] ?? 1));
        $limite = max(1, min(100, (int)($_GET['limite'] ?? 15)));
        $offset = ($pagina - 1) * $limite;
        $conditions = [];
        $params = [];
        $types = '';
        if (in_array($estado, ['activa', 'cerrada', 'eliminada'], true)) {
            $conditions[] = 'v.estado = ?';
            $params[] = $estado;
            $types .= 's';
        }
        if ($modalidad !== 'todas') {
            $conditions[] = 'v.modalidad = ?';
            $params[] = $modalidad;
            $types .= 's';
        }
        if ($buscar !== '') {
            $conditions[] = '(v.titulo_puesto LIKE ? OR e.nombre_empresas LIKE ?)';
            $like = admin_like($buscar);
            array_push($params, $like, $like);
            $types .= 'ss';
        }
        $where = $conditions ? 'WHERE ' . implode(' AND ', $conditions) : '';
        $totalRow = admin_one($con, "SELECT COUNT(DISTINCT v.id_vacante) AS total FROM vacantes v $join $where", $types, ...$params);
        if (!$totalRow) admin_responder(false, 'No se pudieron obtener las vacantes. Intenta de nuevo.', null, 500);
        $rows = admin_all($con, "SELECT $select, COUNT(DISTINCT p.id_postulacion) AS total_postulaciones
            FROM vacantes v $join LEFT JOIN postulaciones p ON p.id_vacante = v.id_vacante $where
            GROUP BY v.id_vacante ORDER BY v.fecha_publicacion DESC, v.id_vacante DESC LIMIT ? OFFSET ?",
            $types . 'ii', ...array_merge($params, [$limite, $offset]));
        foreach ($rows as &$row) $row['id_vacante'] = (int)$row['id_vacante'];
        unset($row);
        $total = (int)$totalRow['total'];
        admin_responder(true, 'Vacantes obtenidas.', [
            'vacantes' => $rows,
            'total' => $total,
            'pagina' => $pagina,
            'limite' => $limite,
            'total_paginas' => (int)ceil($total / $limite),
        ]);
    }

    if ($metodo === 'GET' && $accion === 'detalle') {
        $id = (int)($_GET['id'] ?? 0);
        if (!$id) admin_responder(false, 'ID requerido.', null, 400);
        $vacante = admin_one($con, "SELECT $select, COUNT(DISTINCT p.id_postulacion) AS total_postulaciones
            FROM vacantes v $join LEFT JOIN postulaciones p ON p.id_vacante = v.id_vacante
            WHERE v.id_vacante = ? GROUP BY v.id_vacante", 'i', $id);
        if (!$vacante) admin_responder(false, 'Vacante no encontrada.', null, 404);
        $postulaciones = admin_all($con, 'SELECT p.id_postulacion, p.estado, p.fecha_postulacion,
            u.nombres, u.apellidos, u.correo FROM postulaciones p
            JOIN postulantes po ON po.id_postulante = p.id_postulante
            JOIN usuarios u ON u.id_usuario = po.id_usuario
            WHERE p.id_vacante = ? ORDER BY p.id_postulacion DESC LIMIT 50', 'i', $id);
        $discapacidades = admin_all($con, 'SELECT d.id_tipo_discapacidad AS id_discapacidad,
            d.nombre_discapacidad AS nombre FROM vacante_discapacidad rel
            JOIN tipo_discapacidad d ON d.id_tipo_discapacidad = rel.id_tipo_discapacidad
            WHERE rel.id_vacante = ? ORDER BY d.nombre_discapacidad', 'i', $id);
        admin_responder(true, 'Detalle obtenido.', compact('vacante', 'postulaciones', 'discapacidades'));
    }

    if ($metodo === 'POST' && in_array($accion, ['cerrar', 'eliminar'], true)) {
        $id = (int)($_GET['id'] ?? 0);
        if (!$id) admin_responder(false, 'ID requerido.', null, 400);
        $estado = $accion === 'cerrar' ? 'cerrada' : 'eliminada';
        $stmt = admin_stmt($con, 'UPDATE vacantes SET estado = ? WHERE id_vacante = ?', 'si', $estado, $id);
        if (!$stmt) admin_responder(false, 'No se pudo actualizar la vacante. Intenta de nuevo.', null, 500);
        $changed = mysqli_stmt_affected_rows($stmt);
        mysqli_stmt_close($stmt);
        if ($changed < 1) {
            if (!admin_one($con, 'SELECT id_vacante FROM vacantes WHERE id_vacante = ? LIMIT 1', 'i', $id)) {
                admin_responder(false, 'Vacante no encontrada.', null, 404);
            }
            admin_responder(false, 'La vacante ya se encuentra en ese estado.', null, 409);
        }
        admin_responder(true, $accion === 'cerrar' ? 'Vacante cerrada.' : 'Vacante suspendida.');
    }

    admin_responder(false, 'Acción no reconocida.', null, 400);
} catch (Throwable $e) {
    error_log('vacantes.php: ' . $e->getMessage());
    admin_responder(false, 'No se pudo procesar la solicitud. Intenta de nuevo.', null, 500);
}
