// Este archivo centraliza la URL base y los endpoints del modulo Postulante.
import { BACKEND_BASE_URL } from '../../config/app.js';

export const BACKEND_URL = BACKEND_BASE_URL;
export const BASE_URL = `${BACKEND_URL}/Modelo/Postulante`;

export const ENDPOINTS = {
  dashboard: {
    resumen: `${BASE_URL}/dashboard.php`,
  },

  chat: {
    responder: `${BASE_URL}/chat/chatbot.php`,
    historial: `${BASE_URL}/chat/historial.php`,
  },

  documentos: {
    cv: `${BASE_URL}/cv.php`,
    certificaciones: `${BASE_URL}/certificaciones.php`,
  },

  perfil: {
    obtener: `${BASE_URL}/obtener_perfil.php`,
    actualizar: `${BASE_URL}/actualizar_perfil.php`,
  },

  vacantes: {
    listar: `${BASE_URL}/obtener_vacantes.php`,
  },

  postulaciones: {
    recurso: `${BASE_URL}/postulaciones.php`,
  },

  reportes: {
    recurso: `${BASE_URL}/reportes.php`,
  },

  verificacion: {
    reenviar: `${BASE_URL}/reenviar_codigo.php`,
    verificar: `${BASE_URL}/verificar_codigo.php`,
  },

  ia: {
    recomendarVacantes: `${BASE_URL}/chat/recomendar_vacantes.php`,
    analizarCv: `${BASE_URL}/chat/analizar_cv.php`,

    // Entrevista simulada (practica) con IA.
    entrevistaPostulaciones: `${BASE_URL}/chat/entrevista_postulaciones.php`,
    entrevistaIniciar: `${BASE_URL}/chat/entrevista_iniciar.php`,
    entrevistaResponder: `${BASE_URL}/chat/entrevista_responder.php`,
    entrevistaFinalizar: `${BASE_URL}/chat/entrevista_finalizar.php`,

    // Entrevista REAL (proceso de seleccion, solicitada por un reclutador).
    entrevistaReal: `${BASE_URL}/chat/entrevista_real.php`,
  },

  // Formulario
  formulario: {
    estado: `${BASE_URL}/guardar_formulario.php`,
    guardar: `${BASE_URL}/guardar_formulario.php`,
  },
};
