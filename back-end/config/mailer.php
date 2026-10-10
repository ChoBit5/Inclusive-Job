<?php
// Helper reutilizable de correo (features 2 y 4). No atado a ningun flujo.

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require_once __DIR__ . '/keys.php';

$inclusijobAutoload = __DIR__ . '/../vendor/autoload.php';
if (file_exists($inclusijobAutoload)) {
    require_once $inclusijobAutoload;
}

if (!function_exists('inclusijob_mailer_configured')) {
    function inclusijob_mailer_configured(): bool
    {
        return INCLUSIJOB_SMTP_USER !== 'PASTE_YOUR_KEY_HERE'
            && INCLUSIJOB_SMTP_PASS !== 'PASTE_YOUR_KEY_HERE'
            && INCLUSIJOB_SMTP_USER !== ''
            && INCLUSIJOB_SMTP_PASS !== '';
    }
}

if (!function_exists('inclusijob_send_mail')) {
    // Lanza Exception con mensaje legible si falta config o falla el envio.
    function inclusijob_send_mail(string $to, string $subject, string $htmlBody, string $textBody = ''): void
    {
        if (!inclusijob_mailer_configured()) {
            throw new \Exception('Servicio de correo no configurado. Pega tus credenciales SMTP en back-end/config/keys.php.');
        }

        if (!class_exists('PHPMailer\\PHPMailer\\PHPMailer')) {
            throw new \Exception('Falta ejecutar composer install en back-end/.');
        }

        $mail = new PHPMailer(true);
        $mail->CharSet = 'UTF-8';
        $mail->isSMTP();
        $mail->Host = INCLUSIJOB_SMTP_HOST;
        $mail->SMTPAuth = true;
        $mail->Username = INCLUSIJOB_SMTP_USER;
        $mail->Password = INCLUSIJOB_SMTP_PASS;
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port = INCLUSIJOB_SMTP_PORT;
        $mail->setFrom(INCLUSIJOB_SMTP_USER, INCLUSIJOB_SMTP_FROM_NAME);
        $mail->addAddress($to);
        $mail->isHTML(true);
        $mail->Subject = $subject;
        $mail->Body = $htmlBody;
        $mail->AltBody = $textBody !== '' ? $textBody : strip_tags($htmlBody);

        try {
            $mail->send();
        } catch (Exception $e) {
            throw new \Exception('No se pudo enviar el correo. Revisa la configuracion SMTP e intenta de nuevo.');
        }
    }
}

if (!function_exists('inclusijob_send_verification_code')) {
    function inclusijob_send_verification_code(string $to, string $codigo): void
    {
        $subject = 'Tu codigo de verificacion InclusiJob';
        $text = "Tu codigo de verificacion es: {$codigo}\nVence en 15 minutos. Si no lo solicitaste, ignora este correo.";
        $html = "<h2>Verificacion de correo</h2>"
            . "<p>Tu codigo de verificacion es: <strong>{$codigo}</strong></p>"
            . "<p>Vence en 15 minutos. Si no lo solicitaste, ignora este correo.</p>";
        inclusijob_send_mail($to, $subject, $html, $text);
    }
}
