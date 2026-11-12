<?php

declare(strict_types=1);

require_once __DIR__ . '/../../../config/keys.php';

function entrevistaGroqValorConfigurado(string $value): bool
{
    $value = trim($value);
    return $value !== '' && $value !== 'PASTE_YOUR_KEY_HERE';
}

function entrevistaGroqConfiguracionValida(): bool
{
    return defined('INCLUSIJOB_GROQ_API_KEY')
        && defined('INCLUSIJOB_GROQ_URL')
        && defined('INCLUSIJOB_GROQ_MODEL')
        && entrevistaGroqValorConfigurado((string)INCLUSIJOB_GROQ_API_KEY)
        && filter_var(INCLUSIJOB_GROQ_URL, FILTER_VALIDATE_URL) !== false
        && entrevistaGroqValorConfigurado((string)INCLUSIJOB_GROQ_MODEL);
}

function entrevistaGroqParsearRespuesta(string $response): ?array
{
    $json = json_decode($response, true);
    if (!is_array($json)) {
        return null;
    }

    $content = $json['choices'][0]['message']['content'] ?? null;
    if (!is_string($content) || trim($content) === '') {
        return null;
    }

    $parsed = json_decode($content, true);
    if (!is_array($parsed) && preg_match('/\{.*\}/s', $content, $match) === 1) {
        $parsed = json_decode($match[0], true);
    }

    return is_array($parsed) && $parsed !== [] ? $parsed : null;
}

function entrevistaGroqSolicitar(array $payload, int $timeout, ?string &$error = null): ?array
{
    if (!entrevistaGroqConfiguracionValida()) {
        $error = 'Groq no esta configurado.';
        return null;
    }

    $body = json_encode($payload, JSON_UNESCAPED_UNICODE);
    if (!is_string($body)) {
        $error = 'No se pudo preparar la solicitud.';
        return null;
    }

    $status = 0;
    $response = null;

    if (function_exists('curl_init')) {
        $ch = curl_init(INCLUSIJOB_GROQ_URL);
        if ($ch === false) {
            $error = 'No se pudo iniciar la solicitud.';
            return null;
        }

        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_CONNECTTIMEOUT => 8,
            CURLOPT_TIMEOUT => max(1, $timeout),
            CURLOPT_HTTPHEADER => [
                'Authorization: Bearer ' . INCLUSIJOB_GROQ_API_KEY,
                'Content-Type: application/json',
            ],
            CURLOPT_POSTFIELDS => $body,
        ]);

        $response = curl_exec($ch);
        $curlError = curl_error($ch);
        $curlErrno = curl_errno($ch);
        $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($curlErrno !== 0 || !is_string($response) || $response === '') {
            $error = $curlError !== '' ? 'Error de transporte.' : 'El proveedor no devolvio respuesta.';
            return null;
        }
    } else {
        if (!filter_var(ini_get('allow_url_fopen'), FILTER_VALIDATE_BOOLEAN)) {
            $error = 'El transporte HTTP nativo no esta disponible.';
            return null;
        }

        $context = stream_context_create([
            'http' => [
                'method' => 'POST',
                'header' => "Authorization: Bearer " . INCLUSIJOB_GROQ_API_KEY . "\r\n"
                    . "Content-Type: application/json\r\n",
                'content' => $body,
                'timeout' => max(1, $timeout),
                'ignore_errors' => true,
            ],
        ]);

        $response = @file_get_contents(INCLUSIJOB_GROQ_URL, false, $context);
        foreach ($http_response_header ?? [] as $header) {
            if (preg_match('/^HTTP\/\S+\s+(\d{3})/', $header, $matches) === 1) {
                $status = (int)$matches[1];
                break;
            }
        }

        if (!is_string($response) || $response === '') {
            $error = 'El proveedor no devolvio respuesta.';
            return null;
        }
    }

    if ($status < 200 || $status >= 300) {
        $error = 'Groq respondio con un error HTTP.';
        return null;
    }

    $decoded = json_decode($response, true);
    if (!is_array($decoded)) {
        $error = 'Groq no devolvio JSON valido.';
        return null;
    }

    return $decoded;
}
