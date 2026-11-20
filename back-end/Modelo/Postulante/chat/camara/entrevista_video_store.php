<?php

declare(strict_types=1);

// Helpers compartidos del video de verificacion de la entrevista real.
// Los usan: Postulante/chat/entrevista_video.php (subida) y los endpoints
// Reclutador/chat/entrevista_video_*.php (consulta, reintento y visor).

const ENTREVISTA_VIDEO_MAX_BYTES = 80 * 1024 * 1024;
const ENTREVISTA_VIDEO_MAX_INTENTOS = 3;
const ENTREVISTA_VIDEO_MINUTOS_ATASCADO = 15;
const ENTREVISTA_VIDEO_VENTANA_SUBIDA_MINUTOS = 30;

/**
 * Detecta el formato real del archivo por sus primeros bytes
 * (no se confia en el tipo que declara el navegador).
 */
function entrevistaVideoDetectarTipo(string $ruta): ?string
{
    $fh = @fopen($ruta, 'rb');
    if ($fh === false) {
        return null;
    }
    $cabecera = (string)fread($fh, 12);
    fclose($fh);

    if (strlen($cabecera) < 8) {
        return null;
    }
    // WebM / Matroska (EBML).
    if (substr($cabecera, 0, 4) === "\x1A\x45\xDF\xA3") {
        return 'video/webm';
    }
    // MP4 (Safari): "ftyp" en los bytes 4-7.
    if (substr($cabecera, 4, 4) === 'ftyp') {
        return 'video/mp4';
    }
    return null;
}

/**
 * Guarda el video en la tabla entrevista_video leyendolo del archivo temporal
 * por bloques (no lo carga completo en memoria). Devuelve el id insertado.
 */
function entrevistaVideoGuardar(
    mysqli $con,
    int $idPostulacion,
    string $rutaArchivo,
    string $tipoVideo,
    int $tamano,
    bool $camaraInterrumpida
): int {
    $stmt = mysqli_prepare(
        $con,
        'INSERT INTO entrevista_video (id_postulacion, video, tipo_video, tamano_bytes, camara_interrumpida)
         VALUES (?, ?, ?, ?, ?)'
    );
    if ($stmt === false) {
        throw new RuntimeException('No se pudo preparar el guardado del video.');
    }

    $vacio = null;
    $interrumpida = $camaraInterrumpida ? 1 : 0;
    mysqli_stmt_bind_param($stmt, 'ibsii', $idPostulacion, $vacio, $tipoVideo, $tamano, $interrumpida);

    $fh = fopen($rutaArchivo, 'rb');
    if ($fh === false) {
        mysqli_stmt_close($stmt);
        throw new RuntimeException('No se pudo leer el video recibido.');
    }
    while (!feof($fh)) {
        $bloque = fread($fh, 1024 * 1024);
        if ($bloque === false || $bloque === '') {
            break;
        }
        if (!mysqli_stmt_send_long_data($stmt, 1, $bloque)) {
            fclose($fh);
            mysqli_stmt_close($stmt);
            throw new RuntimeException('No se pudo enviar el video a la base de datos.');
        }
    }
    fclose($fh);

    if (!mysqli_stmt_execute($stmt)) {
        $error = mysqli_stmt_error($stmt);
        mysqli_stmt_close($stmt);
        throw new RuntimeException('No se pudo guardar el video: ' . $error);
    }

    $id = (int)mysqli_insert_id($con);
    mysqli_stmt_close($stmt);
    return $id;
}

/**
 * Datos del video/analisis de una postulacion, solo si pertenece a una
 * vacante del reclutador indicado. No incluye el video. Devuelve null si no
 * hay video o si la postulacion no es de ese reclutador.
 */
