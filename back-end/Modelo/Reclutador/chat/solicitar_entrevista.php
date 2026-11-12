<?php

declare(strict_types=1);

require_once __DIR__ . '/../_auth.php';
require_once __DIR__ . '/../../../Conexion.php';
require_once __DIR__ . '/../../Postulante/chat/chat_store.php';

function solicitarEntrevistaResponder(int $status, array $body): never
{
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_UNICODE);
    exit;
}

reclutador_headers('POST, OPTIONS');

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    solicitarEntrevistaResponder(405, [
        'ok' => false,
        'message' => 'Metodo no permitido.',
    ]);
}

$usuario = requerirRol(['reclutador'], ['inactive_status' => 403]);
$body = reclutador_json_body();
$idPostulacion = (int)($body['id_postulacion'] ?? 0);

if ($idPostulacion <= 0) {
    solicitarEntrevistaResponder(422, [
        'ok' => false,
        'message' => 'Falta indicar la postulacion.',
    ]);
}

$con = null;
try {
    $con = conectarbd();
    mysqli_set_charset($con, 'utf8mb4');
    $idReclutador = reclutador_id_desde_usuario($con, (int)($usuario['id'] ?? 0));

    $stmt = mysqli_prepare($con, '
        SELECT
            p.id_postulacion,
            p.id_vacante,
            pf.id_postulante,
            u.id_usuario AS id_usuario_postulante,
            CONCAT(COALESCE(u.nombres, \'\'), \' \', COALESCE(u.apellidos, \'\')) AS nombre_completo,
            v.titulo_puesto,
            v.modalidad,
            v.id_reclutador
        FROM postulaciones p
        INNER JOIN postulantes pf ON pf.id_postulante = p.id_postulante
        INNER JOIN usuarios u ON u.id_usuario = pf.id_usuario
        INNER JOIN vacantes v ON v.id_vacante = p.id_vacante
        WHERE p.id_postulacion = ?
        LIMIT 1
    ');
    if ($stmt === false) {
        throw new RuntimeException('No se pudo preparar la consulta de postulacion.');
    }

    mysqli_stmt_bind_param($stmt, 'i', $idPostulacion);
    if (!mysqli_stmt_execute($stmt)) {
        mysqli_stmt_close($stmt);
        throw new RuntimeException('No se pudo consultar la postulacion.');
    }

    $resultado = mysqli_stmt_get_result($stmt);
    $fila = $resultado ? mysqli_fetch_assoc($resultado) : null;
    mysqli_stmt_close($stmt);

    if (!$fila) {
        solicitarEntrevistaResponder(404, [
            'ok' => false,
            'message' => 'No se encontro esa postulacion.',
        ]);
    }

    if ((int)$fila['id_reclutador'] !== $idReclutador) {
        solicitarEntrevistaResponder(403, [
            'ok' => false,
            'message' => 'No tienes autorizacion sobre esta postulacion.',
        ]);
    }

    $idVacante = (int)$fila['id_vacante'];
    $idUsuarioPostulante = (int)$fila['id_usuario_postulante'];
    $tituloPuesto = (string)$fila['titulo_puesto'];
    $modalidad = (string)$fila['modalidad'];
    $nombreCompleto = trim((string)$fila['nombre_completo']);
    $mensaje = "Un reclutador te invito a una entrevista para el puesto \"$tituloPuesto\".";
    $payload = json_encode([
        'text' => $mensaje,
        'vacante' => [
            'id_vacante' => $idVacante,
            'titulo_puesto' => $tituloPuesto,
            'empresa' => '',
            'modalidad' => $modalidad,
        ],
    ], JSON_UNESCAPED_UNICODE);

    if (!is_string($payload)) {
        throw new RuntimeException('No se pudo preparar la notificacion.');
    }

    save_chat_interaction(
        $con,
        $idUsuarioPostulante,
        'entrevista_real_solicitada',
        'Solicitud de entrevista oficial del reclutador',
        $payload,
        'entrevista_real_solicitada'
    );

    solicitarEntrevistaResponder(200, [
        'ok' => true,
        'mensaje' => "Se envio la solicitud de entrevista a $nombreCompleto.",
    ]);
} catch (Throwable $e) {
    if ($con instanceof mysqli) {
        mysqli_close($con);
    }

    error_log('[RECLUTADOR_SOLICITAR_ENTREVISTA] ' . $e->getMessage());
    solicitarEntrevistaResponder(500, [
        'ok' => false,
        'message' => 'Error interno al solicitar la entrevista.',
    ]);
}
