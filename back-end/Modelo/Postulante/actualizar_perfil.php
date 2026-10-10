<?php
// Actualiza perfil del postulante: { success, message, foto_perfil }.
// UPDATEs de usuarios/postulantes + reemplazo de discapacidades en UNA transacción.
require_once __DIR__ . '/../../config/auth.php';
inclusijob_cors_headers('POST, OPTIONS', 'Content-Type');

$user = requerirRol(['postulante']);
$id_usuario = (int)($user['id'] ?? 0);

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Metodo no permitido.']);
    exit;
}

require_once __DIR__ . '/../../Conexion.php';
require_once __DIR__ . '/../usuarios_telefono.php';
require_once __DIR__ . '/../../config/sanitize.php';
$con = conectarbd();
mysqli_set_charset($con, 'utf8mb4');

$stmt = mysqli_prepare(
    $con,
    'SELECT u.id_rol, p.id_postulante
     FROM usuarios u
     LEFT JOIN postulantes p ON p.id_usuario = u.id_usuario
     WHERE u.id_usuario = ? AND u.estado = 1 LIMIT 1'
);
mysqli_stmt_bind_param($stmt, 'i', $id_usuario);
mysqli_stmt_execute($stmt);
$row = mysqli_fetch_assoc(mysqli_stmt_get_result($stmt));
mysqli_stmt_close($stmt);

if (!$row || (int)$row['id_rol'] !== 2) {
    mysqli_close($con);
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Solo postulantes pueden usar este formulario.']);
    exit;
}
if (!$row['id_postulante']) {
    mysqli_close($con);
    http_response_code(404);
    echo json_encode(['success' => false, 'message' => 'No tienes perfil creado.']);
    exit;
}

$id_postulante = (int)$row['id_postulante'];

// ── Leer campos de $_POST (FormData) ─────────────────────────
$nombres = inclusijob_limpio($_POST['nombres'] ?? '');
$apellidos = inclusijob_limpio($_POST['apellidos'] ?? '');
$telefono = usuario_telefono_digitos($_POST['telefono'] ?? '');
$telefonoNacional = usuario_telefono_nacional($_POST['telefono'] ?? '');
$experiencia = inclusijob_limpio($_POST['experiencia'] ?? '');
$portafolio = inclusijob_limpio($_POST['portafolio_url'] ?? '');
$esfuerzo = isset($_POST['esfuerzo_fisico_posible']) ? trim((string)$_POST['esfuerzo_fisico_posible']) : '';

// Skills llegan como JSON string
$habilidades = '';
$skillsRaw = $_POST['skills'] ?? '';
if ($skillsRaw !== '') {
    $skillsArr = json_decode($skillsRaw, true);
    if (is_array($skillsArr)) {
        $habilidades = json_encode($skillsArr, JSON_UNESCAPED_UNICODE);
    }
}

// Discapacidades llegan como JSON string
$discapacidades = [];
$discRaw = $_POST['discapacidad'] ?? '';
if ($discRaw !== '') {
    $discArr = json_decode($discRaw, true);
    if (is_array($discArr)) {
        $discapacidades = $discArr;
    }
}

// Acepta discapacidades por ID (nuevo flujo dinamico) y por nombre
// (compatibilidad con versiones anteriores del frontend).
$discapacidadIds = [];
if (!empty($discapacidades)) {
    $stmtTipoPorId = mysqli_prepare(
        $con,
        'SELECT id_tipo_discapacidad FROM tipo_discapacidad WHERE id_tipo_discapacidad = ? LIMIT 1'
    );
    $stmtTipoPorNombre = mysqli_prepare(
        $con,
        'SELECT id_tipo_discapacidad FROM tipo_discapacidad WHERE nombre_discapacidad = ? LIMIT 1'
    );

    foreach ($discapacidades as $discValor) {
        $discValor = inclusijob_limpio($discValor);
        if ($discValor === '') {
            continue;
        }

        $tipo = null;
        if (ctype_digit($discValor)) {
            $id_tipo_tmp = (int)$discValor;
            mysqli_stmt_bind_param($stmtTipoPorId, 'i', $id_tipo_tmp);
            mysqli_stmt_execute($stmtTipoPorId);
            $resTipo = mysqli_stmt_get_result($stmtTipoPorId);
            $tipo = mysqli_fetch_assoc($resTipo);
            mysqli_free_result($resTipo);
        } else {
            mysqli_stmt_bind_param($stmtTipoPorNombre, 's', $discValor);
            mysqli_stmt_execute($stmtTipoPorNombre);
            $resTipo = mysqli_stmt_get_result($stmtTipoPorNombre);
            $tipo = mysqli_fetch_assoc($resTipo);
            mysqli_free_result($resTipo);
        }

        if ($tipo) {
            $discapacidadIds[(int)$tipo['id_tipo_discapacidad']] = true;
        }
    }

    mysqli_stmt_close($stmtTipoPorId);
    mysqli_stmt_close($stmtTipoPorNombre);
}

