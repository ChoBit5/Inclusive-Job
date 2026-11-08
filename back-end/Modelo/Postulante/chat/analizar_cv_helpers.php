<?php

declare(strict_types=1);

function analizarCvLimpiarTexto(mixed $value): string
{
    $text = trim((string)$value);
    if ($text === '') {
        return '';
    }

    $text = str_ireplace(
        [
            '[INSERTAR % O NUMERO]',
            '[INSERTAR % O NÚMERO]',
            '[INSERTAR %]',
            '[INSERTAR NUMERO]',
            '[INSERTAR NÚMERO]',
            '[INSERTAR]',
        ],
        '[PORCENTAJE O METRICA]',
        $text
    );

    $text = preg_replace('/\s+/u', ' ', $text);
    return trim((string)$text);
}

function analizarCvNormalizarTexto(string $text): string
{
    $text = html_entity_decode($text, ENT_QUOTES | ENT_HTML5, 'UTF-8');
    $text = preg_replace('/[^\P{C}\t\r\n]+/u', ' ', $text);
    $text = preg_replace('/[ \t]+/u', ' ', (string)$text);
    $text = preg_replace('/[ \t]*\R[ \t]*/u', "\n", (string)$text);
    $text = preg_replace('/\R{3,}/u', "\n\n", (string)$text);

    return trim((string)$text);
}

function analizarCvParsearRespuestaGroq(string $response): ?array
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

function analizarCvListaTexto(mixed $value, int $limit): array
{
    if (!is_array($value) || $limit < 1) {
        return [];
    }

    $items = [];
    foreach ($value as $item) {
        $text = analizarCvLimpiarTexto($item);
        if ($text !== '') {
            $items[] = mb_substr($text, 0, 220, 'UTF-8');
        }

        if (count($items) >= $limit) {
            break;
        }
    }

    return $items;
}

function analizarCvNormalizarAnalisis(array $raw, bool $textoParcial = false): array
{
    $perfil = is_array($raw['perfil_objetivo'] ?? null) ? $raw['perfil_objetivo'] : [];
    $ats = is_array($raw['diagnostico_ats'] ?? null) ? $raw['diagnostico_ats'] : [];
    $impacto = is_array($raw['auditoria_impacto'] ?? null) ? $raw['auditoria_impacto'] : [];
    $resumen = is_array($raw['resumen_profesional'] ?? null) ? $raw['resumen_profesional'] : [];
    $estructura = is_array($raw['estructura_escaneabilidad'] ?? null) ? $raw['estructura_escaneabilidad'] : [];

    $score = is_numeric($ats['puntuacion'] ?? null) ? (int)$ats['puntuacion'] : 5;
    $rewrites = [];
    $rawRewrites = $impacto['bullets_reescritos_star'] ?? [];
    if (is_array($rawRewrites)) {
        foreach ($rawRewrites as $item) {
            if (!is_array($item)) {
                continue;
            }

            $rewrites[] = [
                'original' => mb_substr(analizarCvLimpiarTexto($item['original'] ?? ''), 0, 320, 'UTF-8'),
                'reescrito' => mb_substr(analizarCvLimpiarTexto($item['reescrito'] ?? ''), 0, 420, 'UTF-8'),
            ];

            if (count($rewrites) >= 3) {
                break;
            }
        }
    }

    $nota = analizarCvLimpiarTexto(
        $raw['nota']
            ?? 'Analisis generado con IA. Puede contener errores; revisa cada recomendacion y adapta solo lo que sea verdadero para tu experiencia.'
    );
    if ($textoParcial) {
        $nota .= ($nota === '' ? '' : ' ') . 'El analisis fue parcial porque el texto del CV supero el limite seguro de procesamiento.';
    }

    $confianza = strtolower(analizarCvLimpiarTexto($perfil['confianza'] ?? 'baja'));
    if (!in_array($confianza, ['alta', 'media', 'baja'], true)) {
        $confianza = 'baja';
    }

    return [
        'resumen_chat' => analizarCvLimpiarTexto(
            $raw['resumen_chat'] ?? 'Analice tu CV y encontre oportunidades para mejorar ATS, logros y estructura.'
        ),
        'perfil_objetivo' => [
            'ocupacion_detectada' => analizarCvLimpiarTexto($perfil['ocupacion_detectada'] ?? ''),
            'ocupacion_objetivo' => analizarCvLimpiarTexto($perfil['ocupacion_objetivo'] ?? 'No especificado'),
            'confianza' => $confianza,
            'evidencia' => analizarCvListaTexto($perfil['evidencia'] ?? [], 3),
        ],
        'diagnostico_ats' => [
            'puntuacion' => max(1, min(10, $score)),
            'comentario' => analizarCvLimpiarTexto($ats['comentario'] ?? ''),
            'hard_skills_faltantes' => analizarCvListaTexto($ats['hard_skills_faltantes'] ?? [], 5),
            'soft_skills_faltantes' => analizarCvListaTexto($ats['soft_skills_faltantes'] ?? [], 3),
            'palabras_clave_sugeridas' => analizarCvListaTexto($ats['palabras_clave_sugeridas'] ?? [], 12),
            'alerta_formato' => analizarCvLimpiarTexto(
                $ats['alerta_formato']
                    ?? 'No se detectan riesgos de formato desde el texto extraido; valida visualmente el PDF final.'
            ),
        ],
        'auditoria_impacto' => [
            'diagnostico' => analizarCvLimpiarTexto($impacto['diagnostico'] ?? ''),
            'bullets_detectados' => analizarCvListaTexto($impacto['bullets_detectados'] ?? [], 3),
            'bullets_reescritos_star' => $rewrites,
        ],
        'resumen_profesional' => [
            'evaluacion' => analizarCvLimpiarTexto($resumen['evaluacion'] ?? ''),
            'version_sugerida' => analizarCvLimpiarTexto($resumen['version_sugerida'] ?? ''),
        ],
        'estructura_escaneabilidad' => [
            'comentario' => analizarCvLimpiarTexto($estructura['comentario'] ?? ''),
            'hacer' => analizarCvListaTexto($estructura['hacer'] ?? [], 6),
            'no_hacer' => analizarCvListaTexto($estructura['no_hacer'] ?? [], 6),
        ],
        'nota' => $nota,
    ];
}
