<?php

declare(strict_types=1);

// Analisis del video de verificacion con Gemini (Files API + generateContent).
// La entrevista y su evaluacion siguen siendo de Groq; Gemini solo mira el video.

require_once __DIR__ . '/../../../../config/keys.php';

const ENTREVISTA_VIDEO_GEMINI_BASE = 'https://generativelanguage.googleapis.com';

function entrevistaVideoGeminiConfigurado(): bool
{
    return defined('INCLUSIJOB_GEMINI_API_KEY')
        && defined('INCLUSIJOB_GEMINI_MODEL')
        && trim((string)INCLUSIJOB_GEMINI_API_KEY) !== ''
        && INCLUSIJOB_GEMINI_API_KEY !== 'PASTE_YOUR_KEY_HERE'
        && trim((string)INCLUSIJOB_GEMINI_MODEL) !== '';
}

/**
 * Peticion HTTP a Gemini. Si $rutaArchivo viene, el cuerpo se envia en streaming
 * desde el disco (el video puede pesar decenas de MB).
 *
 * @return array{0:int,1:string} [codigo HTTP, cuerpo]
 */
function entrevistaVideoGeminiHttp(
    string $metodo,
    string $url,
    array $headers,
    ?string $cuerpo,
    ?string $rutaArchivo,
    int $timeout,
    array &$headersRespuesta
): array {
    $headersRespuesta = [];
    $ch = curl_init($url);
    if ($ch === false) {
        throw new RuntimeException('No se pudo iniciar la conexión con Gemini.');
    }

    $headers[] = 'x-goog-api-key: ' . INCLUSIJOB_GEMINI_API_KEY;
    $fh = null;

    $opciones = [
        CURLOPT_CUSTOMREQUEST => $metodo,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 20,
        CURLOPT_TIMEOUT => $timeout,
        CURLOPT_HEADERFUNCTION => static function ($curl, string $linea) use (&$headersRespuesta): int {
            $partes = explode(':', $linea, 2);
            if (count($partes) === 2) {
                $headersRespuesta[strtolower(trim($partes[0]))] = trim($partes[1]);
            }
            return strlen($linea);
        },
    ];

    if ($rutaArchivo !== null) {
        $fh = fopen($rutaArchivo, 'rb');
        if ($fh === false) {
            curl_close($ch);
            throw new RuntimeException('No se pudo leer el video para enviarlo.');
        }
        $opciones[CURLOPT_UPLOAD] = true;
        $opciones[CURLOPT_INFILE] = $fh;
        $opciones[CURLOPT_INFILESIZE] = (int)filesize($rutaArchivo);
        $headers[] = 'Expect:';
    } elseif ($cuerpo !== null) {
        $opciones[CURLOPT_POSTFIELDS] = $cuerpo;
    }

    $opciones[CURLOPT_HTTPHEADER] = $headers;
    curl_setopt_array($ch, $opciones);

    $respuesta = curl_exec($ch);
    $errorCurl = curl_error($ch);
    $codigo = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if (is_resource($fh)) {
        fclose($fh);
    }

    if ($respuesta === false) {
        throw new RuntimeException('Error de conexión con Gemini: ' . $errorCurl);
    }

    return [$codigo, (string)$respuesta];
}

/** Igual que la anterior pero exige 2xx y devuelve el JSON decodificado. */
function entrevistaVideoGeminiJson(string $metodo, string $url, array $headers = [], ?string $cuerpo = null, int $timeout = 120): array
{
    $headersRespuesta = [];
    [$codigo, $texto] = entrevistaVideoGeminiHttp($metodo, $url, $headers, $cuerpo, null, $timeout, $headersRespuesta);
    $json = json_decode($texto, true);

    if ($codigo < 200 || $codigo >= 300) {
        $detalle = is_array($json) ? (string)($json['error']['message'] ?? '') : '';
        throw new RuntimeException("Gemini respondió HTTP $codigo: " . mb_substr($detalle, 0, 300, 'UTF-8'));
    }
    if (!is_array($json)) {
        throw new RuntimeException('Gemini no devolvió una respuesta válida.');
    }
    return $json;
}

