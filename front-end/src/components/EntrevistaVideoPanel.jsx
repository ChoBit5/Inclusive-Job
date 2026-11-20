import { useCallback, useEffect, useRef, useState } from "react";
import Swal from "sweetalert2";
import { reclutadorTheme as t } from "./Portal/portalTheme";
import { ENDPOINTS } from "../hooks/Reclutador/apiReclutador.js";

// Verificacion por video de la entrevista real: informe de Gemini + visor de
// "una sola vez". Se usa dentro de las vistas que ya muestran la calificacion
// (resumen de candidatos y tarjeta del chat del reclutador).

const INTERVALO_REVISION_MS = 8000;
const MAX_REVISIONES = 60;

const swalBase = {
  background: t.bgSurface,
  color: t.textPrimary,
  confirmButtonColor: t.accentHover,
  cancelButtonColor: t.textMuted,
  didOpen: popup => {
    popup.style.border = `1px solid ${t.accentBorder}`;
    popup.style.boxShadow = `0 18px 60px ${t.accentGlow}`;
  }
};

async function pedirJson(url, opciones = {}) {
  const tieneCuerpo = opciones.body !== undefined;
  const res = await fetch(url, {
    credentials: "include",
    ...opciones,
    headers: {
      ...(tieneCuerpo ? { "Content-Type": "application/json" } : {}),
      ...(opciones.headers || {})
    }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) {
    const error = new Error(data.message || `Error ${res.status}: ${res.statusText}`);
    error.status = res.status;
    throw error;
  }
  return data;
}

function crearEstilos(compact) {
  const base = compact ? 11.5 : 13;
  const chico = compact ? 11 : 12;
  return {
    caja: {
      marginTop: compact ? 4 : 2,
      paddingTop: compact ? 8 : 12,
      borderTop: `1px solid ${t.border}`,
      display: "grid",
      gap: compact ? 6 : 8
    },
    cabecera: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
      flexWrap: "wrap"
    },
    titulo: {
      color: t.textPrimary,
      fontSize: compact ? 12 : 13.5
    },
    texto: {
      color: t.textSecondary,
      fontSize: base,
      lineHeight: 1.5,
      margin: 0
    },
    apagado: {
      color: t.textMuted,
      fontSize: chico,
      lineHeight: 1.5,
      margin: 0
    },
    lista: {
      color: t.textSecondary,
      fontSize: chico + 0.5,
      lineHeight: 1.5,
      margin: "3px 0 0",
      paddingLeft: 18
    },
    subtitulo: {
      color: t.accent,
      fontSize: chico
    },
    aviso: {
      color: t.warning,
      fontSize: chico,
      margin: 0
    },
    error: {
      color: t.danger,
      fontSize: chico + 0.5,
      margin: 0
    },
    acciones: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      flexWrap: "wrap"
    },
    boton: deshabilitado => ({
      background: deshabilitado ? t.accentSoft : t.gradient,
      border: `1px solid ${t.accentBorder}`,
      borderRadius: compact ? 8 : 10,
      color: "#fff",
      cursor: deshabilitado ? "not-allowed" : "pointer",
      fontSize: compact ? 11.5 : 13,
      fontWeight: 700,
      opacity: deshabilitado ? 0.7 : 1,
      padding: compact ? "6px 10px" : "8px 14px"
    }),
    botonSecundario: {
      background: "transparent",
      border: `1px solid ${t.accentBorder}`,
      borderRadius: compact ? 8 : 10,
      color: t.accent,
      cursor: "pointer",
      fontSize: compact ? 11.5 : 13,
      fontWeight: 700,
      padding: compact ? "6px 10px" : "8px 14px"
    },
    insignia: color => ({
      background: `${color}22`,
      border: `1px solid ${color}66`,
      borderRadius: 999,
      color,
      fontSize: chico,
      fontWeight: 800,
      padding: "3px 10px",
      whiteSpace: "nowrap"
    })
  };
}

