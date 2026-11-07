<?php

require_once __DIR__ . '/_auth.php';
require_once __DIR__ . '/../../config/pdf.php';
require_once __DIR__ . '/../../Conexion.php';

reclutador_headers('GET, POST, OPTIONS');
$sessionUser = requerirRol(['reclutador']);

function candidatos_fallo(string $contexto, string $detalle, string $mensaje = 'No se pudieron obtener los candidatos.', int $http = 500): void
{
    error_log('[candidatos.php] ' . $contexto . ': ' . $detalle);
    reclutador_responder(false, $mensaje, null, $http);
}

function candidatos_preparar(mysqli $con, string $sql, string $mensaje = 'No se pudieron obtener los candidatos.')
{
    $stmt = mysqli_prepare($con, $sql);
    if ($stmt === false) {
        candidatos_fallo('preparar consulta', mysqli_error($con), $mensaje);
    }
    return $stmt;
}

function candidatos_vincular($stmt, string $types, &...$values): void
{
    if (!mysqli_stmt_bind_param($stmt, $types, ...$values)) {
        candidatos_fallo('vincular parametros', mysqli_stmt_error($stmt));
    }
}

function candidatos_ejecutar($stmt): void
{
    if (!mysqli_stmt_execute($stmt)) {
        candidatos_fallo('ejecutar consulta', mysqli_stmt_error($stmt));
    }
}

function candidatos_resultado($stmt, string $mensaje = 'No se pudieron obtener los candidatos.')
{
    $resultado = mysqli_stmt_get_result($stmt);
    if ($resultado === false) {
        candidatos_fallo('leer resultado', mysqli_stmt_error($stmt), $mensaje);
    }
    return $resultado;
}

function candidatos_vincular_lista($stmt, array $ids): void
{
    $types = str_repeat('i', count($ids));
    $params = [&$types];
    foreach ($ids as $index => &$id) {
        $params[] = &$id;
    }
    unset($id);

    if (!call_user_func_array([$stmt, 'bind_param'], $params)) {
        candidatos_fallo('vincular lista de parametros', mysqli_stmt_error($stmt));
    }
}

function candidatos_id_reclutador(mysqli $con, int $idUsuario): int
{
    $stmt = candidatos_preparar(
        $con,
        'SELECT id_reclutador FROM reclutadores WHERE id_usuario = ? LIMIT 1',
        'No se pudo validar el perfil de reclutador.'
    );
    candidatos_vincular($stmt, 'i', $idUsuario);
    candidatos_ejecutar($stmt);
    $row = mysqli_fetch_assoc(candidatos_resultado($stmt, 'No se pudo validar el perfil de reclutador.'));
    mysqli_stmt_close($stmt);

    if (!$row) {
        reclutador_responder(false, 'No se encontro el perfil de reclutador.', null, 404);
    }

    return (int)$row['id_reclutador'];
}

function candidatos_verificar_vacante(mysqli $con, int $idVacante, int $idReclutador): void
{
    $stmt = candidatos_preparar(
        $con,
        'SELECT id_vacante FROM vacantes WHERE id_vacante = ? AND id_reclutador = ? LIMIT 1',
        'No se pudo validar la vacante.'
    );
    candidatos_vincular($stmt, 'ii', $idVacante, $idReclutador);
    candidatos_ejecutar($stmt);
    $row = mysqli_fetch_assoc(candidatos_resultado($stmt, 'No se pudo validar la vacante.'));
    mysqli_stmt_close($stmt);

    if (!$row) {
        reclutador_responder(false, 'No se encontro la vacante.', null, 404);
    }
}

