<?php

require_once __DIR__ . '/_auth.php';
require_once __DIR__ . '/_helpers.php';

admin_headers('GET, POST, OPTIONS');
admin_usuario_id();
$con = admin_db();
$join = 'LEFT JOIN postulantes po ON po.id_postulante = p.id_postulante
    LEFT JOIN usuarios u ON u.id_usuario = po.id_usuario
    LEFT JOIN vacantes v ON v.id_vacante = p.id_vacante
    LEFT JOIN reclutadores r ON r.id_reclutador = v.id_reclutador
    LEFT JOIN empresas e ON e.id_empresas = r.id_empresas';
$select = "p.id_postulacion, p.id_vacante, po.id_postulante, u.id_usuario, u.nombres,
    u.apellidos, u.correo, u.telefono, u.foto_perfil, p.estado, p.fecha_postulacion,
    v.titulo_puesto AS vacante, v.titulo_puesto, v.descripcion_puesto,
    v.modalidad, v.estado AS estado_vacante, e.id_empresas, e.nombre_empresas AS empresa,
    CONCAT(COALESCE(u.nombres, ''), ' ', COALESCE(u.apellidos, '')) AS postulante";

try {
    $metodo = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    $accion = $_GET['accion'] ?? '';
    if ($metodo === 'GET' && $accion === 'listar') {
        $estado = $_GET['estado'] ?? 'todas';
        $buscar = trim((string)($_GET['buscar'] ?? ''));
        $pagina = max(1, (int)($_GET['pagina'] ?? 1));
        $limite = max(1, min(100, (int)($_GET['limite'] ?? 15)));
        $offset = ($pagina - 1) * $limite;
        $conditions = [];
        $params = [];
        $types = '';
        if (in_array($estado, ['pendiente', 'entrevista', 'aceptado', 'rechazado'], true)) {
            $conditions[] = 'p.estado = ?';
            $params[] = $estado;
            $types .= 's';
        }
        if ($buscar !== '') {
            $conditions[] = '(u.nombres LIKE ? OR u.apellidos LIKE ? OR u.correo LIKE ? OR v.titulo_puesto LIKE ? OR e.nombre_empresas LIKE ?)';
            $like = admin_like($buscar);
            array_push($params, $like, $like, $like, $like, $like);
            $types .= 'sssss';
        }
        $where = $conditions ? 'WHERE ' . implode(' AND ', $conditions) : '';
        $totalRow = admin_one($con, "SELECT COUNT(DISTINCT p.id_postulacion) AS total FROM postulaciones p $join $where", $types, ...$params);
        if (!$totalRow) admin_responder(false, 'No se pudieron obtener las postulaciones. Intenta de nuevo.', null, 500);
        $rows = admin_all($con, "SELECT $select FROM postulaciones p $join $where
            ORDER BY p.fecha_postulacion DESC, p.id_postulacion DESC LIMIT ? OFFSET ?",
            $types . 'ii', ...array_merge($params, [$limite, $offset]));
        foreach ($rows as &$row) {
            $row['id_postulacion'] = (int)$row['id_postulacion'];
            $row['id_vacante'] = (int)$row['id_vacante'];
            $row['id_postulante'] = (int)$row['id_postulante'];
        }
        unset($row);
        $total = (int)$totalRow['total'];
        admin_responder(true, 'Postulaciones obtenidas.', [
            'postulaciones' => $rows,
            'total' => $total,
            'pagina' => $pagina,
            'limite' => $limite,
            'total_paginas' => (int)ceil($total / $limite),
        ]);
    }

    if ($metodo === 'GET' && $accion === 'detalle') {
        $id = (int)($_GET['id'] ?? 0);
        if (!$id) admin_responder(false, 'ID requerido.', null, 400);
        $postulacion = admin_one($con, "SELECT $select FROM postulaciones p $join
            WHERE p.id_postulacion = ? LIMIT 1", 'i', $id);
        if (!$postulacion) admin_responder(false, 'Postulación no encontrada.', null, 404);
        $postulante = admin_one($con, 'SELECT id_postulante, descripcion_discapacidad,
            esfuerzo_fisico_posible, experiencia, habilidades, cv, portafolio_url, id_usuario
            FROM postulantes WHERE id_postulante = ? LIMIT 1', 'i', (int)$postulacion['id_postulante']);
        if ($postulante) {
            $postulante['tiene_cv'] = admin_pdf_available($postulante['cv'] ?? null) ? 1 : 0;
            unset($postulante['cv']);
        }
        $vacante = admin_one($con, 'SELECT v.*, e.nombre_empresas AS empresa FROM vacantes v
            LEFT JOIN reclutadores r ON r.id_reclutador = v.id_reclutador
            LEFT JOIN empresas e ON e.id_empresas = r.id_empresas
            WHERE v.id_vacante = ? LIMIT 1', 'i', (int)$postulacion['id_vacante']);
        $certificaciones = admin_all($con, 'SELECT id_certificaciones, nombre_certificacion,
            institucion_dada, fecha_emitido, pdf FROM certificaciones WHERE id_postulante = ?
            ORDER BY fecha_emitido DESC, id_certificaciones DESC LIMIT 10', 'i', (int)$postulacion['id_postulante']);
        foreach ($certificaciones as &$certificacion) {
            $certificacion['tiene_pdf'] = admin_pdf_available($certificacion['pdf'] ?? null) ? 1 : 0;
            unset($certificacion['pdf']);
        }
        unset($certificacion);
        $discapacidades = admin_all($con, 'SELECT d.id_tipo_discapacidad AS id_discapacidad,
            d.nombre_discapacidad AS nombre FROM postulante_discapacidad rel
            JOIN tipo_discapacidad d ON d.id_tipo_discapacidad = rel.id_tipo_discapacidad
            WHERE rel.id_postulante = ? ORDER BY d.nombre_discapacidad', 'i', (int)$postulacion['id_postulante']);
        admin_responder(true, 'Detalle obtenido.', compact('postulacion', 'postulante', 'vacante', 'discapacidades', 'certificaciones'));
    }

    if ($metodo === 'POST' && $accion === 'actualizar_estado') {
        $id = (int)($_GET['id'] ?? 0);
        $body = admin_json_body();
        $estado = trim((string)($body['estado'] ?? ''));
        if (!$id) admin_responder(false, 'ID requerido.', null, 400);
        if (!in_array($estado, ['pendiente', 'entrevista', 'aceptado', 'rechazado'], true)) {
            admin_responder(false, 'Estado inválido.', null, 400);
        }
        $stmt = admin_stmt($con, 'UPDATE postulaciones SET estado = ? WHERE id_postulacion = ?', 'si', $estado, $id);
        if (!$stmt) admin_responder(false, 'No se pudo actualizar la postulación. Intenta de nuevo.', null, 500);
        $changed = mysqli_stmt_affected_rows($stmt);
        mysqli_stmt_close($stmt);
        if ($changed < 1) {
            if (!admin_one($con, 'SELECT id_postulacion FROM postulaciones WHERE id_postulacion = ? LIMIT 1', 'i', $id)) {
                admin_responder(false, 'Postulación no encontrada.', null, 404);
            }
            admin_responder(true, 'La postulación ya tenía ese estado.');
        }
        admin_responder(true, 'Postulación actualizada.');
    }

    admin_responder(false, 'Acción no reconocida.', null, 400);
} catch (Throwable $e) {
    error_log('postulaciones.php: ' . $e->getMessage());
    admin_responder(false, 'No se pudo procesar la solicitud. Intenta de nuevo.', null, 500);
}
