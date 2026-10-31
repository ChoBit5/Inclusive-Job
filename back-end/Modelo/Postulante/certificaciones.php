<?php

require_once __DIR__ . '/../../config/auth.php';
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/pdfupload.php';
require_once __DIR__ . '/../../config/sanitize.php';
require_once __DIR__ . '/../../Conexion.php';

inclusijob_cors_headers('GET, POST, DELETE, OPTIONS', 'Content-Type');
$sessionUser = requerirRol(['postulante']);
$method = $_SERVER['REQUEST_METHOD'] ?? '';

function certificaciones_responder(int $status, ?string $message, bool $ok = false, array $extra = []): void
{
    header('Content-Type: application/json; charset=utf-8');
    http_response_code($status);
    $payload = ['ok' => $ok];
    if ($message !== null) {
        $payload['msg'] = $message;
    }
    echo json_encode(array_merge($payload, $extra), JSON_UNESCAPED_UNICODE);
    exit;
}

function certificaciones_error(string $context, string $detail): void
{
    error_log('[certificaciones.php] ' . $context . ': ' . $detail);
}

function certificaciones_text_length(string $value): int
{
    return function_exists('mb_strlen') ? mb_strlen($value, 'UTF-8') : strlen($value);
}

function certificaciones_archivo(mysqli $con, array $file): array
{
    $uploadError = pdf_upload_error_message((int)($file['error'] ?? UPLOAD_ERR_NO_FILE), 'PDF');
    if ($uploadError !== null) {
        return ['error' => $uploadError];
    }

    if ((int)($file['size'] ?? 0) > 5 * 1024 * 1024) {
        return ['error' => [413, 'El PDF no debe superar 5 MB.']];
    }

    $tmpName = (string)($file['tmp_name'] ?? '');
    $mime = mime_content_type($tmpName);
    if ($mime === false) {
        $mime = '';
    }

    $bytes = file_get_contents($tmpName);
    if ($bytes === false) {
        certificaciones_error('leer archivo', 'file_get_contents fallo');
        return ['error' => [500, 'No se pudo leer el archivo.']];
    }

    $validationError = pdf_validate_binary($bytes, $mime, 'PDF');
    if ($validationError !== null) {
        return ['error' => $validationError];
    }

    $packetStmt = mysqli_prepare($con, 'SELECT @@max_allowed_packet AS max_allowed_packet');
    if (!$packetStmt || !mysqli_stmt_execute($packetStmt)) {
        certificaciones_error(
            'consultar max_allowed_packet',
            $packetStmt ? mysqli_stmt_error($packetStmt) : mysqli_error($con)
        );
        if ($packetStmt) {
            mysqli_stmt_close($packetStmt);
        }
        return ['error' => [500, 'No se pudo validar el tamaño permitido por el servidor.']];
    }

    $packetResult = mysqli_stmt_get_result($packetStmt);
    if ($packetResult === false) {
        certificaciones_error('leer max_allowed_packet', mysqli_stmt_error($packetStmt));
        mysqli_stmt_close($packetStmt);
        return ['error' => [500, 'No se pudo validar el tamaño permitido por el servidor.']];
    }

    $packetRow = mysqli_fetch_assoc($packetResult);
    mysqli_stmt_close($packetStmt);
    $maxAllowedPacket = (int)($packetRow['max_allowed_packet'] ?? 0);
    if ($maxAllowedPacket <= 0) {
        certificaciones_error('max_allowed_packet', 'valor no disponible');
        return ['error' => [500, 'No se pudo validar el tamaño permitido por el servidor.']];
    }

    if (pdf_exceeds_packet_limit(strlen($bytes), $maxAllowedPacket)) {
        return ['error' => [413, 'El servidor de base de datos no admite un PDF de este tamano.']];
    }

    return ['bytes' => $bytes];
}

if (!in_array($method, ['GET', 'POST', 'DELETE'], true)) {
    certificaciones_responder(405, 'Metodo no permitido.');
}

$con = conectarbd();
if (!mysqli_set_charset($con, 'utf8mb4')) {
    certificaciones_error('charset', mysqli_error($con));
    certificaciones_responder(500, 'No se pudo preparar la conexion.');
}

