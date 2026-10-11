<?php
// Validación de empresas del administrador: listar, detalle, aprobar,
// rechazar, suspender y reactivar. Solo rol administrador.
require_once __DIR__ . '/_auth.php';
require_once __DIR__ . '/../../Conexion.php';
require_once __DIR__ . '/../../config/sanitize.php';

admin_headers('GET, POST, OPTIONS');

$con = conectarbd();
mysqli_set_charset($con, 'utf8mb4');
admin_usuario_id();

// LIKE con ESCAPE: % _ y \ literales no actúan como comodines.
function empresas_escape_like($s) {
    return str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], (string)$s);
}

function empresas_estado_etiqueta($e) {
    if ((int)$e === 0) return 'pendiente';
    if ((int)$e === 1) return 'aprobada';
    if ((int)$e === 2) return 'rechazada';
    if ((int)$e === 3) return 'suspendida';
    return 'desconocido';
}

// Fila mínima para distinguir 404 / estado indebido / incompleta.
function empresas_leer($con, $id) {
    $stmt = mysqli_prepare($con, 'SELECT id_empresas, estado_validacion, rfc, correo_empresa, telefono_empresa FROM empresas WHERE id_empresas = ? LIMIT 1');
    if (!$stmt) {
        error_log('empresas.php leer prepare: ' . mysqli_error($con));
        admin_responder(false, 'No se pudo procesar la solicitud. Intenta de nuevo.', null, 500);
    }
    mysqli_stmt_bind_param($stmt, 'i', $id);
    if (!mysqli_stmt_execute($stmt)) {
        error_log('empresas.php leer execute: ' . mysqli_stmt_error($stmt));
        admin_responder(false, 'No se pudo procesar la solicitud. Intenta de nuevo.', null, 500);
    }
    $res = mysqli_stmt_get_result($stmt);
    $fila = $res ? mysqli_fetch_assoc($res) : null;
    mysqli_stmt_close($stmt);
    return $fila ?: null;
}

function empresas_completa($fila) {
    return trim((string)($fila['rfc'] ?? '')) !== ''
        && trim((string)($fila['correo_empresa'] ?? '')) !== ''
        && trim((string)($fila['telefono_empresa'] ?? '')) !== '';
}

