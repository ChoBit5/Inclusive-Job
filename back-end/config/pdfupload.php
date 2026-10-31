<?php

function pdf_upload_error_message(int $error, string $documentLabel): ?array
{
    if ($error === UPLOAD_ERR_OK) {
        return null;
    }

    if ($error === UPLOAD_ERR_INI_SIZE || $error === UPLOAD_ERR_FORM_SIZE) {
        return [413, 'El ' . $documentLabel . ' no debe superar 5 MB.'];
    }

    if ($error === UPLOAD_ERR_NO_FILE) {
        return [400, 'No se envio ningun archivo'];
    }

    return [400, 'No se pudo subir el archivo.'];
}

function pdf_validate_binary(string $bytes, string $mime, string $documentLabel): ?array
{
    if ($bytes === '') {
        return [400, 'El ' . $documentLabel . ' esta vacio.'];
    }

    if ($mime !== 'application/pdf') {
        return [415, $documentLabel === 'PDF' ? 'Solo PDF' : 'Solo se aceptan archivos PDF'];
    }

    if (strncmp($bytes, '%PDF-', 5) !== 0) {
        return [400, 'El archivo no es un PDF valido.'];
    }

    return null;
}

function pdf_exceeds_packet_limit(int $bytes, int $maxPacket, int $slack = 1024): bool
{
    return $bytes + $slack > $maxPacket;
}

function pdf_optional_upload_error(?array $file, string $documentLabel): ?array
{
    if ($file === null || (int)($file['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) {
        return null;
    }

    return pdf_upload_error_message((int)$file['error'], $documentLabel);
}
