// Este archivo conecta endpoints del postulante con hooks faciles de usar en componentes.
// Aqui deben vivir hooks por dominio/pantalla: perfil, vacantes, postulaciones, etc.


import { useCallback, useState } from 'react';
import { requestPostulante, useApiAction, useFetch } from './useApi';
import { BACKEND_URL, ENDPOINTS } from './apiPostulante';

async function requestData(url, options) {
  const { res, data } = await requestPostulante(url, options);
  return { ...data, httpOk: res.ok };
}

async function requestDocumentoData(url, {
  method = 'GET',
  body,
} = {}) {
  if (!url) throw new Error('La URL es requerida para ejecutar la peticion.');

  const isFormData = body instanceof FormData;
  const res = await fetch(url, {
    method,
    credentials: 'include',
    headers: {
      ...(!isFormData && body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body !== undefined ? { body: isFormData || typeof body === 'string' ? body : JSON.stringify(body) } : {}),
  });

  const data = await res.json().catch(() => ({}));
  return { ...data, httpOk: res.ok };
}

function parseJsonFromResponseText(text) {
  const raw = String(text ?? '').trim();
  if (!raw) return {};

  try {
    return JSON.parse(raw);
  } catch {
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');

    if (start >= 0 && end > start) {
      const possibleJson = raw.slice(start, end + 1);
      try {
        return JSON.parse(possibleJson);
      } catch {
        // Continua hacia el error descriptivo de abajo.
      }
    }
  }

  throw new Error(
    `El backend no devolvio JSON valido: ${raw.slice(0, 220)}`
  );
}

async function obtenerCvBlobPostulante() {
  const res = await fetch(ENDPOINTS.documentos.cv, {
    method: 'GET',
    credentials: 'include',
  });

  const contentType = res.headers.get('content-type') || '';
  if (!res.ok || !contentType.includes('application/pdf')) {
    throw new Error('No hay CV PDF disponible.');
  }

  return res.blob();
}

export function useFormularioPostulante() {
  const obtenerEstadoFormulario = useCallback(() => (
    requestData(ENDPOINTS.formulario.estado)
  ), []);
  const guardarFormulario = useCallback((formData) => (
    requestData(ENDPOINTS.formulario.guardar, { method: 'POST', body: formData })
  ), []);

  return { obtenerEstadoFormulario, guardarFormulario };
}

export function useVerificacionPostulante() {
  const reenviarCodigo = useCallback((correo) => (
    requestData(ENDPOINTS.verificacion.reenviar, { method: 'POST', body: { correo } })
  ), []);
  const verificarCodigo = useCallback((correo, codigo) => (
    requestData(ENDPOINTS.verificacion.verificar, { method: 'POST', body: { correo, codigo } })
  ), []);

  return { reenviarCodigo, verificarCodigo };
}

export function usePerfilPostulante() {
  const obtenerPerfil = useCallback(() => requestData(ENDPOINTS.perfil.obtener), []);
  const actualizarPerfil = useCallback((formData) => (
    requestData(ENDPOINTS.perfil.actualizar, { method: 'POST', body: formData })
  ), []);

  return { obtenerPerfil, actualizarPerfil, backendUrl: BACKEND_URL };
}

export function useDocumentosPostulante() {
  const verificarCv = useCallback(async () => {
    const res = await fetch(ENDPOINTS.documentos.cv, {
      method: 'GET',
      credentials: 'include',
    });

    return res.ok && res.headers.get('content-type')?.includes('application/pdf');
  }, []);
  const subirCv = useCallback((formData) => (
    requestDocumentoData(ENDPOINTS.documentos.cv, { method: 'POST', body: formData })
  ), []);
  const listarCertificaciones = useCallback(() => (
    requestDocumentoData(ENDPOINTS.documentos.certificaciones)
  ), []);
  const guardarCertificacion = useCallback((formData) => (
    requestDocumentoData(ENDPOINTS.documentos.certificaciones, { method: 'POST', body: formData })
  ), []);
  const eliminarCertificacion = useCallback((id) => (
    requestDocumentoData(ENDPOINTS.documentos.certificaciones, { method: 'DELETE', body: { id } })
  ), []);

  return {
    obtenerCvBlob: obtenerCvBlobPostulante,
    verificarCv,
    subirCv,
    listarCertificaciones,
    guardarCertificacion,
    eliminarCertificacion,
    cvUrl: ENDPOINTS.documentos.cv,
    certificacionesUrl: ENDPOINTS.documentos.certificaciones,
  };
}

export function useVacantesPostulante() {
  const listarVacantes = useCallback(() => requestData(ENDPOINTS.vacantes.listar), []);
  const postularse = useCallback((idVacante) => (
    requestData(ENDPOINTS.postulaciones.recurso, { method: 'POST', body: { id_vacante: idVacante } })
  ), []);
  const reportarVacante = useCallback((idVacante, motivo) => (
    requestData(ENDPOINTS.reportes.recurso, { method: 'POST', body: { id_vacante: idVacante, motivo } })
  ), []);

  return { listarVacantes, postularse, reportarVacante };
}

export function usePostulacionesPostulante() {
  const listarPostulaciones = useCallback(() => requestData(ENDPOINTS.postulaciones.recurso), []);
  const despostular = useCallback((idPostulacion) => (
    requestData(ENDPOINTS.postulaciones.recurso, {
      method: 'DELETE',
      body: { id_postulacion: idPostulacion },
    })
  ), []);

  return { listarPostulaciones, despostular };
}

export function useReportesPostulante() {
  const listarReportes = useCallback(() => requestData(ENDPOINTS.reportes.recurso), []);
  const eliminarReporte = useCallback((idReporte) => (
    requestData(ENDPOINTS.reportes.recurso, { method: 'DELETE', body: { id_reporte: idReporte } })
  ), []);
  const editarReporte = useCallback((idReporte, motivo) => (
    requestData(ENDPOINTS.reportes.recurso, { method: 'PUT', body: { id_reporte: idReporte, motivo } })
  ), []);

  return { listarReportes, eliminarReporte, editarReporte };
}

export function useEntrevistaRealPostulante() {
  const ejecutarEntrevista = useCallback(async (body) => {
    const { res, data } = await requestPostulante(ENDPOINTS.ia.entrevistaReal, {
      method: 'POST',
      body,
    });
    if (!res.ok || !data?.ok) {
      throw new Error(data?.message || 'Ocurrio un error en la entrevista.');
    }
    return data;
  }, []);

  return { ejecutarEntrevista };
}

export function usePostulanteDashboard() {
  return useFetch(ENDPOINTS.dashboard.resumen);
}

export function usePostulanteChat() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const enviarMensaje = useCallback(async (mensaje) => {
    const texto = String(mensaje ?? '').trim();

    if (!texto) {
      throw new Error('Escribe un mensaje.');
    }

    setLoading(true);
    setError(null);

    try {
      const body = new URLSearchParams();
      body.set('mensaje', texto);

      const res = await fetch(ENDPOINTS.chat.responder, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      const respuesta = await res.text();

      if (!res.ok) {
        throw new Error(respuesta || `Error ${res.status}: ${res.statusText}`);
      }

      return respuesta;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo contactar al asistente.';
      setError(message);
      throw new Error(message, { cause: err });
    } finally {
      setLoading(false);
    }
  }, []);

  return { enviarMensaje, loading, error };
}

export function usePostulanteChatHistorial() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const cargarHistorial = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('postulante_token');
      const res = await fetch(ENDPOINTS.chat.historial, {
        method: 'GET',
        credentials: 'include',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok === false) {
        throw new Error(data.message || `Error ${res.status}: ${res.statusText}`);
      }

      return data.historial ?? [];
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo cargar el historial del chat.';
      setError(message);
      throw new Error(message, { cause: err });
    } finally {
      setLoading(false);
    }
  }, []);

  return { cargarHistorial, loading, error };
}

