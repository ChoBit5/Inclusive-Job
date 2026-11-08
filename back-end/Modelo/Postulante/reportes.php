<?php

require_once __DIR__ . '/../../config/auth.php';
require_once __DIR__ . '/../../config/sanitize.php';

inclusijob_cors_headers('GET, POST, PUT, DELETE, OPTIONS', 'Content-Type');
$sessionUser = requerirRol(['postulante'], ['inactive_status' => 403]);
$method = strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? ''));

function reportes_responder(int $status, string $message = '', bool $ok = false, ?array $data = null): never
{
    http_response_code($status);
    $payload = ['ok' => $ok];
    if ($data !== null) {
        $payload['data'] = $data;
    } else {
        $payload['msg'] = $message;
    }
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

function reportes_longitud(string $value): int
{
    return function_exists('mb_strlen') ? mb_strlen($value, 'UTF-8') : strlen($value);
}

function reportes_conectar(): mysqli
{
    $con = @mysqli_connect(
        INCLUSIJOB_DB_HOST,
        INCLUSIJOB_DB_USER,
        INCLUSIJOB_DB_PASSWORD,
        INCLUSIJOB_DB_NAME
    );
    if (!$con) {
        throw new RuntimeException('No se pudo conectar con la base de datos.');
    }

    return $con;
}

function reportes_id($value): int|false
{
    $idValido = is_int($value)
        || (is_string($value) && ctype_digit($value));
    if (!$idValido) {
        return false;
    }

    $id = filter_var($value, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
    return $id === false ? false : (int)$id;
}

function reportes_motivo($value): string
{
    if (!is_string($value) && !is_numeric($value)) {
        return '';
    }

    return inclusijob_limpio($value);
}

function reportes_stmt(mysqli $con, string $sql): mysqli_stmt
{
    $stmt = mysqli_prepare($con, $sql);
    if ($stmt === false) {
        throw new RuntimeException('No se pudo preparar la consulta de reportes.');
    }

    return $stmt;
}

function reportes_stmt_ejecutar(mysqli_stmt $stmt, string $message): void
{
    if (!mysqli_stmt_execute($stmt)) {
        $detail = mysqli_stmt_error($stmt);
        throw new RuntimeException($message . ': ' . $detail);
    }
}

function reportes_propio(mysqli $con, int $idReporte, int $idUsuario, bool $bloquear = false): bool
{
    $sql = 'SELECT id_reporte FROM reporte_vacante WHERE id_reporte = ? AND id_usuario = ? LIMIT 1';
    if ($bloquear) {
        $sql .= ' FOR UPDATE';
    }
    $stmt = reportes_stmt($con, $sql);
    if (!mysqli_stmt_bind_param($stmt, 'ii', $idReporte, $idUsuario)) {
        mysqli_stmt_close($stmt);
        throw new RuntimeException('No se pudo enlazar la consulta del reporte.');
    }
    reportes_stmt_ejecutar($stmt, 'No se pudo comprobar el reporte');
    $result = mysqli_stmt_get_result($stmt);
    if ($result === false) {
        $detail = mysqli_stmt_error($stmt);
        mysqli_stmt_close($stmt);
        throw new RuntimeException('No se pudo leer el reporte: ' . $detail);
    }
    $existe = mysqli_fetch_assoc($result) !== null;
    mysqli_stmt_close($stmt);
    return $existe;
}

$body = json_decode(file_get_contents('php://input'), true);

if (!in_array($method, ['GET', 'POST', 'PUT', 'DELETE'], true)) {
    header('Allow: GET, POST, PUT, DELETE, OPTIONS');
    reportes_responder(405, 'Metodo no permitido.');
}

$con = null;

try {
    $con = reportes_conectar();
    if (!mysqli_set_charset($con, 'utf8mb4')) {
        throw new RuntimeException('No se pudo configurar la codificacion del reporte.');
    }

    $idUsuario = (int)($sessionUser['id'] ?? 0);

    if ($method === 'GET') {
        $stmt = reportes_stmt($con, "SELECT
                r.id_reporte,
                r.motivo,
                r.fecha_reporte,
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
                e.nombre_empresas
            FROM reporte_vacante r
            INNER JOIN vacantes v ON r.id_vacante = v.id_vacante
            INNER JOIN reclutadores rec ON v.id_reclutador = rec.id_reclutador
            INNER JOIN empresas e ON rec.id_empresas = e.id_empresas
            WHERE r.id_usuario = ?
              AND COALESCE(e.estado_validacion, 0) = 1
            ORDER BY r.fecha_reporte DESC, r.id_reporte DESC");
        if (!mysqli_stmt_bind_param($stmt, 'i', $idUsuario)) {
            mysqli_stmt_close($stmt);
            throw new RuntimeException('No se pudo enlazar la consulta de reportes.');
        }
        reportes_stmt_ejecutar($stmt, 'No se pudieron obtener los reportes');
        $result = mysqli_stmt_get_result($stmt);
        if ($result === false) {
            $detail = mysqli_stmt_error($stmt);
            mysqli_stmt_close($stmt);
            throw new RuntimeException('No se pudieron leer los reportes: ' . $detail);
        }

        $reportes = [];
        while ($fila = mysqli_fetch_assoc($result)) {
            $reportes[] = [
                'id' => (int)$fila['id_reporte'],
                'vacante_id' => (int)$fila['id_vacante'],
                'vacante' => $fila['titulo_puesto'],
                'descripcion_puesto' => $fila['descripcion_puesto'],
                'requisitos' => $fila['requisitos'],
                'modalidad' => $fila['modalidad'],
                'salario_min' => $fila['salario_min'],
                'salario_max' => $fila['salario_max'],
                'estado' => $fila['estado'],
                'fecha_publicacion' => $fila['fecha_publicacion'],
                'fecha_cierre' => $fila['fecha_cierre'],
                'motivo' => $fila['motivo'],
                'empresa' => $fila['nombre_empresas'],
                'fecha' => $fila['fecha_reporte'],
            ];
        }
        mysqli_stmt_close($stmt);
        mysqli_close($con);
        reportes_responder(200, '', true, $reportes);
    }

    if ($method === 'PUT') {
        $rawIdReporte = is_array($body) ? ($body['id_reporte'] ?? null) : null;
        $idReporte = reportes_id($rawIdReporte);
        if ($idReporte === false) {
            reportes_responder(400, 'ID de reporte invalido.');
        }

        $motivo = reportes_motivo(is_array($body) ? ($body['motivo'] ?? null) : null);
        if ($motivo === '') {
            reportes_responder(400, 'El motivo del reporte es requerido.');
        }
        if (reportes_longitud($motivo) > 500) {
            reportes_responder(400, 'El motivo del reporte no debe superar 500 caracteres.');
        }

        if (!mysqli_begin_transaction($con)) {
            throw new RuntimeException('No se pudo iniciar la transaccion del reporte.');
        }
        if (!reportes_propio($con, $idReporte, $idUsuario, true)) {
            mysqli_rollback($con);
            mysqli_close($con);
            reportes_responder(404, 'Reporte no encontrado.');
        }
        $stmt = reportes_stmt($con, 'UPDATE reporte_vacante SET motivo = ? WHERE id_reporte = ? AND id_usuario = ?');
        if (!mysqli_stmt_bind_param($stmt, 'sii', $motivo, $idReporte, $idUsuario)) {
            mysqli_stmt_close($stmt);
            throw new RuntimeException('No se pudo enlazar la actualizacion del reporte.');
        }
        reportes_stmt_ejecutar($stmt, 'No se pudo actualizar el reporte');
        mysqli_stmt_close($stmt);
        if (!mysqli_commit($con)) {
            throw new RuntimeException('No se pudo confirmar la actualizacion del reporte.');
        }
        mysqli_close($con);
        reportes_responder(200, 'Motivo actualizado', true);
    }

    if ($method === 'DELETE') {
        $rawIdReporte = is_array($body) ? ($body['id_reporte'] ?? null) : null;
        $idReporte = reportes_id($rawIdReporte);
        if ($idReporte === false) {
            reportes_responder(400, 'ID de reporte invalido.');
        }

        if (!mysqli_begin_transaction($con)) {
            throw new RuntimeException('No se pudo iniciar la transaccion del reporte.');
        }
        if (!reportes_propio($con, $idReporte, $idUsuario, true)) {
            mysqli_rollback($con);
            mysqli_close($con);
            reportes_responder(404, 'Reporte no encontrado.');
        }
        $stmt = reportes_stmt($con, 'DELETE FROM reporte_vacante WHERE id_reporte = ? AND id_usuario = ?');
        if (!mysqli_stmt_bind_param($stmt, 'ii', $idReporte, $idUsuario)) {
            mysqli_stmt_close($stmt);
            throw new RuntimeException('No se pudo enlazar la eliminacion del reporte.');
        }
        reportes_stmt_ejecutar($stmt, 'No se pudo eliminar el reporte');
        mysqli_stmt_close($stmt);
        if (!mysqli_commit($con)) {
            throw new RuntimeException('No se pudo confirmar la eliminacion del reporte.');
        }
        mysqli_close($con);
        reportes_responder(200, 'Reporte eliminado', true);
    }

    $rawIdVacante = is_array($body) ? ($body['id_vacante'] ?? null) : null;
    $idVacante = reportes_id($rawIdVacante);
    if ($idVacante === false) {
        reportes_responder(400, 'ID de vacante invalido.');
    }

    $rawMotivo = is_array($body) ? ($body['motivo'] ?? null) : null;
    $motivo = reportes_motivo($rawMotivo);
    if ($motivo === '') {
        reportes_responder(400, 'El motivo del reporte es requerido.');
    }
    if (reportes_longitud($motivo) > 500) {
        reportes_responder(400, 'El motivo del reporte no debe superar 500 caracteres.');
    }

    if (!mysqli_begin_transaction($con)) {
        throw new RuntimeException('No se pudo iniciar la transaccion del reporte.');
    }

    $stmtVacante = mysqli_prepare(
        $con,
        "SELECT v.id_vacante
         FROM vacantes v
         INNER JOIN reclutadores rec ON rec.id_reclutador = v.id_reclutador
         INNER JOIN empresas e ON e.id_empresas = rec.id_empresas
         WHERE v.id_vacante = ?
           AND v.estado = 'activa'
           AND COALESCE(e.estado_validacion, 0) = 1
         LIMIT 1 FOR UPDATE"
    );
    if ($stmtVacante === false) {
        throw new RuntimeException('No se pudo preparar la validacion de la vacante.');
    }
    if (!mysqli_stmt_bind_param($stmtVacante, 'i', $idVacante)
        || !mysqli_stmt_execute($stmtVacante)) {
        $detail = mysqli_stmt_error($stmtVacante);
        mysqli_stmt_close($stmtVacante);
        throw new RuntimeException('No se pudo validar la vacante: ' . $detail);
    }
    $vacanteResult = mysqli_stmt_get_result($stmtVacante);
    if ($vacanteResult === false) {
        $detail = mysqli_stmt_error($stmtVacante);
        mysqli_stmt_close($stmtVacante);
        throw new RuntimeException('No se pudo leer la validacion de la vacante: ' . $detail);
    }
    $vacante = mysqli_fetch_assoc($vacanteResult);
    mysqli_stmt_close($stmtVacante);
    if (!$vacante) {
        mysqli_rollback($con);
        mysqli_close($con);
        reportes_responder(404, 'La vacante no esta disponible para reportarse.');
    }

    $stmtDuplicado = mysqli_prepare(
        $con,
        'SELECT id_reporte FROM reporte_vacante WHERE id_vacante = ? AND id_usuario = ? LIMIT 1'
    );
    if ($stmtDuplicado === false) {
        throw new RuntimeException('No se pudo preparar la validacion del reporte duplicado.');
    }
    if (!mysqli_stmt_bind_param($stmtDuplicado, 'ii', $idVacante, $idUsuario)
        || !mysqli_stmt_execute($stmtDuplicado)) {
        $detail = mysqli_stmt_error($stmtDuplicado);
        mysqli_stmt_close($stmtDuplicado);
        throw new RuntimeException('No se pudo validar el reporte duplicado: ' . $detail);
    }
    $duplicadoResult = mysqli_stmt_get_result($stmtDuplicado);
    if ($duplicadoResult === false) {
        $detail = mysqli_stmt_error($stmtDuplicado);
        mysqli_stmt_close($stmtDuplicado);
        throw new RuntimeException('No se pudo leer el reporte duplicado: ' . $detail);
    }
    $duplicado = mysqli_fetch_assoc($duplicadoResult);
    mysqli_stmt_close($stmtDuplicado);
    if ($duplicado) {
        mysqli_rollback($con);
        mysqli_close($con);
        reportes_responder(409, 'Ya reportaste esta vacante.');
    }

    $stmtInsertar = mysqli_prepare(
        $con,
        'INSERT INTO reporte_vacante (id_vacante, id_usuario, motivo) VALUES (?, ?, ?)'
    );
    if ($stmtInsertar === false) {
        throw new RuntimeException('No se pudo preparar la creacion del reporte.');
    }
    if (!mysqli_stmt_bind_param($stmtInsertar, 'iis', $idVacante, $idUsuario, $motivo)
        || !mysqli_stmt_execute($stmtInsertar)) {
        $detail = mysqli_stmt_error($stmtInsertar);
        mysqli_stmt_close($stmtInsertar);
        throw new RuntimeException('No se pudo insertar el reporte: ' . $detail);
    }
    $affectedRows = mysqli_stmt_affected_rows($stmtInsertar);
    mysqli_stmt_close($stmtInsertar);
    if ($affectedRows !== 1) {
        throw new RuntimeException('La insercion del reporte no afecto una fila.');
    }
    if (!mysqli_commit($con)) {
        throw new RuntimeException('No se pudo confirmar el reporte.');
    }

    mysqli_close($con);
    reportes_responder(200, 'Reporte enviado.', true);
} catch (Throwable $e) {
    if ($con instanceof mysqli) {
        @mysqli_rollback($con);
        @mysqli_close($con);
    }
    error_log('[POSTULANTE_REPORTES] ' . $e->getMessage());
    reportes_responder(500, 'No se pudo guardar el reporte.');
}
