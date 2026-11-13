<?php

declare(strict_types=1);

const ENTREVISTA_REAL_TIEMPO_LIMITE = 900;

function entrevistaRealTiempoEstado(int $iniciadoEn, ?int $ahora = null): array
{
    $ahora ??= time();
    $inicio = max(0, $iniciadoEn);
    $elapsed = max(0, $ahora - $inicio);
    $utilizado = min($elapsed, ENTREVISTA_REAL_TIEMPO_LIMITE);
    $restante = max(0, ENTREVISTA_REAL_TIEMPO_LIMITE - $utilizado);

    return [
        'iniciado_en' => $inicio,
        'expira_en' => $inicio + ENTREVISTA_REAL_TIEMPO_LIMITE,
        'tiempo_limite_segundos' => ENTREVISTA_REAL_TIEMPO_LIMITE,
        'tiempo_utilizado_segundos' => $utilizado,
        'tiempo_restante_segundos' => $restante,
        'agotado' => $restante === 0,
    ];
}