export function useRecomendacionVacantesIA() {
  const { execute, loading, error } = useApiAction();

  const recomendarVacantes = useCallback(() => (
    execute(ENDPOINTS.ia.recomendarVacantes, 'POST')
  ), [execute]);

  return { recomendarVacantes, loading, error };
}

export function useAnalisisCvIA() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const analizarCV = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('postulante_token');
      const res = await fetch(ENDPOINTS.ia.analizarCv, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ source: 'session_cv' }),
      });

      const rawText = await res.text();
      const data = parseJsonFromResponseText(rawText);

      if (!res.ok || data.ok === false) {
        throw new Error(data.message || data.msg || `Error ${res.status}: ${res.statusText}`);
      }

      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo analizar el CV.';
      setError(message);
      throw new Error(message, { cause: err });
    } finally {
      setLoading(false);
    }
  }, []);

  return { analizarCV, loading, error };
}

/**
 * usePostulacionesEntrevistaIA - Trae las postulaciones del usuario para
 * mostrarlas como tarjetas en el chat ("elige una vacante para simular
 * una entrevista"), igual que se hace con recomendar vacantes.
 */
export function usePostulacionesEntrevistaIA() {
  const { execute, loading, error } = useApiAction();

  const listarPostulaciones = useCallback(async () => {
    const data = await execute(ENDPOINTS.ia.entrevistaPostulaciones, 'GET');
    return data.postulaciones ?? [];
  }, [execute]);

  return { listarPostulaciones, loading, error };
}

