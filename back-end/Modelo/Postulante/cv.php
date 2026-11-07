<?php

require_once __DIR__ . '/../../config/auth.php';
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/pdf.php';
require_once __DIR__ . '/../../Conexion.php';
require_once __DIR__ . '/cv_helpers.php';

inclusijob_cors_headers('GET, POST, OPTIONS', 'Content-Type');
$sessionUser = requerirRol(['postulante']);
$method = $_SERVER['REQUEST_METHOD'] ?? '';

function cv_responder(int $status, string $message, bool $success = false): void
{
    header('Content-Type: application/json; charset=utf-8');
    http_response_code($status);
    echo json_encode([
        'ok' => $success,
        'msg' => $message,
    ]);
    exit;
}

function cv_error(string $context, string $detail): void
{
    error_log('[cv.php] ' . $context . ': ' . $detail);
}

if ($method !== 'GET' && $method !== 'POST') {
    cv_responder(405, 'Metodo no permitido.');
}

$con = conectarbd();
if (!mysqli_set_charset($con, 'utf8mb4')) {
    cv_error('charset', mysqli_error($con));
    cv_responder(500, 'No se pudo preparar la conexion.');
}

$idUsuario = (int)($sessionUser['id'] ?? 0);
$stmtPostulante = mysqli_prepare(
    $con,
    'SELECT id_postulante FROM postulantes WHERE id_usuario = ? LIMIT 1'
);
if (!$stmtPostulante) {
    cv_error('preparar postulante', mysqli_error($con));
    cv_responder(500, 'No se pudo consultar el postulante.');
}

if (!mysqli_stmt_bind_param($stmtPostulante, 'i', $idUsuario)) {
    cv_error('vincular postulante', mysqli_stmt_error($stmtPostulante));
    mysqli_stmt_close($stmtPostulante);
    cv_responder(500, 'No se pudo consultar el postulante.');
}

if (!mysqli_stmt_execute($stmtPostulante)) {
    cv_error('ejecutar postulante', mysqli_stmt_error($stmtPostulante));
    mysqli_stmt_close($stmtPostulante);
    cv_responder(500, 'No se pudo consultar el postulante.');
}

$resultPostulante = mysqli_stmt_get_result($stmtPostulante);
if ($resultPostulante === false) {
    cv_error('leer postulante', mysqli_stmt_error($stmtPostulante));
    mysqli_stmt_close($stmtPostulante);
    cv_responder(500, 'No se pudo consultar el postulante.');
}

$postulante = mysqli_fetch_assoc($resultPostulante);
mysqli_stmt_close($stmtPostulante);

if (!$postulante) {
    cv_responder(404, 'No se encontro el postulante.');
}

$idPostulante = (int)$postulante['id_postulante'];

if ($method === 'GET') {
    $stmt = mysqli_prepare(
        $con,
        'SELECT cv FROM postulantes WHERE id_postulante = ? LIMIT 1'
    );
    if (!$stmt) {
        cv_error('preparar CV', mysqli_error($con));
        cv_responder(500, 'No se pudo obtener el CV.');
    }

    if (!mysqli_stmt_bind_param($stmt, 'i', $idPostulante)) {
        cv_error('vincular CV', mysqli_stmt_error($stmt));
        mysqli_stmt_close($stmt);
        cv_responder(500, 'No se pudo obtener el CV.');
    }

    if (!mysqli_stmt_execute($stmt)) {
        cv_error('ejecutar CV', mysqli_stmt_error($stmt));
        mysqli_stmt_close($stmt);
        cv_responder(500, 'No se pudo obtener el CV.');
    }

    $result = mysqli_stmt_get_result($stmt);
    if ($result === false) {
        cv_error('leer CV', mysqli_stmt_error($stmt));
        mysqli_stmt_close($stmt);
        cv_responder(500, 'No se pudo obtener el CV.');
    }

    $row = mysqli_fetch_assoc($result);
    mysqli_stmt_close($stmt);
    $cv = $row['cv'] ?? null;

    if ($cv === null || $cv === '') {
        http_response_code(404);
        header('Content-Type: text/plain; charset=utf-8');
        echo 'No hay CV registrado';
        exit;
    }

    inclusijob_enviar_pdf((string)$cv, 'cv.pdf');
}

