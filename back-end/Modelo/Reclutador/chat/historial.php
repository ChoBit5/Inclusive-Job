<?php

declare(strict_types=1);

require_once __DIR__ . '/../../../config/auth.php';
require_once __DIR__ . '/../../../Conexion.php';

inclusijob_cors_headers('GET, OPTIONS', 'Content-Type, Authorization');

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    http_response_code(405);
    echo json_encode([
        'auth' => false,
        'ok' => false,
        'message' => 'Metodo no permitido',
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$usuario = requerirRol(['reclutador'], ['include_auth' => true, 'inactive_status' => 403]);
$idUsuario = (int)($usuario['id'] ?? 0);
$con = null;

try {
    $con = conectarbd();
    mysqli_set_charset($con, 'utf8mb4');

    $sql = '
        SELECT *
        FROM (
            SELECT
                id_chatbot,
                tipo_interaccion,
                mensaje_usuario,
                respuesta_ia,
                resultado,
                calificacion,
                fecha
            FROM chabots
            WHERE id_usuario = ?
            ORDER BY fecha DESC, id_chatbot DESC
            LIMIT 40
        ) historial
        ORDER BY fecha ASC, id_chatbot ASC
    ';

    $stmt = mysqli_prepare($con, $sql);
    if (!$stmt) {
        throw new RuntimeException('No se pudo preparar la consulta del historial.');
    }

    mysqli_stmt_bind_param($stmt, 'i', $idUsuario);
    if (!mysqli_stmt_execute($stmt)) {
        mysqli_stmt_close($stmt);
        throw new RuntimeException('No se pudo ejecutar la consulta del historial.');
    }

    $resultado = mysqli_stmt_get_result($stmt);
    if ($resultado === false) {
        mysqli_stmt_close($stmt);
        throw new RuntimeException('No se pudo leer la consulta del historial.');
    }

    $items = [];
    while ($fila = mysqli_fetch_assoc($resultado)) {
        $items[] = [
            'id' => (int)$fila['id_chatbot'],
            'tipo_interaccion' => $fila['tipo_interaccion'],
            'mensaje_usuario' => $fila['mensaje_usuario'],
            'respuesta_ia' => $fila['respuesta_ia'],
            'resultado' => $fila['resultado'],
            'calificacion' => $fila['calificacion'] !== null ? (int)$fila['calificacion'] : null,
            'fecha' => $fila['fecha'],
        ];
    }

    mysqli_stmt_close($stmt);
    mysqli_close($con);
    echo json_encode([
        'auth' => true,
        'ok' => true,
        'historial' => $items,
    ], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    if ($con instanceof mysqli) {
        mysqli_close($con);
    }

    error_log('[RECLUTADOR_CHAT_HISTORIAL] ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'auth' => true,
        'ok' => false,
        'message' => 'Error al cargar historial',
    ], JSON_UNESCAPED_UNICODE);
}

