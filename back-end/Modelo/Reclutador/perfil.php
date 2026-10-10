<?php
// Perfil del reclutador: obtener + actualizar.
// Guardia vía _auth (requerirRol reclutador): sin sesión 401, otro rol 403.
// Formato de respuesta success/ok/message/data del origen.
require_once __DIR__ . '/_auth.php';
require_once __DIR__ . '/../../Conexion.php';
require_once __DIR__ . '/../usuarios_telefono.php';
require_once __DIR__ . '/../../config/sanitize.php';
require_once __DIR__ . '/../../config/empresa.php';
require_once __DIR__ . '/../../config/uploads.php';

reclutador_headers();

$con = conectarbd();
mysqli_set_charset($con, 'utf8mb4');
$id_usuario = reclutador_usuario_id();
$id_reclutador = reclutador_id_desde_usuario($con, $id_usuario, true);
$accion = $_GET['accion'] ?? '';

function perfil_reclutador_input() {
    $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
    if (stripos($contentType, 'multipart/form-data') !== false) {
        return $_POST;
    }

    return reclutador_json_body();
}

function perfil_reclutador_validar_nombre($valor, $campo) {
    if (mb_strlen($valor) > 150) {
        reclutador_responder(false, "El campo '{$campo}' no debe superar 150 caracteres.", null, 400);
    }
    if (!preg_match('/^[\p{L}\s.\-]+$/u', $valor)) {
        reclutador_responder(false, "El campo '{$campo}' solo debe contener letras, espacios, puntos y guiones.", null, 400);
    }
}

if ($accion === 'obtener') {
    $sql = "SELECT
                u.id_usuario,
                u.nombres,
                u.apellidos,
                u.correo,
                COALESCE(u.telefono, '') AS telefono,
                u.foto_perfil,
                COALESCE(e.nombre_empresas, '') AS empresa,
                COALESCE(r.puesto, 'Reclutador') AS puesto,
                COALESCE(r.sector, 'No especificado') AS sector,
                COALESCE(e.estado_validacion, 0) AS empresa_validada
            FROM usuarios u
            LEFT JOIN reclutadores r ON r.id_usuario = u.id_usuario
            LEFT JOIN empresas e ON e.id_empresas = r.id_empresas
            WHERE u.id_usuario = ? AND u.id_rol = 3
            LIMIT 1";
    $stmt = mysqli_prepare($con, $sql);
    if (!$stmt) {
        reclutador_responder(false, 'No se pudo obtener el perfil del reclutador.', null, 500);
    }
    mysqli_stmt_bind_param($stmt, 'i', $id_usuario);
    mysqli_stmt_execute($stmt);
    $res = mysqli_stmt_get_result($stmt);
    $row = $res ? mysqli_fetch_assoc($res) : null;
    mysqli_stmt_close($stmt);

    if (!$row) {
        reclutador_responder(false, 'No se encontro el perfil del reclutador.', null, 404);
    }

    $row['id_usuario'] = (int)$row['id_usuario'];
    $row['empresa_validada'] = (int)$row['empresa_validada'];

    reclutador_responder(true, 'Perfil obtenido', $row);
}

