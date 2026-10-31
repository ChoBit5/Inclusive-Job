<?php
// Resumen del dashboard del reclutador.
require_once __DIR__ . '/_auth.php';
require_once __DIR__ . '/../../Conexion.php';

function dashboard_consultar($con, $sql, $id_reclutador) {
    $stmt = mysqli_prepare($con, $sql);
    if (!$stmt) {
        throw new RuntimeException('No se pudo preparar la consulta del dashboard: ' . mysqli_error($con));
    }

    mysqli_stmt_bind_param($stmt, 'i', $id_reclutador);
    if (!mysqli_stmt_execute($stmt)) {
        $error = mysqli_stmt_error($stmt);
        mysqli_stmt_close($stmt);
        throw new RuntimeException('No se pudo ejecutar la consulta del dashboard: ' . $error);
    }

    $resultado = mysqli_stmt_get_result($stmt);
    if ($resultado === false) {
        mysqli_stmt_close($stmt);
        throw new RuntimeException('No se pudo leer la consulta del dashboard: ' . mysqli_error($con));
    }

    return [$stmt, $resultado];
}

function dashboard_contar($con, $sql, $id_reclutador) {
    [$stmt, $resultado] = dashboard_consultar($con, $sql, $id_reclutador);
    $fila = mysqli_fetch_assoc($resultado);
    mysqli_stmt_close($stmt);
    return (int)($fila['total'] ?? 0);
}

reclutador_headers('GET, OPTIONS');
$con = conectarbd();
mysqli_set_charset($con, 'utf8mb4');
$id_usuario = reclutador_usuario_id();

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    reclutador_responder(false, 'Metodo no permitido.', null, 405);
}