header('Content-Type: application/json; charset=utf-8');
$file = $_FILES['cv'] ?? null;
if (!is_array($file)) {
    cv_responder(400, 'No se envio ningun archivo');
}

$uploadError = cv_upload_error_message((int)($file['error'] ?? UPLOAD_ERR_NO_FILE));
if ($uploadError !== null) {
    cv_responder($uploadError[0], $uploadError[1]);
}

$maxCvBytes = 5 * 1024 * 1024;
$fileSize = (int)($file['size'] ?? 0);
if ($fileSize > $maxCvBytes) {
    cv_responder(413, 'El CV no debe superar 5 MB.');
}

$tmpName = (string)($file['tmp_name'] ?? '');
$mime = mime_content_type($tmpName);
if ($mime === false) {
    $mime = '';
}

$cv = file_get_contents($tmpName);
if ($cv === false) {
    cv_error('leer archivo', 'file_get_contents fallo');
    cv_responder(500, 'No se pudo leer el archivo.');
}

$validationError = cv_validate_binary($cv, $mime);
if ($validationError !== null) {
    cv_responder($validationError[0], $validationError[1]);
}

$packetStmt = mysqli_prepare($con, 'SELECT @@max_allowed_packet AS max_allowed_packet');
if (!$packetStmt || !mysqli_stmt_execute($packetStmt)) {
    cv_error('consultar max_allowed_packet', $packetStmt ? mysqli_stmt_error($packetStmt) : mysqli_error($con));
    if ($packetStmt) {
        mysqli_stmt_close($packetStmt);
    }
    cv_responder(500, 'No se pudo validar el tamaño permitido por el servidor.');
}

$packetResult = mysqli_stmt_get_result($packetStmt);
if ($packetResult === false) {
    cv_error('leer max_allowed_packet', mysqli_stmt_error($packetStmt));
    mysqli_stmt_close($packetStmt);
    cv_responder(500, 'No se pudo validar el tamaño permitido por el servidor.');
}

$packetRow = mysqli_fetch_assoc($packetResult);
mysqli_stmt_close($packetStmt);
$maxAllowedPacket = (int)($packetRow['max_allowed_packet'] ?? 0);
if ($maxAllowedPacket <= 0) {
    cv_error('max_allowed_packet', 'valor no disponible');
    cv_responder(500, 'No se pudo validar el tamaño permitido por el servidor.');
}

if (cv_exceeds_packet_limit(strlen($cv), $maxAllowedPacket)) {
    cv_responder(413, 'El servidor de base de datos no admite un CV de este tamano.');
}

$stmt = mysqli_prepare($con, 'UPDATE postulantes SET cv = ? WHERE id_postulante = ?');
if (!$stmt) {
    cv_error('preparar guardado', mysqli_error($con));
    cv_responder(500, 'No se pudo guardar el CV.');
}

$null = null;
if (!mysqli_stmt_bind_param($stmt, 'bi', $null, $idPostulante)) {
    cv_error('vincular guardado', mysqli_stmt_error($stmt));
    mysqli_stmt_close($stmt);
    cv_responder(500, 'No se pudo guardar el CV.');
}

if (!mysqli_stmt_send_long_data($stmt, 0, $cv)) {
    cv_error('enviar binario', mysqli_stmt_error($stmt));
    mysqli_stmt_close($stmt);
    cv_responder(500, 'No se pudo guardar el CV.');
}

if (!mysqli_stmt_execute($stmt)) {
    cv_error('ejecutar guardado', mysqli_stmt_error($stmt));
    mysqli_stmt_close($stmt);
    cv_responder(500, 'No se pudo guardar el CV.');
}

mysqli_stmt_close($stmt);
mysqli_close($con);
echo json_encode([
    'ok' => true,
    'msg' => 'CV actualizado correctamente',
]);
