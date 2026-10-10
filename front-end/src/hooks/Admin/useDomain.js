// Hooks específicos por dominio — conectados a los endpoints PHP reales
import { useFetch, useApiAction } from './useApi';
import { ENDPOINTS } from './apiAdmin';

// ─── DASHBOARD ───────────────────────────────────────────────

export function useDashboardStats() {
  const { data, loading, error, refetch } = useFetch(ENDPOINTS.dashboard.stats);
  const stats = data?.data ?? data ?? null;

  return {
    stats,
    actividadMensual:   stats?.actividad_mensual ?? [],
    ultimasVacantes:    stats?.ultimas_vacantes ?? [],
    empresasPendientes: stats?.empresas_pendientes_lista ?? [],
    loading,
    error,
    refetch,
  };
}

// ─── EMPRESAS ────────────────────────────────────────────────
export function useEmpresas(params = '') {
  return useFetch(`${ENDPOINTS.empresas.list}${params}`);
}
export function useEmpresaDetalle(id) {
  return useFetch(id ? ENDPOINTS.empresas.detail(id) : null);
}
export function useEmpresaAcciones() {
  const { execute, loading, error } = useApiAction();
  return {
    aprobar:   (id)        => execute(ENDPOINTS.empresas.aprobar(id),   'POST'),
    rechazar:  (id, motivo)=> execute(ENDPOINTS.empresas.rechazar(id),  'POST', { motivo }),
    suspender: (id)        => execute(ENDPOINTS.empresas.suspender(id), 'POST'),
    reactivar: (id)        => execute(ENDPOINTS.empresas.reactivar(id), 'POST'),
    loading,
    error,
  };
}

// ─── USUARIOS ────────────────────────────────────────────────
export function useUsuarios(params = '') {
  return useFetch(`${ENDPOINTS.usuarios.list}${params}`);
}
export function useUsuarioDetalle(id) {
  return useFetch(id ? ENDPOINTS.usuarios.detail(id) : null);
}
export function useUsuarioAcciones() {
  const { execute, loading, error } = useApiAction();
  return {
    suspender: (id) => execute(ENDPOINTS.usuarios.suspender(id), 'POST'),
    reactivar: (id) => execute(ENDPOINTS.usuarios.reactivar(id), 'POST'),
    loading,
    error,
  };
}

// ─── VACANTES ────────────────────────────────────────────────
export function useVacantes(params = '') {
  return useFetch(`${ENDPOINTS.vacantes.list}${params}`);
}
export function useVacanteDetalle(id) {
  return useFetch(id ? ENDPOINTS.vacantes.detail(id) : null);
}
export function useVacanteAcciones() {
  const { execute, loading, error } = useApiAction();
  return {
    cerrar:   (id) => execute(ENDPOINTS.vacantes.cerrar(id),   'POST'),
    eliminar: (id) => execute(ENDPOINTS.vacantes.eliminar(id), 'POST'),
    loading,
    error,
  };
}

// ─── POSTULACIONES ───────────────────────────────────────────
export function usePostulaciones(params = '') {
  return useFetch(`${ENDPOINTS.postulaciones.list}${params}`);
}
export function usePostulacionDetalle(id) {
  return useFetch(id ? ENDPOINTS.postulaciones.detail(id) : null);
}
export function usePostulacionAcciones() {
  const { execute, loading, error } = useApiAction();
  return {
    actualizarEstado: (id, estado) => execute(ENDPOINTS.postulaciones.actualizarEstado(id), 'POST', { estado }),
    loading,
    error,
  };
}

// ─── DISCAPACIDADES ──────────────────────────────────────────
export function useDiscapacidades() {
  return useFetch(ENDPOINTS.discapacidades.list);
}
export function useDiscapacidadAcciones() {
  const { execute, loading, error } = useApiAction();
  return {
    crear:    (data)     => execute(ENDPOINTS.discapacidades.create,     'POST', data),
    editar:   (id, data) => execute(ENDPOINTS.discapacidades.update(id), 'POST', data),
    eliminar: (id)       => execute(ENDPOINTS.discapacidades.delete(id), 'POST'),
    loading,
    error,
  };
}

// ─── REPORTES ────────────────────────────────────────────────
export function useReportes(params = '') {
  return useFetch(`${ENDPOINTS.reportes.list}${params}`);
}
export function useReporteAcciones() {
  const { execute, loading, error } = useApiAction();
  return {
    ignorar:         (id) => execute(ENDPOINTS.reportes.ignorar(id),        'POST'),
    eliminarVacante: (id, data = {}) => execute(ENDPOINTS.reportes.eliminarVacante(id), 'POST', data),
    loading,
    error,
  };
}
