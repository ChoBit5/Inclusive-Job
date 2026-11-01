<?php

require_once __DIR__ . '/../../config/auth.php';
require_once __DIR__ . '/../../config/vacantes.php';

inclusijob_cors_headers('GET, POST, DELETE, OPTIONS', 'Content-Type');
$sessionUser = requerirRol(['postulante']);
$method = strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? ''));

if (!in_array($method, ['GET', 'POST', 'DELETE'], true)) {
    http_response_code(405);
    echo json_encode([
        'ok' => false,
        'msg' => 'Método no permitido.',
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

require_once __DIR__ . '/../../Conexion.php';

function postulaciones_bind(mysqli_stmt $stmt, string $types, array &$params): void
{
    if ($types === '') {
        return;
    }

    $bind = [$types];
    foreach ($params as &$value) {
        $bind[] = &$value;
    }
    unset($value);

    if (!call_user_func_array([$stmt, 'bind_param'], $bind)) {
        throw new RuntimeException('No se pudieron enlazar los parámetros de postulaciones.');
    }
}

function postulaciones_rows(mysqli $con, string $sql, string $types = '', array $params = []): array
{
    $stmt = mysqli_prepare($con, $sql);
    if ($stmt === false) {
        throw new RuntimeException('No se pudo preparar una consulta de postulaciones: ' . mysqli_error($con));
    }

    postulaciones_bind($stmt, $types, $params);
    if (!mysqli_stmt_execute($stmt)) {
        $error = mysqli_stmt_error($stmt);
        mysqli_stmt_close($stmt);
        throw new RuntimeException('No se pudo ejecutar una consulta de postulaciones: ' . $error);
    }

    $result = mysqli_stmt_get_result($stmt);
    if ($result === false) {
        $error = mysqli_stmt_error($stmt);
        mysqli_stmt_close($stmt);
        throw new RuntimeException('No se pudo leer una consulta de postulaciones: ' . $error);
    }

    $rows = [];
    while ($row = mysqli_fetch_assoc($result)) {
        $rows[] = $row;
    }
    mysqli_free_result($result);
    mysqli_stmt_close($stmt);
    return $rows;
}

function postulaciones_execute(mysqli $con, string $sql, string $types, array $params): int
{
    $stmt = mysqli_prepare($con, $sql);
    if ($stmt === false) {
        throw new RuntimeException('No se pudo preparar una acción de postulaciones: ' . mysqli_error($con));
    }

    postulaciones_bind($stmt, $types, $params);
    if (!mysqli_stmt_execute($stmt)) {
        $error = mysqli_stmt_error($stmt);
        mysqli_stmt_close($stmt);
        throw new RuntimeException('No se pudo ejecutar una acción de postulaciones: ' . $error);
    }

    $affectedRows = mysqli_stmt_affected_rows($stmt);
    mysqli_stmt_close($stmt);
    return $affectedRows;
}

function postulaciones_responder(int $status, string $message): never
{
    http_response_code($status);
    echo json_encode([
        'ok' => false,
        'msg' => $message,
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

function postulaciones_id_desde_sesion(mysqli $con, array $sessionUser): int
{
    $rows = postulaciones_rows(
        $con,
        'SELECT id_postulante FROM postulantes WHERE id_usuario = ? LIMIT 1',
        'i',
        [(int)($sessionUser['id'] ?? 0)]
    );
    if (!$rows) {
        postulaciones_responder(404, 'No se encontró un perfil de postulante.');
    }

    return (int)$rows[0]['id_postulante'];
}

function postulaciones_estado_aceptado(string $estado): bool
{
    return in_array(strtolower(trim($estado)), ['aceptado', 'aceptada', 'contratado', 'contratada'], true);
}

$con = null;

try {
    $con = conectarbd();
    if (!mysqli_set_charset($con, 'utf8mb4')) {
        throw new RuntimeException('No se pudo configurar la codificación de postulaciones.');
    }

    $idPostulante = postulaciones_id_desde_sesion($con, $sessionUser);

    if ($method === 'GET') {
        $visibleSql = inclusijob_postulacion_visible_sql('e');
        $rows = postulaciones_rows(
            $con,
            "SELECT
                p.id_postulacion,
                p.estado,
                p.fecha_postulacion,
                v.id_vacante,
                v.titulo_puesto,
                v.descripcion_puesto,
                v.requisitos,
                v.modalidad,
                v.salario_min,
                v.salario_max,
                v.fecha_publicacion,
                v.fecha_cierre,
                e.nombre_empresas
             FROM postulaciones p
             INNER JOIN vacantes v ON v.id_vacante = p.id_vacante
             INNER JOIN reclutadores r ON r.id_reclutador = v.id_reclutador
             INNER JOIN empresas e ON e.id_empresas = r.id_empresas
             WHERE p.id_postulante = ?
               AND {$visibleSql}
             ORDER BY p.fecha_postulacion DESC",
            'i',
            [$idPostulante]
        );

        $postulaciones = [];
        $vacanteIds = [];
        foreach ($rows as $row) {
            $idVacante = (int)$row['id_vacante'];
            $vacanteIds[$idVacante] = true;
            $postulaciones[] = [
                'id' => (int)$row['id_postulacion'],
                'vacante_id' => $idVacante,
                'vacante' => $row['titulo_puesto'],
                'empresa' => $row['nombre_empresas'],
                'descripcion_puesto' => $row['descripcion_puesto'],
                'requisitos' => $row['requisitos'],
                'modalidad' => $row['modalidad'],
                'salario_min' => $row['salario_min'],
                'salario_max' => $row['salario_max'],
                'estado' => strtolower((string)$row['estado']),
                'fecha_publicacion' => $row['fecha_publicacion'],
                'fecha_cierre' => $row['fecha_cierre'],
                'fecha' => $row['fecha_postulacion'],
                'discapacidades' => [],
            ];
        }

        if ($vacanteIds) {
            $ids = array_keys($vacanteIds);
            $placeholders = implode(',', array_fill(0, count($ids), '?'));
            $discapacidadRows = postulaciones_rows(
                $con,
                "SELECT vd.id_vacante, td.nombre_discapacidad
                 FROM vacante_discapacidad vd
                 INNER JOIN tipo_discapacidad td ON td.id_tipo_discapacidad = vd.id_tipo_discapacidad
                 WHERE vd.id_vacante IN ({$placeholders})
                 ORDER BY vd.id_vacante, td.nombre_discapacidad",
                str_repeat('i', count($ids)),
                $ids
            );
            $discapacidadesPorVacante = [];
            foreach ($discapacidadRows as $row) {
                $discapacidadesPorVacante[(int)$row['id_vacante']][] = $row['nombre_discapacidad'];
            }
            foreach ($postulaciones as &$postulacion) {
                $postulacion['discapacidades'] = $discapacidadesPorVacante[$postulacion['vacante_id']] ?? [];
            }
            unset($postulacion);
        }

        mysqli_close($con);
        echo json_encode([
            'ok' => true,
            'data' => $postulaciones,
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    if ($method === 'DELETE') {
        $body = json_decode(file_get_contents('php://input'), true);
        $rawId = is_array($body) ? ($body['id_postulacion'] ?? null) : null;
        $idPostulacion = filter_var($rawId, FILTER_VALIDATE_INT, [
            'options' => ['min_range' => 1],
        ]);
        if ($idPostulacion === false) {
            postulaciones_responder(400, 'ID inválido');
        }

        $ownRows = postulaciones_rows(
            $con,
            'SELECT estado FROM postulaciones WHERE id_postulacion = ? AND id_postulante = ? LIMIT 1',
            'ii',
            [$idPostulacion, $idPostulante]
        );
        if (!$ownRows) {
            postulaciones_responder(404, 'No encontrada');
        }
        if (postulaciones_estado_aceptado((string)$ownRows[0]['estado'])) {
            postulaciones_responder(409, 'Esta postulación ya fue aceptada y no se puede retirar. Contacta al reclutador.');
        }

        $affectedRows = postulaciones_execute(
            $con,
            "DELETE FROM postulaciones
             WHERE id_postulacion = ?
               AND id_postulante = ?
               AND LOWER(estado) NOT IN ('aceptado', 'aceptada', 'contratado', 'contratada')
             LIMIT 1",
            'ii',
            [$idPostulacion, $idPostulante]
        );
        if ($affectedRows !== 1) {
            $currentRows = postulaciones_rows(
                $con,
                'SELECT estado FROM postulaciones WHERE id_postulacion = ? AND id_postulante = ? LIMIT 1',
                'ii',
                [$idPostulacion, $idPostulante]
            );
            if ($currentRows && postulaciones_estado_aceptado((string)$currentRows[0]['estado'])) {
                postulaciones_responder(409, 'Esta postulación ya fue aceptada y no se puede retirar. Contacta al reclutador.');
            }
            postulaciones_responder(404, 'No encontrada');
        }

        mysqli_close($con);
        echo json_encode([
            'ok' => true,
            'msg' => 'Postulación eliminada',
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $body = json_decode(file_get_contents('php://input'), true);
    $rawIdVacante = is_array($body) ? ($body['id_vacante'] ?? null) : null;
    $idVacante = filter_var($rawIdVacante, FILTER_VALIDATE_INT, [
        'options' => ['min_range' => 1],
    ]);
    if ($idVacante === false) {
        postulaciones_responder(400, 'ID de vacante requerido.');
    }

    $visibleSql = inclusijob_vacante_visible_sql('v', 'e');
    $visibleRows = postulaciones_rows(
        $con,
        "SELECT v.id_vacante
         FROM vacantes v
         INNER JOIN reclutadores r ON r.id_reclutador = v.id_reclutador
         INNER JOIN empresas e ON e.id_empresas = r.id_empresas
         WHERE v.id_vacante = ?
           AND {$visibleSql}
         LIMIT 1",
        'i',
        [$idVacante]
    );
    if (!$visibleRows) {
        postulaciones_responder(404, 'La vacante no esta disponible para postulaciones.');
    }

    $discapacidadRows = postulaciones_rows(
        $con,
        'SELECT id_tipo_discapacidad FROM postulante_discapacidad WHERE id_postulante = ? LIMIT 1',
        'i',
        [$idPostulante]
    );
    if (!$discapacidadRows) {
        postulaciones_responder(403, 'Registra tus discapacidades en tu perfil para postularte.');
    }

    $duplicateRows = postulaciones_rows(
        $con,
        'SELECT id_postulacion FROM postulaciones WHERE id_postulante = ? AND id_vacante = ? LIMIT 1',
        'ii',
        [$idPostulante, $idVacante]
    );
    if ($duplicateRows) {
        postulaciones_responder(409, 'Ya te postulaste a esta vacante.');
    }

    $compatibilityRows = postulaciones_rows(
        $con,
        "SELECT v.id_vacante
         FROM vacantes v
         INNER JOIN reclutadores r ON r.id_reclutador = v.id_reclutador
         INNER JOIN empresas e ON e.id_empresas = r.id_empresas
         WHERE v.id_vacante = ?
           AND {$visibleSql}
           AND " . inclusijob_vacante_compatible_sql('v', 'pd_compat') . "
         LIMIT 1",
        'ii',
        [$idVacante, $idPostulante]
    );
    if (!$compatibilityRows) {
        postulaciones_responder(403, 'Esta vacante no es compatible con tu perfil.');
    }

    $insertSql = "INSERT INTO postulaciones (id_postulante, id_vacante, estado)
        SELECT ?, v.id_vacante, 'pendiente'
        FROM vacantes v
        INNER JOIN reclutadores r ON r.id_reclutador = v.id_reclutador
        INNER JOIN empresas e ON e.id_empresas = r.id_empresas
        WHERE v.id_vacante = ?
          AND {$visibleSql}
          AND " . inclusijob_vacante_compatible_sql('v', 'pd_atomic') . "
          AND NOT EXISTS (
              SELECT 1
              FROM postulaciones p_existing
              WHERE p_existing.id_postulante = ?
                AND p_existing.id_vacante = v.id_vacante
          )";
    $insertParams = [$idPostulante, $idVacante, $idPostulante, $idPostulante];
    $stmtInsert = mysqli_prepare($con, $insertSql);
    if ($stmtInsert === false) {
        throw new RuntimeException('No se pudo preparar la creación de la postulación: ' . mysqli_error($con));
    }
    postulaciones_bind($stmtInsert, 'iiii', $insertParams);
    if (!mysqli_stmt_execute($stmtInsert)) {
        $errno = mysqli_stmt_errno($stmtInsert);
        $error = mysqli_stmt_error($stmtInsert);
        mysqli_stmt_close($stmtInsert);
        if ($errno === 1062) {
            postulaciones_responder(409, 'Ya te postulaste a esta vacante.');
        }
        throw new RuntimeException('No se pudo insertar la postulación: ' . $error);
    }
    $affectedRows = mysqli_stmt_affected_rows($stmtInsert);
    mysqli_stmt_close($stmtInsert);

    if ($affectedRows !== 1) {
        $duplicateRows = postulaciones_rows(
            $con,
            'SELECT id_postulacion FROM postulaciones WHERE id_postulante = ? AND id_vacante = ? LIMIT 1',
            'ii',
            [$idPostulante, $idVacante]
        );
        if ($duplicateRows) {
            postulaciones_responder(409, 'Ya te postulaste a esta vacante.');
        }

        $visibleRows = postulaciones_rows(
            $con,
            "SELECT v.id_vacante
             FROM vacantes v
             INNER JOIN reclutadores r ON r.id_reclutador = v.id_reclutador
             INNER JOIN empresas e ON e.id_empresas = r.id_empresas
             WHERE v.id_vacante = ?
               AND {$visibleSql}
             LIMIT 1",
            'i',
            [$idVacante]
        );
        if (!$visibleRows) {
            postulaciones_responder(404, 'La vacante no esta disponible para postulaciones.');
        }
        postulaciones_responder(403, 'Esta vacante no es compatible con tu perfil.');
    }

    mysqli_close($con);
    http_response_code(201);
    echo json_encode([
        'ok' => true,
        'msg' => 'Postulación enviada.',
    ], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    error_log('[POSTULANTE_POSTULACIONES] ' . $e->getMessage());
    if ($con instanceof mysqli) {
        mysqli_close($con);
    }
    $message = $method === 'GET'
        ? 'No se pudieron obtener tus postulaciones.'
        : ($method === 'DELETE' ? 'No se pudo retirar la postulación.' : 'No se pudo enviar la postulación.');
    postulaciones_responder(500, $message);
}
