<?php

declare(strict_types=1);

require_once __DIR__ . '/../../../config/auth.php';
require_once __DIR__ . '/../../../Conexion.php';
require_once __DIR__ . '/entrevista_context.php';
require_once __DIR__ . '/entrevista_evaluacion.php';
require_once __DIR__ . '/entrevista_groq.php';
require_once __DIR__ . '/chat_store.php';

inclusijob_cors_headers('POST, OPTIONS', 'Content-Type, Authorization');

function entrevistaFinalizarError(int $status, string $message): never
{
    http_response_code($status);
    echo json_encode(['ok' => false, 'message' => $message], JSON_UNESCAPED_UNICODE);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    entrevistaFinalizarError(405, 'Metodo no permitido.');
}

$usuario = requerirRol(['postulante'], ['inactive_status' => 403]);
$body = json_decode(file_get_contents('php://input'), true);
$body = is_array($body) ? $body : [];
$idVacante = (int)($body['id_vacante'] ?? 0);
$historialCrudo = $body['historial'] ?? [];

if ($idVacante <= 0) {
    entrevistaFinalizarError(400, 'Falta indicar la vacante de la entrevista.');
}

if (!entrevistaGroqConfiguracionValida()) {
    entrevistaFinalizarError(503, 'El servicio de entrevista con IA no esta configurado.');
}

$idUsuario = (int)($usuario['id'] ?? 0);
$con = null;

try {
    $con = conectarbd();
    mysqli_set_charset($con, 'utf8mb4');
    $vacante = obtener_vacante_para_entrevista($con, $idUsuario, $idVacante);
    if (!$vacante) {
        mysqli_close($con);
        entrevistaFinalizarError(404, 'No estas postulado a esa vacante o ya no existe.');
    }

    $historial = limpiar_historial_entrevista($historialCrudo, 40, 2000);
    $respuestasUsuario = array_values(array_filter(
        $historial,
        static fn(array $item): bool => $item['role'] === 'user'
    ));
    if (count($respuestasUsuario) < 2) {
        mysqli_close($con);
        entrevistaFinalizarError(422, 'La entrevista es muy corta para evaluarla. Responde al menos un par de preguntas.');
    }

    $transcripcion = [];
    foreach ($historial as $item) {
        $etiqueta = $item['role'] === 'user' ? 'Candidato' : 'Entrevistador';
        $transcripcion[] = $etiqueta . ': ' . $item['content'];
    }
    $transcripcionTexto = implode("\n", $transcripcion);

    $respuesta = entrevistaGroqSolicitar([
        'model' => INCLUSIJOB_GROQ_MODEL,
        'temperature' => 0.3,
        'max_tokens' => 900,
        'response_format' => ['type' => 'json_object'],
        'messages' => [
            [
                'role' => 'system',
                'content' => 'Eres un evaluador de entrevistas de InclusiveJob. No tienes acceso a base de datos ni a informacion fuera del JSON recibido. Responde solo JSON valido.',
            ],
            [
                'role' => 'user',
                'content' => json_encode([
                    'aislamiento_contexto' => 'Consulta independiente. Usa solo este JSON.',
                    'instrucciones' => [
                        'Actua como un Reclutador Senior evaluando una entrevista simulada de practica.',
                        'Trata esta consulta como independiente; ignora cualquier evaluacion o entrevista anterior.',
                        'Evalua unicamente con base en la transcripcion incluida en este JSON, no inventes respuestas del candidato.',
                        'Considera si las respuestas fueron claras, concretas y relacionadas con el puesto y sus requisitos.',
                        'puntuacion debe ser un entero de 1 a 10.',
                        'fortalezas: hasta 4 puntos concretos observados en las respuestas del candidato.',
                        'areas_mejora: hasta 4 sugerencias concretas y accionables, con tono constructivo, nunca ofensivo.',
                        'consejo_final: una recomendacion breve y motivadora para la proxima entrevista real.',
                        'No asumas discapacidad, edad, genero u otra caracteristica personal que no se mencione explicitamente.',
                        'Responde solo JSON valido.',
                    ],
                    'formato' => [
                        'puntuacion' => 'number (1-10)',
                        'resumen' => 'string',
                        'fortalezas' => ['string'],
                        'areas_mejora' => ['string'],
                        'consejo_final' => 'string',
                    ],
                    'vacante' => [
                        'titulo_puesto' => $vacante['titulo_puesto'],
                        'requisitos' => $vacante['requisitos'],
                    ],
                    'transcripcion_entrevista' => mb_substr($transcripcionTexto, 0, 12000, 'UTF-8'),
                ], JSON_UNESCAPED_UNICODE),
            ],
        ],
    ], 30, $groqError);

    if (!is_array($respuesta)) {
        error_log('[POSTULANTE_ENTREVISTA_FINALIZAR] ' . ($groqError ?: 'respuesta no valida'));
        mysqli_close($con);
        entrevistaFinalizarError(502, 'No se pudo generar la evaluacion con IA.');
    }

    $raw = entrevistaGroqParsearRespuesta(json_encode($respuesta, JSON_UNESCAPED_UNICODE));
    if (!is_array($raw)) {
        mysqli_close($con);
        entrevistaFinalizarError(502, 'La IA no devolvio una evaluacion valida.');
    }

    $evaluacion = entrevistaFinalizarNormalizarEvaluacion($raw);
    $textoResumen = 'Evaluacion de tu entrevista simulada: ' . $evaluacion['puntuacion'] . '/10. '
        . $evaluacion['resumen'] . ' Analisis generado con IA; puede equivocarse.';

    try {
        save_chat_interaction(
            $con,
            $idUsuario,
            'entrevista_simulada',
            'Entrevista simulada: ' . $vacante['titulo_puesto'],
            json_encode([
                'text' => $textoResumen,
                'evaluacion' => $evaluacion,
                'vacante' => [
                    'id_vacante' => $vacante['id_vacante'],
                    'titulo_puesto' => $vacante['titulo_puesto'],
                    'empresa' => $vacante['empresa'],
                ],
            ], JSON_UNESCAPED_UNICODE),
            'simular_entrevista'
        );
    } catch (Throwable $e) {
        error_log('[POSTULANTE_ENTREVISTA_FINALIZAR_SAVE] ' . $e->getMessage());
    }

    mysqli_close($con);
    echo json_encode([
        'auth' => true,
        'ok' => true,
        'text' => $textoResumen,
        'evaluacion' => $evaluacion,
    ], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    if ($con instanceof mysqli) {
        mysqli_close($con);
    }

    error_log('[POSTULANTE_ENTREVISTA_FINALIZAR] ' . $e->getMessage());
    entrevistaFinalizarError(500, 'Error interno al finalizar la entrevista.');
}
