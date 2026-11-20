<?php

declare(strict_types=1);

// POST { id_postulacion }
// Vuelve a pedir el analisis a Gemini cuando fallo (maximo 3 intentos).

require_once __DIR__ . '/../../_auth.php';
require_once __DIR__ . '/../../../../Conexion.php';
require_once __DIR__ . '/../../../Postulante/chat/camara/entrevista_video_store.php';
require_once __DIR__ . '/../../../Postulante/chat/camara/entrevista_video_gemini.php';

reclutador_headers('POST, OPTIONS');
ini_set('memory_limit', '384M');

function entrevistaVideoReintentarError(int $status, string $message): never
{
    http_response_code($status);
    echo json_encode(['ok' => false, 'message' => $message], JSON_UNESCAPED_UNICODE);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    entrevistaVideoReintentarError(405, 'Metodo no permitido.');
}

$usuario = requerirRol(['reclutador'], ['inactive_status' => 403]);
$body = reclutador_json_body();
$idPostulacion = (int)($body['id_postulacion'] ?? 0);

if ($idPostulacion <= 0) {
    entrevistaVideoReintentarError(422, 'Falta indicar la postulacion.');
}

$con = null;
$rutaTmp = null;
try {
    $con = conectarbd();
    mysqli_set_charset($con, 'utf8mb4');
    $idReclutador = reclutador_id_desde_usuario($con, (int)($usuario['id'] ?? 0));

    $info = entrevistaVideoInfoParaReclutador($con, $idPostulacion, $idReclutador);
    if ($info === null) {
        mysqli_close($con);
        entrevistaVideoReintentarError(404, 'No se encontró el video de esta entrevista.');
    }
    if (!$info['puede_reintentar']) {
        mysqli_close($con);
        entrevistaVideoReintentarError(409, 'Este análisis no se puede reintentar.');
    }

    $stmt = mysqli_prepare($con, 'SELECT id_entrevista_video, video, tipo_video, camara_interrumpida FROM entrevista_video WHERE id_postulacion = ? LIMIT 1');
    if ($stmt === false) {
        throw new RuntimeException('No se pudo preparar la lectura del video.');
    }
    mysqli_stmt_bind_param($stmt, 'i', $idPostulacion);
    mysqli_stmt_execute($stmt);
    $res = mysqli_stmt_get_result($stmt);
    $fila = $res ? mysqli_fetch_assoc($res) : null;
    mysqli_stmt_close($stmt);

    if (!$fila || empty($fila['video'])) {
        mysqli_close($con);
        entrevistaVideoReintentarError(404, 'El video ya no está disponible.');
    }

    $rutaTmp = tempnam(sys_get_temp_dir(), 'inclusijob_ev_');
    if ($rutaTmp === false || file_put_contents($rutaTmp, $fila['video']) === false) {
        throw new RuntimeException('No se pudo preparar el video para reanalizarlo.');
    }
    $idEntrevistaVideo = (int)$fila['id_entrevista_video'];
    $tipoVideo = (string)$fila['tipo_video'];
    $camaraInterrumpida = (bool)(int)$fila['camara_interrumpida'];
    unset($fila);

    // Se marca como "procesando" antes de responder, para que el panel lo refleje.
    $stmt = mysqli_prepare($con, "UPDATE entrevista_video SET estado_analisis = 'procesando', error_analisis = NULL WHERE id_entrevista_video = ?");
    if ($stmt) {
        mysqli_stmt_bind_param($stmt, 'i', $idEntrevistaVideo);
        mysqli_stmt_execute($stmt);
        mysqli_stmt_close($stmt);
    }
} catch (Throwable $e) {
    if ($rutaTmp) {
        @unlink($rutaTmp);
    }
    if ($con instanceof mysqli) {
        mysqli_close($con);
    }
    error_log('[RECLUTADOR_ENTREVISTA_VIDEO_REINTENTAR] ' . $e->getMessage());
    entrevistaVideoReintentarError(500, 'No se pudo reintentar el análisis.');
}

entrevistaVideoResponderYContinuar(['ok' => true, 'message' => 'Analizando de nuevo el video.']);

entrevistaVideoEjecutarAnalisis($con, $idEntrevistaVideo, $rutaTmp, $tipoVideo, $camaraInterrumpida);
@unlink($rutaTmp);
mysqli_close($con);
exit;
