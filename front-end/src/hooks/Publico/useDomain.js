import { useCallback } from 'react';
import { ENDPOINTS, JSONBIN_HEADERS } from './apiPublico';

async function leerComentarios() {
  const res = await fetch(ENDPOINTS.comentarios, {
    method: 'GET',
    headers: JSONBIN_HEADERS,
  });
  if (!res.ok) throw new Error('No se pudieron cargar los comentarios.');
  const json = await res.json();
  return json.record?.comentarios ?? [];
}

export function useComentariosPublicos() {
  const cargarComentarios = useCallback(() => leerComentarios(), []);

  const publicarComentario = useCallback(async ({ nombre, comentario }) => {
    const actuales = await leerComentarios();
    const nuevo = {
      id: Date.now(),
      nombre: nombre.trim(),
      comentario: comentario.trim(),
      fecha: new Date().toISOString(),
    };
    const comentarios = [nuevo, ...actuales];
    const res = await fetch(ENDPOINTS.comentarios, {
      method: 'PUT',
      headers: JSONBIN_HEADERS,
      body: JSON.stringify({ comentarios }),
    });
    if (!res.ok) throw new Error('No se pudo publicar el comentario.');
    return comentarios;
  }, []);

  return { cargarComentarios, publicarComentario };
}
