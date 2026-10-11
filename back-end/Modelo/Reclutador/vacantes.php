<?php
// Vacantes del reclutador (24a): listar, crear (insertar/guardar) y eliminar.
// Editar y actualizar_estado llegan en la 24b; hasta entonces responden 400.
require_once __DIR__ . '/_auth.php';
require_once __DIR__ . '/../../Conexion.php';
require_once __DIR__ . '/../../config/sanitize.php';

reclutador_headers('GET, POST, OPTIONS, DELETE');

$con = conectarbd();
mysqli_set_charset($con, 'utf8mb4');
$id_usuario = reclutador_usuario_id();
$id_reclutador = reclutador_id_desde_usuario($con, $id_usuario);
$accion = $_GET['accion'] ?? '';
$data = reclutador_json_body();

function vacante_discapacidad_ids($raw) {
    if (is_string($raw)) {
        $decoded = json_decode($raw, true);
        $raw = is_array($decoded) ? $decoded : explode(',', $raw);
    }

    if (!is_array($raw)) {
        return [];
    }

    $ids = [];
    foreach ($raw as $value) {
        $id = (int)$value;
        if ($id > 0) {
            $ids[$id] = $id;
        }
    }

    return array_values($ids);
}

function vacante_validar_discapacidades($con, $ids) {
    if (!$ids) {
        return [];
    }

    $ids = array_values(array_unique(array_map('intval', $ids)));
    $in = implode(',', $ids);
    $res = mysqli_query($con, "SELECT id_tipo_discapacidad FROM tipo_discapacidad WHERE id_tipo_discapacidad IN ($in)");

    if (!$res) {
        error_log('vacantes: no se pudieron validar las discapacidades: ' . mysqli_error($con));
        reclutador_responder(false, 'No se pudieron validar las discapacidades.', null, 500);
    }

    $validos = [];
    while ($row = mysqli_fetch_assoc($res)) {
        $validos[] = (int)$row['id_tipo_discapacidad'];
    }

    sort($ids);
    sort($validos);

    if ($ids !== $validos) {
        reclutador_responder(false, 'Una o mas discapacidades seleccionadas no existen.', null, 400);
    }

    return $validos;
}

function vacante_sync_discapacidades($con, $id_vacante, $ids) {
    $stmt_del = mysqli_prepare($con, 'DELETE FROM vacante_discapacidad WHERE id_vacante = ?');
    if (!$stmt_del) {
        return false;
    }
    mysqli_stmt_bind_param($stmt_del, 'i', $id_vacante);
    if (!mysqli_stmt_execute($stmt_del)) {
        mysqli_stmt_close($stmt_del);
        return false;
    }
    mysqli_stmt_close($stmt_del);

    if (!$ids) {
        return true;
    }

    $stmt_ins = mysqli_prepare($con, 'INSERT IGNORE INTO vacante_discapacidad (id_vacante, id_tipo_discapacidad) VALUES (?, ?)');
    if (!$stmt_ins) {
        return false;
    }
    foreach ($ids as $id_tipo) {
        $id_tipo = (int)$id_tipo;
        mysqli_stmt_bind_param($stmt_ins, 'ii', $id_vacante, $id_tipo);
        if (!mysqli_stmt_execute($stmt_ins)) {
            mysqli_stmt_close($stmt_ins);
            return false;
        }
    }
    mysqli_stmt_close($stmt_ins);

    return true;
}

