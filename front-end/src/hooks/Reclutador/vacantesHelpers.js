// Lógica pura de vacantes del reclutador (sin React): validación, fechas,
// discapacidades, filtros y mensaje de error de eliminar.
// Se usa en Vacantes.jsx / VacanteFormModal.jsx y en tests con node --test.
export const SALARIO_MINIMO_VACANTE = 1000;
export const SALARIO_MAXIMO_VACANTE = 1000000;

export const INITIAL_VACANTE_FORM = {
  titulo_puesto: '',
  descripcion_puesto: '',
  requisitos: '',
  modalidad: 'Presencial',
  salario_min: '',
  salario_max: '',
  fecha_publicacion: '',
  fecha_cierre: '',
  estado: 'activa',
  discapacidades: [],
};

export function getDiscapacidadId(item) {
  return Number(item?.id_tipo_discapacidad ?? item?.id_discapacidad ?? item?.id ?? item) || 0;
}

export function getDiscapacidadNombre(item) {
  return item?.nombre_discapacidad ?? item?.nombre ?? item?.tipo ?? String(item ?? '');
}

export function getVacanteDiscapacidadIds(vacante) {
  if (Array.isArray(vacante?.discapacidad_ids)) {
    return vacante.discapacidad_ids.map(Number).filter(Boolean);
  }
  if (Array.isArray(vacante?.discapacidades)) {
    return vacante.discapacidades.map(getDiscapacidadId).filter(Boolean);
  }
  return [];
}

export function toDateInputValue(value) {
  if (!value) return '';
  const normalized = String(value).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : '';
}

export function validateVacanteForm(formData) {
  if (!String(formData?.titulo_puesto ?? '').trim()) {
    return 'El titulo de la vacante es obligatorio.';
  }
  const salarioMin = Number(formData?.salario_min);
  const salarioMax = Number(formData?.salario_max);
  const fechaPublicacion = toDateInputValue(formData?.fecha_publicacion);
  const fechaCierre = toDateInputValue(formData?.fecha_cierre);
  const salarioInvalido = !Number.isFinite(salarioMin)
    || !Number.isFinite(salarioMax)
    || salarioMin < SALARIO_MINIMO_VACANTE
    || salarioMin > SALARIO_MAXIMO_VACANTE
    || salarioMax < SALARIO_MINIMO_VACANTE
    || salarioMax > SALARIO_MAXIMO_VACANTE;
  if (salarioInvalido) {
    return 'El salario debe estar entre $1,000 y $1,000,000 pesos.';
  }
  if (salarioMin > salarioMax) {
    return 'El salario maximo debe ser mayor o igual al salario minimo.';
  }
  if (!fechaPublicacion || !fechaCierre) {
    return 'La fecha de publicacion y la fecha de cierre son obligatorias.';
  }
  if (fechaPublicacion > fechaCierre) {
    return 'La fecha de cierre debe ser posterior a la fecha de publicacion.';
  }
  return null;
}

// Misma lógica que el useMemo de Vacantes.jsx (sin cambiar conducta).
export function filtrarVacantes(vacantes = [], busqueda = '', filtroEstado = 'Todas', filtroModalidad = 'Todas las modalidades') {
  return (vacantes ?? []).filter((vacante) => {
    const titulo = String(vacante.titulo_puesto || '').toLowerCase();
    const cumpleBusqueda = titulo.includes(String(busqueda ?? '').toLowerCase());
    const cumpleEstado = filtroEstado === 'Todas'
      || (filtroEstado === 'Activas' && vacante.estado === 'activa')
      || (filtroEstado === 'Pausadas' && vacante.estado === 'pausada');
    const cumpleModalidad = filtroModalidad === 'Todas las modalidades' || vacante.modalidad === filtroModalidad;
    return cumpleBusqueda && cumpleEstado && cumpleModalidad;
  });
}

// El mensaje del servidor manda (explica el 409); el texto actual queda de respaldo.
export function mensajeErrorEliminar(err) {
  const mensaje = err instanceof Error ? err.message : String(err?.message ?? '');
  return mensaje.trim() ? mensaje : 'No se pudo eliminar la vacante.';
}
