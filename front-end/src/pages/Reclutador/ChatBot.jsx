import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useNavigate } from "react-router-dom";
import { useReclutadorChat, useReclutadorChatHistorial, useMejorCandidatoReclutador, useVacantesReclutador, useSolicitarEntrevistaReclutador } from "../../hooks/Reclutador/useDomain.js";
import { reclutadorTheme as t } from "../../components/Portal/portalTheme";
import ChatbotUI from "../../components/chat/ChatbotUI.jsx";
const RUTA_CANDIDATOS = "/reclutador/candidatos";
const PATRON_MEJOR_CANDIDATO = /mejor\s+candidat|mejor\s+postulante|candidat[oa]\s+ideal|recomi[eé]ndame.*candidat|qui[eé]n.*(mejor|ideal).*postul/i;
const SUGERENCIAS = ["¿Cuáles son los mejores postulantes para mi vacante activa?", "¿Cómo filtro candidatos por habilidades o discapacidad?", "¿Cómo publico una nueva vacante?", "¿Cómo reviso los reportes de mis vacantes?"];
const MENSAJE_BIENVENIDA = {
  tipo: "bot",
  texto: "👋 ¡Hola! Soy el asistente de Inclusive Job.\n\nPuedo ayudarte a:\n• Encontrar los mejores postulantes para tus vacantes\n• Resolver dudas sobre el uso del sistema\n• Orientarte en procesos de reclutamiento\n\n¿En qué te ayudo hoy?"
};
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
    if (["entrevista_completada", "entrevista_simulada", "simular_entrevista"].includes(row.resultado)) return;
    if (row.mensaje_usuario) {
      mapeados.push({
        tipo: "usuario",
        texto: row.mensaje_usuario
      });
    }
    if (row.respuesta_ia) {
      const payload = parseRespuestaIA(row.respuesta_ia);
      if (row.resultado === "entrevista_real_completada" && payload?.evaluacion && payload?.candidato) {
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
    cargarHistorial,
    error: historialError
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
  const [solicitandoEntrevistaId, setSolicitandoEntrevistaId] = useState(null);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const vacantesActivas = useMemo(() => {
    const lista = vacantesData?.data ?? [];
    return lista.filter(v => v.estado === "activa");
  }, [vacantesData]);
  const cargandoRespuesta = loading || loadingRecomendacion;
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
  const normalizedMessages = mensajes.map((message, index) => ({
    id: `recruiter-${index}`,
    role: message.tipo === "usuario" ? "user" : "assistant",
    content: message.texto ?? "",
    error: message.error,
    data: message
  }));
  const renderMessageContent = message => {
    const data = message.data;
    return <>
      {data.recomendacion && <TarjetaRecomendacion recomendacion={data.recomendacion} onVerCandidato={irACandidatoRecomendado} onSolicitarEntrevista={solicitarEntrevistaCandidato} solicitandoId={solicitandoEntrevistaId} />}
      {data.vacantesParaElegir && <TarjetaSeleccionVacante vacantes={data.vacantesParaElegir} onElegir={elegirVacanteParaAnalizar} disabled={cargandoRespuesta} />}
      {data.entrevistaCompletada && <TarjetaEntrevistaCompletada info={data.entrevistaCompletada} onVerCandidato={irACandidatoRecomendado} />}
    </>;
  };
  const suggestionsVisible = (esInicio || suggestionsOpen) && !cargandoRespuesta;
  const suggestions = suggestionsVisible ? <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "4px" }}>
    {SUGERENCIAS.map((suggestion, index) => <button key={suggestion} type="button" onClick={() => {
      setSuggestionsOpen(false);
      enviar(suggestion);
    }} style={{ textAlign: "left", fontSize: "12px", padding: "8px 12px", borderRadius: "10px", cursor: "pointer", border: `1px solid ${t.border}`, background: t.bgSurface, color: t.textSecondary, fontWeight: 500, lineHeight: 1.4, transition: "all 0.15s ease", animation: "chatbotMessageIn 0.3s ease both", animationDelay: `${0.15 + index * 0.06}s` }}>{suggestion}</button>)}
  </div> : null;
  const action = <div style={{ display: "grid", gap: "6px" }}>
    {!esInicio && <button type="button" onClick={() => setSuggestionsOpen(value => !value)} disabled={cargandoRespuesta} style={{ width: "100%", padding: "8px 12px", borderRadius: "10px", border: `1px solid ${t.border}`, background: t.bgSurface, color: t.accent, fontSize: "12px", fontWeight: 600, cursor: cargandoRespuesta ? "not-allowed" : "pointer", opacity: cargandoRespuesta ? 0.65 : 1 }}>{suggestionsOpen ? "Ocultar preguntas" : "Mostrar preguntas"}</button>}
    <button type="button" onClick={() => iniciarBusquedaMejorCandidato("Buscar a mi mejor candidato")} disabled={cargandoRespuesta} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", fontSize: "12.5px", fontWeight: 600, color: t.accent, background: t.accentSoft, border: `1px solid ${t.accentBorder}`, borderRadius: "10px", padding: "8px 12px", cursor: cargandoRespuesta ? "not-allowed" : "pointer", transition: "filter 0.15s ease", opacity: cargandoRespuesta ? 0.65 : 1 }}>
      <SparkleIcon size={13} color={t.accent} />
      {loadingRecomendacion ? "Analizando candidatos..." : "Buscar a mi mejor candidato"}
    </button>
  </div>;

  return <ChatbotUI
    theme="reclutador"
    title="Asistente InclusiveJob"
    subtitle="En línea"
    open={open}
    onOpenChange={nextOpen => setOpen(nextOpen)}
    messages={normalizedMessages}
    value={mensaje}
    onChange={setMensaje}
    onSend={() => enviar(mensaje)}
    loading={cargandoRespuesta}
    historyError={historialError}
    actions={action}
    emptyContent={suggestions}
    renderMessageContent={renderMessageContent}
  />;
}
