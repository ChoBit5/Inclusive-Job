<?php

declare(strict_types=1);

function entrevistaFinalizarTexto(mixed $value): string
{
    $text = strip_tags(trim((string)$value));
    $text = preg_replace('/\s+/u', ' ', $text);
    return trim((string)$text);
}

function entrevistaFinalizarLista(mixed $value, int $limit): array
{
    if (!is_array($value)) {
        return [];
    }

    $items = [];
    foreach ($value as $item) {
        $text = entrevistaFinalizarTexto($item);
        if ($text !== '') {
            $items[] = mb_substr($text, 0, 220, 'UTF-8');
        }
        if (count($items) >= $limit) {
            break;
        }
    }

    return $items;
}

function entrevistaFinalizarNormalizarEvaluacion(array $raw): array
{
    return [
        'puntuacion' => max(1, min(10, (int)($raw['puntuacion'] ?? 5))),
        'resumen' => entrevistaFinalizarTexto($raw['resumen'] ?? 'Completaste la entrevista simulada.'),
        'fortalezas' => entrevistaFinalizarLista($raw['fortalezas'] ?? [], 5),
        'areas_mejora' => entrevistaFinalizarLista($raw['areas_mejora'] ?? [], 5),
        'consejo_final' => entrevistaFinalizarTexto($raw['consejo_final'] ?? 'Sigue practicando tus respuestas con ejemplos concretos.'),
    ];
}
