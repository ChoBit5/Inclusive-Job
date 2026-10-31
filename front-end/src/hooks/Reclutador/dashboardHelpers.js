const STAT_DEFINITIONS = [
  ['Vacantes activas', 'vacantes_activas', 'Briefcase', '#7c3aed'],
  ['Candidatos totales', 'candidatos_totales', 'Users', '#8b5cf6'],
  ['Postulaciones hoy', 'postulaciones_hoy', 'TrendingUp', '#6d28d9'],
  ['Reportes activos', 'reportes_activos', 'AlertTriangle', '#f59e0b'],
];

export function buildDashboardStats(stats = {}, icons = {}) {
  return STAT_DEFINITIONS.map(([label, key, iconKey, color]) => ({
    label,
    value: Number(stats?.[key] ?? 0) || 0,
    icon: icons[iconKey],
    color,
  }));
}

export function estadoAvisoEmpresa(empresa = {}) {
  const estadoValidacion = Number(empresa?.estado_validacion ?? (empresa?.aprobada ? 1 : 0));
  const estadoTexto = String(empresa?.estado ?? '').toLowerCase();

  if (empresa?.aprobada === true || estadoTexto === 'aprobada' || estadoValidacion === 1) {
    return { estado: 'aprobada', puedePublicar: true, visible: false };
  }
  if (estadoTexto === 'rechazada' || estadoValidacion === 2 || empresa?.requiere_reenvio === true) {
    return {
      estado: 'rechazada',
      puedePublicar: false,
      visible: true,
      titulo: 'Empresa rechazada',
      descripcion: 'Corrige y reenvia los datos de tu empresa para que administracion pueda revisarla de nuevo.',
      accion: 'Reenviar datos',
    };
  }
  if (estadoTexto === 'suspendida' || estadoValidacion === 3) {
    return {
      estado: 'suspendida',
      puedePublicar: false,
      visible: true,
      titulo: 'Empresa suspendida',
      descripcion: 'Tu empresa fue suspendida por administracion y no puede publicar vacantes por ahora.',
      accion: 'Ver empresa',
    };
  }
  return {
    estado: 'pendiente',
    puedePublicar: false,
    visible: true,
    titulo: 'Empresa pendiente de validacion',
    descripcion: 'Registra y espera que el administrador valide tu empresa para publicar vacantes.',
    accion: 'Ver empresa',
  };
}

export function normalizarChartDashboard(chart) {
  return Array.isArray(chart) ? chart : [];
}

