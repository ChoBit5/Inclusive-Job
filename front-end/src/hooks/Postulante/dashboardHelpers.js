const DEFAULT_CHECKLIST = [
  { id: 1, label: 'Datos de cuenta', done: false, path: '/formulario', peso: 15 },
  { id: 2, label: 'Evaluacion inicial', done: false, path: '/formulario', peso: 15 },
  { id: 3, label: 'Foto de perfil', done: false, path: '/formulario', peso: 10 },
  { id: 4, label: 'Discapacidad registrada', done: false, path: '/formulario', peso: 15 },
  { id: 5, label: 'Registro de habilidades', done: false, path: '/postulante/perfil', peso: 10 },
  { id: 6, label: 'Datos de contacto', done: false, path: '/postulante/perfil', peso: 10 },
  { id: 7, label: 'Al menos 1 certificacion', done: false, path: '/postulante/certificaciones', peso: 20 },
  { id: 8, label: 'CV registrado', done: false, path: '/postulante/certificaciones', peso: 5 },
];

const HIDDEN_CHECKLIST_IDS = new Set([2]);

export function filtrarChecklistPostulante(checklist = []) {
  return (Array.isArray(checklist) ? checklist : [])
    .filter(item => !HIDDEN_CHECKLIST_IDS.has(Number(item?.id)));
}

export function accionChecklistPostulante(item = {}) {
  const id = Number(item.id);
  if (id === 6 && !item.done) {
    return {
      path: '/postulante/perfil',
      state: { openEdit: true, editTab: 'info' },
    };
  }
  if (id === 3 || id === 4 || id === 5) {
    return {
      path: '/postulante/perfil',
      state: {
        openEdit: true,
        editTab: id === 3 ? 'info' : id === 4 ? 'accesibilidad' : 'skills',
      },
    };
  }
  if (!item.done && item.path) return { path: item.path };
  return null;
}

export function calcularPerfilDashboard(perfil = {}) {
  const incoming = Array.isArray(perfil?.checklist) ? perfil.checklist : [];
  const checklist = incoming.length > 0
    ? incoming.map(item => ({ ...item, done: Boolean(item.done), peso: Number(item.peso) || 0 }))
    : DEFAULT_CHECKLIST.map(item => ({ ...item }));
  const completado = checklist.reduce((total, item) => total + (item.done ? item.peso : 0), 0);

  const reported = incoming.length > 0 ? completado : Number(perfil?.completado) || 0;
  return {
    completado: Math.max(0, Math.min(100, reported)),
    checklist,
    pasosPendientes: checklist.filter(item => !item.done).length,
  };
}

const POSTULACION_UI = {
  pendiente: { key: 'pendiente', label: 'Pendiente', bg: '#fef3c7', text: '#92400e', border: '#fde68a' },
  'en proceso': { key: 'en proceso', label: 'En proceso', bg: '#ede9fe', text: '#5b21b6', border: '#c4b5fd' },
  entrevista: { key: 'entrevista', label: 'Entrevista', bg: '#ede9fe', text: '#5b21b6', border: '#c4b5fd' },
  aceptada: { key: 'aceptada', label: 'Aceptada', bg: '#d1fae5', text: '#065f46', border: '#6ee7b7' },
  rechazado: { key: 'rechazado', label: 'Rechazado', bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' },
};

export function estadoPostulacionUi(estado) {
  const normalized = String(estado ?? '').trim().toLowerCase();
  if (normalized === 'pendiente') return POSTULACION_UI.pendiente;
  if (normalized === 'en proceso') return POSTULACION_UI['en proceso'];
  if (normalized === 'entrevista') return POSTULACION_UI.entrevista;
  if (['aceptado', 'aceptada', 'contratado', 'contratada'].includes(normalized)) return POSTULACION_UI.aceptada;
  if (normalized === 'rechazado' || normalized === 'rechazada') return POSTULACION_UI.rechazado;
  return {
    key: normalized || 'pendiente',
    label: normalized || 'Pendiente',
    bg: '#fef3c7',
    text: '#92400e',
    border: '#fde68a',
  };
}

export function normalizarVacanteRecomendada(vacante = {}) {
  return {
    ...vacante,
    id: Number(vacante.id ?? vacante.id_vacante) || 0,
    id_vacante: Number(vacante.id_vacante ?? vacante.id) || 0,
    salario_min: vacante.salario_min === null || vacante.salario_min === undefined || vacante.salario_min === ''
      ? null
      : Number(vacante.salario_min),
    salario_max: vacante.salario_max === null || vacante.salario_max === undefined || vacante.salario_max === ''
      ? null
      : Number(vacante.salario_max),
    discapacidades: Array.isArray(vacante.discapacidades) ? vacante.discapacidades : [],
  };
}

export function enriquecerVacanteRecomendada(vacante = {}, detalleVacantes = []) {
  const idVacante = Number(vacante.id_vacante ?? vacante.id) || 0;
  const detalle = (Array.isArray(detalleVacantes) ? detalleVacantes : [])
    .find(item => Number(item?.id_vacante) === idVacante);

  return {
    ...vacante,
    ...(detalle ?? {}),
    id: idVacante,
    id_vacante: idVacante,
  };
}
