import { BACKEND_BASE_URL } from '../../config/app.js';

export const BASE_URL = `${BACKEND_BASE_URL}/Modelo/Administrador`;

export const ENDPOINTS = {

  // ── Dashboard ──────────────────────────────────────────────
  dashboard: {
    stats: `${BASE_URL}/admin.php?accion=stats`,
  },

  // ── Empresas ───────────────────────────────────────────────
  empresas: {
    list:      `${BASE_URL}/empresas.php?accion=listar`,
    detail:    (id) => `${BASE_URL}/empresas.php?accion=detalle&id=${id}`,
    aprobar:   (id) => `${BASE_URL}/empresas.php?accion=aprobar&id=${id}`,
    rechazar:  (id) => `${BASE_URL}/empresas.php?accion=rechazar&id=${id}`,
    suspender: (id) => `${BASE_URL}/empresas.php?accion=suspender&id=${id}`,
    reactivar: (id) => `${BASE_URL}/empresas.php?accion=reactivar&id=${id}`,
  },

  // ── Usuarios ───────────────────────────────────────────────
  usuarios: {
    list:      `${BASE_URL}/usuarios.php?accion=listar`,
    detail:    (id) => `${BASE_URL}/usuarios.php?accion=detalle&id=${id}`,
    cv:        (id) => `${BASE_URL}/usuarios.php?accion=cv&id=${id}`,
    certificacionPdf: (id) => `${BASE_URL}/usuarios.php?accion=certificacion_pdf&id=${id}`,
    suspender: (id) => `${BASE_URL}/usuarios.php?accion=suspender&id=${id}`,
    reactivar: (id) => `${BASE_URL}/usuarios.php?accion=reactivar&id=${id}`,
  },

  // ── Vacantes ───────────────────────────────────────────────
  vacantes: {
    list:     `${BASE_URL}/vacantes.php?accion=listar`,
    detail:   (id) => `${BASE_URL}/vacantes.php?accion=detalle&id=${id}`,
    cerrar:   (id) => `${BASE_URL}/vacantes.php?accion=cerrar&id=${id}`,
    eliminar: (id) => `${BASE_URL}/vacantes.php?accion=eliminar&id=${id}`,
  },

  // ── Postulaciones ──────────────────────────────────────────
  postulaciones: {
    list:             `${BASE_URL}/postulaciones.php?accion=listar`,
    detail:           (id) => `${BASE_URL}/postulaciones.php?accion=detalle&id=${id}`,
    actualizarEstado: (id) => `${BASE_URL}/postulaciones.php?accion=actualizar_estado&id=${id}`,
  },

  // ── Discapacidades ─────────────────────────────────────────
  discapacidades: {
    list:   `${BASE_URL}/discapacidades.php?accion=listar`,
    create: `${BASE_URL}/discapacidades.php?accion=crear`,
    update: (id) => `${BASE_URL}/discapacidades.php?accion=editar&id=${id}`,
    delete: (id) => `${BASE_URL}/discapacidades.php?accion=eliminar&id=${id}`,
  },

  // ── Reportes ───────────────────────────────────────────────
  reportes: {
    list:           `${BASE_URL}/reportes.php?accion=listar`,
    ignorar:        (id) => `${BASE_URL}/reportes.php?accion=ignorar&id=${id}`,
    eliminarVacante:(id) => `${BASE_URL}/reportes.php?accion=eliminar_vacante&id=${id}`,
  },
};