function vacante_agregar_discapacidades($con, &$vacantes) {
    if (!$vacantes) {
        return;
    }

    $ids = array_map(fn($v) => (int)$v['id_vacante'], $vacantes);
    $in = implode(',', $ids);
    $sql = "SELECT
                vd.id_vacante AS id_vacante,
                td.id_tipo_discapacidad,
                td.nombre_discapacidad,
                COALESCE(td.descripcion, '') AS descripcion
            FROM vacante_discapacidad vd
            INNER JOIN tipo_discapacidad td ON td.id_tipo_discapacidad = vd.id_tipo_discapacidad
            WHERE vd.id_vacante IN ($in)
            ORDER BY td.nombre_discapacidad ASC";
    $res = mysqli_query($con, $sql);

    $por_vacante = [];
    if ($res) {
        while ($row = mysqli_fetch_assoc($res)) {
            $id_vacante = (int)$row['id_vacante'];
            $por_vacante[$id_vacante][] = [
                'id_tipo_discapacidad' => (int)$row['id_tipo_discapacidad'],
                'nombre_discapacidad' => $row['nombre_discapacidad'],
                'descripcion' => $row['descripcion'],
            ];
        }
    }

    foreach ($vacantes as &$vacante) {
        $id = (int)$vacante['id_vacante'];
        $vacante['discapacidades'] = $por_vacante[$id] ?? [];
        $vacante['discapacidad_ids'] = array_map(fn($d) => (int)$d['id_tipo_discapacidad'], $vacante['discapacidades']);
    }
    unset($vacante);
}

function vacante_pertenece_reclutador($con, $id_vacante, $id_reclutador) {
    $stmt = mysqli_prepare($con, 'SELECT id_vacante FROM vacantes WHERE id_vacante = ? AND id_reclutador = ? LIMIT 1');
    if (!$stmt) {
        error_log('vacantes: no se pudo verificar la pertenencia de la vacante ' . $id_vacante);
        reclutador_responder(false, 'No se pudo validar la vacante.', null, 500);
    }
    mysqli_stmt_bind_param($stmt, 'ii', $id_vacante, $id_reclutador);
    mysqli_stmt_execute($stmt);
    $res = mysqli_stmt_get_result($stmt);
    $row = $res ? mysqli_fetch_assoc($res) : null;
    mysqli_stmt_close($stmt);
    return (bool)$row;
}

function vacante_empresa_validada($con, $id_reclutador) {
    $stmt = mysqli_prepare($con, 'SELECT COALESCE(e.estado_validacion, 0) AS empresa_validada
            FROM reclutadores r
            LEFT JOIN empresas e ON e.id_empresas = r.id_empresas
            WHERE r.id_reclutador = ?
            LIMIT 1');
    if (!$stmt) {
        return 0;
    }
    mysqli_stmt_bind_param($stmt, 'i', $id_reclutador);
    mysqli_stmt_execute($stmt);
    $res = mysqli_stmt_get_result($stmt);
    $row = $res ? mysqli_fetch_assoc($res) : null;
    mysqli_stmt_close($stmt);

    return (int)($row['empresa_validada'] ?? 0);
}

function vacante_exigir_empresa_aprobada($con, $id_reclutador) {
    if (vacante_empresa_validada($con, $id_reclutador) !== 1) {
        reclutador_responder(false, 'No puedes publicar vacantes hasta que tu empresa sea aprobada por el administrador.', null, 403);
    }
}

function vacante_validar_salarios($salario_min_raw, $salario_max_raw) {
    if ($salario_min_raw === '' || $salario_max_raw === '' || $salario_min_raw === null || $salario_max_raw === null) {
        reclutador_responder(false, 'El salario debe estar entre $1,000 y $1,000,000 pesos.', null, 400);
    }

    if (!is_numeric($salario_min_raw) || !is_numeric($salario_max_raw)) {
        reclutador_responder(false, 'El salario debe estar entre $1,000 y $1,000,000 pesos.', null, 400);
    }

    $salario_min = (float)$salario_min_raw;
    $salario_max = (float)$salario_max_raw;

    if ($salario_min < 1000 || $salario_min > 1000000 || $salario_max < 1000 || $salario_max > 1000000) {
        reclutador_responder(false, 'El salario debe estar entre $1,000 y $1,000,000 pesos.', null, 400);
    }

    if ($salario_min > $salario_max) {
        reclutador_responder(false, 'El salario maximo debe ser mayor o igual al salario minimo.', null, 400);
    }

    return [$salario_min, $salario_max];
}

function vacante_fecha_valida($fecha) {
    if (!is_string($fecha) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $fecha)) {
        return false;
    }

    $dt = DateTime::createFromFormat('!Y-m-d', $fecha);
    return $dt && $dt->format('Y-m-d') === $fecha;
}

