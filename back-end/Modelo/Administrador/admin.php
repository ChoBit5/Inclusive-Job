<?php
// Estadísticas del dashboard del administrador (acción stats, por defecto).
require_once __DIR__ . '/_auth.php';
require_once __DIR__ . '/../../Conexion.php';

admin_headers('GET, OPTIONS');

$con = conectarbd();
mysqli_set_charset($con, 'utf8mb4');
admin_usuario_id();

// ── Solo GET permitido ────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    admin_responder(false, 'Método no permitido.', null, 405);
}

// Consolida los 9 conteos repetidos; mismas claves y valores que el origen.
function admin_contar($con, $sql) {
    $r = mysqli_query($con, $sql);
    if (!$r) {
        error_log('admin.php stats conteo: ' . mysqli_error($con));
        admin_responder(false, 'No se pudieron obtener las estadísticas. Intenta de nuevo.', null, 500);
    }
    $fila = mysqli_fetch_assoc($r);
    return (int)($fila['total'] ?? 0);
}

// ── Acción según parámetro ────────────────────────────────────
$accion = $_GET['accion'] ?? 'stats';

if ($accion === 'stats') {
    try {
    $stats = [];

    $stats['total_usuarios'] = admin_contar($con, "SELECT COUNT(*) AS total FROM usuarios");
    $stats['total_postulantes'] = admin_contar($con, "SELECT COUNT(*) AS total FROM usuarios WHERE id_rol = 2");
    $stats['total_reclutadores'] = admin_contar($con, "SELECT COUNT(*) AS total FROM usuarios WHERE id_rol = 3");
    $stats['total_empresas'] = admin_contar($con, "SELECT COUNT(*) AS total FROM empresas");
    $stats['empresas_pendientes'] = admin_contar($con, "SELECT COUNT(*) AS total FROM empresas WHERE estado_validacion = 0");
    $stats['vacantes_activas'] = admin_contar($con, "SELECT COUNT(*) AS total FROM vacantes WHERE estado = 'activa'");
    $stats['vacantes_cerradas'] = admin_contar($con, "SELECT COUNT(*) AS total FROM vacantes WHERE estado = 'cerrada'");
    $stats['postulaciones_realizadas'] = admin_contar($con, "SELECT COUNT(*) AS total FROM postulaciones");
    $stats['reportes_recibidos'] = admin_contar($con, "SELECT COUNT(*) AS total FROM reporte_vacante");

    // ── Actividad por mes (últimos 6 meses) ──────────────────
    // Meses en español con la primera letra en mayúscula ("Ene"…).
    if (!mysqli_query($con, "SET lc_time_names = 'es_MX'")) {
        error_log('admin.php stats lc_time_names: ' . mysqli_error($con));
        admin_responder(false, 'No se pudieron obtener las estadísticas. Intenta de nuevo.', null, 500);
    }
    $sql_meses = "
        SELECT
            DATE_FORMAT(fecha_publicacion, '%b') AS mes,
            DATE_FORMAT(fecha_publicacion, '%Y-%m') AS mes_orden,
            COUNT(*) AS vacantes
        FROM vacantes
        WHERE fecha_publicacion >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
        GROUP BY mes_orden, mes
        ORDER BY mes_orden ASC
    ";
    $r_meses = mysqli_query($con, $sql_meses);
    if (!$r_meses) {
        error_log('admin.php stats meses: ' . mysqli_error($con));
        admin_responder(false, 'No se pudieron obtener las estadísticas. Intenta de nuevo.', null, 500);
    }
    $meses = [];
    while ($fila = mysqli_fetch_assoc($r_meses)) {
        $meses[] = [
            'mes' => ucfirst($fila['mes']),
            'vacantes' => (int)$fila['vacantes'],
        ];
    }
    $stats['actividad_mensual'] = $meses;

    // ── Últimas 5 vacantes publicadas ────────────────────────
    $sql_vacantes = "
        SELECT
            v.id_vacante,
            v.titulo_puesto,
            e.nombre_empresas AS empresa,
            v.modalidad,
            v.estado,
            v.fecha_publicacion
        FROM vacantes v
        JOIN reclutadores rec ON rec.id_reclutador = v.id_reclutador
        JOIN empresas e       ON e.id_empresas     = rec.id_empresas
        ORDER BY v.fecha_publicacion DESC
        LIMIT 5
    ";
    $r_vac = mysqli_query($con, $sql_vacantes);
    if (!$r_vac) {
        error_log('admin.php stats vacantes: ' . mysqli_error($con));
        admin_responder(false, 'No se pudieron obtener las estadísticas. Intenta de nuevo.', null, 500);
    }
    $ultimas_vacantes = [];
    while ($fila = mysqli_fetch_assoc($r_vac)) {
        $ultimas_vacantes[] = $fila;
    }
    $stats['ultimas_vacantes'] = $ultimas_vacantes;

    // ── Últimas 5 empresas pendientes ────────────────────────
    $sql_emp = "
        SELECT
            id_empresas,
            nombre_empresas,
            correo_empresa,
            fecha_registro_empres AS fecha_registro
        FROM empresas
        WHERE estado_validacion = 0
        ORDER BY fecha_registro_empres DESC
        LIMIT 5
    ";
    $r_emp = mysqli_query($con, $sql_emp);
    if (!$r_emp) {
        error_log('admin.php stats empresas: ' . mysqli_error($con));
        admin_responder(false, 'No se pudieron obtener las estadísticas. Intenta de nuevo.', null, 500);
    }
    $empresas_pendientes = [];
    while ($fila = mysqli_fetch_assoc($r_emp)) {
        $empresas_pendientes[] = $fila;
    }
    $stats['empresas_pendientes_lista'] = $empresas_pendientes;

    mysqli_close($con);
    admin_responder(true, 'Estadísticas obtenidas correctamente.', $stats);
    } catch (Throwable $e) {
        // mysqli puede lanzar excepción (PHP 8.1+) en vez de devolver false:
        // mensaje legible al cliente, detalle solo al log.
        error_log('admin.php stats excepción: ' . $e->getMessage());
        admin_responder(false, 'No se pudieron obtener las estadísticas. Intenta de nuevo.', null, 500);
    }
}

admin_responder(false, 'Acción no reconocida.', null, 400);
