<?php
// Datos de la empresa del reclutador: obtener + actualizar.
// Guarda solo en `empresas` y enlaza con `reclutadores.id_empresas` en una transacción.
require_once __DIR__ . '/_auth.php';
require_once __DIR__ . '/../../Conexion.php';
require_once __DIR__ . '/../../config/sanitize.php';

reclutador_headers();

$con = conectarbd();
mysqli_set_charset($con, 'utf8mb4');
$id_usuario = reclutador_usuario_id();
$id_reclutador = reclutador_id_desde_usuario($con, $id_usuario);
$accion = $_GET['accion'] ?? '';

function empresa_normalizar_telefono($telefono_raw) {
    $telefono = trim((string)$telefono_raw);
    $digitos = preg_replace('/\D+/', '', $telefono);

    if ($telefono === '') {
        reclutador_responder(false, 'El numero de telefono es obligatorio.', null, 400);
    }

    if (!preg_match('/^[0-9+\s()\-]+$/', $telefono)) {
        reclutador_responder(false, 'El numero de telefono solo puede contener numeros, espacios, guiones o parentesis.', null, 400);
    }

    $ladas = [
        '502', '503', '504', '505', '506', '507',
        '591', '593', '595', '598',
        '52', '34', '54', '56', '57', '51', '58', '55',
        '1',
    ];

    $nacional = $digitos;
    if (strlen($digitos) > 10) {
        foreach ($ladas as $lada) {
            if (strpos($digitos, $lada) === 0 && strlen($digitos) > strlen($lada)) {
                $nacional = substr($digitos, strlen($lada));
                break;
            }
        }
    }

    if (!preg_match('/^[0-9]{10}$/', $nacional)) {
        reclutador_responder(false, 'El numero de telefono debe contener 10 digitos sin contar la LADA.', null, 400);
    }

    return $digitos;
}

function empresa_normalizar_rfc($rfc_raw) {
    $rfc = strtoupper(preg_replace('/[\s\-]+/', '', trim((string)$rfc_raw)));

    if ($rfc === '') {
        reclutador_responder(false, 'El RFC de la empresa es obligatorio.', null, 400);
    }

    if (!preg_match('/^([A-ZÑ&]{3,4})([0-9]{2})([0-9]{2})([0-9]{2})([A-Z0-9]{3})$/u', $rfc, $matches)) {
        reclutador_responder(false, 'Ingresa un RFC mexicano valido.', null, 400);
    }

    $year = (int)$matches[2];
    $month = (int)$matches[3];
    $day = (int)$matches[4];
    $fullYear = $year <= 30 ? 2000 + $year : 1900 + $year;

    if (!checkdate($month, $day, $fullYear)) {
        reclutador_responder(false, 'La fecha del RFC no es valida.', null, 400);
    }

    return $rfc;
}

function empresa_validar_sitio_web($sitio_web) {
    if ($sitio_web === '') {
        return;
    }
    if (mb_strlen($sitio_web) > 250) {
        reclutador_responder(false, 'El sitio web no debe superar 250 caracteres.', null, 400);
    }
    $partes = parse_url($sitio_web);
    $esquema = strtolower((string)($partes['scheme'] ?? ''));
    if (!in_array($esquema, ['http', 'https'], true) || !filter_var($sitio_web, FILTER_VALIDATE_URL)) {
        reclutador_responder(false, 'El sitio web debe ser una URL valida con http o https.', null, 400);
    }
}

function empresa_validar_dato_unico($con, $id_empresas_actual, $condicion, $params, $campo) {
    $sql = 'SELECT id_empresas, nombre_empresas
            FROM empresas
            WHERE id_empresas <> ?
              AND (' . $condicion . ')
            LIMIT 1';
    $stmt = mysqli_prepare($con, $sql);

    if (!$stmt) {
        reclutador_responder(false, 'No se pudo validar si la empresa ya existe.', null, 500);
    }

    $bind_params = array_merge([(int)$id_empresas_actual], $params);
    $types = 'i' . str_repeat('s', count($params));
    mysqli_stmt_bind_param($stmt, $types, ...$bind_params);
    mysqli_stmt_execute($stmt);
    $res = mysqli_stmt_get_result($stmt);
    $row = $res ? mysqli_fetch_assoc($res) : null;
    mysqli_stmt_close($stmt);

    if ($row) {
        $nombre = trim($row['nombre_empresas'] ?? '');
        $detalle = $nombre !== '' ? " ({$nombre})" : '';
        reclutador_responder(false, "Ya existe una empresa registrada con el mismo {$campo}{$detalle}.", null, 409);
    }
}