function entrevistaVideoInfoParaReclutador(mysqli $con, int $idPostulacion, int $idReclutador): ?array
{
    $stmt = mysqli_prepare($con, '
        SELECT
            ev.id_entrevista_video,
            ev.camara_interrumpida,
            ev.video_visto,
            ev.estado_analisis,
            ev.informe_ia,
            ev.sugiere_revision,
            ev.error_analisis,
            ev.intentos_analisis,
            (ev.video IS NOT NULL AND ev.tamano_bytes > 0) AS tiene_blob,
            TIMESTAMPDIFF(MINUTE, ev.fecha_actualizacion, NOW()) AS minutos_sin_cambios
        FROM entrevista_video ev
        INNER JOIN postulaciones p ON p.id_postulacion = ev.id_postulacion
        INNER JOIN vacantes v ON v.id_vacante = p.id_vacante
        WHERE ev.id_postulacion = ?
          AND v.id_reclutador = ?
        LIMIT 1
    ');
    if ($stmt === false) {
        throw new RuntimeException('No se pudo preparar la consulta del video.');
    }

    mysqli_stmt_bind_param($stmt, 'ii', $idPostulacion, $idReclutador);
    if (!mysqli_stmt_execute($stmt)) {
        mysqli_stmt_close($stmt);
        throw new RuntimeException('No se pudo consultar el video.');
    }
    $resultado = mysqli_stmt_get_result($stmt);
    $fila = $resultado ? mysqli_fetch_assoc($resultado) : null;
    mysqli_stmt_close($stmt);

    if (!$fila) {
        return null;
    }

    $estado = (string)$fila['estado_analisis'];
    $error = $fila['error_analisis'] !== null ? (string)$fila['error_analisis'] : null;

    // Si el analisis quedo "en proceso" demasiado tiempo (se cayo el servidor),
    // se muestra como error para poder reintentar.
    if (
        in_array($estado, ['pendiente', 'procesando'], true)
        && (int)$fila['minutos_sin_cambios'] >= ENTREVISTA_VIDEO_MINUTOS_ATASCADO
    ) {
        $estado = 'error';
        $error = 'El análisis no terminó. Puedes reintentarlo.';
    }

    $informe = null;
    if ($estado === 'completado' && is_string($fila['informe_ia']) && $fila['informe_ia'] !== '') {
        $decodificado = json_decode($fila['informe_ia'], true);
        $informe = is_array($decodificado) ? $decodificado : null;
    }

    $tieneBlob = (bool)(int)$fila['tiene_blob'];

    return [
        'tiene_video' => true,
        'estado_analisis' => $estado,
        'sugiere_revision' => $fila['sugiere_revision'] !== null ? (bool)(int)$fila['sugiere_revision'] : null,
        'informe' => $informe,
        'error' => $estado === 'error' ? ($error ?: 'No se pudo analizar el video.') : null,
        'puede_reintentar' => $estado === 'error'
            && $tieneBlob
            && (int)$fila['intentos_analisis'] < ENTREVISTA_VIDEO_MAX_INTENTOS,
        'video_visto' => (bool)(int)$fila['video_visto'],
        'camara_interrumpida' => (bool)(int)$fila['camara_interrumpida'],
    ];
}

/**
 * Manda la respuesta JSON al navegador y deja que el script siga trabajando
 * (para el analisis con Gemini, que tarda). Libera el bloqueo de sesion.
 */
function entrevistaVideoResponderYContinuar(array $cuerpo, int $status = 200): void
{
    ignore_user_abort(true);
    set_time_limit(600);

    if (session_status() === PHP_SESSION_ACTIVE) {
        session_write_close();
    }

    $json = json_encode($cuerpo, JSON_UNESCAPED_UNICODE) ?: '{"ok":true}';

    while (ob_get_level() > 0) {
        ob_end_clean();
    }

    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Content-Length: ' . strlen($json));
    header('Connection: close');
    echo $json;

    flush();
    if (function_exists('fastcgi_finish_request')) {
        fastcgi_finish_request();
    } elseif (function_exists('litespeed_finish_request')) {
        litespeed_finish_request();
    }
}

/**
 * Corre el analisis de Gemini sobre un archivo de video y guarda el resultado
 * (o el error) en la fila. Nunca lanza excepciones.
 */
function entrevistaVideoEjecutarAnalisis(mysqli $con, int $idEntrevistaVideo, string $rutaVideo, string $tipoVideo, bool $camaraInterrumpida): void
{
    try {
        $stmt = mysqli_prepare(
            $con,
            "UPDATE entrevista_video
             SET estado_analisis = 'procesando', error_analisis = NULL, intentos_analisis = intentos_analisis + 1
             WHERE id_entrevista_video = ?"
        );
        if ($stmt) {
            mysqli_stmt_bind_param($stmt, 'i', $idEntrevistaVideo);
            mysqli_stmt_execute($stmt);
            mysqli_stmt_close($stmt);
        }

        $informe = entrevistaVideoAnalizarConGemini($rutaVideo, $tipoVideo, [
            'camara_interrumpida' => $camaraInterrumpida,
        ]);

        $json = json_encode($informe, JSON_UNESCAPED_UNICODE);
        $sugiere = !empty($informe['sugiere_revision']) ? 1 : 0;

        $stmt = mysqli_prepare(
            $con,
            "UPDATE entrevista_video
             SET estado_analisis = 'completado', informe_ia = ?, sugiere_revision = ?,
                 error_analisis = NULL, fecha_analisis = NOW()
             WHERE id_entrevista_video = ?"
        );
        if ($stmt) {
            mysqli_stmt_bind_param($stmt, 'sii', $json, $sugiere, $idEntrevistaVideo);
            mysqli_stmt_execute($stmt);
            mysqli_stmt_close($stmt);
        }
    } catch (Throwable $e) {
        error_log('[ENTREVISTA_VIDEO_ANALISIS] ' . $e->getMessage());
        $mensaje = mb_substr(entrevistaVideoMensajeAmigable($e->getMessage()), 0, 250, 'UTF-8');

        try {
            $stmt = mysqli_prepare(
                $con,
                "UPDATE entrevista_video
                 SET estado_analisis = 'error', error_analisis = ?
                 WHERE id_entrevista_video = ?"
            );
            if ($stmt) {
                mysqli_stmt_bind_param($stmt, 'si', $mensaje, $idEntrevistaVideo);
                mysqli_stmt_execute($stmt);
                mysqli_stmt_close($stmt);
            }
        } catch (Throwable $inner) {
            error_log('[ENTREVISTA_VIDEO_ANALISIS_GUARDAR_ERROR] ' . $inner->getMessage());
        }
    }
}

/** Traduce el error tecnico a un mensaje que pueda leer el reclutador. */
function entrevistaVideoMensajeAmigable(string $tecnico): string
{
    if (str_contains($tecnico, 'no está configurado')) {
        return 'El servicio de análisis de video no está configurado.';
    }
    if (preg_match('/HTTP (\d{3})/', $tecnico, $m)) {
        return match ((int)$m[1]) {
            400 => 'El servicio de IA no pudo procesar este video.',
            401, 403 => 'La clave del servicio de IA no es válida o no tiene permiso.',
            404 => 'El modelo de IA configurado no está disponible.',
            429 => 'Se alcanzó el límite de uso del servicio de IA. Intenta de nuevo más tarde.',
            default => 'El servicio de IA respondió con un error. Intenta de nuevo más tarde.',
        };
    }
    if (str_contains($tecnico, 'no devolvió')) {
        return 'La IA no devolvió un informe válido. Intenta de nuevo.';
    }
    return 'No se pudo analizar el video. Intenta de nuevo más tarde.';
}
