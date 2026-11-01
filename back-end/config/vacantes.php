<?php

function inclusijob_vacantes_alias(string $alias): string
{
    if (!preg_match('/^[A-Za-z_][A-Za-z0-9_]*$/', $alias)) {
        throw new InvalidArgumentException('Alias SQL no valido.');
    }

    return $alias;
}

function inclusijob_vacante_visible_sql(string $vacanteAlias = 'v', string $empresaAlias = 'e'): string
{
    $v = inclusijob_vacantes_alias($vacanteAlias);
    $e = inclusijob_vacantes_alias($empresaAlias);

    return "{$v}.estado = 'activa'
        AND {$e}.estado_validacion = 1
        AND {$v}.fecha_publicacion <= NOW()
        AND ({$v}.fecha_cierre IS NULL OR {$v}.fecha_cierre >= CURDATE())";
}

function inclusijob_vacante_compatible_sql(string $vacanteAlias = 'v', string $postulanteAlias = 'pd'): string
{
    $v = inclusijob_vacantes_alias($vacanteAlias);
    $pd = inclusijob_vacantes_alias($postulanteAlias);

    return "EXISTS (
        SELECT 1
        FROM vacante_discapacidad vd_compat
        INNER JOIN postulante_discapacidad {$pd}
            ON {$pd}.id_tipo_discapacidad = vd_compat.id_tipo_discapacidad
        WHERE vd_compat.id_vacante = {$v}.id_vacante
          AND {$pd}.id_postulante = ?
    )";
}
