<?php

require_once __DIR__ . '/../../config/auth.php';
require_once __DIR__ . '/../../config/vacantes.php';

inclusijob_cors_headers('GET, OPTIONS', 'Content-Type');
$sessionUser = requerirRol(['postulante']);

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    http_response_code(405);
    echo json_encode(['auth' => false, 'message' => 'Metodo no permitido']);
    exit;
}

require_once __DIR__ . '/../../Conexion.php';

function postulante_dashboard_rows(mysqli $con, string $sql, string $types = '', array $params = []): array
{
    $stmt = mysqli_prepare($con, $sql);
    if (!$stmt) {
        throw new RuntimeException('No se pudo preparar la consulta del dashboard: ' . mysqli_error($con));
    }

    if ($types !== '') {
        mysqli_stmt_bind_param($stmt, $types, ...$params);
    }

    if (!mysqli_stmt_execute($stmt)) {
        $error = mysqli_stmt_error($stmt);
        mysqli_stmt_close($stmt);
        throw new RuntimeException('No se pudo ejecutar la consulta del dashboard: ' . $error);
    }

    $result = mysqli_stmt_get_result($stmt);
    if ($result === false) {
        $error = mysqli_stmt_error($stmt);
        mysqli_stmt_close($stmt);
        throw new RuntimeException('No se pudo leer la consulta del dashboard: ' . $error);
    }

    $rows = [];
    while ($row = mysqli_fetch_assoc($result)) {
        $rows[] = $row;
    }
    mysqli_stmt_close($stmt);
    return $rows;
}

function postulante_dashboard_scalar(mysqli $con, string $sql, string $types = '', array $params = []): int
{
    $rows = postulante_dashboard_rows($con, $sql, $types, $params);
    return (int)($rows[0]['total'] ?? 0);
}

function postulante_dashboard_placeholders(array $values): string
{
    return implode(',', array_fill(0, count($values), '?'));
}

$con = null;