function candidatos_consultar_certificaciones(mysqli $con, array $idsPostulante): array
{
    if ($idsPostulante === []) {
        return [];
    }

    $placeholders = implode(',', array_fill(0, count($idsPostulante), '?'));
    $sql = "SELECT
                id_postulante,
                id_certificaciones,
                nombre_certificacion,
                institucion_dada,
                fecha_emitido,
                CASE WHEN LEFT(pdf, 4) = '%PDF' THEN 1 ELSE 0 END AS tiene_pdf
            FROM certificaciones
            WHERE id_postulante IN ($placeholders)
            ORDER BY id_postulante ASC, fecha_emitido DESC, id_certificaciones DESC";
    $stmt = candidatos_preparar($con, $sql, 'No se pudieron obtener las certificaciones.');
    candidatos_vincular_lista($stmt, $idsPostulante);
    candidatos_ejecutar($stmt);
    $resultado = candidatos_resultado($stmt, 'No se pudieron obtener las certificaciones.');

    $porPostulante = [];
    while ($row = mysqli_fetch_assoc($resultado)) {
        $idPostulante = (int)$row['id_postulante'];
        if (count($porPostulante[$idPostulante] ?? []) >= 10) {
            continue;
        }
        $porPostulante[$idPostulante][] = [
            'id_certificaciones' => (int)$row['id_certificaciones'],
            'id_certificacion' => (int)$row['id_certificaciones'],
            'nombre_certificacion' => $row['nombre_certificacion'],
            'institucion_dada' => $row['institucion_dada'],
            'fecha_emitido' => $row['fecha_emitido'],
            'tiene_pdf' => (int)$row['tiene_pdf'],
        ];
    }
    mysqli_stmt_close($stmt);

    return $porPostulante;
}

function candidatos_consultar_discapacidades(mysqli $con, array $idsPostulante): array
{
    if ($idsPostulante === []) {
        return [];
    }

    $placeholders = implode(',', array_fill(0, count($idsPostulante), '?'));
    $sql = "SELECT
                pd.id_postulante,
                td.id_tipo_discapacidad AS id_discapacidad,
                td.nombre_discapacidad AS nombre,
                td.descripcion
            FROM postulante_discapacidad pd
            INNER JOIN tipo_discapacidad td ON td.id_tipo_discapacidad = pd.id_tipo_discapacidad
            WHERE pd.id_postulante IN ($placeholders)
            ORDER BY pd.id_postulante ASC, td.nombre_discapacidad ASC";
    $stmt = candidatos_preparar($con, $sql, 'No se pudieron obtener las discapacidades.');
    candidatos_vincular_lista($stmt, $idsPostulante);
    candidatos_ejecutar($stmt);
    $resultado = candidatos_resultado($stmt, 'No se pudieron obtener las discapacidades.');

    $porPostulante = [];
    while ($row = mysqli_fetch_assoc($resultado)) {
        $idPostulante = (int)$row['id_postulante'];
        $porPostulante[$idPostulante][] = [
            'id_discapacidad' => (int)$row['id_discapacidad'],
            'nombre' => $row['nombre'],
            'descripcion' => $row['descripcion'],
        ];
    }
    mysqli_stmt_close($stmt);

    return $porPostulante;
}

