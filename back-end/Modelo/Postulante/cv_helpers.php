<?php

function cv_upload_error_message(int $error): ?array
{
    if ($error === UPLOAD_ERR_OK) {
        return null;
    }

    if ($error === UPLOAD_ERR_INI_SIZE || $error === UPLOAD_ERR_FORM_SIZE) {
        return [413, 'El CV no debe superar 5 MB.'];
    }

    if ($error === UPLOAD_ERR_NO_FILE) {
        return [400, 'No se envio ningun archivo'];
    }

    return [400, 'No se pudo subir el archivo.'];
}

function cv_validate_binary(string $bytes, string $mime): ?array
{
    if ($bytes === '') {
        return [400, 'El archivo esta vacio.'];
    }

    if ($mime !== 'application/pdf') {
        return [415, 'Solo se aceptan archivos PDF'];
    }

    if (strncmp($bytes, '%PDF-', 5) !== 0) {
        return [400, 'El archivo no es un PDF valido.'];
    }

    return null;
}

function cv_exceeds_packet_limit(int $bytes, int $maxPacket, int $slack = 1024): bool
{
    return $bytes + $slack > $maxPacket;
}
