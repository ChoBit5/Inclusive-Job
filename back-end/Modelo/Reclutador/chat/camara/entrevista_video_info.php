<?php

declare(strict_types=1);

// GET ?id_postulacion=N
// Estado del video de verificacion y del informe de Gemini de una postulacion
// de una vacante del reclutador. No devuelve el video.

require_once __DIR__ . '/../../_auth.php';
require_once __DIR__ . '/../../../../Conexion.php';
require_once __DIR__ . '/../../../Postulante/chat/camara/entrevista_video_store.php';

reclutador_headers('GET, OPTIONS');

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'message' => 'Metodo no permitido.'], JSON_UNESCAPED_UNICODE);
    exit;
}

$usuario = requerirRol(['reclutador'], ['inactive_status' => 403]);
$idPostulacion = (int)($_GET['id_postulacion'] ?? 0);

if ($idPostulacion <= 0) {
    http_response_code(422);
    echo json_encode(['ok' => false, 'message' => 'Falta indicar la postulacion.'], JSON_UNESCAPED_UNICODE);
    exit;
}

$con = null;
try {
    $con = conectarbd();
    mysqli_set_charset($con, 'utf8mb4');
    $idReclutador = reclutador_id_desde_usuario($con, (int)($usuario['id'] ?? 0));

    $info = entrevistaVideoInfoParaReclutador($con, $idPostulacion, $idReclutador);
    mysqli_close($con);

    echo json_encode(
        ['ok' => true] + ($info ?? ['tiene_video' => false]),
        JSON_UNESCAPED_UNICODE
    );
} catch (Throwable $e) {
    if ($con instanceof mysqli) {
        mysqli_close($con);
    }
    error_log('[RECLUTADOR_ENTREVISTA_VIDEO_INFO] ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['ok' => false, 'message' => 'No se pudo consultar el video de la entrevista.'], JSON_UNESCAPED_UNICODE);
}