$idUsuario = (int)($sessionUser['id'] ?? 0);
$stmtPostulante = mysqli_prepare(
    $con,
    'SELECT id_postulante FROM postulantes WHERE id_usuario = ? LIMIT 1'
);
if (!$stmtPostulante) {
    certificaciones_error('preparar postulante', mysqli_error($con));
    certificaciones_responder(500, 'No se pudo consultar el postulante.');
}
if (!mysqli_stmt_bind_param($stmtPostulante, 'i', $idUsuario)) {
    certificaciones_error('vincular postulante', mysqli_stmt_error($stmtPostulante));
    mysqli_stmt_close($stmtPostulante);
    certificaciones_responder(500, 'No se pudo consultar el postulante.');
}
if (!mysqli_stmt_execute($stmtPostulante)) {
    certificaciones_error('ejecutar postulante', mysqli_stmt_error($stmtPostulante));
    mysqli_stmt_close($stmtPostulante);
    certificaciones_responder(500, 'No se pudo consultar el postulante.');
}
$postulanteResult = mysqli_stmt_get_result($stmtPostulante);
if ($postulanteResult === false) {
    certificaciones_error('leer postulante', mysqli_stmt_error($stmtPostulante));
    mysqli_stmt_close($stmtPostulante);
    certificaciones_responder(500, 'No se pudo consultar el postulante.');
}
$postulante = mysqli_fetch_assoc($postulanteResult);
mysqli_stmt_close($stmtPostulante);
if (!$postulante) {
    certificaciones_responder(404, 'No se encontro el postulante.');
}
$idPostulante = (int)$postulante['id_postulante'];

if ($method === 'GET' && isset($_GET['archivo'])) {
    if (!isset($_GET['id']) || !ctype_digit((string)$_GET['id']) || (int)$_GET['id'] <= 0) {
        certificaciones_responder(400, 'ID invalido.');
    }

    $id = (int)$_GET['id'];
    $stmt = mysqli_prepare(
        $con,
        'SELECT pdf FROM certificaciones WHERE id_certificaciones = ? AND id_postulante = ? LIMIT 1'
    );
    if (!$stmt) {
        certificaciones_error('preparar PDF', mysqli_error($con));
        certificaciones_responder(500, 'No se pudo obtener el PDF.');
    }
    if (!mysqli_stmt_bind_param($stmt, 'ii', $id, $idPostulante) || !mysqli_stmt_execute($stmt)) {
        certificaciones_error('consultar PDF', mysqli_stmt_error($stmt));
        mysqli_stmt_close($stmt);
        certificaciones_responder(500, 'No se pudo obtener el PDF.');
    }
    $result = mysqli_stmt_get_result($stmt);
    if ($result === false) {
        certificaciones_error('leer PDF', mysqli_stmt_error($stmt));
        mysqli_stmt_close($stmt);
        certificaciones_responder(500, 'No se pudo obtener el PDF.');
    }
    $row = mysqli_fetch_assoc($result);
    mysqli_stmt_close($stmt);
    $pdf = $row['pdf'] ?? null;
    if ($pdf === null || $pdf === '') {
        http_response_code(404);
        header('Content-Type: text/plain; charset=utf-8');
        echo 'PDF no encontrado';
        exit;
    }

    header('Content-Type: application/pdf');
    header('Content-Disposition: inline; filename=certificacion.pdf');
    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
    header('Pragma: no-cache');
    header('Expires: 0');
    header('X-Content-Type-Options: nosniff');
    header('Content-Length: ' . strlen($pdf));
    echo $pdf;
    exit;
}

if ($method === 'DELETE') {
    $body = json_decode(file_get_contents('php://input'), true);
    $idValue = is_array($body) ? ($body['id'] ?? null) : null;
    if ((!is_int($idValue) && !(is_string($idValue) && ctype_digit($idValue))) || (int)$idValue <= 0) {
        certificaciones_responder(400, 'ID invalido.');
    }
    $id = (int)$idValue;
    $stmt = mysqli_prepare(
        $con,
        'DELETE FROM certificaciones WHERE id_certificaciones = ? AND id_postulante = ? LIMIT 1'
    );
    if (!$stmt) {
        certificaciones_error('preparar eliminacion', mysqli_error($con));
        certificaciones_responder(500, 'No se pudo eliminar la certificacion.');
    }
    if (!mysqli_stmt_bind_param($stmt, 'ii', $id, $idPostulante) || !mysqli_stmt_execute($stmt)) {
        certificaciones_error('ejecutar eliminacion', mysqli_stmt_error($stmt));
        mysqli_stmt_close($stmt);
        certificaciones_responder(500, 'No se pudo eliminar la certificacion.');
    }
    $affectedRows = mysqli_stmt_affected_rows($stmt);
    mysqli_stmt_close($stmt);
    if ($affectedRows === 0) {
        certificaciones_responder(404, 'No se encontro la certificacion.');
    }
    certificaciones_responder(200, 'Certificacion eliminada', true);
}

