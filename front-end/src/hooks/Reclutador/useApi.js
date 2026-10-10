// Hooks genericos para consumir cualquier URL del modulo Reclutador.

import { useCallback, useEffect, useState } from 'react';

async function requestJson(url, { method = 'GET', body, headers = {} } = {}) {
  if (!url) throw new Error('La URL es requerida para ejecutar la peticion.');
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;

  const res = await fetch(url, {
    method,
    credentials: 'include',
    headers: isFormData
      ? { ...headers }
      : {
          'Content-Type': 'application/json',
          ...headers,
        },
    ...(body !== undefined ? { body: isFormData ? body : JSON.stringify(body) } : {}),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || data.success === false || data.ok === false) {
    throw new Error(data.message || data.mensaje || `Error ${res.status}: ${res.statusText}`);
  }

  return data;
}

export function useFetch(url, options = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(Boolean(url));
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (!url) return null;

    setLoading(true);
    setError(null);

    try {
      const json = await requestJson(url, { headers: options.headers || {} });
      setData(json);
      return json;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [url, options.headers]);

  useEffect(() => {
    fetchData().catch(() => {});
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

export function useApiAction() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const execute = useCallback(async (url, method = 'POST', body) => {
    setLoading(true);
    setError(null);

    try {
      return await requestJson(url, { method, body });
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { execute, loading, error };
}
