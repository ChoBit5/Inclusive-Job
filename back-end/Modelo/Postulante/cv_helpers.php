<?php

require_once __DIR__ . '/../../config/pdfupload.php';

function cv_upload_error_message(int $error): ?array
{
    return pdf_upload_error_message($error, 'CV');
}

function cv_validate_binary(string $bytes, string $mime): ?array
{
    return pdf_validate_binary($bytes, $mime, 'archivo');
}

function cv_exceeds_packet_limit(int $bytes, int $maxPacket, int $slack = 1024): bool
{
    return pdf_exceeds_packet_limit($bytes, $maxPacket, $slack);
}