function empresa_validar_sin_duplicados($con, $id_empresas_actual, $nombre_empresa, $rfc_empresa, $correo_empresa, $telefono_empresa) {
    empresa_validar_dato_unico(
        $con,
        $id_empresas_actual,
        'LOWER(TRIM(nombre_empresas)) = LOWER(TRIM(?))',
        [$nombre_empresa],
        'nombre'
    );

    empresa_validar_dato_unico(
        $con,
        $id_empresas_actual,
        "UPPER(REPLACE(REPLACE(rfc, '-', ''), ' ', '')) = ?",
        [$rfc_empresa],
        'RFC'
    );

    empresa_validar_dato_unico(
        $con,
        $id_empresas_actual,
        'LOWER(TRIM(correo_empresa)) = LOWER(TRIM(?))',
        [$correo_empresa],
        'correo'
    );

    // telefono_nacional es generada (últimos 10 dígitos): cubre otro formato/LADA.
    $nacional = substr($telefono_empresa, -10);
    empresa_validar_dato_unico(
        $con,
        $id_empresas_actual,
        'telefono_nacional = ?',
        [$nacional],
        'telefono'
    );
}

if ($accion === 'obtener') {
    $sql = "SELECT
                COALESCE(e.nombre_empresas, '') AS nombre_empresa,
                COALESCE(e.rfc, '') AS rfc,
                COALESCE(e.rfc, '') AS rfc_empresa,
                COALESCE(e.correo_empresa, '') AS correo_empresa,
                COALESCE(e.sitio_web, '') AS sitio_web,
                COALESCE(e.telefono_empresa, '') AS telefono_empresa,
                COALESCE(e.descripcion, '') AS descripcion_empresa,
                COALESCE(e.direccion, '') AS direccion_empresa,
                COALESCE(e.estado_validacion, 0) AS empresa_validada,
                COALESCE(e.estado_validacion, 0) AS estado_validacion,
                e.id_empresas
            FROM usuarios u
            LEFT JOIN reclutadores r ON r.id_usuario = u.id_usuario
            LEFT JOIN empresas e ON e.id_empresas = r.id_empresas
            WHERE u.id_usuario = ? AND u.id_rol = 3
            LIMIT 1";
    $stmt = mysqli_prepare($con, $sql);
    if (!$stmt) {
        reclutador_responder(false, 'No se pudieron obtener los datos de la empresa.', null, 500);
    }
    mysqli_stmt_bind_param($stmt, 'i', $id_usuario);
    mysqli_stmt_execute($stmt);
    $res = mysqli_stmt_get_result($stmt);
    $row = $res ? mysqli_fetch_assoc($res) : null;
    mysqli_stmt_close($stmt);

    if (!$row) {
        reclutador_responder(false, 'No se encontraron datos corporativos.', null, 404);
    }

    $row['empresa_validada'] = (int)$row['empresa_validada'];
    $row['estado_validacion'] = (int)$row['estado_validacion'];
    $row['empresa_rechazada'] = $row['estado_validacion'] === 2;
    $row['requiere_reenvio'] = $row['estado_validacion'] === 2;
    $row['id_empresas'] = $row['id_empresas'] !== null ? (int)$row['id_empresas'] : null;
    reclutador_responder(true, 'Datos de la empresa obtenidos', $row);
}

