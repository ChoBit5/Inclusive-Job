<?php

require_once __DIR__ . '/_auth.php';
require_once __DIR__ . '/_helpers.php';

admin_headers('GET, POST, OPTIONS');
admin_usuario_id();
$con = admin_db();

function admin_usuario_normalizar(array $usuario): array
{
    $roles = [1 => 'administrador', 2 => 'postulante', 3 => 'reclutador'];
    $estados = [0 => 'inactivo', 1 => 'activo', 2 => 'suspendido'];
    $usuario['id_usuario'] = (int)$usuario['id_usuario'];
    $usuario['id_rol'] = (int)($usuario['id_rol'] ?? 0);
    $usuario['rol'] = strtolower((string)($usuario['rol'] ?? '')) ?: ($roles[$usuario['id_rol']] ?? 'usuario');
    $usuario['estado'] = is_numeric($usuario['estado'] ?? null)
        ? ($estados[(int)$usuario['estado']] ?? 'inactivo')
        : strtolower((string)($usuario['estado'] ?? 'inactivo'));
    return $usuario;
}

try {
    $metodo = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    $accion = $_GET['accion'] ?? '';

    if ($metodo === 'GET' && $accion === 'cv') {
        $id = (int)($_GET['id'] ?? 0);
        if (!$id) admin_responder(false, 'ID requerido.', null, 400);
        $row = admin_one($con, 'SELECT cv FROM postulantes WHERE id_usuario = ? LIMIT 1', 'i', $id);
        admin_output_pdf($row['cv'] ?? null, 'cv_usuario_' . $id . '.pdf');
    }

    if ($metodo === 'GET' && $accion === 'certificacion_pdf') {
        $id = (int)($_GET['id'] ?? 0);
        if (!$id) admin_responder(false, 'ID requerido.', null, 400);
        $row = admin_one($con, 'SELECT pdf FROM certificaciones WHERE id_certificaciones = ? LIMIT 1', 'i', $id);
        admin_output_pdf($row['pdf'] ?? null, 'certificacion_' . $id . '.pdf');
    }

    if ($metodo === 'GET' && $accion === 'listar') {
        $rol = $_GET['rol'] ?? 'todos';
        $estado = $_GET['estado'] ?? 'todos';
        $buscar = trim((string)($_GET['buscar'] ?? ''));
        $pagina = max(1, (int)($_GET['pagina'] ?? 1));
        $limite = max(1, min(100, (int)($_GET['limite'] ?? 15)));
        $offset = ($pagina - 1) * $limite;
        $conditions = [];
        $params = [];
        $types = '';

        if (isset(['administrador' => 1, 'postulante' => 2, 'reclutador' => 3][$rol])) {
            $conditions[] = 'u.id_rol = ?';
            $params[] = ['administrador' => 1, 'postulante' => 2, 'reclutador' => 3][$rol];
            $types .= 'i';
        }
        if (isset(['inactivo' => 0, 'activo' => 1, 'suspendido' => 2][$estado])) {
            $conditions[] = 'u.estado = ?';
            $params[] = ['inactivo' => 0, 'activo' => 1, 'suspendido' => 2][$estado];
            $types .= 'i';
        }
        if ($buscar !== '') {
            $conditions[] = '(u.nombres LIKE ? OR u.apellidos LIKE ? OR u.correo LIKE ?)';
            $like = admin_like($buscar);
            array_push($params, $like, $like, $like);
            $types .= 'sss';
        }
        $where = $conditions ? 'WHERE ' . implode(' AND ', $conditions) : '';
        $totalRow = admin_one($con, "SELECT COUNT(*) AS total FROM usuarios u $where", $types, ...$params);
        if ($totalRow === null) admin_responder(false, 'No se pudieron obtener los usuarios. Intenta de nuevo.', null, 500);
        $total = (int)$totalRow['total'];
        $rows = admin_all($con, "SELECT u.id_usuario, u.nombres, u.apellidos, u.correo, u.telefono,
            u.foto_perfil, u.estado, u.id_rol, CASE u.id_rol WHEN 1 THEN 'administrador'
            WHEN 2 THEN 'postulante' WHEN 3 THEN 'reclutador' ELSE 'usuario' END AS rol,
            u.fecha_registro AS fecha_registro FROM usuarios u $where
            ORDER BY u.fecha_registro DESC, u.id_usuario DESC LIMIT ? OFFSET ?",
            $types . 'ii', ...array_merge($params, [$limite, $offset]));
        $usuarios = array_map('admin_usuario_normalizar', $rows);
        admin_responder(true, 'Usuarios obtenidos.', [
            'usuarios' => $usuarios,
            'total' => $total,
            'pagina' => $pagina,
            'limite' => $limite,
            'total_paginas' => (int)ceil($total / $limite),
        ]);
    }

    if ($metodo === 'GET' && $accion === 'detalle') {
        $id = (int)($_GET['id'] ?? 0);
        if (!$id) admin_responder(false, 'ID requerido.', null, 400);
        $usuario = admin_one($con, "SELECT u.id_usuario, u.nombres, u.apellidos, u.correo, u.telefono,
            u.foto_perfil, u.estado, u.id_rol, CASE u.id_rol WHEN 1 THEN 'administrador'
            WHEN 2 THEN 'postulante' WHEN 3 THEN 'reclutador' ELSE 'usuario' END AS rol,
            u.fecha_registro AS fecha_registro FROM usuarios u WHERE u.id_usuario = ? LIMIT 1", 'i', $id);
        if (!$usuario) admin_responder(false, 'Usuario no encontrado.', null, 404);
        $usuario = admin_usuario_normalizar($usuario);
        $postulante = null;
        $reclutador = null;
        $discapacidades = [];
        $certificaciones = [];
        $postulaciones = [];
        $vacantes = [];

        if ((int)$usuario['id_rol'] === 2) {
            $postulante = admin_one($con, 'SELECT id_postulante, descripcion_discapacidad, esfuerzo_fisico_posible,
                experiencia, habilidades, cv, portafolio_url, id_usuario FROM postulantes WHERE id_usuario = ? LIMIT 1', 'i', $id);
            if ($postulante) {
                $postulante['tiene_cv'] = admin_pdf_available($postulante['cv'] ?? null) ? 1 : 0;
                unset($postulante['cv']);
                $idPostulante = (int)$postulante['id_postulante'];
                $certificaciones = admin_all($con, 'SELECT id_certificaciones, nombre_certificacion,
                    institucion_dada, fecha_emitido, pdf FROM certificaciones WHERE id_postulante = ?
                    ORDER BY fecha_emitido DESC, id_certificaciones DESC LIMIT 10', 'i', $idPostulante);
                foreach ($certificaciones as &$certificacion) {
                    $certificacion['tiene_pdf'] = admin_pdf_available($certificacion['pdf'] ?? null) ? 1 : 0;
                    unset($certificacion['pdf']);
                }
                unset($certificacion);
                $discapacidades = admin_all($con, 'SELECT d.id_tipo_discapacidad AS id_discapacidad,
                    d.nombre_discapacidad AS nombre FROM postulante_discapacidad rel
                    JOIN tipo_discapacidad d ON d.id_tipo_discapacidad = rel.id_tipo_discapacidad
                    WHERE rel.id_postulante = ? ORDER BY d.nombre_discapacidad', 'i', $idPostulante);
                $postulaciones = admin_all($con, 'SELECT p.id_postulacion, p.estado, p.fecha_postulacion,
                    v.titulo_puesto, e.nombre_empresas AS empresa FROM postulaciones p
                    JOIN vacantes v ON v.id_vacante = p.id_vacante
                    LEFT JOIN reclutadores r ON r.id_reclutador = v.id_reclutador
                    LEFT JOIN empresas e ON e.id_empresas = r.id_empresas
                    WHERE p.id_postulante = ? ORDER BY p.fecha_postulacion DESC LIMIT 10', 'i', $idPostulante);
            }
        }

        if ((int)$usuario['id_rol'] === 3) {
            $reclutador = admin_one($con, 'SELECT r.id_reclutador, r.id_usuario, r.id_empresas,
                r.puesto, r.sector, e.nombre_empresas AS empresa, e.nombre_empresas,
                e.correo_empresa, e.estado_validacion, e.estado_validacion AS empresa_validada
                FROM reclutadores r LEFT JOIN empresas e ON e.id_empresas = r.id_empresas
                WHERE r.id_usuario = ? LIMIT 1', 'i', $id);
            if ($reclutador) {
                $vacantes = admin_all($con, 'SELECT id_vacante, titulo_puesto, modalidad, estado,
                    fecha_publicacion FROM vacantes WHERE id_reclutador = ?
                    ORDER BY fecha_publicacion DESC LIMIT 10', 'i', (int)$reclutador['id_reclutador']);
            }
        }

        admin_responder(true, 'Detalle obtenido.', compact('usuario', 'postulante', 'reclutador', 'discapacidades', 'certificaciones', 'postulaciones', 'vacantes'));
    }

    if ($metodo === 'POST' && in_array($accion, ['suspender', 'reactivar'], true)) {
        $id = (int)($_GET['id'] ?? 0);
        if (!$id) admin_responder(false, 'ID requerido.', null, 400);
        $estado = $accion === 'suspender' ? 2 : 1;
        $stmt = admin_stmt($con, 'UPDATE usuarios SET estado = ? WHERE id_usuario = ?', 'ii', $estado, $id);
        if (!$stmt) admin_responder(false, 'No se pudo actualizar el usuario. Intenta de nuevo.', null, 500);
        $changed = mysqli_stmt_affected_rows($stmt);
        mysqli_stmt_close($stmt);
        if ($changed < 1) {
            if (!admin_one($con, 'SELECT id_usuario FROM usuarios WHERE id_usuario = ? LIMIT 1', 'i', $id)) {
                admin_responder(false, 'Usuario no encontrado.', null, 404);
            }
            admin_responder(false, 'El usuario ya se encuentra en ese estado.', null, 409);
        }
        admin_responder(true, $accion === 'suspender' ? 'Usuario suspendido.' : 'Usuario reactivado.');
    }

    admin_responder(false, 'Acción no reconocida.', null, 400);
} catch (Throwable $e) {
    error_log('usuarios.php: ' . $e->getMessage());
    admin_responder(false, 'No se pudo procesar la solicitud. Intenta de nuevo.', null, 500);
}
