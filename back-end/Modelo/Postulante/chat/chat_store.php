<?php

declare(strict_types=1);

function save_chat_interaction(
    mysqli $con,
    int $idUsuario,
    string $tipoInteraccion,
    string $mensajeUsuario,
    string $respuestaIa,
    string $resultado,
    ?int $calificacion = null,
    ?string $archivoCv = null
): void {
    $stmt = mysqli_prepare(
        $con,
        'INSERT INTO chabots
            (tipo_interaccion, mensaje_usuario, respuesta_ia, resultado, calificacion, archivo_cv, id_usuario)
         VALUES (?, ?, ?, ?, ?, ?, ?)'
    );

    if (!$stmt) {
        throw new RuntimeException('No se pudo preparar el guardado del chat.');
    }

    mysqli_stmt_bind_param(
        $stmt,
        'ssssisi',
        $tipoInteraccion,
        $mensajeUsuario,
        $respuestaIa,
        $resultado,
        $calificacion,
        $archivoCv,
        $idUsuario
    );

    if (!mysqli_stmt_execute($stmt)) {
        mysqli_stmt_close($stmt);
        throw new RuntimeException('No se pudo guardar la interacción del chat.');
    }

    mysqli_stmt_close($stmt);
}