if ($accion === 'actualizar' && ($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    $input = perfil_reclutador_input();

    $nombres = inclusijob_limpio($input['nombres'] ?? '');
    $apellidos = inclusijob_limpio($input['apellidos'] ?? '');
    $telefono_raw = $input['telefono'] ?? '';
    $telefono = usuario_telefono_digitos($telefono_raw);
    $telefono_nacional = usuario_telefono_nacional($telefono_raw);
    $empresa = inclusijob_limpio($input['empresa'] ?? '');
    $puesto = inclusijob_limpio($input['puesto'] ?? 'Reclutador');
    if ($puesto === '') {
        $puesto = 'Reclutador';
    }
    $sector = inclusijob_limpio($input['sector'] ?? 'No especificado');
    if ($sector === '') {
        $sector = 'No especificado';
    }

    if ($nombres === '' || $apellidos === '') {
        reclutador_responder(false, 'Faltan campos obligatorios: nombre y apellidos.', null, 400);
    }
    perfil_reclutador_validar_nombre($nombres, 'nombres');
    perfil_reclutador_validar_nombre($apellidos, 'apellidos');

    if ($empresa === '') {
        reclutador_responder(false, 'La empresa es obligatoria.', null, 400);
    }
    if (mb_strlen($empresa) > 200) {
        reclutador_responder(false, 'El nombre de la empresa no debe superar 200 caracteres.', null, 400);
    }
    if (mb_strlen($puesto) > 150) {
        reclutador_responder(false, 'El puesto no debe superar 150 caracteres.', null, 400);
    }
    if (mb_strlen($sector) > 100) {
        reclutador_responder(false, 'El sector no debe superar 100 caracteres.', null, 400);
    }

    if ($telefono !== '' && !preg_match('/^[0-9]{10}$/', $telefono_nacional)) {
        reclutador_responder(false, 'El telefono debe contener 10 digitos sin contar la LADA.', null, 422);
    }

    if ($telefono !== '' && usuario_telefono_duplicado($con, $telefono_raw, $id_usuario)) {
        reclutador_responder(false, 'Este numero de telefono ya esta registrado por otro usuario.', null, 409);
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
    $actual = $res_check ? mysqli_fetch_assoc($res_check) : null;
    mysqli_stmt_close($stmt_check);

    if (!$actual) {
        reclutador_responder(false, 'Usuario no encontrado en la base de datos.', null, 404);
    }

    $empresa_actual = trim($actual['nombre_empresas'] ?? '');
    $validacion_actual = (int)($actual['estado_validacion'] ?? 0);
    $id_empresas = (int)($actual['id_empresas'] ?? 0);
    $cambio_empresa = ($empresa !== $empresa_actual);
    $nueva_validacion = $cambio_empresa ? 0 : $validacion_actual;

    inclusijob_empresa_validar_dato_unico(
        $con,
        $id_empresas,
        'LOWER(TRIM(nombre_empresas)) = LOWER(TRIM(?))',
        [$empresa],
        'nombre',
        'reclutador_responder'
    );

    $foto_perfil_ruta = null;
    if (!empty($_FILES['fotoPerfil']['name'])) {
        $resFoto = inclusijob_foto_perfil_guardar($id_usuario, $_FILES['fotoPerfil']);
        if (isset($resFoto['error'])) {
            reclutador_responder(false, $resFoto['error'], null, $resFoto['http']);
        }
        $foto_perfil_ruta = $resFoto['ruta'];
    }

    mysqli_begin_transaction($con);

    try {
        $foto_anterior = '';
        $stmtFoto = mysqli_prepare($con, 'SELECT foto_perfil FROM usuarios WHERE id_usuario = ?');
        if (!$stmtFoto) {
            throw new Exception('No se pudo leer la foto anterior.');
        }
        mysqli_stmt_bind_param($stmtFoto, 'i', $id_usuario);
        if (!mysqli_stmt_execute($stmtFoto)) {
            mysqli_stmt_close($stmtFoto);
            throw new Exception('No se pudo leer la foto anterior.');
        }
        $resFotoSel = mysqli_stmt_get_result($stmtFoto);
        $filaFoto = $resFotoSel ? mysqli_fetch_assoc($resFotoSel) : null;
        mysqli_stmt_close($stmtFoto);
        $foto_anterior = (string)($filaFoto['foto_perfil'] ?? '');

        if ($foto_perfil_ruta !== null) {
            $stmt_user = mysqli_prepare($con, 'UPDATE usuarios SET nombres = ?, apellidos = ?, telefono = ?, foto_perfil = ? WHERE id_usuario = ? AND id_rol = 3');
            if (!$stmt_user) {
                throw new Exception('Error al actualizar los datos personales.');
            }
            mysqli_stmt_bind_param($stmt_user, 'ssssi', $nombres, $apellidos, $telefono, $foto_perfil_ruta, $id_usuario);
        } else {
            $stmt_user = mysqli_prepare($con, 'UPDATE usuarios SET nombres = ?, apellidos = ?, telefono = ? WHERE id_usuario = ? AND id_rol = 3');
            if (!$stmt_user) {
                throw new Exception('Error al actualizar los datos personales.');
            }
            mysqli_stmt_bind_param($stmt_user, 'sssi', $nombres, $apellidos, $telefono, $id_usuario);
        }
        if (!mysqli_stmt_execute($stmt_user)) {
            mysqli_stmt_close($stmt_user);
            throw new Exception('Error al actualizar los datos personales.');
        }
        mysqli_stmt_close($stmt_user);

        if (!$id_empresas) {
            $stmt_empresa = mysqli_prepare($con, 'INSERT INTO empresas (nombre_empresas, descripcion, direccion, telefono_empresa, correo_empresa, sitio_web, rfc, estado_validacion) VALUES (?, NULL, NULL, NULL, NULL, NULL, NULL, ?)');
            if (!$stmt_empresa) {
                throw new Exception('Error al crear la empresa.');
            }
            mysqli_stmt_bind_param($stmt_empresa, 'si', $empresa, $nueva_validacion);
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
            $stmt_empresa = mysqli_prepare($con, 'UPDATE empresas SET nombre_empresas = ?, estado_validacion = ? WHERE id_empresas = ?');
            if (!$stmt_empresa) {
                throw new Exception('Error al actualizar la empresa.');
            }
            mysqli_stmt_bind_param($stmt_empresa, 'sii', $empresa, $nueva_validacion, $id_empresas);
            if (!mysqli_stmt_execute($stmt_empresa)) {
                $errno = mysqli_stmt_errno($stmt_empresa);
                mysqli_stmt_close($stmt_empresa);
                throw new Exception('Error al actualizar la empresa.', $errno);
            }
            mysqli_stmt_close($stmt_empresa);
        }

        $stmt_reclutador = mysqli_prepare($con, 'UPDATE reclutadores SET puesto = ?, sector = ?, id_empresas = ? WHERE id_reclutador = ? AND id_usuario = ?');
        if (!$stmt_reclutador) {
            throw new Exception('Error al actualizar el perfil de reclutador.');
        }
        mysqli_stmt_bind_param($stmt_reclutador, 'ssiii', $puesto, $sector, $id_empresas, $id_reclutador, $id_usuario);
        if (!mysqli_stmt_execute($stmt_reclutador)) {
            mysqli_stmt_close($stmt_reclutador);
            throw new Exception('Error al actualizar el perfil de reclutador.');
        }
        mysqli_stmt_close($stmt_reclutador);

        mysqli_commit($con);

        if (session_status() !== PHP_SESSION_ACTIVE) {
            session_start();
        }
        $_SESSION['user']['nombre'] = trim($nombres . ' ' . $apellidos);
        $_SESSION['user']['nombres'] = $nombres;
        $_SESSION['user']['apellido'] = $apellidos;
        if ($foto_perfil_ruta !== null) {
            $_SESSION['user']['foto_perfil'] = $foto_perfil_ruta;
            $_SESSION['user']['avatar'] = $foto_perfil_ruta;
        }

        if ($foto_perfil_ruta !== null) {
            inclusijob_foto_borrar_anterior($foto_anterior, $foto_perfil_ruta);
        }

        mysqli_close($con);
        reclutador_responder(true, 'Perfil actualizado', [
            'empresa_validada' => $nueva_validacion,
            'cambio_empresa' => $cambio_empresa,
            'foto_perfil' => $foto_perfil_ruta,
        ]);
    } catch (Throwable $e) {
        mysqli_rollback($con);
        if ($foto_perfil_ruta !== null) {
            inclusijob_foto_borrar_huerfana($foto_perfil_ruta);
        }
        if ((int)$e->getCode() === 1062 || mysqli_errno($con) === 1062) {
            inclusijob_empresa_validar_dato_unico(
                $con,
                $id_empresas,
                'LOWER(TRIM(nombre_empresas)) = LOWER(TRIM(?))',
                [$empresa],
                'nombre',
                'reclutador_responder'
            );
            mysqli_close($con);
            reclutador_responder(false, 'Ya existe una empresa registrada con el mismo nombre.', null, 409);
        }
        mysqli_close($con);
        reclutador_responder(false, $e->getMessage() ?: 'Error al actualizar el perfil de reclutador.', null, 500);
    }
}

reclutador_responder(false, 'Accion no permitida.', null, 400);