if ($method === 'POST') {
    $nombre = inclusijob_limpio($_POST['nombre_certificacion'] ?? '');
    $institucion = inclusijob_limpio($_POST['institucion_dada'] ?? '');
    $fecha = trim((string)($_POST['fecha_emitido'] ?? ''));
    $hasId = array_key_exists('id', $_POST);
    $id = $hasId ? (int)$_POST['id'] : 0;

    if (!$nombre || !$institucion || !$fecha) {
        certificaciones_responder(400, 'Campos incompletos');
    }
    if (certificaciones_text_length($nombre) > 200) {
        certificaciones_responder(400, 'El nombre de la certificacion no debe superar 200 caracteres.');
    }
    if (certificaciones_text_length($institucion) > 200) {
        certificaciones_responder(400, 'La institucion no debe superar 200 caracteres.');
    }
    if ($hasId && $id <= 0) {
        certificaciones_responder(400, 'ID invalido.');
    }

    $date = DateTime::createFromFormat('!Y-m-d', $fecha);
    $dateErrors = DateTime::getLastErrors();
    if (!$date || ($dateErrors !== false && ($dateErrors['warning_count'] > 0 || $dateErrors['error_count'] > 0)) || $date->format('Y-m-d') !== $fecha) {
        certificaciones_responder(400, 'Fecha invalida');
    }
    if ($date > new DateTime('today')) {
        certificaciones_responder(400, 'La fecha no puede ser futura');
    }

    if ($hasId) {
        $check = mysqli_prepare(
            $con,
            'SELECT id_certificaciones FROM certificaciones WHERE id_certificaciones = ? AND id_postulante = ? LIMIT 1'
        );
        if (!$check) {
            certificaciones_error('preparar pertenencia', mysqli_error($con));
            certificaciones_responder(500, 'No se pudo consultar la certificacion.');
        }
        if (!mysqli_stmt_bind_param($check, 'ii', $id, $idPostulante) || !mysqli_stmt_execute($check)) {
            certificaciones_error('consultar pertenencia', mysqli_stmt_error($check));
            mysqli_stmt_close($check);
            certificaciones_responder(500, 'No se pudo consultar la certificacion.');
        }
        $checkResult = mysqli_stmt_get_result($check);
        if ($checkResult === false) {
            certificaciones_error('leer pertenencia', mysqli_stmt_error($check));
            mysqli_stmt_close($check);
            certificaciones_responder(500, 'No se pudo consultar la certificacion.');
        }
        $exists = mysqli_fetch_assoc($checkResult);
        mysqli_stmt_close($check);
        if (!$exists) {
            certificaciones_responder(404, 'No se encontro la certificacion.');
        }
    }

    $file = $_FILES['pdf'] ?? null;
    $optionalUploadError = $hasId ? pdf_optional_upload_error($file, 'PDF') : null;
    if ($optionalUploadError !== null) {
        certificaciones_responder($optionalUploadError[0], $optionalUploadError[1]);
    }
    $hasNewPdf = is_array($file) && (int)($file['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_OK;
    if (!$hasId && !$file) {
        certificaciones_responder(400, 'Selecciona PDF');
    }
    if (!$hasId && $file && (int)($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
        if ((int)$file['error'] === UPLOAD_ERR_NO_FILE) {
            certificaciones_responder(400, 'Selecciona PDF');
        }
        $uploadError = pdf_upload_error_message((int)$file['error'], 'PDF');
        certificaciones_responder($uploadError[0], $uploadError[1]);
    }

    $pdf = null;
    if ($hasNewPdf) {
        $validatedFile = certificaciones_archivo($con, $file);
        if (isset($validatedFile['error'])) {
            certificaciones_responder($validatedFile['error'][0], $validatedFile['error'][1]);
        }
        $pdf = $validatedFile['bytes'];
    }

    if ($hasId && $hasNewPdf) {
        $stmt = mysqli_prepare(
            $con,
            'UPDATE certificaciones SET nombre_certificacion = ?, institucion_dada = ?, pdf = ?, fecha_emitido = ? WHERE id_certificaciones = ? AND id_postulante = ?'
        );
        if (!$stmt) {
            certificaciones_error('preparar edicion con PDF', mysqli_error($con));
            certificaciones_responder(500, 'No se pudo guardar la certificacion.');
        }
        $null = null;
        if (!mysqli_stmt_bind_param($stmt, 'ssbsii', $nombre, $institucion, $null, $fecha, $id, $idPostulante)
            || !mysqli_stmt_send_long_data($stmt, 2, $pdf)
            || !mysqli_stmt_execute($stmt)) {
            certificaciones_error('guardar edicion con PDF', mysqli_stmt_error($stmt));
            mysqli_stmt_close($stmt);
            certificaciones_responder(500, 'No se pudo guardar la certificacion.');
        }
    } elseif ($hasId) {
        $stmt = mysqli_prepare(
            $con,
            'UPDATE certificaciones SET nombre_certificacion = ?, institucion_dada = ?, fecha_emitido = ? WHERE id_certificaciones = ? AND id_postulante = ?'
        );
        if (!$stmt) {
            certificaciones_error('preparar edicion', mysqli_error($con));
            certificaciones_responder(500, 'No se pudo guardar la certificacion.');
        }
        if (!mysqli_stmt_bind_param($stmt, 'sssii', $nombre, $institucion, $fecha, $id, $idPostulante)
            || !mysqli_stmt_execute($stmt)) {
            certificaciones_error('guardar edicion', mysqli_stmt_error($stmt));
            mysqli_stmt_close($stmt);
            certificaciones_responder(500, 'No se pudo guardar la certificacion.');
        }
    } else {
        $stmt = mysqli_prepare(
            $con,
            'INSERT INTO certificaciones (nombre_certificacion, institucion_dada, pdf, fecha_emitido, id_postulante) VALUES (?, ?, ?, ?, ?)'
        );
        if (!$stmt) {
            certificaciones_error('preparar creacion', mysqli_error($con));
            certificaciones_responder(500, 'No se pudo guardar la certificacion.');
        }
        $null = null;
        if (!mysqli_stmt_bind_param($stmt, 'ssbsi', $nombre, $institucion, $null, $fecha, $idPostulante)
            || !mysqli_stmt_send_long_data($stmt, 2, $pdf)
            || !mysqli_stmt_execute($stmt)) {
            certificaciones_error('guardar creacion', mysqli_stmt_error($stmt));
            mysqli_stmt_close($stmt);
            certificaciones_responder(500, 'No se pudo guardar la certificacion.');
        }
    }

    mysqli_stmt_close($stmt);
    certificaciones_responder(200, 'Guardado correctamente', true);
}

$stmt = mysqli_prepare(
    $con,
    'SELECT id_certificaciones, nombre_certificacion, institucion_dada, fecha_emitido FROM certificaciones WHERE id_postulante = ? ORDER BY fecha_emitido DESC'
);
if (!$stmt) {
    certificaciones_error('preparar lista', mysqli_error($con));
    certificaciones_responder(500, 'No se pudieron obtener las certificaciones.');
}
if (!mysqli_stmt_bind_param($stmt, 'i', $idPostulante) || !mysqli_stmt_execute($stmt)) {
    certificaciones_error('ejecutar lista', mysqli_stmt_error($stmt));
    mysqli_stmt_close($stmt);
    certificaciones_responder(500, 'No se pudieron obtener las certificaciones.');
}
$result = mysqli_stmt_get_result($stmt);
if ($result === false) {
    certificaciones_error('leer lista', mysqli_stmt_error($stmt));
    mysqli_stmt_close($stmt);
    certificaciones_responder(500, 'No se pudieron obtener las certificaciones.');
}
$data = [];
while ($row = mysqli_fetch_assoc($result)) {
    $data[] = [
        'id' => (int)$row['id_certificaciones'],
        'nombre' => $row['nombre_certificacion'],
        'emisor' => $row['institucion_dada'],
        'fecha' => $row['fecha_emitido'],
    ];
}
mysqli_stmt_close($stmt);
certificaciones_responder(200, null, true, ['certificaciones' => $data]);
