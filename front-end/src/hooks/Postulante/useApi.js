// Hooks genericos para consumir cualquier URL del modulo Postulante.
import { useCallback, useEffect, useState } from 'react';

export async function requestPostulante(url, {
  method = 'GET',
  body,
  headers = {},
  parse = 'json',
} = {}) {
  if (!url) throw new Error('La URL es requerida para ejecutar la peticion.');

  const token = localStorage.getItem('postulante_token');
  const isFormData = body instanceof FormData;
  const res = await fetch(url, {
    method,
    credentials: 'include',
    headers: {
      ...(!isFormData && body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    ...(body !== undefined ? { body: isFormData || typeof body === 'string' ? body : JSON.stringify(body) } : {}),
  });

  const data = parse === 'text'
    ? await res.text()
    : await res.json().catch(() => ({}));

  return { res, data };
}

/**
 * useFetch - Hook generico para peticiones GET.
 */
export function useFetch(url, options = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(Boolean(url));
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (!url) return;

    setLoading(true);
    setError(null);

    try {
      const { res, data: json } = await requestPostulante(url, { headers: options.headers || {} });

      if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);

      setData(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [url, options.headers]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

/**
 * useApiAction - Hook generico para POST, PUT, PATCH o DELETE.
 */
export function useApiAction() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const execute = useCallback(async (url, method = 'POST', body = null) => {
    if (!url) throw new Error('La URL es requerida para ejecutar la accion.');

    setLoading(true);
    setError(null);

    try {
      const { res, data } = await requestPostulante(url, { method, body: body ?? undefined });

      if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);

      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { execute, loading, error };
}
