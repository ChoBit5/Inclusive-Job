<?php

declare(strict_types=1);

// POST multipart (id_vacante, video, camara_interrumpida).
// Lo llama el modal de la entrevista real justo despues de finalizarla.
// Guarda el video en entrevista_video y, sin hacer esperar al postulante,
// pide a Gemini el informe y lo guarda en la misma fila.

require_once __DIR__ . '/../../../../config/auth.php';
require_once __DIR__ . '/../../../../Conexion.php';
require_once __DIR__ . '/entrevista_video_store.php';
require_once __DIR__ . '/entrevista_video_gemini.php';

inclusijob_cors_headers('POST, OPTIONS', 'Content-Type, Authorization');

function entrevistaVideoError(int $status, string $message): never
{
    http_response_code($status);
    echo json_encode(['ok' => false, 'message' => $message], JSON_UNESCAPED_UNICODE);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    entrevistaVideoError(405, 'Metodo no permitido.');
}

$usuario = requerirRol(['postulante'], ['inactive_status' => 403]);
$idUsuario = (int)($usuario['id'] ?? 0);

// Cuando el cuerpo supera post_max_size, PHP vacia $_POST y $_FILES sin avisar.
if (empty($_FILES) && (int)($_SERVER['CONTENT_LENGTH'] ?? 0) > 0) {
    entrevistaVideoError(413, 'El video pesa más de lo que permite el servidor. Avisa al equipo para subir post_max_size y upload_max_filesize en php.ini.');
}

$idVacante = (int)($_POST['id_vacante'] ?? 0);
if ($idVacante <= 0) {
    entrevistaVideoError(400, 'Falta indicar la vacante de la entrevista.');
}

$archivo = $_FILES['video'] ?? null;
if (!is_array($archivo) || ($archivo['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
    $codigoSubida = is_array($archivo) ? (int)($archivo['error'] ?? UPLOAD_ERR_NO_FILE) : UPLOAD_ERR_NO_FILE;
    if (in_array($codigoSubida, [UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE], true)) {
        entrevistaVideoError(413, 'El video pesa más de lo que permite el servidor (upload_max_filesize).');
    }
    entrevistaVideoError(400, 'No se recibió correctamente el video.');
}

$tamano = (int)($archivo['size'] ?? 0);
if ($tamano <= 0 || $tamano > ENTREVISTA_VIDEO_MAX_BYTES) {
    entrevistaVideoError(413, 'El video debe pesar entre 1 byte y ' . (int)(ENTREVISTA_VIDEO_MAX_BYTES / 1048576) . ' MB.');
}

$rutaTmp = (string)$archivo['tmp_name'];
if (!is_uploaded_file($rutaTmp)) {
    entrevistaVideoError(400, 'El archivo recibido no es válido.');
}

$tipoVideo = entrevistaVideoDetectarTipo($rutaTmp);
if ($tipoVideo === null) {
    entrevistaVideoError(415, 'El formato del video no es compatible (se aceptan WebM y MP4).');
}

$camaraInterrumpida = filter_var($_POST['camara_interrumpida'] ?? '0', FILTER_VALIDATE_BOOLEAN);

$con = null;
try {
    $con = conectarbd();
    mysqli_set_charset($con, 'utf8mb4');

    // Postulacion del usuario a esa vacante.
    $stmt = mysqli_prepare($con, '
        SELECT po.id_postulacion
        FROM postulaciones po
        INNER JOIN postulantes p ON p.id_postulante = po.id_postulante
        WHERE p.id_usuario = ? AND po.id_vacante = ?
        ORDER BY po.fecha_postulacion DESC
        LIMIT 1
    ');
    if ($stmt === false) {
        throw new RuntimeException('No se pudo consultar la postulacion.');
    }
    mysqli_stmt_bind_param($stmt, 'ii', $idUsuario, $idVacante);
    mysqli_stmt_execute($stmt);
    $res = mysqli_stmt_get_result($stmt);
    $fila = $res ? mysqli_fetch_assoc($res) : null;
    mysqli_stmt_close($stmt);

    if (!$fila) {
        mysqli_close($con);
        entrevistaVideoError(404, 'No estás postulado a esa vacante.');
    }
    $idPostulacion = (int)$fila['id_postulacion'];

    // Solo se acepta video de una entrevista terminada hace poco.
    $stmt = mysqli_prepare($con, "
        SELECT 1
        FROM chabots
        WHERE id_usuario = ?
          AND resultado = 'entrevista_real_realizada'
          AND JSON_EXTRACT(respuesta_ia, '\$.vacante.id_vacante') = ?
          AND fecha >= (NOW() - INTERVAL " . ENTREVISTA_VIDEO_VENTANA_SUBIDA_MINUTOS . " MINUTE)
        LIMIT 1
    ");
    if ($stmt === false) {
        throw new RuntimeException('No se pudo verificar la entrevista.');
    }
    mysqli_stmt_bind_param($stmt, 'ii', $idUsuario, $idVacante);
    mysqli_stmt_execute($stmt);
    $res = mysqli_stmt_get_result($stmt);
    $entrevistaTerminada = (bool)($res && mysqli_fetch_assoc($res));
    mysqli_stmt_close($stmt);

    if (!$entrevistaTerminada) {
        mysqli_close($con);
        entrevistaVideoError(409, 'No hay una entrevista recién terminada para esta vacante.');
    }

    // Un solo video por postulacion.
    $stmt = mysqli_prepare($con, 'SELECT 1 FROM entrevista_video WHERE id_postulacion = ? LIMIT 1');
    if ($stmt === false) {
        throw new RuntimeException('No se pudo verificar el video previo.');
    }
    mysqli_stmt_bind_param($stmt, 'i', $idPostulacion);
    mysqli_stmt_execute($stmt);
    $res = mysqli_stmt_get_result($stmt);
    $yaExiste = (bool)($res && mysqli_fetch_assoc($res));
    mysqli_stmt_close($stmt);

    if ($yaExiste) {
        mysqli_close($con);
        entrevistaVideoError(409, 'El video de esta entrevista ya fue enviado.');
    }

    $idEntrevistaVideo = entrevistaVideoGuardar($con, $idPostulacion, $rutaTmp, $tipoVideo, $tamano, $camaraInterrumpida);
} catch (Throwable $e) {
    if ($con instanceof mysqli) {
        mysqli_close($con);
    }
    error_log('[POSTULANTE_ENTREVISTA_VIDEO] ' . $e->getMessage());
    entrevistaVideoError(500, 'No se pudo guardar el video de verificación.');
}

// Respuesta inmediata: el postulante no espera al analisis.
entrevistaVideoResponderYContinuar(['ok' => true, 'message' => 'Video recibido.']);

// ---- A partir de aqui el postulante ya tiene su respuesta ----
// El tmp_name sigue existiendo hasta que termine el script.
entrevistaVideoEjecutarAnalisis($con, $idEntrevistaVideo, $rutaTmp, $tipoVideo, $camaraInterrumpida);
mysqli_close($con);
exit;
