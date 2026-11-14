<?php

declare(strict_types=1);

require_once __DIR__ . '/_auth.php';
require_once __DIR__ . '/../../Conexion.php';

reclutador_headers('GET, POST, OPTIONS');
$usuario = requerirRol(['reclutador'], ['inactive_status' => 403]);
$idUsuario = (int)($usuario['id'] ?? 0);
$method = strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? ''));

if (!in_array($method, ['GET', 'POST'], true)) {
    header('Allow: GET, POST, OPTIONS');
    reclutador_responder(false, 'Metodo no permitido.', null, 405);
}

$con = null;

try {
    $con = @mysqli_connect(
        INCLUSIJOB_DB_HOST,
        INCLUSIJOB_DB_USER,
        INCLUSIJOB_DB_PASSWORD,
        INCLUSIJOB_DB_NAME
    );

    if (!$con) {
        throw new RuntimeException('No se pudo conectar con la base de datos.');
    }

    if (!mysqli_set_charset($con, 'utf8mb4')) {
        throw new RuntimeException('No se pudo configurar la codificacion.');
    }

    if ($method === 'POST') {
        $accion = (string)($_GET['accion'] ?? '');
        if ($accion !== 'marcar_aviso_atendido') {
            reclutador_responder(false, 'Accion no reconocida.', null, 400);
        }

        $data = reclutador_json_body();
        $rawId = $_GET['id'] ?? ($data['id_aviso'] ?? ($data['id'] ?? null));
        $idAviso = filter_var($rawId, FILTER_VALIDATE_INT, [
            'options' => ['min_range' => 1],
        ]);

        if ($idAviso === false) {
            reclutador_responder(false, 'ID de aviso requerido.', null, 400);
        }

        $sqlAtender = "UPDATE chabots
            SET resultado = CONCAT(COALESCE(resultado, 'reporte_aviso'), '_atendido'),
                tipo_interaccion = 'reporte_atendido'
            WHERE id_chatbot = ?
              AND id_usuario = ?
              AND resultado NOT LIKE '%_atendido'
              AND (
                resultado IN ('reporte_ignorado_admin', 'reporte_vacante_eliminada_admin')
                OR tipo_interaccion IN ('reporte_resuelto', 'reporte_reprimenda')
              )";
        $stmtAtender = mysqli_prepare($con, $sqlAtender);
        if (!$stmtAtender) {
            throw new RuntimeException('No se pudo preparar el aviso.');
        }

        mysqli_stmt_bind_param($stmtAtender, 'ii', $idAviso, $idUsuario);
        if (!mysqli_stmt_execute($stmtAtender)) {
            mysqli_stmt_close($stmtAtender);
            throw new RuntimeException('No se pudo actualizar el aviso.');
        }

        $afectadas = mysqli_stmt_affected_rows($stmtAtender);
        mysqli_stmt_close($stmtAtender);

        if ($afectadas === 0) {
            reclutador_responder(false, 'Aviso no encontrado o ya atendido.', null, 404);
        }

        reclutador_responder(true, 'Aviso marcado como atendido.', [
            'id_aviso' => (int)$idAviso,
        ]);
    }

    if ($method === 'GET') {
    $idReclutador = reclutador_id_desde_usuario($con, $idUsuario);
    $sql = 'SELECT
                rv.id_reporte,
                rv.motivo,
                rv.fecha_reporte,
                v.id_vacante,
                v.titulo_puesto,
                v.fecha_publicacion,
                u.nombres,
                u.apellidos,
                u.correo
            FROM reporte_vacante rv
            INNER JOIN vacantes v ON rv.id_vacante = v.id_vacante
            INNER JOIN usuarios u ON rv.id_usuario = u.id_usuario
            WHERE v.id_reclutador = ?
            ORDER BY rv.fecha_reporte DESC, rv.id_reporte DESC';

    $stmt = mysqli_prepare($con, $sql);
    if (!$stmt) {
        throw new RuntimeException('No se pudo preparar la consulta de reportes.');
    }

    mysqli_stmt_bind_param($stmt, 'i', $idReclutador);
    if (!mysqli_stmt_execute($stmt)) {
        mysqli_stmt_close($stmt);
        throw new RuntimeException('No se pudo consultar los reportes.');
    }

    $resultado = mysqli_stmt_get_result($stmt);
    if ($resultado === false) {
        mysqli_stmt_close($stmt);
        throw new RuntimeException('No se pudo leer los reportes.');
    }

    $reportes = [];
    while ($fila = mysqli_fetch_assoc($resultado)) {
        $reportes[] = [
            'id' => (int)$fila['id_reporte'],
            'motivo' => $fila['motivo'],
            'fecha_reporte' => $fila['fecha_reporte'],
            'id_vacante' => (int)$fila['id_vacante'],
            'vacante' => $fila['titulo_puesto'],
            'fecha_publicacion' => $fila['fecha_publicacion'],
            'usuario_nombre' => trim(($fila['nombres'] ?? '') . ' ' . ($fila['apellidos'] ?? '')),
            'correo' => $fila['correo'],
        ];
    }
    mysqli_stmt_close($stmt);

    $sqlAvisos = "SELECT
                      id_chatbot,
                      tipo_interaccion,
                      mensaje_usuario,
                      respuesta_ia,
                      resultado,
                      fecha
                  FROM chabots
                  WHERE id_usuario = ?
                    AND resultado NOT LIKE '%_atendido'
                    AND (
                        resultado IN ('reporte_ignorado_admin', 'reporte_vacante_eliminada_admin')
                        OR tipo_interaccion IN ('reporte_resuelto', 'reporte_reprimenda')
                    )
                  ORDER BY fecha DESC, id_chatbot DESC
                  LIMIT 20";
    $stmtAvisos = mysqli_prepare($con, $sqlAvisos);
    if (!$stmtAvisos) {
        throw new RuntimeException('No se pudo preparar la consulta de avisos.');
    }

    mysqli_stmt_bind_param($stmtAvisos, 'i', $idUsuario);
    if (!mysqli_stmt_execute($stmtAvisos)) {
        mysqli_stmt_close($stmtAvisos);
        throw new RuntimeException('No se pudieron consultar los avisos.');
    }

    $resAvisos = mysqli_stmt_get_result($stmtAvisos);
    if ($resAvisos === false) {
        mysqli_stmt_close($stmtAvisos);
        throw new RuntimeException('No se pudieron leer los avisos.');
    }

    $avisos = [];
    while ($fila = mysqli_fetch_assoc($resAvisos)) {
        $payload = json_decode((string)($fila['respuesta_ia'] ?? ''), true);
        if (!is_array($payload)) {
            $payload = [];
        }

        $reportePayload = is_array($payload['reporte'] ?? null) ? $payload['reporte'] : [];
        $vacantePayload = is_array($payload['vacante'] ?? null) ? $payload['vacante'] : [];

        $avisos[] = [
            'id' => (int)$fila['id_chatbot'],
            'tipo_interaccion' => $fila['tipo_interaccion'],
            'resultado' => $fila['resultado'],
            'accion' => $payload['accion'] ?? null,
            'texto' => $payload['text'] ?? $fila['mensaje_usuario'],
            'fecha' => $fila['fecha'],
            'id_vacante' => isset($vacantePayload['id_vacante'])
                ? (int)$vacantePayload['id_vacante']
                : null,
            'vacante' => $vacantePayload['titulo_puesto'] ?? 'Vacante',
            'motivo' => $reportePayload['motivo'] ?? '',
            'comentario_admin' => $reportePayload['comentario_admin'] ?? '',
            'usuario_reportante' => $reportePayload['usuario_reportante'] ?? '',
            'fecha_reporte' => $reportePayload['fecha_reporte'] ?? null,
        ];
    }
    mysqli_stmt_close($stmtAvisos);
    mysqli_close($con);

    reclutador_responder(true, 'Reportes obtenidos', [
        'reportes' => $reportes,
        'avisos' => $avisos,
    ]);
    }
} catch (Throwable $e) {
    if ($con instanceof mysqli) {
        mysqli_close($con);
    }

    error_log('mostrar_reportes.php: ' . $e->getMessage());
    reclutador_responder(false, 'No se pudieron obtener los reportes. Intenta de nuevo.', null, 500);
}
