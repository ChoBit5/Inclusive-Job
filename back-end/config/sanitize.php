<?php
// Texto libre se guarda tal cual (trim + sin etiquetas); nunca con escape HTML.
// El escape ocurre al mostrar (React lo hace solo; emails y PDFs deben escapar explícito).

if (!function_exists('inclusijob_limpio')) {
    function inclusijob_limpio($v): string
    {
        return strip_tags(trim((string)$v));
    }
}