try {
    $accion = $_GET['accion'] ?? '';
    $metodo = $_SERVER['REQUEST_METHOD'] ?? 'GET';

    // GET - listar con filtro de estado, búsqueda y paginación.
    if ($metodo === 'GET' && $accion === 'listar') {
        $estado = $_GET['estado'] ?? 'todas';
        $buscar = $_GET['buscar'] ?? '';
        $pagina = max(1, (int)($_GET['pagina'] ?? 1));
        $limite = max(1, min(100, (int)($_GET['limite'] ?? 15)));
        $offset = ($pagina - 1) * $limite;

        $condiciones = [];
        $params = [];
        $tipos = '';

        if (in_array($estado, ['0', '1', '2', '3'], true)) {
            $condiciones[] = 'e.estado_validacion = ?';
            $params[] = (int)$estado;
            $tipos .= 'i';
        }

        if ($buscar !== '') {
            $condiciones[] = '(e.nombre_empresas LIKE ? ESCAPE \'\\\\\' OR e.correo_empresa LIKE ? ESCAPE \'\\\\\' OR e.direccion LIKE ? ESCAPE \'\\\\\' OR e.rfc LIKE ? ESCAPE \'\\\\\')';
            $like = '%' . empresas_escape_like($buscar) . '%';
            for ($i = 0; $i < 4; $i++) {
                $params[] = $like;
                $tipos .= 's';
            }
        }

        $where = count($condiciones) ? 'WHERE ' . implode(' AND ', $condiciones) : '';

        $stmtT = mysqli_prepare($con, "SELECT COUNT(*) AS total FROM empresas e $where");
        if (!$stmtT) {
            error_log('empresas.php listar total prepare: ' . mysqli_error($con));
            admin_responder(false, 'No se pudieron obtener las empresas. Intenta de nuevo.', null, 500);
        }
        if ($params) mysqli_stmt_bind_param($stmtT, $tipos, ...$params);
        if (!mysqli_stmt_execute($stmtT)) {
            error_log('empresas.php listar total execute: ' . mysqli_stmt_error($stmtT));
            admin_responder(false, 'No se pudieron obtener las empresas. Intenta de nuevo.', null, 500);
        }
        $resT = mysqli_stmt_get_result($stmtT);
        if (!$resT) {
            error_log('empresas.php listar total result: ' . mysqli_error($con));
            admin_responder(false, 'No se pudieron obtener las empresas. Intenta de nuevo.', null, 500);
        }
        $total = (int)(mysqli_fetch_assoc($resT)['total'] ?? 0);
        mysqli_stmt_close($stmtT);

        $sql = "SELECT e.id_empresas, e.nombre_empresas, COALESCE(e.rfc, '') AS rfc,
                e.descripcion, e.direccion, e.telefono_empresa, e.correo_empresa, e.sitio_web,
                e.estado_validacion, e.fecha_registro_empres AS fecha_registro,
                COUNT(DISTINCT r.id_reclutador) AS total_reclutadores,
                COUNT(DISTINCT v.id_vacante) AS total_vacantes
            FROM empresas e
            LEFT JOIN reclutadores r ON r.id_empresas = e.id_empresas
            LEFT JOIN vacantes v ON v.id_reclutador = r.id_reclutador
            $where
            GROUP BY e.id_empresas
            ORDER BY e.fecha_registro_empres DESC
            LIMIT ? OFFSET ?";
        $stmt = mysqli_prepare($con, $sql);
        if (!$stmt) {
            error_log('empresas.php listar prepare: ' . mysqli_error($con));
            admin_responder(false, 'No se pudieron obtener las empresas. Intenta de nuevo.', null, 500);
        }
        $allParams = array_merge($params, [$limite, $offset]);
        $allTipos = $tipos . 'ii';
        mysqli_stmt_bind_param($stmt, $allTipos, ...$allParams);
        if (!mysqli_stmt_execute($stmt)) {
            error_log('empresas.php listar execute: ' . mysqli_stmt_error($stmt));
            admin_responder(false, 'No se pudieron obtener las empresas. Intenta de nuevo.', null, 500);
        }
        $res = mysqli_stmt_get_result($stmt);
        if (!$res) {
            error_log('empresas.php listar result: ' . mysqli_error($con));
            admin_responder(false, 'No se pudieron obtener las empresas. Intenta de nuevo.', null, 500);
        }
        $empresas = [];
        while ($fila = mysqli_fetch_assoc($res)) {
            $fila['estado_validacion'] = (int)$fila['estado_validacion'];
            $empresas[] = $fila;
        }
        mysqli_stmt_close($stmt);
        mysqli_close($con);
        admin_responder(true, 'Empresas obtenidas.', [
            'empresas' => $empresas,
            'total' => $total,
            'pagina' => $pagina,
            'limite' => $limite,
            'total_paginas' => ceil($total / $limite),
        ]);
    }

    // GET - detalle: empresa, reclutadores y 10 vacantes recientes.
    if ($metodo === 'GET' && $accion === 'detalle') {
        $id = (int)($_GET['id'] ?? 0);
        if (!$id) admin_responder(false, 'ID requerido.', null, 400);

        $stmt = mysqli_prepare($con, "SELECT e.*, COALESCE(e.rfc, '') AS rfc FROM empresas e WHERE e.id_empresas = ? LIMIT 1");
        if (!$stmt) {
            error_log('empresas.php detalle prepare: ' . mysqli_error($con));
            admin_responder(false, 'No se pudo obtener el detalle. Intenta de nuevo.', null, 500);
        }
        mysqli_stmt_bind_param($stmt, 'i', $id);
        if (!mysqli_stmt_execute($stmt)) {
            error_log('empresas.php detalle execute: ' . mysqli_stmt_error($stmt));
            admin_responder(false, 'No se pudo obtener el detalle. Intenta de nuevo.', null, 500);
        }
        $resE = mysqli_stmt_get_result($stmt);
        $empresa = $resE ? mysqli_fetch_assoc($resE) : null;
        mysqli_stmt_close($stmt);
        if (!$empresa) admin_responder(false, 'Empresa no encontrada.', null, 404);

        $stmt2 = mysqli_prepare($con, 'SELECT r.id_reclutador, r.puesto, u.nombres, u.apellidos, u.correo, u.telefono, u.foto_perfil, u.estado FROM reclutadores r JOIN usuarios u ON u.id_usuario = r.id_usuario WHERE r.id_empresas = ?');
        if (!$stmt2) {
            error_log('empresas.php detalle reclutadores prepare: ' . mysqli_error($con));
            admin_responder(false, 'No se pudo obtener el detalle. Intenta de nuevo.', null, 500);
        }
        mysqli_stmt_bind_param($stmt2, 'i', $id);
        if (!mysqli_stmt_execute($stmt2)) {
            error_log('empresas.php detalle reclutadores execute: ' . mysqli_stmt_error($stmt2));
            admin_responder(false, 'No se pudo obtener el detalle. Intenta de nuevo.', null, 500);
        }
        $resRec = mysqli_stmt_get_result($stmt2);
        if (!$resRec) {
            error_log('empresas.php detalle reclutadores result: ' . mysqli_error($con));
            admin_responder(false, 'No se pudo obtener el detalle. Intenta de nuevo.', null, 500);
        }
        $reclutadores = [];
        while ($r = mysqli_fetch_assoc($resRec)) $reclutadores[] = $r;
        mysqli_stmt_close($stmt2);

        $stmt3 = mysqli_prepare($con, 'SELECT v.id_vacante, v.titulo_puesto, v.modalidad, v.estado, v.fecha_publicacion, COUNT(p.id_postulacion) AS total_postulaciones FROM vacantes v JOIN reclutadores rec ON rec.id_reclutador = v.id_reclutador LEFT JOIN postulaciones p ON p.id_vacante = v.id_vacante WHERE rec.id_empresas = ? GROUP BY v.id_vacante ORDER BY v.fecha_publicacion DESC LIMIT 10');
        if (!$stmt3) {
            error_log('empresas.php detalle vacantes prepare: ' . mysqli_error($con));
            admin_responder(false, 'No se pudo obtener el detalle. Intenta de nuevo.', null, 500);
        }
        mysqli_stmt_bind_param($stmt3, 'i', $id);
        if (!mysqli_stmt_execute($stmt3)) {
            error_log('empresas.php detalle vacantes execute: ' . mysqli_stmt_error($stmt3));
            admin_responder(false, 'No se pudo obtener el detalle. Intenta de nuevo.', null, 500);
        }
        $resVac = mysqli_stmt_get_result($stmt3);
        if (!$resVac) {
            error_log('empresas.php detalle vacantes result: ' . mysqli_error($con));
            admin_responder(false, 'No se pudo obtener el detalle. Intenta de nuevo.', null, 500);
        }
        $vacantes = [];
        while ($v = mysqli_fetch_assoc($resVac)) $vacantes[] = $v;
        mysqli_stmt_close($stmt3);

        $empresa['estado_validacion'] = (int)$empresa['estado_validacion'];
        mysqli_close($con);
        admin_responder(true, 'Detalle obtenido.', [
            'empresa' => $empresa,
            'reclutadores' => $reclutadores,
            'vacantes' => $vacantes,
        ]);
    }

    // POST - aprobar (0 → 1). Exige RFC, correo y teléfono completos.
    if ($metodo === 'POST' && $accion === 'aprobar') {
        $id = (int)($_GET['id'] ?? 0);
        if (!$id) admin_responder(false, 'ID requerido.', null, 400);

        $stmt = mysqli_prepare($con, "UPDATE empresas SET estado_validacion = 1, motivo_rechazo = NULL WHERE id_empresas = ? AND estado_validacion IN (0) AND COALESCE(TRIM(rfc), '') <> '' AND COALESCE(TRIM(correo_empresa), '') <> '' AND COALESCE(TRIM(telefono_empresa), '') <> ''");
        if (!$stmt) {
            error_log('empresas.php aprobar prepare: ' . mysqli_error($con));
            admin_responder(false, 'No se pudo aprobar la empresa. Intenta de nuevo.', null, 500);
        }
        mysqli_stmt_bind_param($stmt, 'i', $id);
        if (!mysqli_stmt_execute($stmt)) {
            error_log('empresas.php aprobar execute: ' . mysqli_stmt_error($stmt));
            admin_responder(false, 'No se pudo aprobar la empresa. Intenta de nuevo.', null, 500);
        }
        if (mysqli_stmt_affected_rows($stmt) > 0) {
            mysqli_stmt_close($stmt);
            mysqli_close($con);
            admin_responder(true, 'Empresa aprobada correctamente.');
        }
        mysqli_stmt_close($stmt);

        $fila = empresas_leer($con, $id);
        if (!$fila) admin_responder(false, 'Empresa no encontrada.', null, 404);
        if (!empresas_completa($fila)) admin_responder(false, 'La empresa aún no completó su RFC, correo y teléfono.', null, 409);
        $et = empresas_estado_etiqueta($fila['estado_validacion']);
        if ((int)$fila['estado_validacion'] === 1) admin_responder(false, 'La empresa ya está aprobada.', null, 409);
        admin_responder(false, "La empresa no está pendiente de aprobación (estado actual: $et).", null, 409);
    }

    // POST - rechazar (0,1 → 2). Exige motivo y lo guarda.
    if ($metodo === 'POST' && $accion === 'rechazar') {
        $id = (int)($_GET['id'] ?? 0);
        if (!$id) admin_responder(false, 'ID requerido.', null, 400);
        $body = admin_cuerpo_json();
        $motivo = inclusijob_limpio($body['motivo'] ?? '');
        if ($motivo === '') admin_responder(false, 'El motivo del rechazo es obligatorio.', null, 400);
        if (mb_strlen($motivo) > 500) admin_responder(false, 'El motivo no debe superar 500 caracteres.', null, 400);

        $stmt = mysqli_prepare($con, 'UPDATE empresas SET estado_validacion = 2, motivo_rechazo = ? WHERE id_empresas = ? AND estado_validacion IN (0, 1)');
        if (!$stmt) {
            error_log('empresas.php rechazar prepare: ' . mysqli_error($con));
            admin_responder(false, 'No se pudo rechazar la empresa. Intenta de nuevo.', null, 500);
        }
        mysqli_stmt_bind_param($stmt, 'si', $motivo, $id);
        if (!mysqli_stmt_execute($stmt)) {
            error_log('empresas.php rechazar execute: ' . mysqli_stmt_error($stmt));
            admin_responder(false, 'No se pudo rechazar la empresa. Intenta de nuevo.', null, 500);
        }
        if (mysqli_stmt_affected_rows($stmt) > 0) {
            mysqli_stmt_close($stmt);
            mysqli_close($con);
            admin_responder(true, 'Empresa rechazada.');
        }
        mysqli_stmt_close($stmt);

        $fila = empresas_leer($con, $id);
        if (!$fila) admin_responder(false, 'Empresa no encontrada.', null, 404);
        $et = empresas_estado_etiqueta($fila['estado_validacion']);
        if ((int)$fila['estado_validacion'] === 2) admin_responder(false, 'La empresa ya está rechazada.', null, 409);
        admin_responder(false, "La empresa no se puede rechazar en su estado actual ($et).", null, 409);
    }

    // POST - suspender (1 → 3).
    if ($metodo === 'POST' && $accion === 'suspender') {
        $id = (int)($_GET['id'] ?? 0);
        if (!$id) admin_responder(false, 'ID requerido.', null, 400);

        $stmt = mysqli_prepare($con, 'UPDATE empresas SET estado_validacion = 3, motivo_rechazo = NULL WHERE id_empresas = ? AND estado_validacion IN (1)');
        if (!$stmt) {
            error_log('empresas.php suspender prepare: ' . mysqli_error($con));
            admin_responder(false, 'No se pudo suspender la empresa. Intenta de nuevo.', null, 500);
        }
        mysqli_stmt_bind_param($stmt, 'i', $id);
        if (!mysqli_stmt_execute($stmt)) {
            error_log('empresas.php suspender execute: ' . mysqli_stmt_error($stmt));
            admin_responder(false, 'No se pudo suspender la empresa. Intenta de nuevo.', null, 500);
        }
        if (mysqli_stmt_affected_rows($stmt) > 0) {
            mysqli_stmt_close($stmt);
            mysqli_close($con);
            admin_responder(true, 'Empresa suspendida.');
        }
        mysqli_stmt_close($stmt);

        $fila = empresas_leer($con, $id);
        if (!$fila) admin_responder(false, 'Empresa no encontrada.', null, 404);
        $et = empresas_estado_etiqueta($fila['estado_validacion']);
        if ((int)$fila['estado_validacion'] === 3) admin_responder(false, 'La empresa ya está suspendida.', null, 409);
        admin_responder(false, "Solo se puede suspender una empresa aprobada (estado actual: $et).", null, 409);
    }

    // POST - reactivar (2,3 → 1). Exige RFC, correo y teléfono completos.
    if ($metodo === 'POST' && $accion === 'reactivar') {
        $id = (int)($_GET['id'] ?? 0);
        if (!$id) admin_responder(false, 'ID requerido.', null, 400);

        $stmt = mysqli_prepare($con, "UPDATE empresas SET estado_validacion = 1, motivo_rechazo = NULL WHERE id_empresas = ? AND estado_validacion IN (2, 3) AND COALESCE(TRIM(rfc), '') <> '' AND COALESCE(TRIM(correo_empresa), '') <> '' AND COALESCE(TRIM(telefono_empresa), '') <> ''");
        if (!$stmt) {
            error_log('empresas.php reactivar prepare: ' . mysqli_error($con));
            admin_responder(false, 'No se pudo reactivar la empresa. Intenta de nuevo.', null, 500);
        }
        mysqli_stmt_bind_param($stmt, 'i', $id);
        if (!mysqli_stmt_execute($stmt)) {
            error_log('empresas.php reactivar execute: ' . mysqli_stmt_error($stmt));
            admin_responder(false, 'No se pudo reactivar la empresa. Intenta de nuevo.', null, 500);
        }
        if (mysqli_stmt_affected_rows($stmt) > 0) {
            mysqli_stmt_close($stmt);
            mysqli_close($con);
            admin_responder(true, 'Empresa reactivada.');
        }
        mysqli_stmt_close($stmt);

        $fila = empresas_leer($con, $id);
        if (!$fila) admin_responder(false, 'Empresa no encontrada.', null, 404);
        if (!empresas_completa($fila)) admin_responder(false, 'La empresa aún no completó su RFC, correo y teléfono.', null, 409);
        $et = empresas_estado_etiqueta($fila['estado_validacion']);
        if ((int)$fila['estado_validacion'] === 1) admin_responder(false, 'La empresa ya está aprobada.', null, 409);
        admin_responder(false, "La empresa no se puede reactivar en su estado actual ($et).", null, 409);
    }

    admin_responder(false, 'Accion no reconocida.', null, 400);
} catch (Throwable $e) {
    error_log('empresas.php excepción: ' . $e->getMessage());
    admin_responder(false, 'No se pudo procesar la solicitud. Intenta de nuevo.', null, 500);
}