function entrevistaVideoGeminiInstruccion(bool $camaraInterrumpida): string
{
    $avisoCamara = $camaraInterrumpida
        ? "\nDATO DEL SISTEMA: la cámara se interrumpió en algún momento de la grabación; si ves cortes o imagen negra, descríbelos de forma neutra."
        : '';

    return <<<TEXTO
Analiza este video de una persona realizando una entrevista de selección en línea. La persona lee preguntas en pantalla y responde por escrito. Tu única función es señalar momentos que un reclutador humano podría querer revisar para verificar que la persona no recibe ayuda externa no permitida ni consulta material que contiene respuestas.{$avisoCamara}

PUEDES SEÑALAR (solo si es claramente visible o audible):
- Otra persona que aparece o habla y parece dictar, sugerir o escribir las respuestas.
- Consulta repetida de un dispositivo, papel u objeto que parece contener respuestas.
- La persona abandona la imagen, o la cámara se tapa o se apaga, durante periodos prolongados.
- Se ven o escuchan respuestas leídas de otra fuente.

NO LO TRATES COMO SOSPECHOSO (esta plataforma es de inclusión laboral):
- Movimientos atípicos, tics, movimientos oculares o posturales, o dificultad para mantener la mirada en la pantalla.
- Tecnología de apoyo: lector de pantalla, comandos de voz, teclados o ratones adaptados, pantallas braille, dispositivos de comunicación; incluso hablar en voz alta para dictar.
- Un intérprete, asistente personal o cuidador que solo apoya con accesibilidad (movilidad, comunicación, interpretación). Si no puedes distinguir si apoya con accesibilidad o con el contenido de las respuestas, descríbelo como ambiguo y no lo uses para sugerir revisión.
- Mirar a los lados, pensar, hacer pausas, mostrar nervios, mala iluminación o mala calidad de imagen.

REGLAS:
1. Describe únicamente lo que se observa. No inventes eventos ni tiempos.
2. Indica el minuto y segundo aproximado de cada observación en formato mm:ss.
3. No afirmes que alguien hizo trampa. Esto es una alerta preliminar para revisión humana.
4. "sugiere_revision" es true solo si hay al menos una observación que indique posible ayuda externa o consulta de material; en cualquier otro caso es false.
5. Si el video es oscuro, estático o no permite ver con claridad, dilo en "limitaciones".
6. Responde en español.

Responde ÚNICAMENTE con un JSON válido con esta forma:
{
  "resumen": "descripción breve de lo que ocurre en el video",
  "observaciones": [
    { "tiempo": "mm:ss", "descripcion": "qué se observa", "motivo": "por qué podría merecer revisión" }
  ],
  "sugiere_revision": false,
  "limitaciones": "calidad de imagen u otras limitaciones; cadena vacía si no hay"
}
Si no hay observaciones relevantes, "observaciones" debe ser una lista vacía.
TEXTO;
}

/** Limpia y acota lo que devuelve el modelo antes de guardarlo. */
function entrevistaVideoGeminiNormalizar(array $raw): array
{
    $texto = static fn($v, int $max): string => mb_substr(trim((string)$v), 0, $max, 'UTF-8');

    $observaciones = [];
    foreach ((array)($raw['observaciones'] ?? []) as $item) {
        if (!is_array($item)) {
            continue;
        }
        $descripcion = $texto($item['descripcion'] ?? '', 400);
        if ($descripcion === '') {
            continue;
        }
        $tiempo = trim((string)($item['tiempo'] ?? ''));
        $observaciones[] = [
            'tiempo' => preg_match('/^\d{1,2}:\d{2}(:\d{2})?$/', $tiempo) ? $tiempo : '',
            'descripcion' => $descripcion,
            'motivo' => $texto($item['motivo'] ?? '', 400),
        ];
        if (count($observaciones) >= 15) {
            break;
        }
    }

    // La alerta solo se activa si hay observaciones que la respalden.
    $sugiere = filter_var($raw['sugiere_revision'] ?? false, FILTER_VALIDATE_BOOLEAN) && count($observaciones) > 0;

    return [
        'resumen' => $texto($raw['resumen'] ?? 'No se obtuvo un resumen del video.', 800),
        'observaciones' => $observaciones,
        'sugiere_revision' => $sugiere,
        'limitaciones' => $texto($raw['limitaciones'] ?? '', 400),
        // La conclusion la fija el servidor, no el modelo.
        'conclusion' => $sugiere
            ? 'Se detectaron movimientos potencialmente sospechosos; se sugiere ver el video.'
            : 'No se detectaron movimientos claramente sospechosos; se sugiere revisar el video si existen otras dudas.',
    ];
}

/**
 * Sube el video a Gemini, espera a que este procesado, pide el informe y borra
 * el archivo remoto. Lanza RuntimeException si algo falla.
 */