try {
    $id_reclutador = reclutador_id_desde_usuario($con, $id_usuario);

    $stmt_user = mysqli_prepare($con, "SELECT
            u.id_usuario,
            u.nombres,
            u.apellidos,
            u.correo,
            u.foto_perfil,
            COALESCE(e.nombre_empresas, 'Empresa sin registrar') AS empresa,
            COALESCE(e.estado_validacion, 0) AS empresa_validada
        FROM usuarios u
        LEFT JOIN reclutadores r ON r.id_usuario = u.id_usuario
        LEFT JOIN empresas e ON e.id_empresas = r.id_empresas
        WHERE u.id_usuario = ? AND u.id_rol = 3
        LIMIT 1");
    if (!$stmt_user) {
        throw new RuntimeException('No se pudo preparar el usuario del dashboard: ' . mysqli_error($con));
    }
    mysqli_stmt_bind_param($stmt_user, 'i', $id_usuario);
    if (!mysqli_stmt_execute($stmt_user)) {
        $error = mysqli_stmt_error($stmt_user);
        mysqli_stmt_close($stmt_user);
        throw new RuntimeException('No se pudo consultar el usuario del dashboard: ' . $error);
    }
    $result_user = mysqli_stmt_get_result($stmt_user);
    if ($result_user === false) {
        mysqli_stmt_close($stmt_user);
        throw new RuntimeException('No se pudo leer el usuario del dashboard: ' . mysqli_error($con));
    }
    $user_row = mysqli_fetch_assoc($result_user);
    mysqli_stmt_close($stmt_user);

    if (!$user_row) {
        mysqli_close($con);
        reclutador_responder(false, 'No se encontro el usuario reclutador.', null, 404);
    }

    $empresa_validada = (int)$user_row['empresa_validada'];
    $empresa_estado = ['pendiente', 'aprobada', 'rechazada', 'suspendida'][$empresa_validada] ?? 'pendiente';

    $user = [
        'id' => (int)$user_row['id_usuario'],
        'nombre' => trim(($user_row['nombres'] ?? '') . ' ' . ($user_row['apellidos'] ?? '')),
        'correo' => $user_row['correo'] ?? '',
        'foto_perfil' => $user_row['foto_perfil'] ?? '',
        'avatar' => $user_row['foto_perfil'] ?? '',
        'rol' => 'Reclutador',
    ];
    $empresa = [
        'nombre' => $user_row['empresa'],
        'aprobada' => $empresa_validada === 1,
        'estado' => $empresa_estado,
        'estado_validacion' => $empresa_validada,
        'requiere_reenvio' => $empresa_validada === 2,
    ];

    $stats = [
        'vacantes_activas' => dashboard_contar($con, "SELECT COUNT(*) AS total FROM vacantes WHERE id_reclutador = ? AND estado = 'activa'", $id_reclutador),
        'candidatos_totales' => dashboard_contar($con, 'SELECT COUNT(DISTINCT p.id_postulante) AS total FROM postulaciones p INNER JOIN vacantes v ON p.id_vacante = v.id_vacante WHERE v.id_reclutador = ?', $id_reclutador),
        'postulaciones_hoy' => dashboard_contar($con, 'SELECT COUNT(*) AS total FROM postulaciones p INNER JOIN vacantes v ON p.id_vacante = v.id_vacante WHERE v.id_reclutador = ? AND DATE(p.fecha_postulacion) = CURDATE()', $id_reclutador),
        'reportes_activos' => dashboard_contar($con, 'SELECT COUNT(*) AS total FROM reporte_vacante rv INNER JOIN vacantes v ON rv.id_vacante = v.id_vacante WHERE v.id_reclutador = ?', $id_reclutador),
    ];

    [$stmt_chart, $result_chart] = dashboard_consultar($con, "WITH RECURSIVE dias AS (
            SELECT DATE_SUB(CURDATE(), INTERVAL 6 DAY) AS fecha
            UNION ALL
            SELECT DATE_ADD(fecha, INTERVAL 1 DAY) FROM dias WHERE fecha < CURDATE()
        ), conteos AS (
            SELECT DATE(p.fecha_postulacion) AS fecha, COUNT(*) AS postulaciones
            FROM postulaciones p
            INNER JOIN vacantes v ON p.id_vacante = v.id_vacante
            WHERE v.id_reclutador = ?
              AND DATE(p.fecha_postulacion) BETWEEN DATE_SUB(CURDATE(), INTERVAL 6 DAY) AND CURDATE()
            GROUP BY DATE(p.fecha_postulacion)
        )
        SELECT DATE_FORMAT(d.fecha, '%d/%m') AS day, COALESCE(c.postulaciones, 0) AS postulaciones
        FROM dias d
        LEFT JOIN conteos c ON c.fecha = d.fecha
        ORDER BY d.fecha ASC", $id_reclutador);
    $chart = [];
    while ($fila = mysqli_fetch_assoc($result_chart)) {
        $chart[] = ['day' => $fila['day'], 'postulaciones' => (int)$fila['postulaciones'], 'vistas' => 0];
    }
    mysqli_stmt_close($stmt_chart);

    [$stmt_vacantes, $result_vacantes] = dashboard_consultar($con, "SELECT
            v.id_vacante AS id,
            v.titulo_puesto AS titulo,
            v.estado,
            v.fecha_publicacion,
            COUNT(p.id_postulacion) AS postulaciones,
            GREATEST(0, DATEDIFF(CURDATE(), DATE(v.fecha_publicacion))) AS dias
        FROM vacantes v
        LEFT JOIN postulaciones p ON v.id_vacante = p.id_vacante
        WHERE v.id_reclutador = ?
        GROUP BY v.id_vacante, v.titulo_puesto, v.estado, v.fecha_publicacion
        ORDER BY v.fecha_publicacion DESC
        LIMIT 5", $id_reclutador);
    $vacantes_recientes = [];
    while ($fila = mysqli_fetch_assoc($result_vacantes)) {
        $fila['id'] = (int)$fila['id'];
        $fila['postulaciones'] = (int)$fila['postulaciones'];
        $fila['dias'] = (int)$fila['dias'];
        $fila['vistas'] = 0;
        $vacantes_recientes[] = $fila;
    }
    mysqli_stmt_close($stmt_vacantes);

    [$stmt_candidatos, $result_candidatos] = dashboard_consultar($con, "SELECT
            p.id_postulacion AS id,
            CONCAT(COALESCE(u.nombres, ''), ' ', COALESCE(u.apellidos, '')) AS nombre,
            v.titulo_puesto AS vacante,
            COALESCE(p.estado, 'pendiente') AS estado,
            p.fecha_postulacion,
            DATE_FORMAT(p.fecha_postulacion, '%d/%m/%Y') AS tiempo
        FROM postulaciones p
        INNER JOIN vacantes v ON p.id_vacante = v.id_vacante
        INNER JOIN postulantes pos ON p.id_postulante = pos.id_postulante
        INNER JOIN usuarios u ON pos.id_usuario = u.id_usuario
        WHERE v.id_reclutador = ?
        ORDER BY p.fecha_postulacion DESC
        LIMIT 5", $id_reclutador);
    $candidatos_recientes = [];
    while ($fila = mysqli_fetch_assoc($result_candidatos)) {
        $fila['id'] = (int)$fila['id'];
        $candidatos_recientes[] = $fila;
    }
    mysqli_stmt_close($stmt_candidatos);

    mysqli_close($con);
    reclutador_responder(true, 'Dashboard obtenido', [
        'user' => $user,
        'empresa' => $empresa,
        'stats' => $stats,
        'chart' => $chart,
        'vacantes_recientes' => $vacantes_recientes,
        'candidatos_recientes' => $candidatos_recientes,
    ]);
} catch (Throwable $e) {
    error_log('dashboard.php: ' . $e->getMessage());
    if (isset($con) && $con instanceof mysqli) {
        mysqli_close($con);
    }
    reclutador_responder(false, 'No se pudo obtener el dashboard. Intenta de nuevo.', null, 500);
}
