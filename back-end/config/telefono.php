<?php
// Lista única de LADAs y extracción del número nacional (10 dígitos).
// Centraliza la copia repetida en usuarios_telefono.php, empresa.php y perfil.php.
// No cambia reglas ni mensajes: cada endpoint conserva los suyos.

if (!function_exists('inclusijob_ladas')) {
    function inclusijob_ladas(): array
    {
        return [
            '502', '503', '504', '505', '506', '507',
            '591', '593', '595', '598',
            '52', '34', '54', '56', '57', '51', '58', '55',
            '1',
        ];
    }
}

if (!function_exists('inclusijob_telefono_nacional')) {
    // Recibe dígitos ya limpios (solo 0-9) y quita la LADA inicial si hay más de 10.
    function inclusijob_telefono_nacional(string $digitos): string
    {
        if ($digitos === '') {
            return '';
        }

        if (strlen($digitos) > 10) {
            foreach (inclusijob_ladas() as $lada) {
                if (strpos($digitos, $lada) === 0 && strlen($digitos) > strlen($lada)) {
                    return substr($digitos, strlen($lada));
                }
            }
        }

        return $digitos;
    }
}