function entrevistaVideoAnalizarConGemini(string $rutaVideo, string $tipoVideo, array $contexto = []): array
{
    if (!entrevistaVideoGeminiConfigurado()) {
        throw new RuntimeException('El servicio de análisis de video no está configurado.');
    }
    if (!is_file($rutaVideo)) {
        throw new RuntimeException('No se encontró el video a analizar.');
    }

    $modelo = preg_replace('#^models/#', '', trim((string)INCLUSIJOB_GEMINI_MODEL));
    $tamano = (int)filesize($rutaVideo);
    $nombreArchivo = null;

    try {
        // 1. Iniciar la subida (resumable).
        $headersInicio = [];
        [$codigo, $texto] = entrevistaVideoGeminiHttp(
            'POST',
            ENTREVISTA_VIDEO_GEMINI_BASE . '/upload/v1beta/files',
            [
                'Content-Type: application/json',
                'X-Goog-Upload-Protocol: resumable',
                'X-Goog-Upload-Command: start',
                'X-Goog-Upload-Header-Content-Length: ' . $tamano,
                'X-Goog-Upload-Header-Content-Type: ' . $tipoVideo,
            ],
            json_encode(['file' => ['display_name' => 'entrevista_verificacion']]),
            null,
            60,
            $headersInicio
        );
        if ($codigo < 200 || $codigo >= 300) {
            $json = json_decode($texto, true);
            throw new RuntimeException("Gemini respondió HTTP $codigo: " . mb_substr((string)($json['error']['message'] ?? ''), 0, 300, 'UTF-8'));
        }
        $urlSubida = $headersInicio['x-goog-upload-url'] ?? '';
        if ($urlSubida === '') {
            throw new RuntimeException('Gemini no devolvió la URL para subir el video.');
        }

        // 2. Enviar los bytes del video.
        $headersSubida = [];
        [$codigo, $texto] = entrevistaVideoGeminiHttp(
            'POST',
            $urlSubida,
            [
                'Content-Type: ' . $tipoVideo,
                'X-Goog-Upload-Offset: 0',
                'X-Goog-Upload-Command: upload, finalize',
            ],
            null,
            $rutaVideo,
            600,
            $headersSubida
        );
        $archivo = json_decode($texto, true);
        if ($codigo < 200 || $codigo >= 300 || !is_array($archivo) || empty($archivo['file']['name'])) {
            throw new RuntimeException("Gemini respondió HTTP $codigo: no confirmó el archivo subido.");
        }
        $nombreArchivo = (string)$archivo['file']['name'];
        $uriArchivo = (string)($archivo['file']['uri'] ?? '');

        // 3. Esperar a que Gemini procese el video (hasta ~2 minutos).
        $listo = false;
        for ($intento = 0; $intento < 40; $intento++) {
            $estado = entrevistaVideoGeminiJson('GET', ENTREVISTA_VIDEO_GEMINI_BASE . '/v1beta/' . $nombreArchivo);
            $estadoActual = (string)($estado['state'] ?? '');
            if ($estadoActual === 'ACTIVE') {
                $uriArchivo = (string)($estado['uri'] ?? $uriArchivo);
                $listo = true;
                break;
            }
            if ($estadoActual === 'FAILED') {
                throw new RuntimeException('Gemini no pudo procesar el video.');
            }
            sleep(3);
        }
        if (!$listo || $uriArchivo === '') {
            throw new RuntimeException('El video aún no está listo en Gemini.');
        }

        // 4. Pedir el informe.
        $respuesta = entrevistaVideoGeminiJson(
            'POST',
            ENTREVISTA_VIDEO_GEMINI_BASE . '/v1beta/models/' . rawurlencode($modelo) . ':generateContent',
            ['Content-Type: application/json'],
            json_encode([
                'contents' => [[
                    'parts' => [
                        ['fileData' => ['mimeType' => $tipoVideo, 'fileUri' => $uriArchivo]],
                        ['text' => entrevistaVideoGeminiInstruccion(!empty($contexto['camara_interrumpida']))],
                    ],
                ]],
                'generationConfig' => [
                    'temperature' => 0.1,
                    'maxOutputTokens' => 4096,
                    'responseMimeType' => 'application/json',
                ],
            ], JSON_UNESCAPED_UNICODE),
            300
        );

        $partes = $respuesta['candidates'][0]['content']['parts'] ?? [];
        $textoIa = '';
        foreach ((array)$partes as $parte) {
            if (is_array($parte) && isset($parte['text']) && empty($parte['thought'])) {
                $textoIa .= (string)$parte['text'];
            }
        }
        $textoIa = trim(preg_replace('/^```(?:json)?\s*|\s*```$/i', '', trim($textoIa)) ?? '');
        if ($textoIa === '') {
            throw new RuntimeException('Gemini no devolvió un informe de texto.');
        }

        $raw = json_decode($textoIa, true);
        if (!is_array($raw)) {
            throw new RuntimeException('Gemini no devolvió un informe en formato válido.');
        }

        $informe = entrevistaVideoGeminiNormalizar($raw);
        $informe['modelo'] = $modelo;
        return $informe;
    } finally {
        // 5. No dejar el video de la persona guardado en Gemini.
        if ($nombreArchivo !== null) {
            try {
                $h = [];
                entrevistaVideoGeminiHttp('DELETE', ENTREVISTA_VIDEO_GEMINI_BASE . '/v1beta/' . $nombreArchivo, [], null, null, 30, $h);
            } catch (Throwable $e) {
                error_log('[ENTREVISTA_VIDEO_GEMINI_BORRAR] ' . $e->getMessage());
            }
        }
    }
}
