<?php

require_once __DIR__ . '/../../config/auth.php';
require_once __DIR__ . '/../../config/uploads.php';
require_once __DIR__ . '/../../config/sanitize.php';

inclusijob_cors_headers('GET, POST, OPTIONS', 'Content-Type, Authorization');
$user = requerirRol(['postulante']);

function formulario_responder(array $payload, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

function formulario_preparar(mysqli $con, string $sql): mysqli_stmt
{
    $stmt = mysqli_prepare($con, $sql);
    if (!$stmt) {
        throw new RuntimeException('No se pudo preparar la consulta.');
    }
    return $stmt;
}

function formulario_bind(mysqli_stmt $stmt, string $types, &...$values): void
{
    if (!mysqli_stmt_bind_param($stmt, $types, ...$values)) {
        throw new RuntimeException('No se pudieron preparar los datos.');
    }
}

function formulario_ejecutar(mysqli_stmt $stmt): void
{
    if (!mysqli_stmt_execute($stmt)) {
        throw new RuntimeException('No se pudo ejecutar la consulta.');
    }
}

function formulario_resultado(mysqli_stmt $stmt): mysqli_result
{
    $result = mysqli_stmt_get_result($stmt);
    if (!$result) {
        throw new RuntimeException('No se pudo leer la consulta.');
    }
    return $result;
}

function formulario_texto(mixed $valor): string
{
    return is_scalar($valor) ? inclusijob_limpio((string)$valor) : '';
}

function formulario_foto_mensaje(string $error): string
{
    if (str_contains($error, 'Formato no valido')) {
        return 'Formato de imagen no valido. Usa JPG, PNG o WEBP.';
    }
    if (str_contains($error, 'no debe superar 5 MB')) {
        return 'La imagen no debe superar los 5 MB.';
    }
    return $error;
}

function formulario_error_interno(?mysqli $con, ?string $fotoNueva, Throwable $error): void
{
    error_log('[guardar_formulario] ' . $error->getMessage());
    if ($con instanceof mysqli) {
        @mysqli_rollback($con);
        @mysqli_close($con);
    }
    if ($fotoNueva !== null) {
        inclusijob_foto_borrar_huerfana($fotoNueva);
    }
    formulario_responder([
        'success' => false,
        'mensaje' => 'Error al guardar el perfil.',
    ], 500);
}

$metodo = $_SERVER['REQUEST_METHOD'] ?? '';
if (!in_array($metodo, ['GET', 'POST'], true)) {
    formulario_responder([
        'success' => false,
        'mensaje' => 'Metodo no permitido.',
    ], 405);
}

$id_usuario = (int)($user['id'] ?? 0);
$con = null;
$fotoNueva = null;

try {
    require_once __DIR__ . '/../../Conexion.php';
    $con = conectarbd();
    mysqli_set_charset($con, 'utf8mb4');

    $stmtUsuario = formulario_preparar(
        $con,
        'SELECT id_rol
         FROM usuarios
         WHERE id_usuario = ? AND estado = 1
         LIMIT 1'
    );
    formulario_bind($stmtUsuario, 'i', $id_usuario);
    formulario_ejecutar($stmtUsuario);
    $usuario = mysqli_fetch_assoc(formulario_resultado($stmtUsuario));
    mysqli_stmt_close($stmtUsuario);

    if (!$usuario || (int)$usuario['id_rol'] !== 2) {
        mysqli_close($con);
        formulario_responder([
            'success' => false,
            'mensaje' => 'Solo los postulantes pueden usar este formulario.',
        ], 403);
    }

    if ($metodo === 'GET') {
        $catalogo = [];
        $resCatalogo = mysqli_query(
            $con,
            'SELECT id_tipo_discapacidad, nombre_discapacidad, descripcion
             FROM tipo_discapacidad
             ORDER BY nombre_discapacidad ASC'
        );
        if (!$resCatalogo) {
            throw new RuntimeException('No se pudo obtener el catalogo.');
        }
        while ($row = mysqli_fetch_assoc($resCatalogo)) {
            $catalogo[] = [
                'id_tipo_discapacidad' => (int)$row['id_tipo_discapacidad'],
                'nombre_discapacidad' => $row['nombre_discapacidad'],
                'descripcion' => $row['descripcion'] ?? '',
            ];
        }
        mysqli_free_result($resCatalogo);

        $stmtPostulante = formulario_preparar(
            $con,
            'SELECT id_postulante, descripcion_discapacidad,
                    esfuerzo_fisico_posible, experiencia, habilidades
             FROM postulantes
             WHERE id_usuario = ?
             LIMIT 1'
        );
        formulario_bind($stmtPostulante, 'i', $id_usuario);
        formulario_ejecutar($stmtPostulante);
        $postulante = mysqli_fetch_assoc(formulario_resultado($stmtPostulante));
        mysqli_stmt_close($stmtPostulante);

        $tiposIds = [];
        if ($postulante) {
            $stmtTipos = formulario_preparar(
                $con,
                'SELECT id_tipo_discapacidad
                 FROM postulante_discapacidad
                 WHERE id_postulante = ?'
            );
            $idPostulante = (int)$postulante['id_postulante'];
            formulario_bind($stmtTipos, 'i', $idPostulante);
            formulario_ejecutar($stmtTipos);
            $resTipos = formulario_resultado($stmtTipos);
            while ($row = mysqli_fetch_assoc($resTipos)) {
                $tiposIds[] = (int)$row['id_tipo_discapacidad'];
            }
            mysqli_stmt_close($stmtTipos);
        }

        mysqli_close($con);
        $completado = $postulante
            && trim((string)($postulante['descripcion_discapacidad'] ?? '')) !== ''
            && trim((string)($postulante['experiencia'] ?? '')) !== ''
            && trim((string)($postulante['habilidades'] ?? '')) !== ''
            && $postulante['esfuerzo_fisico_posible'] !== null
            && !empty($tiposIds);

        formulario_responder([
            'success' => true,
            'completado' => (bool)$completado,
            'requiere_formulario' => !$completado,
            'id_postulante' => $postulante ? (int)$postulante['id_postulante'] : null,
            'discapacidades' => $catalogo,
            'tipos_discapacidad' => $tiposIds,
        ]);
    }

    $idUsuarioFrontRaw = $_POST['id_usuario'] ?? 0;
    $idUsuarioFront = is_scalar($idUsuarioFrontRaw) ? (int)$idUsuarioFrontRaw : 0;
    if ($idUsuarioFront > 0 && $idUsuarioFront !== $id_usuario) {
        mysqli_close($con);
        formulario_responder([
            'success' => false,
            'mensaje' => 'No puedes modificar el perfil de otro usuario.',
        ], 403);
    }

    $tiposRecibidos = $_POST['tipoDiscapacidad'] ?? [];
    $tiposRecibidos = is_array($tiposRecibidos) ? $tiposRecibidos : [$tiposRecibidos];
    $tiposRecibidos = array_values(array_filter(
        $tiposRecibidos,
        static fn($valor): bool => is_scalar($valor) && trim((string)$valor) !== ''
    ));

    $tiposIds = [];
    $stmtTipoNombre = formulario_preparar(
        $con,
        'SELECT id_tipo_discapacidad
         FROM tipo_discapacidad
         WHERE nombre_discapacidad = ?
         LIMIT 1'
    );
    foreach ($tiposRecibidos as $tipoRaw) {
        $tipoRaw = trim((string)$tipoRaw);
        if (is_numeric($tipoRaw)) {
            $tiposIds[] = (int)$tipoRaw;
            continue;
        }

        formulario_bind($stmtTipoNombre, 's', $tipoRaw);
        formulario_ejecutar($stmtTipoNombre);
        $tipo = mysqli_fetch_assoc(formulario_resultado($stmtTipoNombre));
        if ($tipo) {
            $tiposIds[] = (int)$tipo['id_tipo_discapacidad'];
        }
    }
    mysqli_stmt_close($stmtTipoNombre);
    $tiposIds = array_values(array_unique($tiposIds));

    if (empty($tiposIds)) {
        mysqli_close($con);
        formulario_responder([
            'success' => false,
            'mensaje' => 'Debes seleccionar al menos un tipo de discapacidad.',
        ], 422);
    }

    $placeholders = implode(',', array_fill(0, count($tiposIds), '?'));
    $stmtTiposValidar = formulario_preparar(
        $con,
        "SELECT id_tipo_discapacidad
         FROM tipo_discapacidad
         WHERE id_tipo_discapacidad IN ($placeholders)"
    );
    $tiposBind = str_repeat('i', count($tiposIds));
    formulario_bind($stmtTiposValidar, $tiposBind, ...$tiposIds);
    formulario_ejecutar($stmtTiposValidar);
    $tiposValidos = [];
    $resTiposValidos = formulario_resultado($stmtTiposValidar);
    while ($row = mysqli_fetch_assoc($resTiposValidos)) {
        $tiposValidos[] = (int)$row['id_tipo_discapacidad'];
    }
    mysqli_stmt_close($stmtTiposValidar);
    sort($tiposIds);
    sort($tiposValidos);
    if ($tiposIds !== $tiposValidos) {
        mysqli_close($con);
        formulario_responder([
            'success' => false,
            'mensaje' => 'Uno o mas tipos de discapacidad no son validos.',
        ], 422);
    }

    $descripcion = formulario_texto($_POST['descripcionDiscapacidad'] ?? '');
    $esfuerzoRaw = formulario_texto($_POST['esfuerzoFisico'] ?? '');
    $experiencia = formulario_texto($_POST['experiencia'] ?? '');
    $habilidades = formulario_texto($_POST['habilidades'] ?? '');

    if ($descripcion === '') {
        mysqli_close($con);
        formulario_responder(['success' => false, 'mensaje' => 'La descripcion de la discapacidad es requerida.'], 422);
    }
    if (mb_strlen($descripcion) > 2000) {
        mysqli_close($con);
        formulario_responder(['success' => false, 'mensaje' => 'La descripcion de la discapacidad no debe superar 2000 caracteres.'], 422);
    }
    if ($esfuerzoRaw === '') {
        mysqli_close($con);
        formulario_responder(['success' => false, 'mensaje' => 'Indica si puedes realizar esfuerzo fisico.'], 422);
    }
    if ($experiencia === '') {
        mysqli_close($con);
        formulario_responder(['success' => false, 'mensaje' => 'La experiencia es requerida.'], 422);
    }
    if (mb_strlen($experiencia) > 2000) {
        mysqli_close($con);
        formulario_responder(['success' => false, 'mensaje' => 'La experiencia no debe superar 2000 caracteres.'], 422);
    }
    if ($habilidades === '') {
        mysqli_close($con);
        formulario_responder(['success' => false, 'mensaje' => 'Las habilidades son requeridas.'], 422);
    }
    if (mb_strlen($habilidades) > 2000) {
        mysqli_close($con);
        formulario_responder(['success' => false, 'mensaje' => 'Las habilidades no deben superar 2000 caracteres.'], 422);
    }

    if (!isset($_FILES['fotoPerfil']) || !is_array($_FILES['fotoPerfil'])
        || empty($_FILES['fotoPerfil']['name'])
        || (int)($_FILES['fotoPerfil']['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE
    ) {
        mysqli_close($con);
        formulario_responder(['success' => false, 'mensaje' => 'La foto de perfil es obligatoria.'], 422);
    }

    $fotoSubida = inclusijob_foto_perfil_guardar($id_usuario, $_FILES['fotoPerfil']);
    if (isset($fotoSubida['error'])) {
        $status = (int)($fotoSubida['http'] ?? 422);
        mysqli_close($con);
        formulario_responder([
            'success' => false,
            'mensaje' => formulario_foto_mensaje((string)$fotoSubida['error']),
        ], $status);
    }
    $fotoNueva = $fotoSubida['ruta'];
    $esfuerzo = $esfuerzoRaw === 'No' ? 0 : 1;

    if (!mysqli_begin_transaction($con)) {
        throw new RuntimeException('No se pudo iniciar la transaccion.');
    }

    $stmtFotoAnterior = formulario_preparar(
        $con,
        'SELECT foto_perfil FROM usuarios WHERE id_usuario = ? LIMIT 1'
    );
    formulario_bind($stmtFotoAnterior, 'i', $id_usuario);
    formulario_ejecutar($stmtFotoAnterior);
    $filaFoto = mysqli_fetch_assoc(formulario_resultado($stmtFotoAnterior));
    mysqli_stmt_close($stmtFotoAnterior);
    $fotoAnterior = (string)($filaFoto['foto_perfil'] ?? '');

    $stmtExistente = formulario_preparar(
        $con,
        'SELECT id_postulante FROM postulantes WHERE id_usuario = ? LIMIT 1'
    );
    formulario_bind($stmtExistente, 'i', $id_usuario);
    formulario_ejecutar($stmtExistente);
    $postulanteExistente = mysqli_fetch_assoc(formulario_resultado($stmtExistente));
    mysqli_stmt_close($stmtExistente);

    if ($postulanteExistente) {
        $idPostulante = (int)$postulanteExistente['id_postulante'];
        $stmtPostulante = formulario_preparar(
            $con,
            'UPDATE postulantes
             SET descripcion_discapacidad = ?, esfuerzo_fisico_posible = ?,
                 experiencia = ?, habilidades = ?
             WHERE id_postulante = ?'
        );
        formulario_bind($stmtPostulante, 'sissi', $descripcion, $esfuerzo, $experiencia, $habilidades, $idPostulante);
    } else {
        $stmtPostulante = formulario_preparar(
            $con,
            'INSERT INTO postulantes
             (descripcion_discapacidad, esfuerzo_fisico_posible, experiencia, habilidades, id_usuario)
             VALUES (?, ?, ?, ?, ?)'
        );
        formulario_bind($stmtPostulante, 'sissi', $descripcion, $esfuerzo, $experiencia, $habilidades, $id_usuario);
    }
    formulario_ejecutar($stmtPostulante);
    if (!$postulanteExistente) {
        $idPostulante = (int)mysqli_insert_id($con);
    }
    mysqli_stmt_close($stmtPostulante);

    $stmtFoto = formulario_preparar(
        $con,
        'UPDATE usuarios SET foto_perfil = ? WHERE id_usuario = ?'
    );
    formulario_bind($stmtFoto, 'si', $fotoNueva, $id_usuario);
    formulario_ejecutar($stmtFoto);
    mysqli_stmt_close($stmtFoto);

    $stmtEliminarTipos = formulario_preparar(
        $con,
        'DELETE FROM postulante_discapacidad WHERE id_postulante = ?'
    );
    formulario_bind($stmtEliminarTipos, 'i', $idPostulante);
    formulario_ejecutar($stmtEliminarTipos);
    mysqli_stmt_close($stmtEliminarTipos);

    $stmtInsertarTipo = formulario_preparar(
        $con,
        'INSERT INTO postulante_discapacidad (id_postulante, id_tipo_discapacidad)
         VALUES (?, ?)'
    );
    foreach ($tiposIds as $idTipo) {
        formulario_bind($stmtInsertarTipo, 'ii', $idPostulante, $idTipo);
        formulario_ejecutar($stmtInsertarTipo);
    }
    mysqli_stmt_close($stmtInsertarTipo);

    if (!mysqli_commit($con)) {
        throw new RuntimeException('No se pudo confirmar la transaccion.');
    }

    inclusijob_foto_borrar_anterior($fotoAnterior, $fotoNueva);
    mysqli_close($con);
    formulario_responder([
        'success' => true,
        'mensaje' => 'Perfil guardado correctamente.',
        'id_postulante' => $idPostulante,
    ]);
} catch (Throwable $error) {
    formulario_error_interno($con, $fotoNueva, $error);
}