// descripcion_discapacidad = nota + porcentaje
$nota = inclusijob_limpio($_POST['nota'] ?? '');
$porcentaje = trim((string)($_POST['porcentaje'] ?? ''));

// ── VALIDACIONES ──────────────────────────────────────────────
$errores = [];

// nombres y apellidos: solo letras (incluye tildes/ñ) y espacios;
// usuarios.nombres / apellidos es varchar(150).
$regexTexto = '/^[A-Za-zÀ-ÖØ-öø-ÿÑñ\s]+$/u';

if ($nombres === '' || !preg_match($regexTexto, $nombres)) {
    $errores[] = "El campo 'nombres' solo debe contener letras.";
} elseif (mb_strlen($nombres) > 150) {
    $errores[] = "El campo 'nombres' no debe superar 150 caracteres.";
}

if ($apellidos === '' || !preg_match($regexTexto, $apellidos)) {
    $errores[] = "El campo 'apellidos' solo debe contener letras.";
} elseif (mb_strlen($apellidos) > 150) {
    $errores[] = "El campo 'apellidos' no debe superar 150 caracteres.";
}

// telefono: se guarda con LADA, pero la validacion de 10 digitos aplica
// solo al numero nacional, no a la LADA.
if ($telefono !== '' && !preg_match('/^[0-9]{10}$/', $telefonoNacional)) {
    $errores[] = "El campo 'telefono' debe contener 10 digitos sin contar la LADA.";
}

if ($telefono !== '' && usuario_telefono_duplicado($con, $telefono, $id_usuario)) {
    $errores[] = 'Este numero de telefono ya esta registrado por otro usuario.';
}

// esfuerzo_fisico_posible: entero de 0 a 5.
if ($esfuerzo === '' || !ctype_digit($esfuerzo) || (int)$esfuerzo < 0 || (int)$esfuerzo > 5) {
    $errores[] = "El campo 'esfuerzo fisico posible' debe ser un numero valido (0 a 5).";
}

// porcentaje: si viene, numerico entre 0 y 100.
if ($porcentaje !== '' && (!is_numeric($porcentaje) || (float)$porcentaje < 0 || (float)$porcentaje > 100)) {
    $errores[] = "El campo 'porcentaje' debe ser un numero entre 0 y 100.";
}

// portafolio_url: si viene, URL valida.
if ($portafolio !== '' && !filter_var($portafolio, FILTER_VALIDATE_URL)) {
    $errores[] = "El campo 'portafolio' debe ser una URL valida (ej: https://midominio.com).";
}

// experiencia: obligatoria, maximo 2000.
if ($experiencia === '') {
    $errores[] = "El campo 'experiencia' no puede estar vacio.";
} elseif (mb_strlen($experiencia) > 2000) {
    $errores[] = "El campo 'experiencia' es demasiado largo (maximo 2000 caracteres).";
}

// skills: si vino, debe ser un array valido tras el decode.
if ($skillsRaw !== '' && $habilidades === '') {
    $errores[] = "El campo 'skills' tiene un formato invalido.";
}

if (!empty($errores)) {
    mysqli_close($con);
    http_response_code(422);
    echo json_encode([
        'success' => false,
        'message' => implode(' ', $errores),
    ]);
    exit;
}

$esfuerzo = (int)$esfuerzo;

