<?php

if (!function_exists('inclusijob_enviar_pdf')) {
    function inclusijob_enviar_pdf(string $bytes, string $filename): void
    {
        $safeFilename = preg_replace('/[^A-Za-z0-9._-]/', '_', basename($filename));
        if ($safeFilename === '' || $safeFilename === '.' || $safeFilename === '..') {
            $safeFilename = 'documento.pdf';
        }

        if (ob_get_length()) {
            ob_clean();
        }

        header_remove('Content-Type');
        header('Content-Type: application/pdf');
        header('Content-Disposition: inline; filename="' . $safeFilename . '"');
        header('Content-Length: ' . strlen($bytes));
        header('X-Content-Type-Options: nosniff');
        header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
        header('Pragma: no-cache');
        header('Expires: 0');

        echo $bytes;
        exit;
    }
}
