<?php
declare(strict_types=1);

function recomendarVacantesNormalizarTexto(mixed $value): string
{
    $text = is_scalar($value) ? (string)$value : '';
    $text = str_replace("\0", ' ', $text);
    $text = preg_replace('/[\x01-\x1F\x7F]+/u', ' ', $text) ?? $text;
    $text = preg_replace('/\s+/u', ' ', trim($text)) ?? trim($text);

    return function_exists('mb_strtolower') ? mb_strtolower($text, 'UTF-8') : strtolower($text);
}

function recomendarVacantesDividirRequisitos(mixed $value): array
{
    $text = is_scalar($value) ? (string)$value : '';
    $parts = preg_split('/[\r\n;|]+/u', $text) ?: [];
    $result = [];

    foreach ($parts as $part) {
        $clean = recomendarVacantesLimpiarSalida($part, 180);
        if ($clean !== '') {
            $result[] = $clean;
        }
    }

    return array_values(array_unique($result));
}

function recomendarVacantesPuntuar(array $perfil, array $vacante): int
{
    $profileText = implode(' ', [
        (string)($perfil['habilidades'] ?? ''),
        (string)($perfil['experiencia'] ?? ''),
    ]);
    $certificaciones = $perfil['certificaciones'] ?? [];
    if (is_array($certificaciones)) {
        $profileText .= ' ' . implode(' ', array_map('strval', $certificaciones));
    } else {
        $profileText .= ' ' . (string)$certificaciones;
    }

    $profileTokens = recomendarVacantesTokens($profileText);
    $vacancyText = implode(' ', [
        (string)($vacante['titulo_puesto'] ?? ''),
        (string)($vacante['descripcion_puesto'] ?? ''),
        implode(' ', recomendarVacantesDividirRequisitos($vacante['requisitos'] ?? '')),
    ]);
    $vacancyText = recomendarVacantesNormalizarTexto($vacancyText);

    $matches = 0;
    foreach ($profileTokens as $token) {
        if (str_contains($vacancyText, $token)) {
            $matches++;
        }
    }

    $score = 45 + min(25, $matches * 5);
    $modalidad = recomendarVacantesNormalizarTexto($vacante['modalidad'] ?? '');
    if (str_contains($modalidad, 'remot') || str_contains($modalidad, 'hibrid')) {
        $score += 8;
    }

    $esfuerzo = recomendarVacantesNormalizarTexto($perfil['esfuerzo_fisico_posible'] ?? '');
    if ($esfuerzo === 'limitado' || $esfuerzo === 'bajo') {
        $score += str_contains($modalidad, 'remot') ? 7 : 2;
    }

    if ($certificaciones !== [] && $certificaciones !== '' && $certificaciones !== null) {
        $score += 5;
    }

    return max(0, min(100, $score));
}

function recomendarVacantesFallback(array $perfil, array $vacantes, int $limite = 4): array
{
    $items = [];
    foreach ($vacantes as $vacante) {
        $id = (int)($vacante['id_vacante'] ?? 0);
        if ($id <= 0) {
            continue;
        }

        $score = recomendarVacantesPuntuar($perfil, $vacante);
        $items[] = [
            'id_vacante' => $id,
            'compatibilidad' => $score,
            'motivo' => 'Recomendada por coincidencia entre tu perfil, modalidad y requisitos de la vacante.',
            'puntos_fuertes' => [],
            'aspecto_a_revisar' => 'Revisa los requisitos antes de postularte.',
            '_score' => $score,
            '_fecha' => (string)($vacante['fecha_publicacion'] ?? ''),
        ];
    }

    usort($items, static function (array $left, array $right): int {
        $scoreComparison = ($right['_score'] ?? 0) <=> ($left['_score'] ?? 0);
        if ($scoreComparison !== 0) {
            return $scoreComparison;
        }

        return strcmp((string)($right['_fecha'] ?? ''), (string)($left['_fecha'] ?? ''));
    });

    foreach ($items as &$item) {
        unset($item['_score'], $item['_fecha']);
    }
    unset($item);

    return array_slice($items, 0, max(0, $limite));
}

function recomendarVacantesExtraerJson(string $content): ?array
{
    $content = trim($content);
    if ($content === '') {
        return null;
    }

    $content = preg_replace('/^```(?:json)?\s*|\s*```$/i', '', $content) ?? $content;
    $start = strpos($content, '{');
    $end = strrpos($content, '}');
    if ($start === false || $end === false || $end < $start) {
        return null;
    }

    $decoded = json_decode(substr($content, $start, $end - $start + 1), true);
    return is_array($decoded) && !array_is_list($decoded) ? $decoded : null;
}

