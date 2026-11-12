<?php

declare(strict_types=1);

require_once __DIR__ . '/../../../config/auth.php';
require_once __DIR__ . '/../../../Conexion.php';
require_once __DIR__ . '/entrevista_context.php';
require_once __DIR__ . '/entrevista_groq.php';

inclusijob_cors_headers('POST, OPTIONS', 'Content-Type, Authorization');

function entrevistaIniciarError(int $status, string $message): never
{
    http_response_code($status);
    echo json_encode(['ok' => false, 'message' => $message], JSON_UNESCAPED_UNICODE);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    entrevistaIniciarError(405, 'Metodo no permitido.');
}

$usuario = requerirRol(['postulante'], ['inactive_status' => 403]);
$body = json_decode(file_get_contents('php://input'), true);
$idVacante = (int)(is_array($body) ? ($body['id_vacante'] ?? 0) : 0);

if ($idVacante <= 0) {
    entrevistaIniciarError(400, 'Falta indicar la vacante para la entrevista.');
}

if (!entrevistaGroqConfiguracionValida()) {
    entrevistaIniciarError(503, 'El servicio de entrevista con IA no esta configurado.');
}

$con = null;
try {
    $con = conectarbd();
    mysqli_set_charset($con, 'utf8mb4');

    $vacante = obtener_vacante_para_entrevista($con, (int)($usuario['id'] ?? 0), $idVacante);
    mysqli_close($con);
    $con = null;

    if (!$vacante) {
        entrevistaIniciarError(404, 'No estas postulado a esa vacante o ya no existe.');
    }

    $respuesta = entrevistaGroqSolicitar([
        'model' => INCLUSIJOB_GROQ_MODEL,
        'temperature' => 0.4,
        'max_tokens' => 500,
        'messages' => [
            ['role' => 'system', 'content' => construirContextoEntrevista($vacante)],
            ['role' => 'user', 'content' => 'Inicia la entrevista simulada.'],
        ],
    ], 25, $groqError);

    $mensaje = is_array($respuesta)
        ? trim((string)($respuesta['choices'][0]['message']['content'] ?? ''))
        : '';
    if (!is_array($respuesta) || $mensaje === '') {
        error_log('[POSTULANTE_ENTREVISTA_INICIAR] ' . ($groqError ?: 'respuesta no valida'));
        entrevistaIniciarError(502, 'No se pudo iniciar la entrevista con IA.');
    }

    echo json_encode([
        'auth' => true,
        'ok' => true,
        'mensaje' => $mensaje,
        'vacante' => [
            'id_vacante' => $vacante['id_vacante'],
            'titulo_puesto' => $vacante['titulo_puesto'],
            'empresa' => $vacante['empresa'],
            'modalidad' => $vacante['modalidad'],
        ],
    ], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    if ($con instanceof mysqli) {
        mysqli_close($con);
    }

    error_log('[POSTULANTE_ENTREVISTA_INICIAR] ' . $e->getMessage());
    entrevistaIniciarError(500, 'Error interno al iniciar la entrevista.');
}
