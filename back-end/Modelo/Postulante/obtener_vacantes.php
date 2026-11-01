<?php

require_once __DIR__ . '/../../config/auth.php';
require_once __DIR__ . '/../../config/vacantes.php';

inclusijob_cors_headers('GET, OPTIONS', 'Content-Type');
$sessionUser = requerirRol(['postulante'], ['include_auth' => true]);

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    http_response_code(405);
    echo json_encode([
        'auth' => true,
        'message' => 'Metodo no permitido.',
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

require_once __DIR__ . '/../../Conexion.php';

function postulante_vacantes_bind(mysqli_stmt $stmt, string $types, array &$params): void
{
    if ($types === '') {
        return;
    }

    $bind = [$types];
    foreach ($params as $key => &$value) {
        $bind[] = &$value;
    }
    unset($value);

    if (!call_user_func_array([$stmt, 'bind_param'], $bind)) {
        throw new RuntimeException('No se pudieron enlazar los parametros de vacantes.');
    }
}

function postulante_vacantes_rows(mysqli $con, string $sql, string $types = '', array $params = []): array
{
    $stmt = mysqli_prepare($con, $sql);
    if ($stmt === false) {
        throw new RuntimeException('No se pudo preparar una consulta de vacantes: ' . mysqli_error($con));
    }

    postulante_vacantes_bind($stmt, $types, $params);
    if (!mysqli_stmt_execute($stmt)) {
        $error = mysqli_stmt_error($stmt);
        mysqli_stmt_close($stmt);
        throw new RuntimeException('No se pudo ejecutar una consulta de vacantes: ' . $error);
    }

    $result = mysqli_stmt_get_result($stmt);
    if ($result === false) {
        $error = mysqli_stmt_error($stmt);
        mysqli_stmt_close($stmt);
        throw new RuntimeException('No se pudo leer una consulta de vacantes: ' . $error);
    }

    $rows = [];
    while ($row = mysqli_fetch_assoc($result)) {
        $rows[] = $row;
    }
    mysqli_stmt_close($stmt);
    return $rows;
}

function postulante_vacantes_responder_error(int $status, string $message, bool $auth = true, bool $sinDiscapacidades = false): never
{
    http_response_code($status);
    echo json_encode([
        'auth' => $auth,
        'message' => $message,
        'vacantes' => [],
        'sin_discapacidades' => $sinDiscapacidades,
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$con = null;

try {
    $con = conectarbd();
    if (!mysqli_set_charset($con, 'utf8mb4')) {
        throw new RuntimeException('No se pudo configurar la codificacion de vacantes.');
    }

    $idUsuario = (int)($sessionUser['id'] ?? 0);
    $postulanteRows = postulante_vacantes_rows(
        $con,
        'SELECT id_postulante FROM postulantes WHERE id_usuario = ? LIMIT 1',
        'i',
        [$idUsuario]
    );

    if (!$postulanteRows) {
        mysqli_close($con);
        echo json_encode([
            'auth' => true,
            'vacantes' => [],
            'sin_discapacidades' => true,
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $idPostulante = (int)$postulanteRows[0]['id_postulante'];
    $postuladasRows = postulante_vacantes_rows(
        $con,
        'SELECT id_vacante FROM postulaciones WHERE id_postulante = ?',
        'i',
        [$idPostulante]
    );
    $postuladas = [];
    foreach ($postuladasRows as $row) {
        $postuladas[(int)$row['id_vacante']] = true;
    }

    $reportadasRows = postulante_vacantes_rows(
        $con,
        'SELECT id_vacante FROM reporte_vacante WHERE id_usuario = ?',
        'i',
        [$idUsuario]
    );
    $reportadas = [];
    foreach ($reportadasRows as $row) {
        $reportadas[(int)$row['id_vacante']] = true;
    }

    $tiposRows = postulante_vacantes_rows(
        $con,
        'SELECT id_tipo_discapacidad FROM postulante_discapacidad WHERE id_postulante = ?',
        'i',
        [$idPostulante]
    );
    if (!$tiposRows) {
        mysqli_close($con);
        echo json_encode([
            'auth' => true,
            'vacantes' => [],
            'sin_discapacidades' => true,
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $sqlVacantes = "
        SELECT DISTINCT
            v.id_vacante,
            v.titulo_puesto,
            v.descripcion_puesto,
            v.requisitos,
            v.modalidad,
            v.salario_min,
            v.salario_max,
            v.estado,
            v.fecha_publicacion,
            v.fecha_cierre,
            v.id_reclutador,
            CONCAT(COALESCE(u.nombres, ''), ' ', COALESCE(u.apellidos, '')) AS reclutador_nombre,
            u.correo AS reclutador_correo,
            u.telefono AS reclutador_telefono,
            u.foto_perfil AS reclutador_foto,
            COALESCE(r.puesto, 'Reclutador') AS reclutador_puesto,
            e.id_empresas,
            e.nombre_empresas AS empresa,
            e.descripcion AS empresa_descripcion,
            e.direccion AS empresa_direccion,
            e.telefono_empresa,
            e.correo_empresa,
            e.sitio_web AS empresa_sitio_web,
            e.estado_validacion AS empresa_estado_validacion
        FROM vacantes v
        INNER JOIN reclutadores r ON r.id_reclutador = v.id_reclutador
        INNER JOIN empresas e ON e.id_empresas = r.id_empresas
        INNER JOIN usuarios u ON u.id_usuario = r.id_usuario
        WHERE " . inclusijob_vacante_visible_sql('v', 'e') . "
          AND " . inclusijob_vacante_compatible_sql('v', 'pd_compat') . "
        ORDER BY v.fecha_publicacion DESC
    ";
    $vacantes = postulante_vacantes_rows($con, $sqlVacantes, 'i', [$idPostulante]);

    if (!$vacantes) {
        mysqli_close($con);
        echo json_encode([
            'auth' => true,
            'vacantes' => [],
            'sin_discapacidades' => false,
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $idsVacantes = array_map(static fn(array $row): int => (int)$row['id_vacante'], $vacantes);
    $placeholders = implode(',', array_fill(0, count($idsVacantes), '?'));
    $discapacidadRows = postulante_vacantes_rows(
        $con,
        "SELECT vd.id_vacante, td.nombre_discapacidad
         FROM vacante_discapacidad vd
         INNER JOIN tipo_discapacidad td ON td.id_tipo_discapacidad = vd.id_tipo_discapacidad
         WHERE vd.id_vacante IN ({$placeholders})
         ORDER BY vd.id_vacante, td.nombre_discapacidad",
        str_repeat('i', count($idsVacantes)),
        $idsVacantes
    );
    $discapacidadesPorVacante = [];
    foreach ($discapacidadRows as $row) {
        $discapacidadesPorVacante[(int)$row['id_vacante']][] = $row['nombre_discapacidad'];
    }

    foreach ($vacantes as &$vacante) {
        $idVacante = (int)$vacante['id_vacante'];
        $lineas = array_filter(array_map('trim', explode("\n", (string)($vacante['requisitos'] ?? ''))));
        $vacante['requisitos'] = array_values($lineas);
        $vacante['id_vacante'] = $idVacante;
        $vacante['salario_min'] = (float)$vacante['salario_min'];
        $vacante['salario_max'] = (float)$vacante['salario_max'];
        $vacante['id_reclutador'] = (int)$vacante['id_reclutador'];
        $vacante['id_empresas'] = (int)$vacante['id_empresas'];
        $vacante['empresa_estado_validacion'] = (int)$vacante['empresa_estado_validacion'];
        $vacante['discapacidades'] = $discapacidadesPorVacante[$idVacante] ?? [];
        $vacante['postulada'] = isset($postuladas[$idVacante]);
        $vacante['reportada'] = isset($reportadas[$idVacante]);
        $vacante['reclutador'] = [
            'id_reclutador' => $vacante['id_reclutador'],
            'nombre' => trim($vacante['reclutador_nombre'] ?? '') ?: 'Reclutador',
            'correo' => $vacante['reclutador_correo'] ?? '',
            'telefono' => $vacante['reclutador_telefono'] ?? '',
            'foto_perfil' => $vacante['reclutador_foto'] ?? null,
            'puesto' => $vacante['reclutador_puesto'] ?? 'Reclutador',
        ];
        $vacante['empresa_info'] = [
            'id_empresas' => $vacante['id_empresas'],
            'nombre' => $vacante['empresa'] ?? 'Empresa',
            'descripcion' => $vacante['empresa_descripcion'] ?? '',
            'direccion' => $vacante['empresa_direccion'] ?? '',
            'telefono' => $vacante['telefono_empresa'] ?? '',
            'correo' => $vacante['correo_empresa'] ?? '',
            'sitio_web' => $vacante['empresa_sitio_web'] ?? '',
            'estado_validacion' => $vacante['empresa_estado_validacion'],
        ];
    }
    unset($vacante);
    mysqli_close($con);

    echo json_encode([
        'auth' => true,
        'vacantes' => $vacantes,
        'sin_discapacidades' => false,
    ], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    error_log('[POSTULANTE_VACANTES] ' . $e->getMessage());
    if ($con instanceof mysqli) {
        mysqli_close($con);
    }
    postulante_vacantes_responder_error(500, 'No se pudieron obtener las vacantes.');
}