try {
    $con = conectarbd();
    if (!mysqli_set_charset($con, 'utf8mb4')) {
        throw new RuntimeException('No se pudo configurar la codificacion del dashboard.');
    }
    $idUsuario = (int)($sessionUser['id'] ?? 0);

    $usuarioRows = postulante_dashboard_rows(
        $con,
        'SELECT id_usuario, nombres, apellidos, correo, telefono, foto_perfil, id_rol
         FROM usuarios
         WHERE id_usuario = ? AND estado = 1 AND id_rol = 2
         LIMIT 1',
        'i',
        [$idUsuario]
    );

    if (!$usuarioRows) {
        mysqli_close($con);
        http_response_code(403);
        echo json_encode(['auth' => false, 'message' => 'Solo postulantes pueden consultar este dashboard']);
        exit;
    }

    $usuario = $usuarioRows[0];
    $postulanteRows = postulante_dashboard_rows(
        $con,
        'SELECT id_postulante, descripcion_discapacidad, esfuerzo_fisico_posible,
                experiencia, habilidades, (cv IS NOT NULL) AS tiene_cv, portafolio_url
         FROM postulantes
         WHERE id_usuario = ?
         LIMIT 1',
        'i',
        [$idUsuario]
    );
    $postulante = $postulanteRows[0] ?? null;
    $idPostulante = $postulante ? (int)$postulante['id_postulante'] : 0;

    $discapacidades = [];
    $tipos = [];
    if ($idPostulante > 0) {
        $discRows = postulante_dashboard_rows(
            $con,
            'SELECT td.id_tipo_discapacidad, td.nombre_discapacidad
             FROM postulante_discapacidad pd
             INNER JOIN tipo_discapacidad td ON td.id_tipo_discapacidad = pd.id_tipo_discapacidad
             WHERE pd.id_postulante = ?
             ORDER BY td.nombre_discapacidad',
            'i',
            [$idPostulante]
        );
        foreach ($discRows as $row) {
            $tipos[] = (int)$row['id_tipo_discapacidad'];
            $discapacidades[] = $row['nombre_discapacidad'];
        }
    }

    $totalPostulaciones = $idPostulante > 0
        ? postulante_dashboard_scalar($con, 'SELECT COUNT(*) AS total FROM postulaciones WHERE id_postulante = ?', 'i', [$idPostulante])
        : 0;
    $enProceso = $idPostulante > 0
        ? postulante_dashboard_scalar($con, "SELECT COUNT(*) AS total FROM postulaciones WHERE id_postulante = ? AND LOWER(estado) IN ('pendiente', 'en proceso', 'entrevista')", 'i', [$idPostulante])
        : 0;
    $aceptadas = $idPostulante > 0
        ? postulante_dashboard_scalar($con, "SELECT COUNT(*) AS total FROM postulaciones WHERE id_postulante = ? AND LOWER(estado) IN ('aceptado', 'aceptada', 'contratado', 'contratada')", 'i', [$idPostulante])
        : 0;

    $vacantesCompatibles = [];
    $discapacidadesPorVacante = [];
    if ($tipos) {
        $vacantesCompatibles = postulante_dashboard_rows(
            $con,
            "SELECT DISTINCT
                v.id_vacante,
                v.titulo_puesto,
                v.modalidad,
                v.salario_min,
                v.salario_max,
                v.estado,
                v.fecha_publicacion,
                COALESCE(e.nombre_empresas, 'Empresa') AS empresa
             FROM vacantes v
             INNER JOIN reclutadores r ON r.id_reclutador = v.id_reclutador
             INNER JOIN empresas e ON e.id_empresas = r.id_empresas
             WHERE " . inclusijob_vacante_visible_sql('v', 'e') . "
               AND " . inclusijob_vacante_compatible_sql('v', 'pd_compat') . "
               AND NOT EXISTS (
                    SELECT 1
                    FROM postulaciones p
                    WHERE p.id_vacante = v.id_vacante
                      AND p.id_postulante = ?
               )
             ORDER BY v.fecha_publicacion DESC
             LIMIT 3",
            'ii',
            [$idPostulante, $idPostulante]
        );

        if ($vacantesCompatibles) {
            $vacanteIds = array_map(static fn(array $row): int => (int)$row['id_vacante'], $vacantesCompatibles);
            $placeholdersVacantes = postulante_dashboard_placeholders($vacanteIds);
            $discapacidadRows = postulante_dashboard_rows(
                $con,
                "SELECT vd.id_vacante, td.nombre_discapacidad
                 FROM vacante_discapacidad vd
                 INNER JOIN tipo_discapacidad td ON td.id_tipo_discapacidad = vd.id_tipo_discapacidad
                 WHERE vd.id_vacante IN ($placeholdersVacantes)
                 ORDER BY vd.id_vacante, td.nombre_discapacidad",
                str_repeat('i', count($vacanteIds)),
                $vacanteIds
            );
            foreach ($discapacidadRows as $row) {
                $discapacidadesPorVacante[(int)$row['id_vacante']][] = $row['nombre_discapacidad'];
            }
        }
    }

    $vacantesNuevas = 0;
    if ($tipos) {
        $vacantesNuevas = postulante_dashboard_scalar(
            $con,
            "SELECT COUNT(DISTINCT v.id_vacante) AS total
             FROM vacantes v
             INNER JOIN reclutadores r ON r.id_reclutador = v.id_reclutador
             INNER JOIN empresas e ON e.id_empresas = r.id_empresas
             WHERE " . inclusijob_vacante_visible_sql('v', 'e') . "
               AND " . inclusijob_vacante_compatible_sql('v', 'pd_compat') . "
               AND v.fecha_publicacion >= DATE_SUB(NOW(), INTERVAL 30 DAY)",
            'i',
            [$idPostulante]
        );
    }

    $postulacionesRecientes = $idPostulante > 0
        ? postulante_dashboard_rows(
            $con,
            "SELECT
                p.id_postulacion AS id,
                LOWER(p.estado) AS estado,
                p.fecha_postulacion AS fecha,
                v.id_vacante,
                v.titulo_puesto AS vacante,
                v.modalidad,
                COALESCE(e.nombre_empresas, 'Empresa') AS empresa
             FROM postulaciones p
             INNER JOIN vacantes v ON v.id_vacante = p.id_vacante
             INNER JOIN reclutadores r ON r.id_reclutador = v.id_reclutador
             INNER JOIN empresas e ON e.id_empresas = r.id_empresas
             WHERE p.id_postulante = ?
               AND COALESCE(e.estado_validacion, 0) = 1
             ORDER BY p.fecha_postulacion DESC
             LIMIT 3",
            'i',
            [$idPostulante]
        )
        : [];

    $certificaciones = $idPostulante > 0
        ? postulante_dashboard_scalar($con, 'SELECT COUNT(*) AS total FROM certificaciones WHERE id_postulante = ?', 'i', [$idPostulante])
        : 0;
    $hasInicial = $postulante
        && trim((string)($postulante['descripcion_discapacidad'] ?? '')) !== ''
        && trim((string)($postulante['experiencia'] ?? '')) !== ''
        && trim((string)($postulante['habilidades'] ?? '')) !== ''
        && $postulante['esfuerzo_fisico_posible'] !== null;

    $checklist = [
        ['id' => 1, 'label' => 'Datos de cuenta', 'done' => trim((string)$usuario['nombres']) !== '' && trim((string)$usuario['correo']) !== '', 'path' => '/formulario', 'peso' => 15],
        ['id' => 2, 'label' => 'Evaluacion inicial', 'done' => (bool)$hasInicial, 'path' => '/formulario', 'peso' => 15],
        ['id' => 3, 'label' => 'Foto de perfil', 'done' => !empty($usuario['foto_perfil']), 'path' => '/formulario', 'peso' => 10],
        ['id' => 4, 'label' => 'Discapacidad registrada', 'done' => count($discapacidades) > 0, 'path' => '/formulario', 'peso' => 15],
        ['id' => 5, 'label' => 'Registro de habilidades', 'done' => $postulante && trim((string)($postulante['habilidades'] ?? '')) !== '', 'path' => '/postulante/perfil', 'peso' => 10],
        ['id' => 6, 'label' => 'Portafolio electronico', 'done' => $postulante && !empty($postulante['portafolio_url']), 'path' => '/postulante/perfil', 'peso' => 10],
        ['id' => 7, 'label' => 'Al menos 1 certificacion', 'done' => $certificaciones > 0, 'path' => '/postulante/certificaciones', 'peso' => 20],
        ['id' => 8, 'label' => 'CV registrado', 'done' => $postulante && !empty($postulante['tiene_cv']), 'path' => '/postulante/certificaciones', 'peso' => 5],
    ];

    $completado = 0;
    foreach ($checklist as $item) {
        if ($item['done']) {
            $completado += (int)$item['peso'];
        }
    }

    $vacantesFormateadas = [];
    foreach ($vacantesCompatibles as $vacante) {
        $idVacante = (int)$vacante['id_vacante'];
        $vacantesFormateadas[] = [
            'id' => $idVacante,
            'id_vacante' => $idVacante,
            'titulo' => $vacante['titulo_puesto'],
            'titulo_puesto' => $vacante['titulo_puesto'],
            'empresa' => $vacante['empresa'],
            'salario_min' => $vacante['salario_min'] !== null ? (float)$vacante['salario_min'] : null,
            'salario_max' => $vacante['salario_max'] !== null ? (float)$vacante['salario_max'] : null,
            'modalidad' => $vacante['modalidad'],
            'estado' => $vacante['estado'],
            'fecha_publicacion' => $vacante['fecha_publicacion'],
            'discapacidades' => $discapacidadesPorVacante[$idVacante] ?? [],
        ];
    }

    mysqli_close($con);
    echo json_encode([
        'auth' => true,
        'user' => [
            'id' => (int)$usuario['id_usuario'],
            'nombre' => trim($usuario['nombres'] . ' ' . $usuario['apellidos']),
            'rol' => 'Postulante',
            'avatar' => $usuario['foto_perfil'],
            'discapacidades' => $discapacidades,
        ],
        'perfil' => [
            'completado' => $completado,
            'checklist' => $checklist,
            'certificaciones' => $certificaciones,
            'id_postulante' => $idPostulante ?: null,
        ],
        'stats' => [
            'postulaciones' => $totalPostulaciones,
            'en_proceso' => $enProceso,
            'aceptadas' => $aceptadas,
            'vacantes_nuevas' => $vacantesNuevas,
        ],
        'postulaciones_recientes' => $postulacionesRecientes,
        'vacantes_recomendadas' => $vacantesFormateadas,
    ], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    error_log('[POSTULANTE_DASHBOARD] ' . $e->getMessage());
    if ($con instanceof mysqli) {
        mysqli_close($con);
    }
    http_response_code(500);
    echo json_encode(['auth' => true, 'message' => 'Error al cargar dashboard'], JSON_UNESCAPED_UNICODE);
}
