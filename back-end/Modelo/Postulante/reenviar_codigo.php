<?php

require_once __DIR__ . '/../../config/cors.php';
inclusijob_cors_headers('POST, OPTIONS', 'Content-Type');

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'mensaje' => 'Método no permitido.']);
    exit;
}

require_once __DIR__ . '/../../Conexion.php';
require_once __DIR__ . '/../../config/mailer.php';

$body   = json_decode((string)file_get_contents('php://input'), true);
$correo = trim((string)(is_array($body) ? ($body['correo'] ?? '') : ''));

if ($correo === '' || !filter_var($correo, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'mensaje' => 'Correo electrónico inválido.']);
    exit;
}

$con = conectarbd();

$stmtCheck = mysqli_prepare($con, "SELECT correo_validado FROM usuarios WHERE correo = ?");
mysqli_stmt_bind_param($stmtCheck, 's', $correo);
mysqli_stmt_execute($stmtCheck);
$resCheck = mysqli_stmt_get_result($stmtCheck);

if ($u = mysqli_fetch_assoc($resCheck)) {
    mysqli_stmt_close($stmtCheck);
    if ((int)$u['correo_validado'] === 1) {
        mysqli_close($con);
        echo json_encode(['success' => false, 'mensaje' => 'Este correo ya está verificado.']);
        exit;
    }
} else {
    mysqli_stmt_close($stmtCheck);
}

$tipo = 'registro_pendiente';
$stmtT = mysqli_prepare($con,
    "SELECT id_token, token FROM tokens
      WHERE tipo = ?
        AND JSON_UNQUOTE(JSON_EXTRACT(token, '$.correo')) = ?
      LIMIT 1"
);
mysqli_stmt_bind_param($stmtT, 'ss', $tipo, $correo);
mysqli_stmt_execute($stmtT);
$resT = mysqli_stmt_get_result($stmtT);

if (mysqli_num_rows($resT) === 0) {
    mysqli_stmt_close($stmtT);
    mysqli_close($con);
    http_response_code(404);
    echo json_encode(['success' => false, 'mensaje' => 'No hay un registro pendiente para este correo. Vuelve a registrarte.']);
    exit;
}

$row = mysqli_fetch_assoc($resT);
$id_token = (int)$row['id_token'];
$payload  = json_decode((string)$row['token'], true);
mysqli_stmt_close($stmtT);

if (!is_array($payload)) {
    mysqli_close($con);
    http_response_code(500);
    echo json_encode(['success' => false, 'mensaje' => 'El registro pendiente esta corrupto. Vuelve a registrarte.']);
    exit;
}

$nuevoCodigo = sprintf('%06d', random_int(0, 999999));
$payload['codigo'] = $nuevoCodigo;
$nuevoPayload  = json_encode($payload);
$nuevaExpira   = date('Y-m-d H:i:s', strtotime('+15 minutes'));

$stmtUpd = mysqli_prepare($con, "UPDATE tokens SET token = ?, tiempo_expira = ? WHERE id_token = ?");
mysqli_stmt_bind_param($stmtUpd, 'ssi', $nuevoPayload, $nuevaExpira, $id_token);

if (!mysqli_stmt_execute($stmtUpd)) {
    mysqli_stmt_close($stmtUpd);
    mysqli_close($con);
    http_response_code(500);
    echo json_encode(['success' => false, 'mensaje' => 'No se pudo generar un nuevo código.']);
    exit;
}
mysqli_stmt_close($stmtUpd);

try {
    inclusijob_send_verification_code($correo, $nuevoCodigo);
} catch (Throwable $mailError) {
    error_log("[REENVIAR_CODIGO_MAIL] " . $mailError->getMessage());
    mysqli_close($con);
    http_response_code(500);
    echo json_encode(['success' => false, 'mensaje' => $mailError->getMessage()]);
    exit;
}
mysqli_close($con);

echo json_encode([
    'success' => true,
    'mensaje' => 'Te enviamos un nuevo codigo por correo. Vence en 15 minutos.'
]);
