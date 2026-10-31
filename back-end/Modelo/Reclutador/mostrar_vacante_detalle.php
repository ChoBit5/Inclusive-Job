<?php
// Detalle de una vacante del reclutador con sus postulantes.
require_once __DIR__ . '/_auth.php';
require_once __DIR__ . '/../../Conexion.php';

reclutador_headers();

$con = conectarbd();
mysqli_set_charset($con, 'utf8mb4');
$id_usuario = reclutador_usuario_id();
$id_reclutador = reclutador_id_desde_usuario($con, $id_usuario);
$id_vacante = (int)($_GET['id'] ?? 0);

if (!$id_vacante) {
    reclutador_responder(false, 'ID de vacante requerido.', null, 400);
}

try {
    $sql_vacante = "SELECT
                        v.id_vacante,
                        v.titulo_puesto,
                        v.descripcion_puesto,
                        v.requisitos,
                        v.salario_min,
                        v.salario_max,
                        v.modalidad,
                        v.estado,
                        v.fecha_publicacion,
                        v.fecha_cierre,
                        COALESCE(e.nombre_empresas, '') AS nombre_empresa
                    FROM vacantes v
                    INNER JOIN reclutadores r ON v.id_reclutador = r.id_reclutador
                    LEFT JOIN empresas e ON e.id_empresas = r.id_empresas
                    WHERE v.id_vacante = ? AND v.id_reclutador = ?
                    LIMIT 1";
    $stmt = mysqli_prepare($con, $sql_vacante);
    if (!$stmt) {
        throw new Exception('No se pudo obtener el detalle de la vacante.');
    }
    mysqli_stmt_bind_param($stmt, 'ii', $id_vacante, $id_reclutador);
    if (!mysqli_stmt_execute($stmt)) {
        mysqli_stmt_close($stmt);
        throw new Exception('No se pudo obtener el detalle de la vacante.');
    }
    $res = mysqli_stmt_get_result($stmt);
    $vacante = $res ? mysqli_fetch_assoc($res) : null;
    mysqli_stmt_close($stmt);

    if (!$vacante) {
        reclutador_responder(false, 'No se encontro la vacante.', null, 404);
    }

    $sql_postulaciones = "SELECT
                            p.id_postulacion,
                            p.fecha_postulacion,
                            COALESCE(p.estado, 'pendiente') AS estado,
                            CONCAT(COALESCE(u.nombres, ''), ' ', COALESCE(u.apellidos, '')) AS postulante,
                            u.correo
                          FROM postulaciones p
                          INNER JOIN postulantes pos ON p.id_postulante = pos.id_postulante
                          INNER JOIN usuarios u ON pos.id_usuario = u.id_usuario
                          WHERE p.id_vacante = ?
                          ORDER BY p.fecha_postulacion DESC";
    $stmt_post = mysqli_prepare($con, $sql_postulaciones);
    if (!$stmt_post) {
        throw new Exception('No se pudo obtener el detalle de la vacante.');
    }
    mysqli_stmt_bind_param($stmt_post, 'i', $id_vacante);
    if (!mysqli_stmt_execute($stmt_post)) {
        mysqli_stmt_close($stmt_post);
        throw new Exception('No se pudo obtener el detalle de la vacante.');
    }
    $res_post = mysqli_stmt_get_result($stmt_post);

    $postulaciones = [];
    while ($row = mysqli_fetch_assoc($res_post)) {
        $row['id_postulacion'] = (int)$row['id_postulacion'];
        $postulaciones[] = $row;
    }
    mysqli_stmt_close($stmt_post);

    reclutador_responder(true, 'Detalle de vacante obtenido', [
        'vacante' => $vacante,
        'postulaciones' => $postulaciones,
    ]);
} catch (Throwable $e) {
    error_log('vacante detalle: ' . $e->getMessage());
    reclutador_responder(false, 'No se pudo obtener el detalle de la vacante.', null, 500);
}