function recomendarVacantesValidar(array $raw, array $fallback, array $vacantes): array
{
    $byId = [];
    foreach ($vacantes as $vacante) {
        $id = (int)($vacante['id_vacante'] ?? 0);
        if ($id > 0) {
            $byId[$id] = $vacante;
        }
    }

    $fallbackById = [];
    foreach ($fallback as $item) {
        $id = (int)($item['id_vacante'] ?? 0);
        if ($id > 0) {
            $fallbackById[$id] = $item;
        }
    }

    $validas = [];
    $seen = [];
    $items = $raw['recomendaciones'] ?? [];
    if (!is_array($items)) {
        $items = [];
    }

    foreach ($items as $item) {
        if (!is_array($item)) {
            continue;
        }

        $id = filter_var($item['id_vacante'] ?? null, FILTER_VALIDATE_INT);
        if ($id === false || $id <= 0 || !isset($byId[$id]) || isset($seen[$id])) {
            continue;
        }

        $compatibilidad = $item['compatibilidad'] ?? ($fallbackById[$id]['compatibilidad'] ?? 0);
        $compatibilidad = is_numeric($compatibilidad) ? (int)$compatibilidad : 0;
        $compatibilidad = max(0, min(100, $compatibilidad));
        $puntosFuertes = [];
        if (is_array($item['puntos_fuertes'] ?? null)) {
            foreach (array_slice($item['puntos_fuertes'], 0, 3) as $punto) {
                $clean = recomendarVacantesLimpiarSalida($punto, 180);
                if ($clean !== '') {
                    $puntosFuertes[] = $clean;
                }
            }
        }

        $validas[] = [
            'id_vacante' => (int)$id,
            'compatibilidad' => $compatibilidad,
            'motivo' => recomendarVacantesLimpiarSalida($item['motivo'] ?? '', 500),
            'puntos_fuertes' => array_values(array_unique($puntosFuertes)),
            'aspecto_a_revisar' => recomendarVacantesLimpiarSalida($item['aspecto_a_revisar'] ?? 'Revisa los requisitos antes de postularte.', 300),
        ];
        $seen[$id] = true;
    }

    foreach ($fallback as $item) {
        $id = (int)($item['id_vacante'] ?? 0);
        if ($id <= 0 || !isset($byId[$id]) || isset($seen[$id])) {
            continue;
        }

        $validas[] = [
            'id_vacante' => $id,
            'compatibilidad' => max(0, min(100, (int)($item['compatibilidad'] ?? 0))),
            'motivo' => recomendarVacantesLimpiarSalida($item['motivo'] ?? 'Revisa esta vacante según tu perfil.', 500),
            'puntos_fuertes' => is_array($item['puntos_fuertes'] ?? null) ? array_values(array_slice($item['puntos_fuertes'], 0, 3)) : [],
            'aspecto_a_revisar' => recomendarVacantesLimpiarSalida($item['aspecto_a_revisar'] ?? 'Revisa los requisitos antes de postularte.', 300),
        ];
        $seen[$id] = true;
    }

    return $validas;
}

function recomendarVacantesHidratar(array $recomendaciones, array $vacantes): array
{
    $byId = [];
    foreach ($vacantes as $vacante) {
        $id = (int)($vacante['id_vacante'] ?? 0);
        if ($id > 0) {
            $official = $vacante;
            $official['id_vacante'] = $id;
            if (array_key_exists('salario_min', $official)) {
                $official['salario_min'] = $official['salario_min'] !== null ? (float)$official['salario_min'] : null;
            }
            if (array_key_exists('salario_max', $official)) {
                $official['salario_max'] = $official['salario_max'] !== null ? (float)$official['salario_max'] : null;
            }
            $official['requisitos'] = recomendarVacantesDividirRequisitos($official['requisitos'] ?? '');
            $byId[$id] = $official;
        }
    }

    $hydrated = [];
    foreach ($recomendaciones as $recommendation) {
        $id = (int)($recommendation['id_vacante'] ?? 0);
        if ($id <= 0 || !isset($byId[$id])) {
            continue;
        }

        $recommendation['id_vacante'] = $id;
        $recommendation['compatibilidad'] = max(0, min(100, (int)($recommendation['compatibilidad'] ?? 0)));
        $recommendation['vacante'] = $byId[$id];
        $hydrated[] = $recommendation;
    }

    return $hydrated;
}

function recomendarVacantesTokens(string $value): array
{
    $normalized = recomendarVacantesNormalizarTexto($value);
    $tokens = preg_split('/[^\p{L}\p{N}]+/u', $normalized) ?: [];
    $stopwords = ['para', 'como', 'desde', 'entre', 'este', 'esta', 'con', 'por', 'del', 'las', 'los', 'una', 'uno'];
    $result = [];

    foreach ($tokens as $token) {
        if (function_exists('mb_strlen') ? mb_strlen($token, 'UTF-8') < 4 : strlen($token) < 4) {
            continue;
        }
        if (in_array($token, $stopwords, true)) {
            continue;
        }
        $result[$token] = true;
    }

    return array_keys($result);
}

function recomendarVacantesLimpiarSalida(mixed $value, int $limit): string
{
    $text = is_scalar($value) ? strip_tags((string)$value) : '';
    $text = str_replace("\0", ' ', $text);
    $text = preg_replace('/[\x01-\x1F\x7F]+/u', ' ', $text) ?? $text;
    $text = preg_replace('/\s+/u', ' ', trim($text)) ?? trim($text);
    if ($limit <= 0) {
        return '';
    }

    return function_exists('mb_substr') ? mb_substr($text, 0, $limit, 'UTF-8') : substr($text, 0, $limit);
}
