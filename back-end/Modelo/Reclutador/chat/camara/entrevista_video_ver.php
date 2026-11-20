<?php

declare(strict_types=1);

// POST { id_postulacion }
// Entrega el video de verificacion UNA sola vez: marca video_visto = 1 dentro
// de una transaccion y recien despues envia los bytes. Una segunda llamada
// responde 410.

require_once __DIR__ . '/../../_auth.php';
require_once __DIR__ . '/../../../../Conexion.php';
require_once __DIR__ . '/../../../Postulante/chat/camara/entrevista_video_store.php';

reclutador_headers('POST, OPTIONS');
ini_set('memory_limit', '384M');

function entrevistaVideoVerError(int $status, string $message): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['ok' => false, 'message' => $message], JSON_UNESCAPED_UNICODE);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    entrevistaVideoVerError(405, 'Metodo no permitido.');
}

$usuario = requerirRol(['reclutador'], ['inactive_status' => 403]);
$body = reclutador_json_body();
$idPostulacion = (int)($body['id_postulacion'] ?? 0);

if ($idPostulacion <= 0) {
    entrevistaVideoVerError(422, 'Falta indicar la postulacion.');
}

$con = null;
$video = null;
$tipoVideo = '';
try {
    $con = conectarbd();
    mysqli_set_charset($con, 'utf8mb4');
    $idReclutador = reclutador_id_desde_usuario($con, (int)($usuario['id'] ?? 0));

    // 1. Permiso: la postulacion debe ser de una vacante de este reclutador.
    $info = entrevistaVideoInfoParaReclutador($con, $idPostulacion, $idReclutador);
    if ($info === null) {
        mysqli_close($con);
        entrevistaVideoVerError(404, 'No se encontró el video de esta entrevista.');
    }

    // 2. Bloqueo de la fila y marca de "visto" (solo esa tabla).
    mysqli_begin_transaction($con);

    $stmt = mysqli_prepare($con, 'SELECT id_entrevista_video, video, tipo_video, video_visto FROM entrevista_video WHERE id_postulacion = ? FOR UPDATE');
    if ($stmt === false) {
        throw new RuntimeException('No se pudo preparar la lectura del video.');
    }
    mysqli_stmt_bind_param($stmt, 'i', $idPostulacion);
    mysqli_stmt_execute($stmt);
    $res = mysqli_stmt_get_result($stmt);
    $fila = $res ? mysqli_fetch_assoc($res) : null;
    mysqli_stmt_close($stmt);

    if (!$fila) {
        mysqli_rollback($con);
        mysqli_close($con);
        entrevistaVideoVerError(404, 'No se encontró el video de esta entrevista.');
    }
    if ((int)$fila['video_visto'] !== 0) {
        mysqli_rollback($con);
        mysqli_close($con);
        entrevistaVideoVerError(410, 'Este video ya fue consultado y no se puede volver a ver.');
    }
    if (empty($fila['video']) || !in_array($fila['tipo_video'], ['video/webm', 'video/mp4'], true)) {
        mysqli_rollback($con);
        mysqli_close($con);
        entrevistaVideoVerError(500, 'El video guardado no está disponible.');
    }

    $idEntrevistaVideo = (int)$fila['id_entrevista_video'];
    $stmt = mysqli_prepare($con, 'UPDATE entrevista_video SET video_visto = 1, fecha_visto = NOW() WHERE id_entrevista_video = ? AND video_visto = 0');
    if ($stmt === false) {
        throw new RuntimeException('No se pudo marcar el video como visto.');
    }
    mysqli_stmt_bind_param($stmt, 'i', $idEntrevistaVideo);
    mysqli_stmt_execute($stmt);
    $actualizadas = mysqli_stmt_affected_rows($stmt);
    mysqli_stmt_close($stmt);

    if ($actualizadas !== 1) {
        mysqli_rollback($con);
        mysqli_close($con);
        entrevistaVideoVerError(410, 'Este video ya fue consultado y no se puede volver a ver.');
    }

    mysqli_commit($con);
    $video = (string)$fila['video'];
    $tipoVideo = (string)$fila['tipo_video'];
    unset($fila);
    mysqli_close($con);
} catch (Throwable $e) {
    if ($con instanceof mysqli) {
        try {
            mysqli_rollback($con);
        } catch (Throwable $inner) {
        }
        mysqli_close($con);
    }
    error_log('[RECLUTADOR_ENTREVISTA_VIDEO_VER] ' . $e->getMessage());
    entrevistaVideoVerError(500, 'No fue posible recuperar el video.');
}

// 3. Entrega del video.
if (session_status() === PHP_SESSION_ACTIVE) {
    session_write_close();
}
while (ob_get_level() > 0) {
    ob_end_clean();
}
header('Cache-Control: no-store, private, max-age=0');
header('X-Content-Type-Options: nosniff');
header('Content-Type: ' . $tipoVideo);
header('Content-Length: ' . strlen($video));
echo $video;
exit;
