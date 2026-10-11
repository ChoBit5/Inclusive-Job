// Lógica pura de admin empresas (testeable con node --test).
// Las vistas importan de aquí sin cambios visuales.

const ESTADO_MAP = {
  0: { label: 'Pendiente', variant: 'warning' },
  1: { label: 'Aprobada', variant: 'success' },
  2: { label: 'Rechazada', variant: 'danger' },
  3: { label: 'Suspendida', variant: 'default' },
};

export function getEstadoEmpresa(value) {
  return ESTADO_MAP[Number(value)] ?? ESTADO_MAP[0];
}

// Acciones que ofrecen los botones de las vistas por estado.
export function accionesEmpresaPorEstado(value) {
  const estado = Number(value);
  if (estado === 0) return ['ver', 'aprobar', 'rechazar'];
  if (estado === 1) return ['ver', 'rechazar', 'suspender'];
  if (estado === 2 || estado === 3) return ['ver', 'reactivar'];
  return ['ver', 'aprobar', 'rechazar'];
}

// Aviso de error: mensaje del servidor cuando existe, respaldo si no.
export function mensajeErrorServidor(err, respaldo) {
  const msg = err instanceof Error ? err.message : String(err ?? '');
  return msg.trim() ? msg : respaldo;
}
