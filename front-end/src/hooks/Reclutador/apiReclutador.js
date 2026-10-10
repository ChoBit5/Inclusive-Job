// Centraliza la URL base y todos los endpoints del modulo Reclutador.
import { BACKEND_BASE_URL } from '../../config/app.js';

export const BACKEND_URL = BACKEND_BASE_URL;
export const BASE_URL = `${BACKEND_URL}/Modelo/Reclutador`;

const qs = (params = {}) => new URLSearchParams(params).toString();

export const ENDPOINTS = {
  dashboard: {
    resumen: `${BASE_URL}/dashboard.php`,
  },

  perfil: {
    obtener: `${BASE_URL}/perfil.php?accion=obtener`,
    actualizar: `${BASE_URL}/perfil.php?accion=actualizar`,
  },

  empresa: {
    obtener: `${BASE_URL}/empresa.php?accion=obtener`,
    actualizar: `${BASE_URL}/empresa.php?accion=actualizar`,
  },

  catalogos: {
    discapacidades: `${BASE_URL}/catalogos.php?accion=discapacidades`,
  },

  vacantes: {
    listar: `${BASE_URL}/vacantes.php?accion=listar`,
    crear: `${BASE_URL}/vacantes.php?accion=insertar`,
    editar: `${BASE_URL}/vacantes.php?accion=editar`,
    actualizarEstado: `${BASE_URL}/vacantes.php?accion=actualizar_estado`,
    eliminar: (idVacante) => `${BASE_URL}/vacantes.php?${qs({ accion: 'eliminar', id_vacante: idVacante })}`,
    detalle: (idVacante) => `${BASE_URL}/mostrar_vacante_detalle.php?${qs({ id: idVacante })}`,
  },

  candidatos: {
    porVacante: `${BASE_URL}/candidatos.php?accion=listar_por_vacante`,
    detallePorVacante: (idVacante) => `${BASE_URL}/candidatos.php?${qs({ accion: 'detalles_candidatos', id_vacante: idVacante })}`,
    cv: (idPostulacion) => `${BASE_URL}/candidatos.php?${qs({ accion: 'cv', id_postulacion: idPostulacion })}`,
    certificacionPdf: (idCertificacion) => `${BASE_URL}/candidatos.php?${qs({ accion: 'certificacion_pdf', id_certificacion: idCertificacion })}`,
    actualizarEstadoPostulacion: `${BASE_URL}/candidatos.php?accion=actualizar_estado_postulacion`,
  },

  reportes: {
    listar: `${BASE_URL}/mostrar_reportes.php`,
    marcarAvisoAtendido: (idAviso) => `${BASE_URL}/mostrar_reportes.php?${qs({ accion: 'marcar_aviso_atendido', id: idAviso })}`,
  },

  chat: {
    responder: `${BASE_URL}/chat/Chatbot.php`,
    historial: `${BASE_URL}/chat/historial.php`,
    recomendarCandidato: `${BASE_URL}/chat/recomendar_candidatos.php`,
    mejorarRedaccion: `${BASE_URL}/chat/mejorar_redaccion.php`,
     solicitarEntrevista: `${BASE_URL}/chat/solicitar_entrevista.php`,
  },
};
