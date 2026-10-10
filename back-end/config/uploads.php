<?php
// Validación y guardado compartido de fotos de perfil.
// Usado por el perfil del postulante (feature 14) y el del reclutador (feature 22).
// Reglas: extensión JPG/PNG/WEBP, 5 MB, contenido real con getimagesize,
// nombre perfil_<id>_<timestamp>.<ext> en uploads/fotos_perfil/.

if (!function_exists('inclusijob_foto_perfil_validar')) {
    // Devuelve ['ext' => ...] si pasa, o ['error' => mensaje, 'http' => código] si no.
    function inclusijob_foto_perfil_validar(array $archivo): array
    {
        $extensiones = ['jpg', 'jpeg', 'png', 'webp'];
        $ext = strtolower(pathinfo($archivo['name'] ?? '', PATHINFO_EXTENSION));

        if (!in_array($ext, $extensiones, true)) {
            return ['error' => 'Formato no valido. Usa JPG, PNG o WEBP.', 'http' => 422];
        }

        if ((int)($archivo['size'] ?? 0) > 5 * 1024 * 1024) {
            return ['error' => 'La imagen no debe superar 5 MB.', 'http' => 422];
        }

        if ((int)($archivo['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            return ['error' => 'Error al subir el archivo (codigo ' . (int)($archivo['error'] ?? 0) . ').', 'http' => 422];
        }

        $info = @getimagesize($archivo['tmp_name'] ?? '');
        $mimeOk = $info && in_array($info['mime'] ?? '', ['image/jpeg', 'image/png', 'image/webp'], true);
        if (!$mimeOk) {
            return ['error' => 'Formato no valido. Usa JPG, PNG o WEBP.', 'http' => 422];
        }

        return ['ext' => $ext];
    }
}

if (!function_exists('inclusijob_foto_perfil_guardar')) {
    // Valida y mueve el archivo. Devuelve la ruta relativa o el array de error de validar.
    function inclusijob_foto_perfil_guardar(int $id_usuario, array $archivo): array
    {
        $val = inclusijob_foto_perfil_validar($archivo);
        if (isset($val['error'])) {
            return $val;
        }

        $carpeta = __DIR__ . '/../uploads/fotos_perfil/';
        if (!is_dir($carpeta)) {
            mkdir($carpeta, 0755, true);
        }

        $nombre = 'perfil_' . $id_usuario . '_' . time() . '.' . $val['ext'];
        if (!move_uploaded_file($archivo['tmp_name'], $carpeta . $nombre)) {
            return ['error' => 'No se pudo guardar la imagen.', 'http' => 500];
        }

        return ['ruta' => 'uploads/fotos_perfil/' . $nombre];
    }
}

if (!function_exists('inclusijob_foto_anterior_segura')) {
    // ¿Se puede borrar la foto anterior? Triple condición: prefijo local,
    // realpath dentro de la carpeta y distinta de la nueva. Nunca URLs absolutas.
    function inclusijob_foto_anterior_segura(string $anterior, string $nueva): ?string
    {
        if ($anterior === '' || $anterior === $nueva) {
            return null;
        }
        if (strpos($anterior, 'uploads/fotos_perfil/') !== 0) {
            return null;
        }
        $base = realpath(__DIR__ . '/../uploads/fotos_perfil');
        $candidata = realpath(__DIR__ . '/../' . $anterior);
        if ($base && $candidata && strpos($candidata, $base) === 0 && is_file($candidata)) {
            return $candidata;
        }
        return null;
    }
}

if (!function_exists('inclusijob_foto_borrar_anterior')) {
    // Borra la anterior solo tras commit; el fallo se ignora.
    function inclusijob_foto_borrar_anterior(string $anterior, string $nueva): void
    {
        $ruta = inclusijob_foto_anterior_segura($anterior, $nueva);
        if ($ruta !== null) {
            @unlink($ruta);
        }
    }
}

if (!function_exists('inclusijob_foto_borrar_huerfana')) {
    // Si la transacción falla, no deja foto huérfana en disco.
    function inclusijob_foto_borrar_huerfana(string $nueva): void
    {
        $real = realpath(__DIR__ . '/../' . $nueva);
        $base = realpath(__DIR__ . '/../uploads/fotos_perfil');
        if ($real && $base && strpos($real, $base) === 0 && is_file($real)) {
            @unlink($real);
        } else {
            @unlink(__DIR__ . '/../' . $nueva);
        }
    }
}
