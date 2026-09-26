import { useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useNavigate } from "react-router-dom";
import { useReclutadorChat, useReclutadorChatHistorial, useMejorCandidatoReclutador, useVacantesReclutador, useSolicitarEntrevistaReclutador } from "../../data/interface.js";
import { reclutadorTheme as t } from "../../components/Portal/portalTheme";
const RUTA_CANDIDATOS = "/reclutador/candidatos";
const PATRON_MEJOR_CANDIDATO = /mejor\s+candidat|mejor\s+postulante|candidat[oa]\s+ideal|recomi[eé]ndame.*candidat|qui[eé]n.*(mejor|ideal).*postul/i;
const SUGERENCIAS = ["¿Cuáles son los mejores postulantes para mi vacante activa?", "¿Cómo filtro candidatos por habilidades o discapacidad?", "¿Cómo publico una nueva vacante?", "¿Cómo reviso los reportes de mis vacantes?"];
const MENSAJE_BIENVENIDA = {
  tipo: "bot",
  texto: "👋 ¡Hola! Soy el asistente de Inclusive Job.\n\nPuedo ayudarte a:\n• Encontrar los mejores postulantes para tus vacantes\n• Resolver dudas sobre el uso del sistema\n• Orientarte en procesos de reclutamiento\n\n¿En qué te ayudo hoy?"
};
const CLOSE_ANIM_MS = 220;
function parseRespuestaIA(value) {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}
function mapHistorialAMensajes(rows = []) {
  if (!rows.length) return [MENSAJE_BIENVENIDA];
  const mapeados = [];
  rows.forEach(row => {
    if (row.mensaje_usuario) {
      mapeados.push({
        tipo: "usuario",
        texto: row.mensaje_usuario
      });
    }
    if (row.respuesta_ia) {
      const payload = parseRespuestaIA(row.respuesta_ia);
      if (payload?.evaluacion && payload?.candidato) {
        mapeados.push({
          tipo: "bot",
          texto: payload.text || `${payload.candidato.nombre_completo} completo una entrevista simulada.`,
          entrevistaCompletada: {
            nombreCompleto: payload.candidato.nombre_completo,
            tituloPuesto: payload.vacante?.titulo_puesto,
            idVacante: payload.vacante?.id_vacante ?? null,
            idPostulacion: payload.candidato?.id_postulacion ?? null,
            evaluacion: payload.evaluacion
          }
        });
        return;
      }
      mapeados.push({
        tipo: "bot",
        texto: payload?.text || row.respuesta_ia
      });
      return;
    }
  });
  return mapeados.length ? mapeados : [MENSAJE_BIENVENIDA];
}
function formatSalarioChat(min, max) {
  const fmt = n => `$${Number(n).toLocaleString('es-MX')}`;
  if (!min && !max) return null;
  if (!max) return `Desde ${fmt(min)}`;
  if (!min) return `Hasta ${fmt(max)}`;
  return `${fmt(min)} - ${fmt(max)}`;
}
let chatStore = {
  open: false,
  mensajes: [MENSAJE_BIENVENIDA]
};
const listeners = new Set();
function setChatStore(updater) {
  chatStore = typeof updater === "function" ? updater(chatStore) : {
    ...chatStore,
    ...updater
  };
  listeners.forEach(l => l());
}
function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
function getSnapshot() {
  return chatStore;
}
function BotIcon({
  size = 18,
  color = "currentColor"
}) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="8" width="18" height="12" rx="3" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
      <circle cx="9" cy="14" r="1.2" fill={color} stroke="none" />
      <circle cx="15" cy="14" r="1.2" fill={color} stroke="none" />
      <path d="M9 17.5h6" strokeWidth="1.5" />
      <path d="M12 2v2" strokeWidth="1.5" />
    </svg>;
}
function SendIcon({
  size = 16
}) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 2 11 13" />
      <path d="M22 2 15 22 11 13 2 9l20-7z" />
    </svg>;
}
function CloseIcon({
  size = 16
}) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>;
}
function ChatIcon({
  size = 22
}) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      <path d="M8 10h8M8 14h5" strokeWidth="1.5" />
    </svg>;
}
function SparkleIcon({
  size = 14,
  color = "currentColor"
}) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none">
      <path d="M12 2l1.8 5.6L19 9.5l-5.2 1.9L12 17l-1.8-5.6L5 9.5l5.2-1.9L12 2z" />
      <path d="M19 14l.9 2.6L22.5 17.5l-2.6.9L19 21l-.9-2.6-2.6-.9 2.6-.9L19 14z" opacity="0.7" />
    </svg>;
}
function BriefcaseIcon({
  size = 14,
  color = "currentColor"
}) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>;
}
function MicIcon({
  size = 13,
  color = "currentColor"
}) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10v1a7 7 0 0 0 14 0v-1" />
      <path d="M12 18v4M8 22h8" />
    </svg>;
}
function TypingDots() {
  return <div style={{
    display: "flex",
    gap: "4px",
    alignItems: "center",
    padding: "4px 2px"
  }}>
      {[0, 1, 2].map(i => <span key={i} style={{
      width: "6px",
      height: "6px",
      borderRadius: "50%",
      background: t.textMuted,
      display: "inline-block",
      animation: "chatTyping 1.2s ease-in-out infinite",
      animationDelay: `${i * 0.2}s`
    }} />)}
    </div>;
}
function TarjetaRecomendacion({
  recomendacion,
  onVerCandidato,
  onSolicitarEntrevista,
  solicitandoId
}) {
  const enviandoEntrevista = solicitandoId === recomendacion.id_postulacion;
  return <div style={{
    marginTop: "10px",
    padding: "10px 12px",
    borderRadius: "12px",
    background: t.accentSoft,
    border: `1px solid ${t.accentBorder}`,
    display: "flex",
    flexDirection: "column",
    gap: "6px"
  }}>
      <div style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: "8px"
    }}>
        <strong style={{
        fontSize: "12.5px",
        color: t.textPrimary
      }}>
          {recomendacion.nombre_completo}
        </strong>
        <span style={{
        fontSize: "11px",
        fontWeight: 700,
        color: t.accent,
        background: "#fff",
        padding: "2px 8px",
        borderRadius: "20px",
        whiteSpace: "nowrap",
        flexShrink: 0
      }}>
          {recomendacion.porcentaje_compatibilidad}% compatible
        </span>
      </div>
      <span style={{
      fontSize: "11.5px",
      color: t.textMuted
    }}>
        Para: {recomendacion.titulo_puesto}
      </span>
      {recomendacion.justificacion && <span style={{
      fontSize: "11.5px",
      color: t.textSecondary,
      lineHeight: 1.4
    }}>
          {recomendacion.justificacion}
        </span>}

      <div style={{
      display: "flex",
      gap: "6px",
      marginTop: "4px",
      flexWrap: "wrap"
    }}>
        <button className="ver-candidato-btn" onClick={() => onVerCandidato(recomendacion)} style={{
        flex: "1 1 auto",
        fontSize: "12px",
        fontWeight: 600,
        color: "#fff",
        background: t.gradient,
        border: "none",
        padding: "7px 12px",
        borderRadius: "8px",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "6px",
        whiteSpace: "nowrap"
      }}>
          Ver candidato →
        </button>

        <button onClick={() => onSolicitarEntrevista(recomendacion)} disabled={enviandoEntrevista} style={{
        flex: "1 1 auto",
        fontSize: "12px",
        fontWeight: 600,
        color: t.accent,
        background: "#fff",
        border: `1px solid ${t.accentBorder}`,
        padding: "7px 12px",
        borderRadius: "8px",
        cursor: enviandoEntrevista ? "not-allowed" : "pointer",
        opacity: enviandoEntrevista ? 0.65 : 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "6px",
        whiteSpace: "nowrap",
        transition: "filter 0.15s ease"
      }}>
          <MicIcon size={12} color={t.accent} />
          {enviandoEntrevista ? "Enviando..." : "Realizar entrevista"}
        </button>
      </div>
    </div>;
}
function TarjetaSeleccionVacante({
  vacantes,
  onElegir,
  disabled
}) {
  return <div style={{
    marginTop: "10px",
    display: "flex",
    flexDirection: "column",
    gap: "6px"
  }}>
      {vacantes.map(v => {
      const salario = formatSalarioChat(v.salario_min, v.salario_max);
      return <button key={v.id_vacante} className="vacante-eleccion-btn" onClick={() => onElegir(v.id_vacante)} disabled={disabled} style={{
        textAlign: "left",
        display: "flex",
        alignItems: "flex-start",
        gap: "10px",
        padding: "10px 12px",
        borderRadius: "12px",
        border: `1px solid ${t.border}`,
        background: t.bgSurface,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
        transition: "all 0.15s ease"
      }}>
            <div style={{
          width: "28px",
          height: "28px",
          borderRadius: "8px",
          flexShrink: 0,
          background: t.accentSoft,
          border: `1px solid ${t.accentBorder}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}>
              <BriefcaseIcon size={13} color={t.accent} />
            </div>
            <div style={{
          display: "flex",
          flexDirection: "column",
          gap: "2px",
          minWidth: 0
        }}>
              <span style={{
            fontSize: "12.5px",
            fontWeight: 700,
            color: t.textPrimary,
            lineHeight: 1.3
          }}>
                {v.titulo_puesto}
              </span>
              <span style={{
            fontSize: "11px",
            color: t.textMuted
          }}>
                {v.modalidad}{salario ? ` · ${salario}` : ""}
              </span>
            </div>
          </button>;
    })}
    </div>;
}
function TarjetaEntrevistaCompletada({
  info,
  onVerCandidato
}) {
  const puntuacion = info.evaluacion?.puntuacion;
  return <div style={{
    marginTop: "10px",
    padding: "10px 12px",
    borderRadius: "12px",
    background: t.accentSoft,
    border: `1px solid ${t.accentBorder}`,
    display: "flex",
    flexDirection: "column",
    gap: "6px"
  }}>
      <div style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: "8px"
    }}>
        <strong style={{
        fontSize: "12.5px",
        color: t.textPrimary
      }}>
          {info.nombreCompleto}
        </strong>
        {typeof puntuacion === "number" && <span style={{
        fontSize: "11px",
        fontWeight: 700,
        color: t.accent,
        background: "#fff",
        padding: "2px 8px",
        borderRadius: "20px",
        whiteSpace: "nowrap",
        flexShrink: 0
      }}>
            {puntuacion}/10
          </span>}
      </div>
      {info.tituloPuesto && <span style={{
      fontSize: "11.5px",
      color: t.textMuted
    }}>
          Para: {info.tituloPuesto}
        </span>}
      {info.evaluacion?.resumen && <span style={{
      fontSize: "11.5px",
      color: t.textSecondary,
      lineHeight: 1.4
    }}>
          {info.evaluacion.resumen}
        </span>}

      
      <button className="ver-candidato-btn" onClick={() => onVerCandidato({
      id_vacante: info.idVacante,
      id_postulacion: info.idPostulacion
    })} style={{
      marginTop: "4px",
      fontSize: "12px",
      fontWeight: 600,
      color: "#fff",
      background: t.gradient,
      border: "none",
      padding: "7px 12px",
      borderRadius: "8px",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "6px",
      whiteSpace: "nowrap"
    }}>
        Ver candidato →
      </button>
    </div>;
}
function Burbuja({
  msg,
  onVerCandidato,
  onElegirVacante,
  seleccionDeshabilitada,
  onSolicitarEntrevista,
  solicitandoEntrevistaId
}) {
  const esUsuario = msg.tipo === "usuario";
  return <div style={{
    display: "flex",
    alignItems: "flex-end",
    gap: "8px",
    justifyContent: esUsuario ? "flex-end" : "flex-start",
    animation: "msgIn 0.28s cubic-bezier(0.22,1,0.36,1) both"
  }}>
      {!esUsuario && <div style={{
      width: "28px",
      height: "28px",
      borderRadius: "50%",
      flexShrink: 0,
      background: t.accentSoft,
      border: `1px solid ${t.accentBorder}`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }}>
          <BotIcon size={14} color={t.accent} />
        </div>}
      <div style={{
      maxWidth: "78%",
      padding: "10px 14px",
      borderRadius: esUsuario ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
      fontSize: "13px",
      lineHeight: "1.55",
      whiteSpace: "pre-line",
      background: esUsuario ? t.gradient : msg.error ? "rgba(239,68,68,0.08)" : t.bgElevated,
      color: esUsuario ? "#fff" : msg.error ? "#fca5a5" : t.textPrimary,
      border: esUsuario ? "none" : msg.error ? "1px solid rgba(239,68,68,0.25)" : `1px solid ${t.border}`,
      boxShadow: esUsuario ? `0 4px 12px ${t.accentGlow}` : "0 1px 4px rgba(0,0,0,0.06)"
    }}>
        {msg.texto}
        {msg.recomendacion && <TarjetaRecomendacion recomendacion={msg.recomendacion} onVerCandidato={onVerCandidato} onSolicitarEntrevista={onSolicitarEntrevista} solicitandoId={solicitandoEntrevistaId} />}
        {msg.vacantesParaElegir && <TarjetaSeleccionVacante vacantes={msg.vacantesParaElegir} onElegir={onElegirVacante} disabled={seleccionDeshabilitada} />}
        {msg.entrevistaCompletada && <TarjetaEntrevistaCompletada info={msg.entrevistaCompletada} onVerCandidato={onVerCandidato} />}
      </div>
    </div>;
}
export default function ChatBot() {
  const {
    open,
    mensajes
  } = useSyncExternalStore(subscribe, getSnapshot);
  const [mensaje, setMensaje] = useState("");
  const navigate = useNavigate();
  const {
    enviarMensaje,
    loading
  } = useReclutadorChat();
  const {
    cargarHistorial
  } = useReclutadorChatHistorial();
  const {
    buscarMejorCandidato,
    loading: loadingRecomendacion
  } = useMejorCandidatoReclutador();
  const {
    data: vacantesData,
    loading: loadingVacantes
  } = useVacantesReclutador();
  const {
    solicitarEntrevista
  } = useSolicitarEntrevistaReclutador();
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const [solicitandoEntrevistaId, setSolicitandoEntrevistaId] = useState(null);
  const vacantesActivas = useMemo(() => {
    const lista = vacantesData?.data ?? [];
    return lista.filter(v => v.estado === "activa");
  }, [vacantesData]);
  const cargandoRespuesta = loading || loadingRecomendacion;
  const [panelVisible, setPanelVisible] = useState(open);
  const [isClosing, setIsClosing] = useState(false);
  const closeTimerRef = useRef(null);
  const esInicio = mensajes.length === 1;
  const setOpen = v => setChatStore(prev => ({
    ...prev,
    open: typeof v === "function" ? v(prev.open) : v
  }));
  const setMensajes = v => setChatStore(prev => ({
    ...prev,
    mensajes: typeof v === "function" ? v(prev.mensajes) : v
  }));
  useEffect(() => {
    if (!open) return;
    let active = true;
    cargarHistorial().then(rows => {
      if (!active || !rows?.length) return;
      setMensajes(mapHistorialAMensajes(rows));
    }).catch(() => {});
    return () => {
      active = false;
    };
  }, [open]);
  useEffect(() => {
    if (open) {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
      setIsClosing(false);
      setPanelVisible(true);
    } else {
      setIsClosing(true);
      closeTimerRef.current = setTimeout(() => {
        setPanelVisible(false);
        setIsClosing(false);
      }, CLOSE_ANIM_MS);
    }
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, [open]);
  useLayoutEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [mensajes, loading, loadingRecomendacion, open, panelVisible]);
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 80);
  }, [open]);
  const enviar = async texto => {
    const contenido = texto.trim();
    if (!contenido || cargandoRespuesta) return;
    if (PATRON_MEJOR_CANDIDATO.test(contenido)) {
      setMensaje("");
      await iniciarBusquedaMejorCandidato(contenido);
      return;
    }
    setMensajes(prev => [...prev, {
      tipo: "usuario",
      texto: contenido
    }]);
    setMensaje("");
    try {
      const respuesta = await enviarMensaje(contenido);
      setMensajes(prev => [...prev, {
        tipo: "bot",
        texto: respuesta || "No obtuve respuesta, intenta de nuevo."
      }]);
    } catch (err) {
      setMensajes(prev => [...prev, {
        tipo: "bot",
        texto: err?.message || "Ocurrió un error al contactar al asistente.",
        error: true
      }]);
    }
  };
  const iniciarBusquedaMejorCandidato = async textoUsuario => {
    if (cargandoRespuesta) return;
    if (loadingVacantes) {
      setMensajes(prev => [...prev, {
        tipo: "usuario",
        texto: textoUsuario
      }, {
        tipo: "bot",
        texto: "Dame un segundo, todavía estoy cargando tus vacantes. Intenta de nuevo en un momento."
      }]);
      return;
    }
    if (vacantesActivas.length === 0) {
      setMensajes(prev => [...prev, {
        tipo: "usuario",
        texto: textoUsuario
      }, {
        tipo: "bot",
        texto: "No tienes vacantes activas en este momento, así que no hay candidatos que analizar todavía."
      }]);
      return;
    }
    if (vacantesActivas.length === 1) {
      await ejecutarBusquedaMejorCandidato(textoUsuario, vacantesActivas[0].id_vacante);
      return;
    }
    setMensajes(prev => [...prev, {
      tipo: "usuario",
      texto: textoUsuario
    }, {
      tipo: "bot",
      texto: "Tienes varias vacantes activas. ¿Para cuál quieres ver a tu mejor postulante?",
      vacantesParaElegir: vacantesActivas
    }]);
  };
  const ejecutarBusquedaMejorCandidato = async (textoUsuario, idVacante, {
    mostrarBurbujaUsuario = true,
    excluirPostulaciones = []
  } = {}) => {
    if (mostrarBurbujaUsuario) {
      setMensajes(prev => [...prev, {
        tipo: "usuario",
        texto: textoUsuario
      }]);
    }
    try {
      const data = await buscarMejorCandidato(idVacante, excluirPostulaciones);
      if (data?.recomendacion) {
        setMensajes(prev => [...prev, {
          tipo: "bot",
          texto: data.mensaje,
          recomendacion: data.recomendacion
        }]);
      } else {
        setMensajes(prev => [...prev, {
          tipo: "bot",
          texto: data?.mensaje || "No encontré candidatos para analizar todavía."
        }]);
      }
    } catch (err) {
      setMensajes(prev => [...prev, {
        tipo: "bot",
        texto: err?.message || "Ocurrió un error al buscar el mejor candidato.",
        error: true
      }]);
    }
  };
  const elegirVacanteParaAnalizar = async idVacante => {
    if (cargandoRespuesta) return;
    const vacante = vacantesActivas.find(v => v.id_vacante === idVacante);
    const etiqueta = vacante ? `Ver mejor postulante para "${vacante.titulo_puesto}"` : "Ver mejor postulante para esta vacante";
    await ejecutarBusquedaMejorCandidato(etiqueta, idVacante);
  };
  const irACandidatoRecomendado = recomendacion => {
    setOpen(false);
    navigate(RUTA_CANDIDATOS, {
      state: {
        recomendacionIA: {
          id_vacante: recomendacion.id_vacante,
          id_postulacion: recomendacion.id_postulacion,
          porcentaje_compatibilidad: recomendacion.porcentaje_compatibilidad
        }
      }
    });
  };
  const solicitarEntrevistaCandidato = async recomendacion => {
    if (solicitandoEntrevistaId) return;
    setSolicitandoEntrevistaId(recomendacion.id_postulacion);
    let entrevistaCompletada;
    try {
      const data = await solicitarEntrevista(recomendacion.id_postulacion);
      entrevistaCompletada = Boolean(data?.ya_completada);
      if (entrevistaCompletada) {
        setMensajes(prev => [...prev, {
          tipo: "bot",
          texto: data.mensaje || `${recomendacion.nombre_completo} ya completó su entrevista.`,
          entrevistaCompletada: {
            nombreCompleto: data.candidato?.nombre_completo ?? recomendacion.nombre_completo,
            tituloPuesto: data.vacante?.titulo_puesto ?? recomendacion.titulo_puesto,
            idVacante: data.vacante?.id_vacante ?? recomendacion.id_vacante ?? null,
            idPostulacion: data.candidato?.id_postulacion ?? recomendacion.id_postulacion ?? null,
            evaluacion: data.evaluacion
          }
        }]);
      } else {
        setMensajes(prev => [...prev, {
          tipo: "bot",
          texto: data?.mensaje || `Se envió la solicitud de entrevista a ${recomendacion.nombre_completo}.`
        }]);
      }
    } catch (err) {
      setMensajes(prev => [...prev, {
        tipo: "bot",
        texto: err?.message || "No se pudo enviar la solicitud de entrevista.",
        error: true
      }]);
      setSolicitandoEntrevistaId(null);
      return;
    } finally {
      setSolicitandoEntrevistaId(null);
    }
    if (entrevistaCompletada) {
      await ejecutarBusquedaMejorCandidato(null, recomendacion.id_vacante, {
        mostrarBurbujaUsuario: false,
        excluirPostulaciones: [recomendacion.id_postulacion]
      });
    }
  };
  return <>
      <style>{`
        @keyframes chatTyping {
          0%,100% { opacity: 0.4; }
          50%      { opacity: 1; }
        }
        @keyframes chatSlideIn {
          from { opacity: 0; transform: translateY(16px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes chatSlideOut {
          from { opacity: 1; transform: translateY(0) scale(1); }
          to   { opacity: 0; transform: translateY(14px) scale(0.96); }
        }
        @keyframes msgIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fabPulse {
          0%,100% { box-shadow: 0 0 0 0 ${t.accentGlow}; }
          50%      { box-shadow: 0 0 0 8px transparent; }
        }
        .chat-input::placeholder { color: ${t.textMuted}; }
        .chat-input:focus { outline: none; border-color: ${t.accent} !important; box-shadow: 0 0 0 3px ${t.accentGlow}; }
        .chat-input { font-size: 13px; }
        .sugerencia-btn:hover { background: ${t.accentSoft} !important; border-color: ${t.accentBorder} !important; color: ${t.accent} !important; }
        .vacante-eleccion-btn:hover:not(:disabled) { background: ${t.accentSoft} !important; border-color: ${t.accentBorder} !important; transform: translateX(2px); }
        .chat-fab { transition: transform 0.2s ease, box-shadow 0.2s ease; position: fixed; bottom: 24px; right: 24px; }
        .chat-fab:hover { transform: scale(1.08); }
        .chat-fab:active { transform: scale(0.92); }
        .chat-close-btn:hover { background: rgba(255,255,255,0.26) !important; transform: rotate(90deg); }
        .chat-close-btn:active { transform: rotate(90deg) scale(0.86); }
        .chat-send-btn:active { transform: scale(0.92) !important; }
        .chat-mejor-candidato-btn:hover:not(:disabled) { filter: brightness(1.05); }
        .chat-mejor-candidato-btn:disabled { cursor: not-allowed; opacity: 0.65; }

        
        @keyframes verCandidatoEstela {
          0%   { box-shadow: 0 0 0 0 ${t.accentGlow}; }
          70%  { box-shadow: 0 0 0 10px transparent; }
          100% { box-shadow: 0 0 0 0 transparent; }
        }
        .ver-candidato-btn {
          transition: transform 0.15s ease, box-shadow 0.15s ease, filter 0.15s ease;
          animation: verCandidatoEstela 1.3s ease-out 2;
        }
        .ver-candidato-btn:hover:not(:disabled) {
          transform: translateY(-1px) scale(1.03);
          box-shadow: 0 6px 16px ${t.accentGlow};
          filter: brightness(1.05);
        }
        .ver-candidato-btn:active:not(:disabled) { transform: scale(0.95); }

        
        .chatbot-panel {
          box-sizing: border-box;
          position: fixed;
          bottom: 88px;
          right: 24px;
          width: 380px;
          max-width: calc(100vw - 32px);
          height: 580px;
          max-height: calc(100vh - 120px);
        }
        .chatbot-panel * { box-sizing: border-box; }

        @media (max-width: 480px) {
          .chat-fab { bottom: 16px; right: 16px; }
          .chatbot-panel {
            left: 12px;
            right: 12px;
            bottom: 80px;
            width: auto;
            max-width: none;
            height: calc(100vh - 104px);
            max-height: none;
            border-radius: 16px;
          }
          
          .chat-input { font-size: 16px !important; }
        }
      `}</style>

      
      <button className="chat-fab" onClick={() => setOpen(prev => !prev)} title={open ? "Cerrar chat" : "Abrir asistente"} style={{
      width: "52px",
      height: "52px",
      borderRadius: "50%",
      background: t.gradient,
      border: "none",
      cursor: "pointer",
      zIndex: 50,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#fff",
      boxShadow: `0 8px 24px ${t.accentGlow}, 0 2px 8px rgba(0,0,0,0.18)`,
      animation: !open ? "fabPulse 3s ease-in-out infinite" : "none"
    }}>
        <span style={{
        display: "inline-flex",
        transition: "transform 0.35s cubic-bezier(0.4,0,0.2,1)",
        transform: open ? "rotate(225deg)" : "rotate(0deg)"
      }}>
          {open ? <CloseIcon size={18} /> : <ChatIcon size={22} />}
        </span>
      </button>

      
      {panelVisible && <div className="chatbot-panel" style={{
      background: t.bgSurface,
      border: `1px solid ${t.border}`,
      borderRadius: "20px",
      boxShadow: `0 20px 60px rgba(0,0,0,0.22), 0 0 0 1px ${t.accentBorder}`,
      display: "flex",
      flexDirection: "column",
      zIndex: 50,
      overflow: "hidden",
      transformOrigin: "bottom right",
      pointerEvents: isClosing ? "none" : "auto",
      animation: isClosing ? "chatSlideOut 0.22s cubic-bezier(0.4,0,1,1) forwards" : "chatSlideIn 0.25s cubic-bezier(0.22,1,0.36,1)"
    }}>

          
          <div style={{
        background: t.gradient,
        padding: "16px 18px",
        display: "flex",
        alignItems: "center",
        gap: "12px",
        flexShrink: 0,
        position: "relative",
        overflow: "hidden"
      }}>
            <div style={{
          position: "absolute",
          top: "-30px",
          right: "-20px",
          width: "100px",
          height: "100px",
          borderRadius: "50%",
          background: "rgba(255,255,255,0.08)",
          pointerEvents: "none"
        }} />

            <div style={{
          width: "38px",
          height: "38px",
          borderRadius: "12px",
          background: "rgba(255,255,255,0.18)",
          border: "1px solid rgba(255,255,255,0.28)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0
        }}>
              <BotIcon size={20} color="#fff" />
            </div>

            <div style={{
          flex: 1,
          minWidth: 0
        }}>
              <h2 style={{
            margin: 0,
            fontSize: "14px",
            fontWeight: 700,
            color: "#fff",
            lineHeight: 1.2
          }}>
                Asistente InclusiveJob
              </h2>
              <p style={{
            margin: "3px 0 0",
            fontSize: "11.5px",
            color: "rgba(255,255,255,0.78)",
            display: "flex",
            alignItems: "center",
            gap: "5px"
          }}>
                <span style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: cargandoRespuesta ? "#fbbf24" : "#34d399",
              display: "inline-block",
              boxShadow: cargandoRespuesta ? "0 0 6px #fbbf24" : "0 0 6px #34d399"
            }} />
                {cargandoRespuesta ? "Escribiendo..." : "En línea"}
              </p>
            </div>

            <button className="chat-close-btn" onClick={() => setOpen(false)} aria-label="Cerrar chat" style={{
          width: "30px",
          height: "30px",
          borderRadius: "8px",
          background: "rgba(255,255,255,0.14)",
          border: "1px solid rgba(255,255,255,0.22)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          color: "#fff",
          flexShrink: 0,
          transition: "background 0.15s, transform 0.2s ease",
          position: "relative",
          zIndex: 1
        }}>
              <CloseIcon size={14} />
            </button>
          </div>

          
          <div ref={scrollRef} style={{
        flex: 1,
        overflowY: "auto",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        background: t.bgElevated,
        scrollbarWidth: "thin",
        scrollbarColor: `${t.border} transparent`
      }}>
            {mensajes.map((msg, i) => <Burbuja key={i} msg={msg} onVerCandidato={irACandidatoRecomendado} onElegirVacante={elegirVacanteParaAnalizar} seleccionDeshabilitada={cargandoRespuesta} onSolicitarEntrevista={solicitarEntrevistaCandidato} solicitandoEntrevistaId={solicitandoEntrevistaId} />)}

            
            {esInicio && !cargandoRespuesta && <div style={{
          display: "flex",
          flexDirection: "column",
          gap: "6px",
          paddingLeft: "36px",
          marginTop: "4px"
        }}>
                {SUGERENCIAS.map((s, idx) => <button key={s} className="sugerencia-btn" onClick={() => enviar(s)} style={{
            textAlign: "left",
            fontSize: "12px",
            padding: "8px 12px",
            borderRadius: "10px",
            cursor: "pointer",
            border: `1px solid ${t.border}`,
            background: t.bgSurface,
            color: t.textSecondary,
            fontWeight: 500,
            lineHeight: 1.4,
            transition: "all 0.15s ease",
            animation: "msgIn 0.3s ease both",
            animationDelay: `${0.15 + idx * 0.06}s`
          }}>
                    {s}
                  </button>)}
              </div>}

            
            {cargandoRespuesta && <div style={{
          display: "flex",
          alignItems: "flex-end",
          gap: "8px"
        }}>
                <div style={{
            width: "28px",
            height: "28px",
            borderRadius: "50%",
            flexShrink: 0,
            background: t.accentSoft,
            border: `1px solid ${t.accentBorder}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
                  <BotIcon size={14} color={t.accent} />
                </div>
                <div style={{
            padding: "10px 14px",
            borderRadius: "18px 18px 18px 4px",
            background: t.bgSurface,
            border: `1px solid ${t.border}`,
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)"
          }}>
                  <TypingDots />
                </div>
              </div>}
          </div>

          
          <div style={{
        padding: "0 14px 10px",
        flexShrink: 0
      }}>
            <button className="chat-mejor-candidato-btn" onClick={() => iniciarBusquedaMejorCandidato("Buscar a mi mejor candidato")} disabled={cargandoRespuesta} style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "6px",
          fontSize: "12.5px",
          fontWeight: 600,
          color: t.accent,
          background: t.accentSoft,
          border: `1px solid ${t.accentBorder}`,
          borderRadius: "10px",
          padding: "8px 12px",
          cursor: cargandoRespuesta ? "not-allowed" : "pointer",
          transition: "filter 0.15s ease"
        }}>
              <SparkleIcon size={13} color={t.accent} />
              {loadingRecomendacion ? "Analizando candidatos..." : "Buscar a mi mejor candidato"}
            </button>
          </div>

          
          <div style={{
        padding: "12px 14px",
        borderTop: `1px solid ${t.border}`,
        background: t.bgSurface,
        display: "flex",
        gap: "8px",
        alignItems: "center",
        flexShrink: 0
      }}>
            <input ref={inputRef} className="chat-input" type="text" placeholder="Escribe un mensaje..." value={mensaje} disabled={cargandoRespuesta} onChange={e => setMensaje(e.target.value)} onKeyDown={e => e.key === "Enter" && !e.shiftKey && enviar(mensaje)} style={{
          flex: 1,
          padding: "10px 14px",
          borderRadius: "12px",
          border: `1px solid ${t.border}`,
          background: t.bgElevated,
          color: t.textPrimary,
          transition: "border-color 0.15s, box-shadow 0.15s"
        }} />
            <button className="chat-send-btn" onClick={() => enviar(mensaje)} disabled={cargandoRespuesta || !mensaje.trim()} style={{
          width: "38px",
          height: "38px",
          borderRadius: "10px",
          border: "none",
          cursor: cargandoRespuesta || !mensaje.trim() ? "not-allowed" : "pointer",
          background: cargandoRespuesta || !mensaje.trim() ? t.border : t.gradient,
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          transition: "all 0.15s ease",
          boxShadow: !cargandoRespuesta && mensaje.trim() ? `0 4px 12px ${t.accentGlow}` : "none"
        }} onMouseEnter={e => {
          if (!cargandoRespuesta && mensaje.trim()) e.currentTarget.style.transform = "scale(1.06)";
        }} onMouseLeave={e => {
          e.currentTarget.style.transform = "scale(1)";
        }}>
              <SendIcon size={15} />
            </button>
          </div>

          
          <div style={{
        padding: "6px 14px 8px",
        textAlign: "center",
        fontSize: "10.5px",
        color: t.textMuted,
        background: t.bgSurface,
        borderTop: `1px solid ${t.border}`,
        flexShrink: 0
      }}>
            InclusiveJob IA · Respuestas generadas por IA
          </div>
        </div>}
    </>;
}