/**
 * useEntrevistaIA - Maneja los 3 pasos de la entrevista simulada:
 * iniciar (primera pregunta), responder (turno a turno) y finalizar
 * (evaluacion final, solo cuando el usuario decide terminarla).
 * Cancelar la entrevista NO debe llamar a finalizarEntrevista: el modal
 * simplemente se cierra sin guardar ni calificar nada.
 */
export function useEntrevistaIA() {
  const { execute, loading, error } = useApiAction();

  const iniciarEntrevista = useCallback((idVacante) => (
    execute(ENDPOINTS.ia.entrevistaIniciar, 'POST', { id_vacante: idVacante })
  ), [execute]);

  const responderEntrevista = useCallback((idVacante, historial, mensaje) => (
    execute(ENDPOINTS.ia.entrevistaResponder, 'POST', {
      id_vacante: idVacante,
      historial,
      mensaje,
    })
  ), [execute]);

  const finalizarEntrevista = useCallback((idVacante, historial) => (
    execute(ENDPOINTS.ia.entrevistaFinalizar, 'POST', {
      id_vacante: idVacante,
      historial,
    })
  ), [execute]);

  return { iniciarEntrevista, responderEntrevista, finalizarEntrevista, loading, error };
}

/**
 * usePostulanteResource - Base temporal para consultar una URL del modulo Postulante.
 * Usar mientras se definen hooks especificos.
 *
 * Ejemplo futuro:
 * export function usePostulacionesPostulante() {
 *   return useFetch(ENDPOINTS.postulaciones.list);
 * }
 */
export function usePostulanteResource(url, options = {}) {
  return useFetch(url, options);
}

/**
 * usePostulanteAction - Base temporal para ejecutar acciones sobre una URL.
 * Los colaboradores deben envolver execute con nombres claros del negocio.
 *
 * Ejemplo futuro:
 * export function usePostulacionAcciones() {
 *   const { execute, loading, error } = useApiAction();
 *   return {
 *     cancelar: (id) => execute(ENDPOINTS.postulaciones.cancelar(id), 'POST'),
 *     loading,
 *     error,
 *   };
 * }
 */
export function usePostulanteAction() {
  return useApiAction();
}