// descripcion_discapacidad = nota + porcentaje
$desc_disc = $nota;
if ($porcentaje !== '') {
    $desc_disc = $nota !== '' ? $nota . ' | ' . $porcentaje . '%' : $porcentaje . '%';
}

// ── Foto de perfil (opcional, previa a la transacción) ─────────
$foto_perfil_ruta = null;

if (!empty($_FILES['fotoPerfil']['name'])) {
    $archivo = $_FILES['fotoPerfil'];
    $extensiones = ['jpg', 'jpeg', 'png', 'webp'];
    $ext = strtolower(pathinfo($archivo['name'], PATHINFO_EXTENSION));

    if (!in_array($ext, $extensiones, true)) {
        mysqli_close($con);
        http_response_code(422);
        echo json_encode(['success' => false, 'message' => 'Formato no valido. Usa JPG, PNG o WEBP.']);
        exit;
    }

    if ($archivo['size'] > 5 * 1024 * 1024) {
        mysqli_close($con);
        http_response_code(422);
        echo json_encode(['success' => false, 'message' => 'La imagen no debe superar 5 MB.']);
        exit;
    }

    if ($archivo['error'] !== UPLOAD_ERR_OK) {
        mysqli_close($con);
        http_response_code(422);
        echo json_encode(['success' => false, 'message' => 'Error al subir el archivo (codigo ' . $archivo['error'] . ').']);
        exit;
    }

    // Valida contenido real, no solo extension (texto renombrado a .jpg se rechaza).
    $info = @getimagesize($archivo['tmp_name']);
    $mimeOk = $info && in_array($info['mime'] ?? '', ['image/jpeg', 'image/png', 'image/webp'], true);
    if (!$mimeOk) {
        mysqli_close($con);
        http_response_code(422);
        echo json_encode(['success' => false, 'message' => 'Formato no valido. Usa JPG, PNG o WEBP.']);
        exit;
    }

    $carpeta = __DIR__ . '/../../uploads/fotos_perfil/';
    if (!is_dir($carpeta)) {
        mkdir($carpeta, 0755, true);
    }

    $nombre_archivo = 'perfil_' . $id_usuario . '_' . time() . '.' . $ext;

    if (!move_uploaded_file($archivo['tmp_name'], $carpeta . $nombre_archivo)) {
        mysqli_close($con);
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'No se pudo guardar la imagen.']);
        exit;
    }

    $foto_perfil_ruta = 'uploads/fotos_perfil/' . $nombre_archivo;
}

// ── Transacción: usuarios + postulantes + discapacidades ──────
mysqli_begin_transaction($con);

