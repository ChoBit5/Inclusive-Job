<?php
// Catálogo de tipos de discapacidad que usa el formulario de vacantes.
require_once __DIR__ . '/_auth.php';
require_once __DIR__ . '/../../Conexion.php';

reclutador_headers('GET, OPTIONS');

$con = conectarbd();
mysqli_set_charset($con, 'utf8mb4');
reclutador_usuario_id();
$accion = $_GET['accion'] ?? 'discapacidades';

if ($accion === 'discapacidades' || $accion === 'listar_discapacidades') {
    try {
        $sql = "SELECT
                    id_tipo_discapacidad,
                    nombre_discapacidad,
                    COALESCE(descripcion, '') AS descripcion
                FROM tipo_discapacidad
                ORDER BY nombre_discapacidad ASC";
        $res = mysqli_query($con, $sql);

        if (!$res) {
            throw new Exception('No se pudieron obtener las discapacidades.');
        }

        $discapacidades = [];
        while ($row = mysqli_fetch_assoc($res)) {
            $discapacidades[] = [
                'id_tipo_discapacidad' => (int)$row['id_tipo_discapacidad'],
                'nombre_discapacidad' => $row['nombre_discapacidad'],
                'descripcion' => $row['descripcion'],
            ];
        }

        reclutador_responder(true, 'Discapacidades obtenidas', [
            'discapacidades' => $discapacidades,
            'total' => count($discapacidades),
        ]);
    } catch (Throwable $e) {
        error_log('catalogos discapacidades: ' . $e->getMessage());
        reclutador_responder(false, 'No se pudieron obtener las discapacidades.', null, 500);
    }
}

reclutador_responder(false, 'Accion no reconocida.', null, 400);
