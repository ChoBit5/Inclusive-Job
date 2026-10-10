<?php
// Helper reutilizable de Google (features 5a y 5b).
// Valida el credential contra el endpoint tokeninfo de Google.

require_once __DIR__ . '/keys.php';

if (!function_exists('inclusijob_verify_google_credential')) {
    // Devuelve ['email','name','picture']. Lanza Exception legible si no es valido.
    function inclusijob_verify_google_credential(string $credential): array
    {
        if (INCLUSIJOB_GOOGLE_CLIENT_ID === 'PASTE_YOUR_KEY_HERE' || INCLUSIJOB_GOOGLE_CLIENT_ID === '') {
            throw new Exception('Google Client ID no configurado. Pegalo en back-end/config/keys.php y front-end/src/config/keys.js.');
        }

        if ($credential === '') {
            throw new Exception('Token de Google requerido.');
        }

        $url = 'https://oauth2.googleapis.com/tokeninfo?id_token=' . urlencode($credential);
        $ctx = stream_context_create(['http' => ['timeout' => 8]]);
        $raw = @file_get_contents($url, false, $ctx);

        if ($raw === false) {
            throw new Exception('No se pudo validar el token de Google. Intenta de nuevo.');
        }

        $payload = json_decode($raw, true);
        if (!is_array($payload)) {
            throw new Exception('Token de Google invalido o expirado.');
        }

        $aud = (string)($payload['aud'] ?? '');
        $iss = (string)($payload['iss'] ?? '');
        $exp = (int)($payload['exp'] ?? 0);
        $emailVerified = (string)($payload['email_verified'] ?? '');
        $email = strtolower(trim((string)($payload['email'] ?? '')));

        $validIss = $iss === 'accounts.google.com' || $iss === 'https://accounts.google.com';
        $verified = $emailVerified === 'true' || $emailVerified === '1';

        if ($aud !== INCLUSIJOB_GOOGLE_CLIENT_ID || !$validIss || $exp < time() || !$verified || $email === '') {
            throw new Exception('Token de Google invalido o expirado.');
        }

        return [
            'email' => $email,
            'name' => trim((string)($payload['name'] ?? 'Usuario')),
            'picture' => $payload['picture'] ?? null,
        ];
    }
}
