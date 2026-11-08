<?php

declare(strict_types=1);

function validarMensajeChatbotPostulante(string $mensaje): array
{
    $mensaje = trim($mensaje);

    if ($mensaje === '') {
        return [
            'valido' => false,
            'mensaje' => 'Escribe un mensaje.',
        ];
    }

    if (mb_strlen($mensaje) > 500) {
        return [
            'valido' => false,
            'mensaje' => 'El mensaje es demasiado largo (maximo 500 caracteres).',
        ];
    }

    $mensaje = preg_replace('/[\x00-\x1F\x7F]/u', '', $mensaje) ?? '';

    return [
        'valido' => true,
        'mensaje' => $mensaje,
    ];
}

function promptFirewallPostulante(string $mensaje): array
{
    $mensajeNormalizado = mb_strtolower($mensaje, 'UTF-8');
    $frasesBloqueadas = [
        'ignora las instrucciones',
        'ignora todas las instrucciones',
        'olvida las reglas',
        'olvida tus instrucciones',
        'revela tu prompt',
        'muestra tu prompt',
        'cual es tu prompt',
        'cuál es tu prompt',
        'system prompt',
        'prompt del sistema',
        'actua como administrador',
        'actúa como administrador',
        'actua como admin',
        'eres ahora',
        'a partir de ahora eres',
        'dame las contraseñas',
        'dame las contrasenas',
        'muéstrame todas las contraseñas',
        'muestrame todas las contrasenas',
        'dame todos los correos',
        'lista todos los usuarios',
        'lista todos los postulantes',
        'dame la base de datos',
        'muestra las claves api',
        'dame la clave api',
        'ejecuta este comando',
        'ejecuta este codigo',
        'ejecuta este código',
        'borra los registros',
        'elimina los registros',
    ];

    foreach ($frasesBloqueadas as $frase) {
        if (str_contains($mensajeNormalizado, $frase)) {
            return [
                'permitido' => false,
                'motivo' => 'Solicitud bloqueada por politica de seguridad.',
            ];
        }
    }

    return [
        'permitido' => true,
        'motivo' => 'Mensaje permitido.',
    ];
}

function mensajeDentroDelAlcancePostulante(string $mensaje): bool
{
    $texto = mb_strtolower($mensaje, 'UTF-8');

    $saludosOAyuda = [
        'hola', 'buenas', 'buen dia', 'buen día', 'buenas tardes', 'buenas noches',
        'ayuda', 'que puedes hacer', 'qué puedes hacer', 'como funciona', 'cómo funciona',
        'dudas', 'orientame', 'oriéntame',
    ];

    foreach ($saludosOAyuda as $frase) {
        if (str_contains($texto, $frase)) {
            return true;
        }
    }

    $temasPermitidos = [
        'inclusivejob', 'inclusive job', 'app', 'aplicacion', 'aplicación', 'plataforma', 'sistema',
        'postulante', 'postulantes', 'perfil', 'mi perfil', 'formulario',
        'cv', 'curriculum', 'currículum', 'curriculo', 'currículo',
        'certificacion', 'certificación', 'certificaciones', 'certificado', 'certificados',
        'vacante', 'vacantes', 'oferta', 'ofertas', 'empleo', 'trabajo', 'laboral',
        'postular', 'postularme', 'postulacion', 'postulación', 'postulaciones',
        'reclutador', 'empresa', 'empresas', 'candidato', 'candidatos',
        'entrevista', 'entrevistas', 'practicar entrevista', 'simular entrevista',
        'discapacidad', 'discapacidades', 'accesibilidad', 'inclusion', 'inclusión',
        'habilidad', 'habilidades', 'experiencia', 'salario', 'modalidad', 'remoto', 'hibrido', 'híbrido', 'presencial',
        'portafolio', 'reporte', 'reportar', 'buscar vacantes', 'mis postulaciones',
        'carta de presentacion', 'carta de presentación', 'presentacion laboral', 'presentación laboral',
    ];

    foreach ($temasPermitidos as $tema) {
        if (str_contains($texto, $tema)) {
            return true;
        }
    }

    return false;
}

