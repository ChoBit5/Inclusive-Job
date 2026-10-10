<?php
// Revisión de duplicados de empresa compartida por empresa.php y perfil.php.
// Mensajes idénticos a los de empresa.php (feature 23); 409 en duplicado.
// $responder es reclutador_responder en ambos endpoints.

if (!function_exists('inclusijob_empresa_validar_dato_unico')) {
    function inclusijob_empresa_validar_dato_unico($con, int $id_empresas_actual, string $condicion, array $params, string $campo, callable $responder): void
    {
        $sql = 'SELECT id_empresas, nombre_empresas
                FROM empresas
                WHERE id_empresas <> ?
                  AND (' . $condicion . ')
                LIMIT 1';
        $stmt = mysqli_prepare($con, $sql);

        if (!$stmt) {
            $responder(false, 'No se pudo validar si la empresa ya existe.', null, 500);
        }

        $bind_params = array_merge([$id_empresas_actual], $params);
        $types = 'i' . str_repeat('s', count($params));
        mysqli_stmt_bind_param($stmt, $types, ...$bind_params);
        mysqli_stmt_execute($stmt);
        $res = mysqli_stmt_get_result($stmt);
        $row = $res ? mysqli_fetch_assoc($res) : null;
        mysqli_stmt_close($stmt);

        if ($row) {
            $nombre = trim($row['nombre_empresas'] ?? '');
            $detalle = $nombre !== '' ? " ({$nombre})" : '';
            $responder(false, "Ya existe una empresa registrada con el mismo {$campo}{$detalle}.", null, 409);
        }
    }
}
