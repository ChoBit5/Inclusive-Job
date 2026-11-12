<?php

declare(strict_types=1);

require_once __DIR__ . '/../../../config/auth.php';
require_once __DIR__ . '/../../../Conexion.php';
require_once __DIR__ . '/entrevista_context.php';
require_once __DIR__ . '/entrevista_groq.php';

inclusijob_cors_headers('POST, OPTIONS', 'Content-Type, Authorization');

function entrevistaResponderError(int $status, string $message): never
{
    http_response_code($status);
    echo json_encode(['ok' => false, 'message' => $message], JSON_UNESCAPED_UNICODE);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    entrevistaResponderError(405, 'Metodo no permitido.');
}

$usuario = requerirRol(['postulante'], ['inactive_status' => 403]);
$body = json_decode(file_get_contents('php://input'), true);
$body = is_array($body) ? $body : [];
$idVacante = (int)($body['id_vacante'] ?? 0);
$mensaje = trim((string)($body['mensaje'] ?? ''));
$historialCrudo = $body['historial'] ?? [];

if ($idVacante <= 0) {
    entrevistaResponderError(400, 'Falta indicar la vacante de la entrevista.');
}

if ($mensaje === '') {
    entrevistaResponderError(400, 'Escribe una respuesta antes de continuar.');
}

if (!entrevistaGroqConfiguracionValida()) {
    entrevistaResponderError(503, 'El servicio de entrevista con IA no esta configurado.');
}

$con = null;
try {
    $con = conectarbd();
    mysqli_set_charset($con, 'utf8mb4');

    $vacante = obtener_vacante_para_entrevista($con, (int)($usuario['id'] ?? 0), $idVacante);
    mysqli_close($con);
    $con = null;

    if (!$vacante) {
        entrevistaResponderError(404, 'No estas postulado a esa vacante o ya no existe.');
    }

    $historial = limpiar_historial_entrevista($historialCrudo);
    $mensajes = [['role' => 'system', 'content' => construirContextoEntrevista($vacante)]];
    foreach ($historial as $item) {
        $mensajes[] = $item;
    }
    $mensajes[] = [
        'role' => 'user',
        'content' => mb_substr($mensaje, 0, 2000, 'UTF-8'),
    ];

    $respuesta = entrevistaGroqSolicitar([
        'model' => INCLUSIJOB_GROQ_MODEL,
        'temperature' => 0.4,
        'max_tokens' => 500,
        'messages' => $mensajes,
    ], 25, $groqError);

    $mensajeIa = is_array($respuesta)
        ? trim((string)($respuesta['choices'][0]['message']['content'] ?? ''))
        : '';
    if (!is_array($respuesta) || $mensajeIa === '') {
        error_log('[POSTULANTE_ENTREVISTA_RESPONDER] ' . ($groqError ?: 'respuesta no valida'));
        entrevistaResponderError(502, 'No se pudo continuar la entrevista con IA.');
    }

    echo json_encode([
        'auth' => true,
        'ok' => true,
        'mensaje' => $mensajeIa,
    ], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    if ($con instanceof mysqli) {
        mysqli_close($con);
    }

    error_log('[POSTULANTE_ENTREVISTA_RESPONDER] ' . $e->getMessage());
    entrevistaResponderError(500, 'Error interno al continuar la entrevista.');
}