try {
    // Foto anterior: se lee dentro de la transacción, se borra solo tras commit.
    $foto_anterior = null;
    $stmtFoto = mysqli_prepare($con, 'SELECT foto_perfil FROM usuarios WHERE id_usuario = ?');
    if (!$stmtFoto) {
        throw new Exception('No se pudo leer la foto anterior.');
    }
    mysqli_stmt_bind_param($stmtFoto, 'i', $id_usuario);
    if (!mysqli_stmt_execute($stmtFoto)) {
        mysqli_stmt_close($stmtFoto);
        throw new Exception('No se pudo leer la foto anterior.');
    }
    $resFoto = mysqli_stmt_get_result($stmtFoto);
    $filaFoto = $resFoto ? mysqli_fetch_assoc($resFoto) : null;
    mysqli_stmt_close($stmtFoto);
    $foto_anterior = (string)($filaFoto['foto_perfil'] ?? '');

    if ($foto_perfil_ruta !== null) {
        $stmtU = mysqli_prepare(
            $con,
            'UPDATE usuarios
                SET nombres = ?,
                    apellidos = ?,
                    telefono = ?,
                    foto_perfil = ?
             WHERE id_usuario = ?'
        );
        if (!$stmtU) {
            throw new Exception('Error al actualizar el perfil.');
        }
        mysqli_stmt_bind_param($stmtU, 'ssssi', $nombres, $apellidos, $telefono, $foto_perfil_ruta, $id_usuario);
    } else {
        $stmtU = mysqli_prepare(
            $con,
            'UPDATE usuarios
                SET nombres = ?,
                    apellidos = ?,
                    telefono = ?
             WHERE id_usuario = ?'
        );
        if (!$stmtU) {
            throw new Exception('Error al actualizar el perfil.');
        }
        mysqli_stmt_bind_param($stmtU, 'sssi', $nombres, $apellidos, $telefono, $id_usuario);
    }

    if (!mysqli_stmt_execute($stmtU)) {
        mysqli_stmt_close($stmtU);
        throw new Exception('Error al actualizar el perfil.');
    }
    mysqli_stmt_close($stmtU);

    $stmtP = mysqli_prepare(
        $con,
        'UPDATE postulantes
            SET descripcion_discapacidad = ?,
                esfuerzo_fisico_posible  = ?,
                experiencia              = ?,
                habilidades              = ?,
                portafolio_url           = ?
          WHERE id_postulante = ?'
    );
    if (!$stmtP) {
        throw new Exception('Error al actualizar el perfil.');
    }
    mysqli_stmt_bind_param($stmtP, 'sisssi', $desc_disc, $esfuerzo, $experiencia, $habilidades, $portafolio, $id_postulante);

    if (!mysqli_stmt_execute($stmtP)) {
        mysqli_stmt_close($stmtP);
        throw new Exception('Error al actualizar el perfil.');
    }
    mysqli_stmt_close($stmtP);

    $stmtDel = mysqli_prepare($con, 'DELETE FROM postulante_discapacidad WHERE id_postulante = ?');
    if (!$stmtDel) {
        throw new Exception('Error al actualizar el perfil.');
    }
    mysqli_stmt_bind_param($stmtDel, 'i', $id_postulante);
    if (!mysqli_stmt_execute($stmtDel)) {
        mysqli_stmt_close($stmtDel);
        throw new Exception('Error al actualizar el perfil.');
    }
    mysqli_stmt_close($stmtDel);

    if (!empty($discapacidadIds)) {
        $stmtIns = mysqli_prepare(
            $con,
            'INSERT IGNORE INTO postulante_discapacidad (id_postulante, id_tipo_discapacidad) VALUES (?, ?)'
        );
        if (!$stmtIns) {
            throw new Exception('Error al actualizar el perfil.');
        }
        foreach (array_keys($discapacidadIds) as $id_tipo) {
            $id_tipo = (int)$id_tipo;
            mysqli_stmt_bind_param($stmtIns, 'ii', $id_postulante, $id_tipo);
            if (!mysqli_stmt_execute($stmtIns)) {
                mysqli_stmt_close($stmtIns);
                throw new Exception('Error al actualizar el perfil.');
            }
        }
        mysqli_stmt_close($stmtIns);
    }

    mysqli_commit($con);

    $_SESSION['user']['nombre'] = $nombres;
    $_SESSION['user']['apellido'] = $apellidos;

    // Borrado anterior solo tras commit, con triple condición; si falla se ignora.
    if ($foto_perfil_ruta !== null && $foto_anterior !== '' && $foto_anterior !== $foto_perfil_ruta) {
        if (strpos($foto_anterior, 'uploads/fotos_perfil/') === 0) {
            $base = realpath(__DIR__ . '/../../uploads/fotos_perfil');
            $candidata = realpath(__DIR__ . '/../../' . $foto_anterior);
            if ($base && $candidata && strpos($candidata, $base) === 0 && is_file($candidata)) {
                @unlink($candidata);
            }
        }
    }

    mysqli_close($con);

    echo json_encode([
        'success' => true,
        'message' => 'Perfil actualizado correctamente.',
        'foto_perfil' => $foto_perfil_ruta
            ? inclusijob_backend_url($foto_perfil_ruta)
            : null,
    ]);
} catch (Throwable $e) {
    mysqli_rollback($con);
    mysqli_close($con);

    // Si la transacción falla, no deja foto huérfana.
    if ($foto_perfil_ruta !== null) {
        $nueva = realpath(__DIR__ . '/../../' . $foto_perfil_ruta);
        $base = realpath(__DIR__ . '/../../uploads/fotos_perfil');
        if ($nueva && $base && strpos($nueva, $base) === 0 && is_file($nueva)) {
            @unlink($nueva);
        } else {
            @unlink(__DIR__ . '/../../' . $foto_perfil_ruta);
        }
    }

    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error al actualizar el perfil.']);
}
