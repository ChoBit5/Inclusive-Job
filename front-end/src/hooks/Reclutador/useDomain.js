// Conecta endpoints del reclutador con hooks con nombres de negocio.
import { useCallback, useState } from 'react';
import { useApiAction, useFetch } from './useApi';
import { ENDPOINTS } from './apiReclutador';

export function useReclutadorDashboard() {
  return useFetch(ENDPOINTS.dashboard.resumen);
}

export function usePerfilReclutador() {
  return useFetch(ENDPOINTS.perfil.obtener);
}

export function useActualizarPerfilReclutador() {
  const { execute, loading, error } = useApiAction();

  return {
    actualizarPerfil: (data) => execute(ENDPOINTS.perfil.actualizar, 'POST', data),
    loading,
    error,
  };
}

export function useEmpresaReclutador() {
  return useFetch(ENDPOINTS.empresa.obtener);
}

export function useActualizarEmpresaReclutador() {
  const { execute, loading, error } = useApiAction();

  return {
    actualizarEmpresa: (data) => execute(ENDPOINTS.empresa.actualizar, 'POST', data),
    loading,
    error,
  };
}

export function useDiscapacidadesReclutador() {
  return useFetch(ENDPOINTS.catalogos.discapacidades);
}

export function useVacantesReclutador() {
  return useFetch(ENDPOINTS.vacantes.listar);
}

export function useGuardarVacanteReclutador() {
  const { execute, loading, error } = useApiAction();

  return {
    guardarVacante: (data) => execute(ENDPOINTS.vacantes.crear, 'POST', data),
    editarVacante: (data) => execute(ENDPOINTS.vacantes.editar, 'POST', data),
    actualizarEstadoVacante: (data) => execute(ENDPOINTS.vacantes.actualizarEstado, 'POST', data),
    eliminarVacante: (idVacante) => execute(ENDPOINTS.vacantes.eliminar(idVacante), 'POST'),
    loading,
    error,
  };
}

export function useDetalleVacanteReclutador(idVacante) {
  return useFetch(idVacante ? ENDPOINTS.vacantes.detalle(idVacante) : null);
}

export function useVacantesConCandidatosReclutador() {
  return useFetch(ENDPOINTS.candidatos.porVacante);
}

export function useCandidatosVacanteReclutador() {
  const { execute, loading, error } = useApiAction();

  return {
    obtenerCandidatosVacante: (idVacante) => execute(ENDPOINTS.candidatos.detallePorVacante(idVacante), 'GET'),
    actualizarEstadoPostulacion: (data) => execute(ENDPOINTS.candidatos.actualizarEstadoPostulacion, 'POST', data),
    loading,
    error,
  };
}

export function useReportesReclutador() {
  return useFetch(ENDPOINTS.reportes.listar);
}

export function useAvisosReportesReclutador() {
  const { execute, loading, error } = useApiAction();

  return {
    marcarAvisoAtendido: (idAviso) => execute(ENDPOINTS.reportes.marcarAvisoAtendido(idAviso), 'POST'),
    loading,
    error,
  };
}

export function useReclutadorResource(url, options = {}) {
  return useFetch(url, options);
}

export function useReclutadorAction() {
  return useApiAction();
}

export function useReclutadorChat() {
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

export function useReclutadorChatHistorial() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const cargarHistorial = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(ENDPOINTS.chat.historial, {
        method: 'GET',
        credentials: 'include',
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

export function useMejorCandidatoReclutador() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const buscarMejorCandidato = useCallback(async (idVacante = null, excluirPostulaciones = []) => {
    setLoading(true);
    setError(null);

    try {
      const body = {};
      if (idVacante) {
        body.id_vacante = idVacante;
      }
      if (Array.isArray(excluirPostulaciones) && excluirPostulaciones.length > 0) {
        body.excluir_postulaciones = excluirPostulaciones;
      }

      const res = await fetch(ENDPOINTS.chat.recomendarCandidato, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || data.ok === false) {
        throw new Error(data.message || `Error ${res.status}: ${res.statusText}`);
      }

      // { ok: true, recomendacion: {...} | null, mensaje: "..." }
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo obtener la recomendacion.';
      setError(message);
      throw new Error(message, { cause: err });
    } finally {
      setLoading(false);
    }
  }, []);

  return { buscarMejorCandidato, loading, error };
}

export function useMejorarRedaccionReclutador() {
  const [error, setError] = useState(null);

  const mejorarTexto = useCallback(async ({ campo, texto, contexto }) => {
    setError(null);

    try {
      const res = await fetch(ENDPOINTS.chat.mejorarRedaccion, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ campo, texto, contexto }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || data.ok === false) {
        throw new Error(data.message || `Error ${res.status}: ${res.statusText}`);
      }

      // { ok: true, campo, texto_mejorado, sugerencias: [...], nota }
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo mejorar el texto.';
      setError(message);
      throw new Error(message, { cause: err });
    }
  }, []);

  return { mejorarTexto, error };
}

export function useSolicitarEntrevistaReclutador() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const solicitarEntrevista = useCallback(async (idPostulacion) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(ENDPOINTS.chat.solicitarEntrevista, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id_postulacion: idPostulacion }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || data.ok === false) {
        throw new Error(data.message || `Error ${res.status}: ${res.statusText}`);
      }

      // { ok: true, mensaje: "..." }
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo enviar la solicitud de entrevista.';
      setError(message);
      throw new Error(message, { cause: err });
    } finally {
      setLoading(false);
    }
  }, []);

  return { solicitarEntrevista, loading, error };
}