function vacante_validar_fechas($fecha_publicacion_raw, $fecha_cierre_raw) {
    $fecha_publicacion = trim((string)$fecha_publicacion_raw);
    $fecha_cierre = trim((string)$fecha_cierre_raw);

    if ($fecha_publicacion === '' || $fecha_cierre === '') {
        reclutador_responder(false, 'La fecha de publicacion y la fecha de cierre son obligatorias.', null, 400);
    }

    if (!vacante_fecha_valida($fecha_publicacion) || !vacante_fecha_valida($fecha_cierre)) {
        reclutador_responder(false, 'Las fechas de la vacante no tienen un formato valido.', null, 400);
    }

    if ($fecha_publicacion > $fecha_cierre) {
        reclutador_responder(false, 'La fecha de cierre debe ser posterior a la fecha de publicacion.', null, 400);
    }

    return [$fecha_publicacion . ' 00:00:00', $fecha_cierre];
}

function vacante_contar_relacion($con, $tabla, $id_vacante) {
    $tablas = ['postulaciones' => true, 'reporte_vacante' => true];
    if (!isset($tablas[$tabla])) {
        return 0;
    }
    $stmt = mysqli_prepare($con, "SELECT COUNT(*) AS total FROM `$tabla` WHERE id_vacante = ?");
    if (!$stmt) {
        return 0;
    }
    mysqli_stmt_bind_param($stmt, 'i', $id_vacante);
    mysqli_stmt_execute($stmt);
    $res = mysqli_stmt_get_result($stmt);
    $row = $res ? mysqli_fetch_assoc($res) : null;
    mysqli_stmt_close($stmt);
    return (int)($row['total'] ?? 0);
}

if ($accion === 'listar') {
    try {
        $sql = "SELECT id_vacante, titulo_puesto, descripcion_puesto, requisitos, modalidad,
                       salario_min, salario_max, estado, fecha_publicacion, fecha_cierre, id_reclutador
                FROM vacantes
                WHERE id_reclutador = ?
                ORDER BY id_vacante DESC";
        $stmt = mysqli_prepare($con, $sql);
        if (!$stmt) {
            throw new Exception('No se pudieron obtener las vacantes.');
        }
        mysqli_stmt_bind_param($stmt, 'i', $id_reclutador);
        if (!mysqli_stmt_execute($stmt)) {
            throw new Exception('No se pudieron obtener las vacantes.');
        }
        $res = mysqli_stmt_get_result($stmt);

        $vacantes = [];
        while ($row = mysqli_fetch_assoc($res)) {
            $row['id_vacante'] = (int)$row['id_vacante'];
            $vacantes[] = $row;
        }
        mysqli_stmt_close($stmt);

        vacante_agregar_discapacidades($con, $vacantes);
        reclutador_responder(true, 'Vacantes obtenidas', $vacantes);
    } catch (Throwable $e) {
        error_log('vacantes listar: ' . $e->getMessage());
        reclutador_responder(false, 'No se pudieron obtener las vacantes.', null, 500);
    }
}