export default function EntrevistaVideoPanel({
  idPostulacion,
  compact = false
}) {
  const s = crearEstilos(compact);
  const [info, setInfo] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");
  const [abriendo, setAbriendo] = useState(false);
  const [reintentando, setReintentando] = useState(false);
  const vivoRef = useRef(true);
  const revisionesRef = useRef(0);
  const cargar = useCallback(async (silencioso = false) => {
    if (!idPostulacion) {
      setCargando(false);
      return;
    }
    if (!silencioso) setCargando(true);
    try {
      const data = await pedirJson(`${ENDPOINTS.chat.entrevistaVideoInfo}?id_postulacion=${encodeURIComponent(idPostulacion)}`);
      if (!vivoRef.current) return;
      setInfo(data);
      setErrorCarga("");
    } catch (err) {
      if (!vivoRef.current) return;
      if (!silencioso) setErrorCarga(err instanceof Error ? err.message : "No se pudo consultar el video.");
    } finally {
      if (vivoRef.current) setCargando(false);
    }
  }, [idPostulacion]);
  useEffect(() => {
    vivoRef.current = true;
    revisionesRef.current = 0;
    cargar();
    return () => {
      vivoRef.current = false;
    };
  }, [cargar]);

  // Mientras Gemini analiza, se consulta el estado cada pocos segundos.
  useEffect(() => {
    if (!info || !["pendiente", "procesando"].includes(info.estado_analisis)) return undefined;
    if (revisionesRef.current >= MAX_REVISIONES) return undefined;
    const timer = setTimeout(() => {
      revisionesRef.current += 1;
      cargar(true);
    }, INTERVALO_REVISION_MS);
    return () => clearTimeout(timer);
  }, [info, cargar]);
  async function reintentarAnalisis() {
    setReintentando(true);
    try {
      await pedirJson(ENDPOINTS.chat.entrevistaVideoReintentar, {
        method: "POST",
        body: JSON.stringify({
          id_postulacion: idPostulacion
        })
      });
      revisionesRef.current = 0;
      await cargar(true);
    } catch (err) {
      await Swal.fire({
        ...swalBase,
        icon: "error",
        iconColor: t.danger,
        title: "No se pudo reintentar",
        text: err instanceof Error ? err.message : "Intenta de nuevo más tarde."
      });
    } finally {
      if (vivoRef.current) setReintentando(false);
    }
  }
  async function abrirVideo() {
    const confirmacion = await Swal.fire({
      ...swalBase,
      icon: "warning",
      iconColor: t.warning,
      title: "Solo podrás verlo una vez",
      html: "Una vez que abras el video, <b>no podrás volver a verlo</b>. Asegúrate de tener tiempo para verlo completo antes de continuar.",
      showCancelButton: true,
      confirmButtonText: "Abrir video",
      cancelButtonText: "Cancelar"
    });
    if (!confirmacion.isConfirmed) return;
    setAbriendo(true);
    let urlVideo = null;
    try {
      const res = await fetch(ENDPOINTS.chat.entrevistaVideoVer, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          id_postulacion: idPostulacion
        })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || `Error ${res.status}: ${res.statusText}`);
      }
      const archivo = await res.blob();
      if (archivo.size === 0) throw new Error("El video recibido está vacío.");
      urlVideo = URL.createObjectURL(archivo);
    } catch (err) {
      if (vivoRef.current) setAbriendo(false);
      await Swal.fire({
        ...swalBase,
        icon: "error",
        iconColor: t.danger,
        title: "No se pudo abrir el video",
        text: err instanceof Error ? err.message : "Intenta de nuevo más tarde."
      });
      cargar(true);
      return;
    }
    if (vivoRef.current) {
      setAbriendo(false);
      setInfo(previo => previo ? {
        ...previo,
        video_visto: true
      } : previo);
    }
    await Swal.fire({
      ...swalBase,
      title: "Video de verificación",
      html: '<video controls autoplay playsinline controlsList="nodownload noremoteplayback" disablePictureInPicture oncontextmenu="return false" style="width:100%;max-height:60vh;border-radius:12px;background:#000"></video>',
      width: 720,
      confirmButtonText: "Cerrar",
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: popup => {
        swalBase.didOpen(popup);
        const reproductor = popup.querySelector("video");
        if (reproductor) reproductor.src = urlVideo;
      },
      willClose: () => URL.revokeObjectURL(urlVideo)
    });
    cargar(true);
  }
  if (!idPostulacion) return null;
  if (cargando && !info) {
    return <section aria-label="Verificación por video" style={s.caja}>
        <p style={s.apagado}>Consultando la verificación por video...</p>
      </section>;
  }
  if (errorCarga && !info) {
    return <section aria-label="Verificación por video" style={s.caja}>
        <p style={s.error}>{errorCarga}</p>
        <div style={s.acciones}>
          <button type="button" onClick={() => cargar()} style={s.botonSecundario}>Actualizar</button>
        </div>
      </section>;
  }
  if (!info?.tiene_video) {
    return <section aria-label="Verificación por video" style={s.caja}>
        <strong style={s.titulo}>Verificación por video</strong>
        <p style={s.apagado}>
          Esta entrevista no tiene video de verificación. Si el postulante acaba de terminarla, puede tardar unos minutos en llegar.
        </p>
        <div style={s.acciones}>
          <button type="button" onClick={() => cargar()} style={s.botonSecundario}>Actualizar</button>
        </div>
      </section>;
  }
  const estado = info.estado_analisis;
  const informe = info.informe;
  const analizando = estado === "pendiente" || estado === "procesando";
  let insignia = null;
  if (estado === "completado") {
    insignia = info.sugiere_revision ? <span style={s.insignia(t.warning)}>Revisión sugerida</span> : <span style={s.insignia(t.success)}>Sin alertas claras</span>;
  } else if (analizando) {
    insignia = <span style={s.insignia(t.accent)}>Analizando...</span>;
  } else if (estado === "error") {
    insignia = <span style={s.insignia(t.danger)}>Sin análisis</span>;
  }
  return <section aria-label="Verificación por video" style={s.caja}>
      <div style={s.cabecera}>
        <strong style={s.titulo}>Verificación por video</strong>
        {insignia}
      </div>

      {analizando && <p style={s.apagado}>Gemini está analizando el video. Esto puede tardar unos minutos; esta vista se actualiza sola.</p>}

      {estado === "error" && <>
          <p style={s.error}>{info.error || "No se pudo analizar el video."}</p>
          {info.puede_reintentar && <div style={s.acciones}>
              <button type="button" onClick={reintentarAnalisis} disabled={reintentando} style={s.boton(reintentando)}>
                {reintentando ? "Reintentando..." : "Reintentar análisis"}
              </button>
            </div>}
        </>}

      {estado === "completado" && informe && <>
          {informe.conclusion && <p style={s.texto}><strong>{informe.conclusion}</strong></p>}
          {informe.resumen && <p style={s.texto}>{informe.resumen}</p>}
          {informe.observaciones?.length > 0 && <div>
              <strong style={s.subtitulo}>Observaciones</strong>
              <ul style={s.lista}>
                {informe.observaciones.map((obs, indice) => <li key={`obs-${indice}`}>
                    <strong>{obs.tiempo || "Sin tiempo"}</strong> {obs.descripcion}
                    {obs.motivo ? ` (${obs.motivo})` : ""}
                  </li>)}
              </ul>
            </div>}
          {informe.limitaciones && <p style={s.apagado}>Limitaciones: {informe.limitaciones}</p>}
        </>}

      {info.camara_interrumpida && <p style={s.aviso}>La cámara se interrumpió durante la entrevista.</p>}

      <div style={s.acciones}>
        {info.video_visto ? <span style={s.apagado}>Video ya consultado</span> : <button type="button" onClick={abrirVideo} disabled={abriendo} style={s.boton(abriendo)}>
            {abriendo ? "Abriendo..." : "Ver video (solo una vez)"}
          </button>}
      </div>

      <p style={s.apagado}>
        Informe generado con IA: es una alerta preliminar, no una prueba de trampa. Revisa el video antes de decidir.
      </p>
    </section>;
}
