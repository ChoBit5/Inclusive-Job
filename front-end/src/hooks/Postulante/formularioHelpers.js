const FORMULARIO_FIELDS = {
  tipoDiscapacidad: (form) => Array.isArray(form?.tiposDiscapacidad) && form.tiposDiscapacidad.length > 0,
  descripcionDiscapacidad: (form) => Boolean(String(form?.descripcionDiscapacidad ?? '').trim()),
  esfuerzoFisico: (form) => Boolean(form?.esfuerzoFisico),
  experiencia: (form) => Boolean(String(form?.experiencia ?? '').trim()),
  habilidades: (form) => Boolean(String(form?.habilidades ?? '').trim()),
  fotoPerfil: (form) => Boolean(form?.fotoPerfil),
};

export function getFormularioProgress(form = {}) {
  const camposCompletos = Object.fromEntries(
    Object.entries(FORMULARIO_FIELDS).map(([key, isComplete]) => [key, isComplete(form)])
  );
  const totalCampos = Object.keys(camposCompletos).length;
  const camposLlenos = Object.values(camposCompletos).filter(Boolean).length;

  return {
    camposCompletos,
    totalCampos,
    camposLlenos,
    formularioListo: camposLlenos === totalCampos,
    progreso: Math.round((camposLlenos / totalCampos) * 100),
  };
}

export function buildFormularioData(form = {}, idUsuario) {
  const data = new FormData();
  data.append('id_usuario', String(idUsuario));
  (form.tiposDiscapacidad ?? []).forEach((tipo) => data.append('tipoDiscapacidad[]', tipo));
  data.append('descripcionDiscapacidad', form.descripcionDiscapacidad ?? '');
  data.append('esfuerzoFisico', form.esfuerzoFisico ?? '');
  data.append('experiencia', form.experiencia ?? '');
  data.append('habilidades', form.habilidades ?? '');
  data.append('fotoPerfil', form.fotoPerfil ?? '');
  return data;
}

export function getFormularioResponseMessage(response = {}, fallback = 'Error al guardar.') {
  if (response.success === true && response.httpOk !== false) {
    return { tipo: 'ok', texto: '¡Perfil guardado correctamente! Redirigiendo...' };
  }

  return {
    tipo: 'error',
    texto: response.mensaje || response.message || fallback,
  };
}

export function debeRequerirFormulario(response = {}) {
  if (!response.httpOk || response.success === false) return false;
  return Boolean(response.requiere_formulario || !response.completado);
}