if (($accion === 'insertar' || $accion === 'guardar') && ($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    vacante_exigir_empresa_aprobada($con, $id_reclutador);

    $titulo = inclusijob_limpio($data['titulo_puesto'] ?? '');
    $descripcion = inclusijob_limpio($data['descripcion_puesto'] ?? '');
    $requisitos = inclusijob_limpio($data['requisitos'] ?? '');
    $modalidad = trim((string)($data['modalidad'] ?? 'Presencial'));
    $estado = trim((string)($data['estado'] ?? 'activa'));

    if ($titulo === '') {
        reclutador_responder(false, 'El titulo de la vacante es obligatorio.', null, 400);
    }
    if (mb_strlen($titulo) > 200) {
        reclutador_responder(false, 'El titulo de la vacante no debe superar 200 caracteres.', null, 400);
    }
    if (mb_strlen($descripcion) > 5000) {
        reclutador_responder(false, 'La descripcion de la vacante no debe superar 5000 caracteres.', null, 400);
    }
    if (mb_strlen($requisitos) > 5000) {
        reclutador_responder(false, 'Los requisitos de la vacante no deben superar 5000 caracteres.', null, 400);
    }
    if (!in_array($modalidad, ['Presencial', 'Remoto', 'Hibrido'], true)) {
        reclutador_responder(false, 'La modalidad debe ser Presencial, Remoto o Hibrido.', null, 400);
    }
    if (!in_array($estado, ['activa', 'pausada'], true)) {
        reclutador_responder(false, 'El estado debe ser activa o pausada.', null, 400);
    }

    $salarios = vacante_validar_salarios($data['salario_min'] ?? null, $data['salario_max'] ?? null);
    $salario_min = $salarios[0];
    $salario_max = $salarios[1];
    $fechas = vacante_validar_fechas($data['fecha_publicacion'] ?? '', $data['fecha_cierre'] ?? '');
    $fecha_publicacion = $fechas[0];
    $fecha_cierre = $fechas[1];
    $discapacidades = vacante_validar_discapacidades($con, vacante_discapacidad_ids($data['discapacidades'] ?? []));

    try {
        mysqli_begin_transaction($con);

        $sql = "INSERT INTO vacantes
                    (titulo_puesto, descripcion_puesto, requisitos, modalidad, salario_min, salario_max, estado, fecha_publicacion, fecha_cierre, id_reclutador)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        $stmt = mysqli_prepare($con, $sql);
        if (!$stmt) {
            throw new Exception('No se pudo crear la vacante.');
        }
        mysqli_stmt_bind_param($stmt, 'ssssddsssi', $titulo, $descripcion, $requisitos, $modalidad, $salario_min, $salario_max, $estado, $fecha_publicacion, $fecha_cierre, $id_reclutador);

        if (!mysqli_stmt_execute($stmt)) {
            mysqli_stmt_close($stmt);
            throw new Exception('No se pudo crear la vacante.');
        }

        $id_vacante = (int)mysqli_insert_id($con);
        mysqli_stmt_close($stmt);

        if (!vacante_sync_discapacidades($con, $id_vacante, $discapacidades)) {
            throw new Exception('No se pudieron guardar las discapacidades de la vacante.');
        }

        mysqli_commit($con);
        reclutador_responder(true, 'Vacante creada correctamente', ['id_vacante' => $id_vacante]);
    } catch (Throwable $e) {
        mysqli_rollback($con);
        error_log('vacantes crear: ' . $e->getMessage());
        reclutador_responder(false, 'No se pudo crear la vacante.', null, 500);
    }
}

if ($accion === 'eliminar') {
    $metodo = $_SERVER['REQUEST_METHOD'] ?? '';
    if ($metodo !== 'POST' && $metodo !== 'DELETE') {
        reclutador_responder(false, 'Metodo no permitido.', null, 405);
    }

    $id_vacante = (int)($_GET['id_vacante'] ?? ($data['id_vacante'] ?? 0));

    if (!$id_vacante) {
        reclutador_responder(false, 'ID de vacante requerido.', null, 400);
    }

    if (!vacante_pertenece_reclutador($con, $id_vacante, $id_reclutador)) {
        reclutador_responder(false, 'No se encontro la vacante.', null, 404);
    }

    try {
        mysqli_begin_transaction($con);

        // Las discapacidades se borran primero porque su FK a vacantes es
        // restrictiva; si el borrado de la vacante falla, se hace rollback.
        $stmt_disc = mysqli_prepare($con, 'DELETE FROM vacante_discapacidad WHERE id_vacante = ?');
        if (!$stmt_disc) {
            throw new Exception('No se pudo eliminar la vacante.');
        }
        mysqli_stmt_bind_param($stmt_disc, 'i', $id_vacante);
        if (!mysqli_stmt_execute($stmt_disc)) {
            mysqli_stmt_close($stmt_disc);
            throw new Exception('No se pudo eliminar la vacante.');
        }
        mysqli_stmt_close($stmt_disc);

        // Borrado atómico: solo borra si no hay postulaciones ni reportes,
        // así una postulación en carrera bloquea el borrado.
        $stmt = mysqli_prepare($con, 'DELETE FROM vacantes WHERE id_vacante = ? AND id_reclutador = ?
            AND NOT EXISTS (SELECT 1 FROM postulaciones WHERE postulaciones.id_vacante = ?)
            AND NOT EXISTS (SELECT 1 FROM reporte_vacante WHERE reporte_vacante.id_vacante = ?)');
        if (!$stmt) {
            throw new Exception('No se pudo eliminar la vacante.');
        }
        mysqli_stmt_bind_param($stmt, 'iiii', $id_vacante, $id_reclutador, $id_vacante, $id_vacante);

        try {
            $ok = mysqli_stmt_execute($stmt);
        } catch (mysqli_sql_exception $e) {
            mysqli_stmt_close($stmt);
            if ((int)$e->getCode() === 1451) {
                mysqli_rollback($con);
                $n_post = vacante_contar_relacion($con, 'postulaciones', $id_vacante);
                if ($n_post > 0) {
                    reclutador_responder(false, "Esta vacante ya tiene {$n_post} postulacion(es) y no se puede eliminar. Pausala para que deje de recibir postulantes.", null, 409);
                }
                reclutador_responder(false, 'Esta vacante tiene reportes y no se puede eliminar.', null, 409);
            }
            throw new Exception('No se pudo eliminar la vacante.');
        }

        if (!$ok) {
            $errno = mysqli_stmt_errno($stmt);
            mysqli_stmt_close($stmt);
            if ($errno === 1451) {
                mysqli_rollback($con);
                $n_post = vacante_contar_relacion($con, 'postulaciones', $id_vacante);
                if ($n_post > 0) {
                    reclutador_responder(false, "Esta vacante ya tiene {$n_post} postulacion(es) y no se puede eliminar. Pausala para que deje de recibir postulantes.", null, 409);
                }
                reclutador_responder(false, 'Esta vacante tiene reportes y no se puede eliminar.', null, 409);
            }
            throw new Exception('No se pudo eliminar la vacante.');
        }

        if (mysqli_stmt_affected_rows($stmt) === 1) {
            mysqli_stmt_close($stmt);
            mysqli_commit($con);
            reclutador_responder(true, 'Vacante eliminada');
        }
        mysqli_stmt_close($stmt);

        mysqli_rollback($con);

        if (!vacante_pertenece_reclutador($con, $id_vacante, $id_reclutador)) {
            reclutador_responder(false, 'No se encontro la vacante.', null, 404);
        }
        $n_post = vacante_contar_relacion($con, 'postulaciones', $id_vacante);
        if ($n_post > 0) {
            reclutador_responder(false, "Esta vacante ya tiene {$n_post} postulacion(es) y no se puede eliminar. Pausala para que deje de recibir postulantes.", null, 409);
        }
        if (vacante_contar_relacion($con, 'reporte_vacante', $id_vacante) > 0) {
            reclutador_responder(false, 'Esta vacante tiene reportes y no se puede eliminar.', null, 409);
        }
        reclutador_responder(false, 'No se encontro la vacante.', null, 404);
    } catch (Throwable $e) {
        // reclutador_responder() hace exit, así que solo se llega aquí en 500.
        try {
            mysqli_rollback($con);
        } catch (Throwable $ignored) {
        }
        error_log('vacantes eliminar: ' . $e->getMessage());
        reclutador_responder(false, 'No se pudo eliminar la vacante.', null, 500);
    }
}

reclutador_responder(false, 'Accion no reconocida.', null, 400);