try {
    $con = conectarbd();
    if (!mysqli_set_charset($con, 'utf8mb4')) {
        candidatos_fallo('charset', mysqli_error($con), 'No se pudo preparar la conexion.');
    }

    $idUsuario = (int)($sessionUser['id'] ?? 0);
    $idReclutador = candidatos_id_reclutador($con, $idUsuario);
    $accion = (string)($_GET['accion'] ?? '');

    if ($accion === 'actualizar_estado_postulacion') {
        if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
            reclutador_responder(false, 'Metodo no permitido.', null, 405);
        }

        $data = reclutador_json_body();
        $idRaw = $data['id_postulacion'] ?? 0;
        $estadoRaw = $data['estado'] ?? '';
        $idPostulacion = is_scalar($idRaw) ? (int)$idRaw : 0;
        $estado = is_scalar($estadoRaw) ? strtolower(trim((string)$estadoRaw)) : '';
        $estadosValidos = ['pendiente', 'aceptado', 'rechazado'];

        if ($idPostulacion <= 0 || !in_array($estado, $estadosValidos, true)) {
            reclutador_responder(false, 'Datos invalidos para actualizar la postulacion.', null, 400);
        }

        $stmt = candidatos_preparar(
            $con,
            "UPDATE postulaciones p
                INNER JOIN vacantes v ON v.id_vacante = p.id_vacante
                INNER JOIN reclutadores r ON r.id_reclutador = v.id_reclutador
                INNER JOIN empresas e ON e.id_empresas = r.id_empresas
                SET p.estado = ?
                WHERE p.id_postulacion = ?
                  AND v.id_reclutador = ?
                  AND v.estado <> 'eliminada'
                  AND e.estado_validacion = 1",
            'No se pudo actualizar el estado de la postulacion.'
        );
        candidatos_vincular($stmt, 'sii', $estado, $idPostulacion, $idReclutador);
        candidatos_ejecutar($stmt);
        $filasAfectadas = mysqli_stmt_affected_rows($stmt);
        mysqli_stmt_close($stmt);

        if ($filasAfectadas > 0) {
            reclutador_responder(true, 'Estado de postulacion actualizado', [
                'id_postulacion' => $idPostulacion,
                'estado' => $estado,
            ]);
        }

        $stmt = candidatos_preparar(
            $con,
            'SELECT
                p.estado,
                v.estado AS estado_vacante,
                v.id_reclutador,
                e.estado_validacion
             FROM postulaciones p
             INNER JOIN vacantes v ON v.id_vacante = p.id_vacante
             INNER JOIN reclutadores r ON r.id_reclutador = v.id_reclutador
             LEFT JOIN empresas e ON e.id_empresas = r.id_empresas
             WHERE p.id_postulacion = ?
             LIMIT 1',
            'No se pudo verificar la postulacion.'
        );
        candidatos_vincular($stmt, 'i', $idPostulacion);
        candidatos_ejecutar($stmt);
        $fila = mysqli_fetch_assoc(candidatos_resultado($stmt, 'No se pudo verificar la postulacion.'));
        mysqli_stmt_close($stmt);

        if (!$fila || (int)$fila['id_reclutador'] !== $idReclutador) {
            reclutador_responder(false, 'No se encontro la postulacion para tus vacantes.', null, 404);
        }

        if ((string)$fila['estado_vacante'] === 'eliminada') {
            reclutador_responder(false, 'Esta vacante fue suspendida por el administrador y no puede gestionarse.', null, 403);
        }

        if ((int)($fila['estado_validacion'] ?? 0) !== 1) {
            reclutador_responder(false, 'Tu empresa no esta aprobada para gestionar candidatos.', null, 403);
        }

        if (strtolower(trim((string)($fila['estado'] ?? ''))) === $estado) {
            reclutador_responder(true, 'Estado de postulacion actualizado', [
                'id_postulacion' => $idPostulacion,
                'estado' => $estado,
            ]);
        }

        candidatos_fallo(
            'actualizar estado sin filas afectadas',
            'La postulacion cumplio las condiciones pero no cambio de estado.',
            'No se pudo actualizar el estado de la postulacion.'
        );
    }

    if ($accion === 'listar_por_vacante') {
        $sql = "SELECT
                    v.id_vacante,
                    v.titulo_puesto,
                    v.modalidad,
                    v.estado,
                    COUNT(p.id_postulacion) AS total_candidatos
                FROM vacantes v
                LEFT JOIN postulaciones p ON p.id_vacante = v.id_vacante
                WHERE v.id_reclutador = ? AND v.estado <> 'eliminada'
                GROUP BY v.id_vacante, v.titulo_puesto, v.modalidad, v.estado
                ORDER BY total_candidatos DESC, MAX(v.fecha_publicacion) DESC";
        $stmt = candidatos_preparar($con, $sql, 'No se pudieron obtener las vacantes.');
        candidatos_vincular($stmt, 'i', $idReclutador);
        candidatos_ejecutar($stmt);
        $resultado = candidatos_resultado($stmt, 'No se pudieron obtener las vacantes.');

        $vacantes = [];
        while ($row = mysqli_fetch_assoc($resultado)) {
            $vacantes[] = [
                'id_vacante' => (int)$row['id_vacante'],
                'titulo_puesto' => $row['titulo_puesto'],
                'modalidad' => $row['modalidad'],
                'estado' => $row['estado'],
                'total_candidatos' => (int)$row['total_candidatos'],
            ];
        }
        mysqli_stmt_close($stmt);

        reclutador_responder(true, 'Vacantes con candidatos obtenidas', $vacantes);
    }

    if ($accion === 'detalles_candidatos') {
        $idVacante = (int)($_GET['id_vacante'] ?? 0);
        if (!$idVacante) {
            reclutador_responder(false, 'ID de vacante requerido.', null, 400);
        }
        candidatos_verificar_vacante($con, $idVacante, $idReclutador);

        $sql = "SELECT
                    p.id_postulacion,
                    COALESCE(p.estado, 'pendiente') AS estado_postulacion,
                    p.fecha_postulacion,
                    u.id_usuario,
                    u.nombres,
                    u.apellidos,
                    CONCAT(COALESCE(u.nombres, ''), ' ', COALESCE(u.apellidos, '')) AS nombre_completo,
                    u.correo,
                    COALESCE(u.telefono, 'No especificado') AS telefono,
                    u.foto_perfil,
                    u.estado AS estado_usuario,
                    u.fecha_registro,
                    pos.id_postulante,
                    pos.descripcion_discapacidad,
                    pos.esfuerzo_fisico_posible,
                    pos.portafolio_url,
                    CASE WHEN LEFT(pos.cv, 4) = '%PDF' THEN 1 ELSE 0 END AS tiene_cv,
                    COALESCE(pos.descripcion_discapacidad, 'Sin resumen profesional registrado.') AS resumen_profesional,
                    COALESCE(pos.habilidades, 'No especificadas') AS habilidades,
                    COALESCE(pos.experiencia, 'Sin experiencia laboral registrada.') AS experiencia,
                    'No especificada' AS educacion,
                    (ce.id_usuario IS NOT NULL) AS entrevista_realizada,
                    ce.puntuacion_entrevista
                FROM postulaciones p
                INNER JOIN vacantes v ON p.id_vacante = v.id_vacante
                INNER JOIN postulantes pos ON p.id_postulante = pos.id_postulante
                INNER JOIN usuarios u ON pos.id_usuario = u.id_usuario
                LEFT JOIN (
                    SELECT
                        id_usuario,
                        id_vacante_ref,
                        MAX(CAST(NULLIF(puntuacion_entrevista, '') AS UNSIGNED)) AS puntuacion_entrevista
                    FROM (
                        SELECT
                            id_usuario,
                            JSON_UNQUOTE(JSON_EXTRACT(IF(JSON_VALID(respuesta_ia), respuesta_ia, '{}'), '$.vacante.id_vacante')) AS id_vacante_ref,
                            JSON_UNQUOTE(JSON_EXTRACT(IF(JSON_VALID(respuesta_ia), respuesta_ia, '{}'), '$.evaluacion.puntuacion')) AS puntuacion_entrevista
                        FROM chabots
                        WHERE resultado = 'entrevista_real_realizada'
                    ) entrevistas
                    WHERE id_vacante_ref IS NOT NULL
                    GROUP BY id_usuario, id_vacante_ref
                ) ce ON ce.id_usuario = u.id_usuario AND ce.id_vacante_ref = v.id_vacante
                WHERE p.id_vacante = ? AND v.id_reclutador = ?
                ORDER BY p.fecha_postulacion DESC, p.id_postulacion DESC";
        $stmt = candidatos_preparar($con, $sql);
        candidatos_vincular($stmt, 'ii', $idVacante, $idReclutador);
        candidatos_ejecutar($stmt);
        $resultado = candidatos_resultado($stmt);

        $candidatos = [];
        $idsPostulante = [];
        while ($row = mysqli_fetch_assoc($resultado)) {
            $idPostulante = (int)$row['id_postulante'];
            $idsPostulante[$idPostulante] = $idPostulante;
            $candidatos[] = [
                'id_postulacion' => (int)$row['id_postulacion'],
                'estado_postulacion' => $row['estado_postulacion'],
                'fecha_postulacion' => $row['fecha_postulacion'],
                'id_usuario' => (int)$row['id_usuario'],
                'nombres' => $row['nombres'],
                'apellidos' => $row['apellidos'],
                'nombre_completo' => $row['nombre_completo'],
                'correo' => $row['correo'],
                'telefono' => $row['telefono'],
                'foto_perfil' => $row['foto_perfil'],
                'estado_usuario' => $row['estado_usuario'],
                'fecha_registro' => $row['fecha_registro'],
                'id_postulante' => $idPostulante,
                'descripcion_discapacidad' => $row['descripcion_discapacidad'],
                'esfuerzo_fisico_posible' => (int)$row['esfuerzo_fisico_posible'],
                'portafolio_url' => $row['portafolio_url'],
                'resumen_profesional' => $row['resumen_profesional'],
                'habilidades' => $row['habilidades'],
                'experiencia' => $row['experiencia'],
                'educacion' => $row['educacion'],
                'tiene_cv' => (int)$row['tiene_cv'],
                'cv_url' => '',
                'certificaciones' => [],
                'discapacidades' => [],
                'entrevista_realizada' => (bool)(int)$row['entrevista_realizada'],
                'puntuacion_entrevista' => $row['puntuacion_entrevista'] !== null ? (int)$row['puntuacion_entrevista'] : null,
            ];
        }
        mysqli_stmt_close($stmt);

        $idsPostulante = array_values($idsPostulante);
        $certificaciones = candidatos_consultar_certificaciones($con, $idsPostulante);
        $discapacidades = candidatos_consultar_discapacidades($con, $idsPostulante);
        foreach ($candidatos as &$candidato) {
            $idPostulante = $candidato['id_postulante'];
            $candidato['certificaciones'] = $certificaciones[$idPostulante] ?? [];
            $candidato['discapacidades'] = $discapacidades[$idPostulante] ?? [];
        }
        unset($candidato);

        reclutador_responder(true, 'Candidatos obtenidos', $candidatos);
    }

    if ($accion === 'cv') {
        $idPostulacion = (int)($_GET['id_postulacion'] ?? 0);
        if (!$idPostulacion) {
            reclutador_responder(false, 'ID de postulacion requerido.', null, 400);
        }

        $stmt = candidatos_preparar($con, 'SELECT pos.cv
            FROM postulaciones p
            INNER JOIN vacantes v ON p.id_vacante = v.id_vacante
            INNER JOIN postulantes pos ON p.id_postulante = pos.id_postulante
            WHERE p.id_postulacion = ? AND v.id_reclutador = ?
            LIMIT 1', 'No se pudo obtener el CV.');
        candidatos_vincular($stmt, 'ii', $idPostulacion, $idReclutador);
        candidatos_ejecutar($stmt);
        $row = mysqli_fetch_assoc(candidatos_resultado($stmt, 'No se pudo obtener el CV.'));
        mysqli_stmt_close($stmt);

        $cv = $row['cv'] ?? null;
        if ($cv === null || $cv === '' || strncmp((string)$cv, '%PDF', 4) !== 0) {
            reclutador_responder(false, 'El CV no esta disponible como PDF.', null, 404);
        }
        inclusijob_enviar_pdf((string)$cv, 'cv_postulacion_' . $idPostulacion . '.pdf');
    }

    if ($accion === 'certificacion_pdf') {
        $idCertificacion = (int)($_GET['id_certificacion'] ?? $_GET['id'] ?? 0);
        if (!$idCertificacion) {
            reclutador_responder(false, 'ID de certificacion requerido.', null, 400);
        }

        $stmt = candidatos_preparar($con, 'SELECT c.pdf
            FROM certificaciones c
            INNER JOIN postulantes pos ON c.id_postulante = pos.id_postulante
            INNER JOIN postulaciones p ON p.id_postulante = pos.id_postulante
            INNER JOIN vacantes v ON p.id_vacante = v.id_vacante
            WHERE c.id_certificaciones = ? AND v.id_reclutador = ?
            LIMIT 1', 'No se pudo obtener el PDF.');
        candidatos_vincular($stmt, 'ii', $idCertificacion, $idReclutador);
        candidatos_ejecutar($stmt);
        $row = mysqli_fetch_assoc(candidatos_resultado($stmt, 'No se pudo obtener el PDF.'));
        mysqli_stmt_close($stmt);

        $pdf = $row['pdf'] ?? null;
        if ($pdf === null || $pdf === '' || strncmp((string)$pdf, '%PDF', 4) !== 0) {
            reclutador_responder(false, 'El PDF de la certificacion no esta disponible.', null, 404);
        }
        inclusijob_enviar_pdf((string)$pdf, 'certificacion_' . $idCertificacion . '.pdf');
    }

    reclutador_responder(false, 'Accion no valida en el modulo de candidatos.', null, 400);
} catch (Throwable $e) {
    error_log('[candidatos.php] error inesperado: ' . $e->getMessage());
    reclutador_responder(false, 'No se pudo procesar la solicitud de candidatos.', null, 500);
}