if ($accion === 'actualizar' && ($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    $input = reclutador_json_body();
    $nombre_empresa = inclusijob_limpio($input['nombre_empresa'] ?? '');
    $rfc_empresa = empresa_normalizar_rfc(inclusijob_limpio($input['rfc'] ?? $input['rfc_empresa'] ?? ''));
    $correo_empresa = inclusijob_limpio($input['correo_empresa'] ?? '');
    $sitio_web = inclusijob_limpio($input['sitio_web'] ?? '');
    $telefono_empresa = empresa_normalizar_telefono(inclusijob_limpio($input['telefono_empresa'] ?? ''));
    $descripcion_empresa = inclusijob_limpio($input['descripcion_empresa'] ?? '');
    $direccion_empresa = inclusijob_limpio($input['direccion_empresa'] ?? '');

    if ($nombre_empresa === '') {
        reclutador_responder(false, 'El nombre de la empresa es obligatorio.', null, 400);
    }
    if (mb_strlen($nombre_empresa) > 200) {
        reclutador_responder(false, 'El nombre de la empresa no debe superar 200 caracteres.', null, 400);
    }

    if ($correo_empresa === '') {
        reclutador_responder(false, 'El correo de la empresa es obligatorio.', null, 400);
    }

    if (strlen($correo_empresa) > 150 || !filter_var($correo_empresa, FILTER_VALIDATE_EMAIL)) {
        reclutador_responder(false, 'Ingresa un correo de empresa valido.', null, 400);
    }

    empresa_validar_sitio_web($sitio_web);

    if (mb_strlen($direccion_empresa) > 300) {
        reclutador_responder(false, 'La dirección no debe superar 300 caracteres.', null, 400);
    }
    if (mb_strlen($descripcion_empresa) > 2000) {
        reclutador_responder(false, 'La descripción no debe superar 2000 caracteres.', null, 400);
    }

    $stmt_check = mysqli_prepare($con, 'SELECT
            r.id_empresas,
            e.nombre_empresas,
            e.estado_validacion
        FROM usuarios u
        LEFT JOIN reclutadores r ON r.id_usuario = u.id_usuario
        LEFT JOIN empresas e ON e.id_empresas = r.id_empresas
        WHERE u.id_usuario = ?
        LIMIT 1');
    if (!$stmt_check) {
        reclutador_responder(false, 'No se pudo validar el perfil de reclutador.', null, 500);
    }
    mysqli_stmt_bind_param($stmt_check, 'i', $id_usuario);
    mysqli_stmt_execute($stmt_check);
    $res_check = mysqli_stmt_get_result($stmt_check);
    $current = $res_check ? mysqli_fetch_assoc($res_check) : null;
    mysqli_stmt_close($stmt_check);

    if (!$current) {
        reclutador_responder(false, 'Usuario no encontrado.', null, 404);
    }

    $empresa_actual = $current['nombre_empresas'] ?? '';
    $validacion_actual = (int)($current['estado_validacion'] ?? 0);
    $empresa_rechazada = $validacion_actual === 2;
    $nueva_validacion = ($empresa_rechazada || $nombre_empresa !== $empresa_actual) ? 0 : $validacion_actual;
    $id_empresas = (int)($current['id_empresas'] ?? 0);

    empresa_validar_sin_duplicados($con, $id_empresas, $nombre_empresa, $rfc_empresa, $correo_empresa, $telefono_empresa);

    mysqli_begin_transaction($con);

    try {
        if (!$id_empresas) {
            $stmt_empresa = mysqli_prepare($con, 'INSERT INTO empresas (nombre_empresas, descripcion, direccion, telefono_empresa, correo_empresa, sitio_web, rfc, estado_validacion) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
            if (!$stmt_empresa) {
                throw new Exception('Error al crear la empresa.');
            }
            mysqli_stmt_bind_param($stmt_empresa, 'sssssssi', $nombre_empresa, $descripcion_empresa, $direccion_empresa, $telefono_empresa, $correo_empresa, $sitio_web, $rfc_empresa, $nueva_validacion);

            if (!mysqli_stmt_execute($stmt_empresa)) {
                $errno = mysqli_stmt_errno($stmt_empresa);
                mysqli_stmt_close($stmt_empresa);
                throw new Exception('Error al crear la empresa.', $errno);
            }
            mysqli_stmt_close($stmt_empresa);

            $id_empresas = (int)mysqli_insert_id($con);
            $stmt_rel = mysqli_prepare($con, 'UPDATE reclutadores SET id_empresas = ? WHERE id_reclutador = ?');
            if (!$stmt_rel) {
                throw new Exception('Error al enlazar la empresa.');
            }
            mysqli_stmt_bind_param($stmt_rel, 'ii', $id_empresas, $id_reclutador);
            if (!mysqli_stmt_execute($stmt_rel)) {
                $errno = mysqli_stmt_errno($stmt_rel);
                mysqli_stmt_close($stmt_rel);
                throw new Exception('Error al enlazar la empresa.', $errno);
            }
            mysqli_stmt_close($stmt_rel);
        } else {
            $stmt_empresa = mysqli_prepare($con, 'UPDATE empresas SET nombre_empresas = ?, descripcion = ?, direccion = ?, telefono_empresa = ?, correo_empresa = ?, sitio_web = ?, rfc = ?, estado_validacion = ? WHERE id_empresas = ?');
            if (!$stmt_empresa) {
                throw new Exception('Error al guardar la empresa.');
            }
            mysqli_stmt_bind_param($stmt_empresa, 'sssssssii', $nombre_empresa, $descripcion_empresa, $direccion_empresa, $telefono_empresa, $correo_empresa, $sitio_web, $rfc_empresa, $nueva_validacion, $id_empresas);

            if (!mysqli_stmt_execute($stmt_empresa)) {
                $errno = mysqli_stmt_errno($stmt_empresa);
                mysqli_stmt_close($stmt_empresa);
                throw new Exception('Error al guardar la empresa.', $errno);
            }
            mysqli_stmt_close($stmt_empresa);
        }

        mysqli_commit($con);
    } catch (Throwable $e) {
        mysqli_rollback($con);
        // Carrera entre dos guardados: revalidar para el mensaje específico del origen.
        if ((int)$e->getCode() === 1062 || mysqli_errno($con) === 1062) {
            empresa_validar_sin_duplicados($con, $id_empresas, $nombre_empresa, $rfc_empresa, $correo_empresa, $telefono_empresa);
            reclutador_responder(false, 'Ya existe una empresa registrada con los mismos datos.', null, 409);
        }
        reclutador_responder(false, $e->getMessage() ?: 'Error al guardar la empresa.', null, 500);
    }

    mysqli_close($con);
    reclutador_responder(true, 'Datos corporativos actualizados', [
        'empresa_validada' => $nueva_validacion,
        'estado_validacion' => $nueva_validacion,
        'empresa_rechazada' => false,
        'requiere_reenvio' => false,
        'cambio_nombre' => $nombre_empresa !== $empresa_actual,
        'reenvio_revision' => $empresa_rechazada,
    ]);
}

reclutador_responder(false, 'Accion no permitida.', null, 400);
