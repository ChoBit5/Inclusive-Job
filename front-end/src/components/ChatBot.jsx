import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAnalisisCvIA, usePostulanteChat, usePostulanteChatHistorial, useRecomendacionVacantesIA, usePostulacionesEntrevistaIA } from "../hooks/Postulante/useDomain.js";
import EntrevistaModal from "./modal_entrevista";
import EntrevistaRealModal from "./modal_entrevista_real";
const COLORS = {
  primary: "#2563eb",
  primaryDark: "#1e40af",
  accent: "#7c3aed",
  cyan: "#06b6d4",
  ink: "#0f172a",
  muted: "#64748b",
  bg: "#eef6ff",
  surface: "#ffffff",
  border: "#dbe7ff",
  gradient: "linear-gradient(135deg, #1e40af 0%, #2563eb 42%, #7c3aed 72%, #06b6d4 100%)",
  softGradient: "linear-gradient(180deg, #ffffff 0%, #f8fbff 58%, #eef6ff 100%)"
};
const DEFAULT_MESSAGES = [{
  sender: "bot",
  text: "Hola, soy el Asistente InclusiveJob. Puedo ayudarte a encontrar vacantes, revisar tu CV o practicar una entrevista."
}];
function cleanAiText(value) {
  return String(value ?? "").replace(/\[INSERTAR % O NUMERO\]/gi, "[PORCENTAJE O METRICA]").replace(/\[INSERTAR % O NÚMERO\]/gi, "[PORCENTAJE O METRICA]").replace(/\[INSERTAR %\]/gi, "[PORCENTAJE O METRICA]").replace(/\[INSERTAR NUMERO\]/gi, "[PORCENTAJE O METRICA]").replace(/\[INSERTAR NÚMERO\]/gi, "[PORCENTAJE O METRICA]").replace(/\[INSERTAR\]/gi, "[PORCENTAJE O METRICA]");
}
function ChatIcon() {
  return <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>;
}
function CloseIcon({
  size = 28
}) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>;
}
function SendIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m22 2-7 20-4-9-9-4Z" />
    </svg>;
}
function MicBadgeIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10v1a7 7 0 0 0 14 0v-1" />
      <path d="M12 18v4M8 22h8" />
    </svg>;
}
function formatVacantesRecomendadas(recomendaciones = []) {
  if (!recomendaciones.length) {
    return "No encontre vacantes nuevas para recomendarte por ahora. Revisa que tu perfil y discapacidades esten completos.";
  }
  return "Estas son mis recomendaciones para ti. Puedes abrir cualquiera para ver el detalle completo.";
}
function formatPostulacionesEntrevista(postulaciones = []) {
  if (!postulaciones.length) {
    return "Aun no tienes postulaciones activas. Postulate a una vacante para poder simular una entrevista sobre ella.";
  }
  return "Elige la vacante a la que te postulaste para simular una entrevista sobre ella.";
}
function formatCvAnalysis(analisis) {
  if (!analisis) {
    return "No pude generar recomendaciones para tu CV en este momento.";
  }
  const score = analisis.diagnostico_ats?.puntuacion;
  const lines = [];
  if (score) lines.push(`Puntuacion ATS estimada: ${score}/10.`);
  lines.push(cleanAiText(analisis.resumen_chat ?? "Revise tu CV y encontre mejoras importantes."));
  if (analisis.nota) {
    lines.push("", cleanAiText(analisis.nota));
  }
  lines.push("", "Analisis generado con IA; puede equivocarse.");
  lines.push("", "Para una mejor lectura ve a la pestaña de certificaciones");
  return lines.filter(line => line !== undefined && line !== null).join("\n");
}
function parseStoredPayload(value) {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}
function mapHistoryToMessages(rows = []) {
  if (!rows.length) return DEFAULT_MESSAGES;
  const mapped = [];
  rows.forEach(row => {
    if (row.mensaje_usuario) {
      mapped.push({
        sender: "user",
        text: row.mensaje_usuario
      });
    }
    const payload = parseStoredPayload(row.respuesta_ia);
    if (row.resultado === "recomendar_vacantes" && payload?.recomendaciones) {
      mapped.push({
        sender: "bot",
        type: "recommendations",
        text: payload.text || formatVacantesRecomendadas(payload.recomendaciones),
        recomendaciones: payload.recomendaciones
      });
      return;
    }
    if (row.resultado === "analizar_cv" && payload?.analisis) {
      mapped.push({
        sender: "bot",
        type: "cv-analysis",
        text: payload.text ? cleanAiText(payload.text) : formatCvAnalysis(payload.analisis),
        analisis: payload.analisis
      });
      return;
    }
    if (row.resultado === "simular_entrevista" && payload?.evaluacion) {
      mapped.push({
        sender: "bot",
        type: "entrevista-resultado",
        text: payload.text || "Evaluacion de tu entrevista simulada lista.",
        evaluacion: payload.evaluacion
      });
      return;
    }
    if (row.resultado === "entrevista_real_realizada" && payload?.evaluacion) {
      mapped.push({
        sender: "bot",
        type: "entrevista-resultado",
        text: payload.text || "Evaluacion de tu entrevista lista.",
        evaluacion: payload.evaluacion
      });
      return;
    }
    if (row.resultado === "entrevista_solicitada" && payload?.vacante) {
      mapped.push({
        sender: "bot",
        type: "entrevista-solicitada",
        text: payload.text || `Un reclutador te invito a una entrevista simulada para "${payload.vacante.titulo_puesto}".`,
        vacante: payload.vacante
      });
      return;
    }
    if (row.resultado === "entrevista_real_solicitada" && payload?.vacante) {
      mapped.push({
        sender: "bot",
        type: "entrevista-real-solicitada",
        text: payload.text || `Un reclutador te invito a una entrevista para "${payload.vacante.titulo_puesto}".`,
        vacante: payload.vacante
      });
      return;
    }
    if (row.respuesta_ia) {
      mapped.push({
        sender: "bot",
        text: payload?.text || row.respuesta_ia
      });
    }
  });
  return mapped.length ? mapped : DEFAULT_MESSAGES;
}
function getVacanteId(item) {
  return Number(item?.id_vacante ?? item?.vacante?.id_vacante ?? 0);
}
function RecommendationCards({
  recomendaciones = [],
  onOpenVacante
}) {
  if (!recomendaciones.length) return null;
  return <div style={styles.recommendationsList}>
      {recomendaciones.map(item => {
      const vacante = item.vacante ?? {};
      const idVacante = getVacanteId(item);
      return <div key={idVacante || vacante.titulo_puesto} style={styles.recommendationCard}>
            <div style={styles.recommendationTop}>
              <span style={styles.recommendationBadge}>
                {item.compatibilidad ?? 0}% compatible
              </span>
              <span style={styles.recommendationMode}>
                {vacante.modalidad ?? "Modalidad"}
              </span>
            </div>

            <strong style={styles.recommendationTitle}>
              {vacante.titulo_puesto ?? "Vacante"}
            </strong>
            <span style={styles.recommendationCompany}>
              {vacante.empresa ?? "Empresa"}
            </span>
            {item.motivo && <p style={styles.recommendationReason}>{item.motivo}</p>}

            <button type="button" onClick={() => onOpenVacante(item)} disabled={!idVacante} style={{
          ...styles.recommendationButton,
          ...(!idVacante ? styles.recommendationButtonDisabled : {})
        }}>
              Ver vacante
            </button>
          </div>;
    })}
    </div>;
}
function PostulacionesEntrevistaCards({
  postulaciones = [],
  onSimular
}) {
  if (!postulaciones.length) return null;
  return <div style={styles.recommendationsList}>
      {postulaciones.map(item => {
      const vacante = item.vacante ?? {};
      const idVacante = getVacanteId(item);
      return <div key={item.id_postulacion ?? idVacante} style={styles.recommendationCard}>
            <div style={styles.recommendationTop}>
              <span style={styles.recommendationBadge}>
                {item.estado_postulacion ?? "Postulacion"}
              </span>
              <span style={styles.recommendationMode}>
                {vacante.modalidad ?? "Modalidad"}
              </span>
            </div>

            <strong style={styles.recommendationTitle}>
              {vacante.titulo_puesto ?? "Vacante"}
            </strong>
            <span style={styles.recommendationCompany}>
              {vacante.empresa ?? "Empresa"}
            </span>

            <button type="button" onClick={() => onSimular(vacante)} disabled={!idVacante} style={{
          ...styles.recommendationButton,
          ...(!idVacante ? styles.recommendationButtonDisabled : {})
        }}>
              Simular entrevista
            </button>
          </div>;
    })}
    </div>;
}
function EntrevistaSolicitadaCard({
  vacante,
  onIniciar
}) {
  const idVacante = getVacanteId({
    vacante
  });
  return <div style={styles.entrevistaSolicitadaCard}>
      <div style={styles.entrevistaSolicitadaTop}>
        <span style={styles.entrevistaSolicitadaBadge}>
          <MicBadgeIcon /> Entrevista simulada
        </span>
      </div>
      <strong style={styles.recommendationTitle}>
        {vacante?.titulo_puesto ?? "Vacante"}
      </strong>
      {vacante?.empresa && <span style={styles.recommendationCompany}>{vacante.empresa}</span>}
      <button type="button" onClick={() => onIniciar(vacante)} disabled={!idVacante} style={{
      ...styles.recommendationButton,
      ...(!idVacante ? styles.recommendationButtonDisabled : {})
    }}>
        Iniciar entrevista
      </button>
    </div>;
}
function EntrevistaRealSolicitadaCard({
  vacante,
  onIniciar
}) {
  const idVacante = getVacanteId({
    vacante
  });
  return <div style={styles.entrevistaRealCard}>
      <div style={styles.entrevistaSolicitadaTop}>
        <span style={styles.entrevistaRealBadge}>
          <MicBadgeIcon /> Entrevista real
        </span>
      </div>
      <strong style={styles.recommendationTitle}>
        {vacante?.titulo_puesto ?? "Vacante"}
      </strong>
      {vacante?.empresa && <span style={styles.recommendationCompany}>{vacante.empresa}</span>}
      <button type="button" onClick={() => onIniciar(vacante)} disabled={!idVacante} style={{
      ...styles.recommendationButton,
      ...(!idVacante ? styles.recommendationButtonDisabled : {})
    }}>
        Iniciar entrevista
      </button>
    </div>;
}
export default function ChatBubble() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(DEFAULT_MESSAGES);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [entrevista, setEntrevista] = useState({
    open: false,
    vacante: null
  });
  const [entrevistaReal, setEntrevistaReal] = useState({
    open: false,
    vacante: null
  });
  const {
    enviarMensaje,
    loading: sendingMessage
  } = usePostulanteChat();
  const {
    cargarHistorial
  } = usePostulanteChatHistorial();
  const {
    recomendarVacantes,
    loading: recommendingVacantes
  } = useRecomendacionVacantesIA();
  const {
    analizarCV,
    loading: reviewingCv
  } = useAnalisisCvIA();
  const {
    listarPostulaciones,
    loading: loadingPostulaciones
  } = usePostulacionesEntrevistaIA();
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const openRef = useRef(open);
  const quickActionsRef = useRef(null);
  const quickDragRef = useRef({
    active: false,
    startX: 0,
    scrollLeft: 0,
    moved: false
  });
  useEffect(() => {
    openRef.current = open;
  }, [open]);
  useEffect(() => {
    let active = true;
    cargarHistorial().then(rows => {
      if (!active || !rows?.length) return;
      const mensajesMapeados = mapHistoryToMessages(rows);
      setMessages(mensajesMapeados);
      const ultimaFila = rows[rows.length - 1];
      if ((ultimaFila?.resultado === "entrevista_solicitada" || ultimaFila?.resultado === "entrevista_real_solicitada") && !openRef.current) {
        setHasUnread(true);
      }
    }).catch(() => {});
    return () => {
      active = false;
    };
  }, [cargarHistorial]);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth"
    });
  }, [messages, typing]);
  function toggleOpen() {
    setOpen(prev => {
      const next = !prev;
      if (next) setHasUnread(false);
      return next;
    });
  }
  async function handleSend() {
    const text = input.trim();
    if (!text || typing || sendingMessage) return;
    setMessages(prev => [...prev, {
      sender: "user",
      text
    }]);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setTyping(true);
    try {
      const reply = await enviarMensaje(text);
      setMessages(prev => [...prev, {
        sender: "bot",
        text: reply
      }]);
      if (!openRef.current) setHasUnread(true);
    } catch {
      setMessages(prev => [...prev, {
        sender: "bot",
        text: "Ocurrio un error, intenta de nuevo."
      }]);
    } finally {
      setTyping(false);
    }
  }
  async function handleRecommendVacantes() {
    if (typing || sendingMessage || recommendingVacantes) return;
    setMessages(prev => [...prev, {
      sender: "user",
      text: "Recomiendame vacantes"
    }]);
    setTyping(true);
    try {
      const data = await recomendarVacantes();
      const recomendaciones = data.recomendaciones ?? [];
      setMessages(prev => [...prev, {
        sender: "bot",
        type: "recommendations",
        text: formatVacantesRecomendadas(recomendaciones),
        recomendaciones
      }]);
      if (!openRef.current) setHasUnread(true);
    } catch {
      setMessages(prev => [...prev, {
        sender: "bot",
        text: "No pude generar recomendaciones ahora. Intenta de nuevo en un momento."
      }]);
    } finally {
      setTyping(false);
    }
  }
  async function handleReviewCv() {
    if (typing || sendingMessage || recommendingVacantes || reviewingCv) return;
    setMessages(prev => [...prev, {
      sender: "user",
      text: "Revisar mi CV con IA"
    }]);
    setTyping(true);
    try {
      const data = await analizarCV();
      const text = data.chat_resumen ? cleanAiText(data.chat_resumen) : formatCvAnalysis(data.analisis);
      setMessages(prev => [...prev, {
        sender: "bot",
        type: "cv-analysis",
        text,
        analisis: data.analisis
      }]);
      if (!openRef.current) setHasUnread(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "No pude revisar tu CV ahora. Intenta de nuevo en un momento.";
      setMessages(prev => [...prev, {
        sender: "bot",
        text: message
      }]);
    } finally {
      setTyping(false);
    }
  }
  async function handleSimularEntrevista() {
    if (typing || sendingMessage || recommendingVacantes || reviewingCv || loadingPostulaciones) return;
    setMessages(prev => [...prev, {
      sender: "user",
      text: "Simular entrevista"
    }]);
    setTyping(true);
    try {
      const postulaciones = await listarPostulaciones();
      setMessages(prev => [...prev, {
        sender: "bot",
        type: "postulaciones-entrevista",
        text: formatPostulacionesEntrevista(postulaciones),
        postulaciones
      }]);
      if (!openRef.current) setHasUnread(true);
    } catch {
      setMessages(prev => [...prev, {
        sender: "bot",
        text: "No pude cargar tus postulaciones ahora. Intenta de nuevo en un momento."
      }]);
    } finally {
      setTyping(false);
    }
  }
  async function handleAppHelp() {
    if (typing || sendingMessage || recommendingVacantes || reviewingCv) return;
    const pregunta = "Tengo dudas sobre cómo funciona la aplicación InclusiveJob.";
    setMessages(prev => [...prev, {
      sender: "user",
      text: "Dudas sobre la aplicación"
    }]);
    setTyping(true);
    try {
      const reply = await enviarMensaje(pregunta);
      setMessages(prev => [...prev, {
        sender: "bot",
        text: reply
      }]);
      if (!openRef.current) setHasUnread(true);
    } catch {
      setMessages(prev => [...prev, {
        sender: "bot",
        text: "No pude responder en este momento."
      }]);
    } finally {
      setTyping(false);
    }
  }
  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }
  function handleInputChange(e) {
    setInput(e.target.value);
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 90) + "px";
    }
  }
  function handleQuickPointerDown(e) {
    const el = quickActionsRef.current;
    if (!el) return;
    if (e.target.closest("button")) return;
    quickDragRef.current = {
      active: true,
      startX: e.clientX,
      scrollLeft: el.scrollLeft,
      moved: false
    };
    el.setPointerCapture?.(e.pointerId);
    el.style.cursor = "grabbing";
  }
  function handleQuickPointerMove(e) {
    const el = quickActionsRef.current;
    const drag = quickDragRef.current;
    if (!el || !drag.active) return;
    e.preventDefault();
    const delta = e.clientX - drag.startX;
    if (Math.abs(delta) > 5) {
      drag.moved = true;
    }
    el.scrollLeft = drag.scrollLeft - delta;
  }
  function handleQuickPointerEnd(e) {
    const el = quickActionsRef.current;
    quickDragRef.current.active = false;
    if (!el) return;
    el.releasePointerCapture?.(e.pointerId);
    el.style.cursor = "grab";
  }
  function handleQuickWheel(e) {
    const el = quickActionsRef.current;
    if (!el) return;
    const canScroll = el.scrollWidth > el.clientWidth;
    if (!canScroll) return;
    el.scrollLeft += e.deltaY || e.deltaX;
  }
  function handleQuickScroll(direction) {
    const el = quickActionsRef.current;
    if (!el) return;
    el.scrollBy({
      left: direction * 170,
      behavior: "smooth"
    });
  }
  function handleOpenVacante(item) {
    const idVacante = getVacanteId(item);
    if (!idVacante) return;
    navigate(`/postulante/vacantes?vacante=${idVacante}`, {
      state: {
        recomendacionIA: item
      }
    });
    setOpen(false);
    setHasUnread(false);
  }
  function handleOpenCertificaciones() {
    navigate("/postulante/certificaciones");
    setOpen(false);
    setHasUnread(false);
  }
  function handleAbrirEntrevista(vacante) {
    if (!vacante?.id_vacante) return;
    setEntrevista({
      open: true,
      vacante
    });
  }
  function handleCerrarEntrevista() {
    setEntrevista({
      open: false,
      vacante: null
    });
  }
  function handleEvaluacionEntrevista(payload) {
    setMessages(prev => [...prev, {
      sender: "bot",
      type: "entrevista-resultado",
      text: cleanAiText(payload.text),
      evaluacion: payload.evaluacion
    }]);
    if (!openRef.current) setHasUnread(true);
  }
  function handleAbrirEntrevistaReal(vacante) {
    if (!vacante?.id_vacante) return;
    setEntrevistaReal({
      open: true,
      vacante
    });
  }
  function handleCerrarEntrevistaReal() {
    setEntrevistaReal({
      open: false,
      vacante: null
    });
  }
  function handleEvaluacionEntrevistaReal(payload) {
    setMessages(prev => [...prev, {
      sender: "bot",
      type: "entrevista-resultado",
      text: cleanAiText(payload.text),
      evaluacion: payload.evaluacion
    }]);
    if (!openRef.current) setHasUnread(true);
  }
  const isSending = typing || sendingMessage || recommendingVacantes || reviewingCv || loadingPostulaciones;
  return <>
      <button type="button" onClick={toggleOpen} aria-label={open ? "Cerrar chat" : "Abrir chat"} style={styles.bubbleBtn}>
        {open ? <CloseIcon /> : <ChatIcon />}
        {hasUnread && !open && <span style={styles.badge}>1</span>}
      </button>

      {open && <div style={styles.window}>
          <div style={styles.header}>
            <div style={styles.headerIdentity}>
              <div style={styles.assistantAvatar}>
                <ChatIcon />
              </div>
              <div>
                <div style={styles.headerTitle}>
                  <span style={styles.statusDot} />
                  Asistente InclusiveJob
                </div>
                <div style={styles.headerSubtitle}>
                  Soporte inteligente para postulantes
                </div>
              </div>
            </div>
            <button type="button" onClick={toggleOpen} aria-label="Cerrar chat" style={styles.closeBtn}>
              <CloseIcon size={18} />
            </button>
          </div>

          <div style={styles.messagesBox}>
            {messages.map((m, i) => <div key={i} style={{
          ...styles.msg,
          ...(m.sender === "user" ? styles.msgUser : styles.msgBot),
          ...(m.type === "recommendations" || m.type === "postulaciones-entrevista" || m.type === "entrevista-solicitada" || m.type === "entrevista-real-solicitada" ? styles.msgRecommendations : {})
        }}>
                {m.text}
                {m.type === "recommendations" && <RecommendationCards recomendaciones={m.recomendaciones} onOpenVacante={handleOpenVacante} />}
                {m.type === "postulaciones-entrevista" && <PostulacionesEntrevistaCards postulaciones={m.postulaciones} onSimular={handleAbrirEntrevista} />}
                {m.type === "entrevista-solicitada" && <EntrevistaSolicitadaCard vacante={m.vacante} onIniciar={handleAbrirEntrevista} />}
                {m.type === "entrevista-real-solicitada" && <EntrevistaRealSolicitadaCard vacante={m.vacante} onIniciar={handleAbrirEntrevistaReal} />}
                {m.type === "cv-analysis" && <button type="button" onClick={handleOpenCertificaciones} style={styles.cvAnalysisButton}>
                    Ver recomendaciones completas
                  </button>}
              </div>)}

            {isSending && <div style={styles.typingRow}>
                <span style={{
            ...styles.dot,
            animationDelay: "0s"
          }} />
                <span style={{
            ...styles.dot,
            animationDelay: "0.15s"
          }} />
                <span style={{
            ...styles.dot,
            animationDelay: "0.3s"
          }} />
              </div>}
            <div ref={messagesEndRef} />
          </div>

          <div style={styles.quickActionsShell}>
            <button type="button" aria-label="Ver preguntas anteriores" className="inclusive-quick-nav" onClick={() => handleQuickScroll(-1)} style={{
          ...styles.quickNavBtn,
          left: 8
        }}>
              ‹
            </button>

            <div ref={quickActionsRef} className="inclusive-quick-actions" style={styles.quickActions} onPointerDown={handleQuickPointerDown} onPointerMove={handleQuickPointerMove} onPointerUp={handleQuickPointerEnd} onPointerCancel={handleQuickPointerEnd} onPointerLeave={handleQuickPointerEnd} onWheel={handleQuickWheel}>
              <button type="button" className="inclusive-quick-action" onClick={handleRecommendVacantes} disabled={isSending} style={{
            ...styles.quickActionBtn,
            ...(isSending ? styles.quickActionBtnDisabled : {})
          }}>
                <span style={styles.quickActionIcon}>✦</span>
                <span>Vacantes</span>
              </button>
              <button type="button" className="inclusive-quick-action" onClick={handleReviewCv} disabled={isSending} style={{
            ...styles.quickActionBtn,
            ...(isSending ? styles.quickActionBtnDisabled : {})
          }}>
                <span style={styles.quickActionIcon}>CV</span>
                <span>Revisar CV</span>
              </button>
              <button type="button" className="inclusive-quick-action" onClick={handleSimularEntrevista} disabled={isSending} style={{
            ...styles.quickActionBtn,
            ...(isSending ? styles.quickActionBtnDisabled : {})
          }}>
                <span style={styles.quickActionIcon}>🎙</span>
                <span>Entrevista</span>
              </button>
              <button type="button" className="inclusive-quick-action" onClick={handleAppHelp} disabled={isSending} style={{
            ...styles.quickActionBtn,
            ...(isSending ? styles.quickActionBtnDisabled : {})
          }}>
                <span style={styles.quickActionIcon}>?</span>
                <span>Ayuda</span>
              </button>
            </div>

            <button type="button" aria-label="Ver más preguntas" className="inclusive-quick-nav" onClick={() => handleQuickScroll(1)} style={{
          ...styles.quickNavBtn,
          right: 8
        }}>
              ›
            </button>
          </div>

          <div style={styles.inputRow}>
            <textarea ref={textareaRef} rows={1} value={input} onChange={handleInputChange} onKeyDown={handleKeyDown} placeholder="Escribe un mensaje..." style={styles.input} />
            <button type="button" onClick={handleSend} disabled={!input.trim() || isSending} aria-label="Enviar mensaje" style={{
          ...styles.sendBtn,
          ...(!input.trim() || isSending ? styles.sendBtnDisabled : {})
        }}>
              <SendIcon />
            </button>
          </div>
        </div>}

      {entrevista.open && entrevista.vacante && <EntrevistaModal vacante={entrevista.vacante} onClose={handleCerrarEntrevista} onEvaluacionLista={handleEvaluacionEntrevista} />}

      {entrevistaReal.open && entrevistaReal.vacante && <EntrevistaRealModal vacante={entrevistaReal.vacante} onClose={handleCerrarEntrevistaReal} onEvaluacionLista={handleEvaluacionEntrevistaReal} />}

      <style>{`
        @keyframes chat-window-in {
          from { opacity: 0; transform: translateY(14px) scale(0.985); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes chat-message-in {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes chat-card-in {
          from { opacity: 0; transform: translateY(6px) scale(0.99); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes chat-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        @keyframes chat-typing-bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
          30% { transform: translateY(-4px); opacity: 1; }
        }
        .inclusive-quick-actions::-webkit-scrollbar { height: 5px; }
        .inclusive-quick-actions::-webkit-scrollbar-track { background: #eff6ff; border-radius: 999px; }
        .inclusive-quick-actions::-webkit-scrollbar-thumb { background: linear-gradient(90deg,#bfdbfe,#c4b5fd); border-radius: 999px; }
        .inclusive-quick-actions { scrollbar-width: thin; scrollbar-color: #bfdbfe #eff6ff; }
        .inclusive-quick-action:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 12px 24px rgba(37,99,235,0.13);
          border-color: #bfdbfe;
        }
        .inclusive-quick-nav:hover {
          transform: translateY(-50%) scale(1.04);
          box-shadow: 0 10px 22px rgba(37,99,235,0.18);
          border-color: #bfdbfe;
        }
      `}</style>
    </>;
}
const styles = {
  bubbleBtn: {
    position: "fixed",
    bottom: 28,
    right: 28,
    width: 62,
    height: 62,
    borderRadius: 20,
    background: COLORS.gradient,
    color: "#fff",
    border: "1px solid rgba(255,255,255,0.32)",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 18px 40px rgba(37, 99, 235, 0.42)",
    zIndex: 999999,
    animation: "chat-float 7s ease-in-out infinite"
  },
  badge: {
    position: "absolute",
    top: -5,
    right: -5,
    background: "linear-gradient(135deg, #ef4444 0%, #f97316 100%)",
    color: "#fff",
    fontSize: 11,
    fontWeight: 600,
    minWidth: 22,
    height: 22,
    borderRadius: 999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0 4px",
    border: "2px solid #fff",
    boxShadow: "0 8px 18px rgba(239,68,68,0.35)"
  },
  window: {
    position: "fixed",
    bottom: 102,
    right: 28,
    width: 400,
    maxWidth: "calc(100vw - 32px)",
    height: 560,
    maxHeight: "calc(100vh - 126px)",
    background: COLORS.surface,
    borderRadius: 28,
    boxShadow: "0 28px 80px rgba(15,23,42,0.28)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    border: "1px solid rgba(219,231,255,0.95)",
    zIndex: 999999,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    animation: "chat-window-in 0.42s cubic-bezier(.22,1,.36,1)"
  },
  header: {
    background: COLORS.gradient,
    color: "#fff",
    padding: "16px 18px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexShrink: 0,
    position: "relative",
    overflow: "hidden"
  },
  headerIdentity: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    position: "relative",
    zIndex: 1
  },
  assistantAvatar: {
    width: 44,
    height: 44,
    borderRadius: 15,
    background: "rgba(255,255,255,0.18)",
    border: "1px solid rgba(255,255,255,0.32)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.24)"
  },
  headerTitle: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    fontWeight: 850,
    fontSize: 16,
    letterSpacing: "-0.2px"
  },
  headerSubtitle: {
    marginTop: 2,
    color: "rgba(255,255,255,0.78)",
    fontSize: 12,
    fontWeight: 600
  },
  statusDot: {
    width: 9,
    height: 9,
    borderRadius: "50%",
    background: "#22c55e",
    boxShadow: "0 0 0 4px rgba(34,197,94,0.18)"
  },
  closeBtn: {
    background: "rgba(255,255,255,0.14)",
    border: "1px solid rgba(255,255,255,0.24)",
    color: "#fff",
    cursor: "pointer",
    opacity: 0.95,
    padding: 7,
    borderRadius: 12,
    display: "flex",
    alignItems: "center",
    position: "relative",
    zIndex: 1
  },
  heroHint: {
    padding: "14px 18px 12px",
    background: "linear-gradient(180deg, #f8fbff 0%, #eef6ff 100%)",
    borderBottom: `1px solid ${COLORS.border}`,
    display: "flex",
    flexDirection: "column",
    gap: 3,
    flexShrink: 0
  },
  heroEyebrow: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: 850,
    textTransform: "uppercase",
    letterSpacing: "0.7px"
  },
  heroTitle: {
    color: COLORS.ink,
    fontSize: 15,
    letterSpacing: "-0.2px"
  },
  heroText: {
    color: COLORS.muted,
    fontSize: 12.5,
    lineHeight: 1.35
  },
  messagesBox: {
    flex: 1,
    overflowY: "auto",
    padding: "18px 18px 16px",
    display: "flex",
    flexDirection: "column",
    gap: 12,
    background: "radial-gradient(circle at top left, rgba(37,99,235,0.10), transparent 34%), linear-gradient(180deg, #f8fbff 0%, #eef6ff 100%)"
  },
  msg: {
    maxWidth: "80%",
    padding: "11px 14px",
    borderRadius: 18,
    fontSize: 14,
    lineHeight: 1.48,
    wordWrap: "break-word",
    whiteSpace: "pre-line",
    animation: "chat-message-in 0.34s cubic-bezier(.22,1,.36,1)"
  },
  msgBot: {
    alignSelf: "flex-start",
    background: "#fff",
    border: `1px solid ${COLORS.border}`,
    borderBottomLeftRadius: 7,
    color: COLORS.ink,
    boxShadow: "0 10px 26px rgba(15,23,42,0.06)"
  },
  msgRecommendations: {
    maxWidth: "96%",
    width: "96%"
  },
  recommendationsList: {
    display: "grid",
    gap: 10,
    marginTop: 12
  },
  recommendationCard: {
    border: "1px solid #bfdbfe",
    borderRadius: 18,
    background: COLORS.softGradient,
    padding: 14,
    boxShadow: "0 14px 32px rgba(37, 99, 235, 0.12)",
    position: "relative",
    overflow: "hidden",
    animation: "chat-card-in 0.42s cubic-bezier(.22,1,.36,1) both"
  },
  recommendationTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 9
  },
  recommendationBadge: {
    display: "inline-flex",
    alignItems: "center",
    borderRadius: 999,
    background: "linear-gradient(135deg, #eef2ff 0%, #e0f2fe 100%)",
    border: "1px solid #bfdbfe",
    color: COLORS.primaryDark,
    fontSize: 11,
    fontWeight: 800,
    padding: "4px 9px",
    whiteSpace: "nowrap"
  },
  recommendationMode: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: 700,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap"
  },
  recommendationTitle: {
    display: "block",
    color: COLORS.ink,
    fontSize: 14,
    lineHeight: 1.3,
    marginBottom: 3
  },
  recommendationCompany: {
    display: "block",
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 8
  },
  recommendationReason: {
    margin: "0 0 11px",
    color: "#475569",
    fontSize: 12.5,
    lineHeight: 1.45
  },
  recommendationButton: {
    width: "100%",
    border: "none",
    borderRadius: 14,
    background: COLORS.gradient,
    color: "#fff",
    padding: "10px 12px",
    fontSize: 12.5,
    fontWeight: 800,
    cursor: "pointer",
    boxShadow: "0 12px 24px rgba(37, 99, 235, 0.24)"
  },
  recommendationButtonDisabled: {
    opacity: 0.55,
    cursor: "not-allowed"
  },
  cvAnalysisButton: {
    width: "100%",
    border: "none",
    borderRadius: 14,
    background: COLORS.gradient,
    color: "#fff",
    padding: "10px 12px",
    fontSize: 12.5,
    fontWeight: 800,
    cursor: "pointer",
    marginTop: 10,
    boxShadow: "0 12px 24px rgba(37, 99, 235, 0.24)"
  },
  entrevistaSolicitadaCard: {
    marginTop: 12,
    border: "1px solid #fde68a",
    borderRadius: 18,
    background: "linear-gradient(180deg, #fffbeb 0%, #fff8e8 100%)",
    padding: 14,
    boxShadow: "0 14px 30px rgba(217, 119, 6, 0.12)"
  },
  entrevistaSolicitadaTop: {
    display: "flex",
    marginBottom: 7
  },
  entrevistaSolicitadaBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    borderRadius: 999,
    background: "#fef3c7",
    border: "1px solid #fcd34d",
    color: "#92400e",
    fontSize: 11,
    fontWeight: 800,
    padding: "4px 10px",
    whiteSpace: "nowrap"
  },
  entrevistaRealCard: {
    marginTop: 12,
    border: "1px solid #bbf7d0",
    borderRadius: 18,
    background: "linear-gradient(180deg, #f0fdf4 0%, #ecfdf5 100%)",
    padding: 14,
    boxShadow: "0 14px 30px rgba(16, 185, 129, 0.12)"
  },
  entrevistaRealBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    borderRadius: 999,
    background: "#d1fae5",
    border: "1px solid #6ee7b7",
    color: "#065f46",
    fontSize: 11,
    fontWeight: 800,
    padding: "4px 10px",
    whiteSpace: "nowrap"
  },
  msgUser: {
    alignSelf: "flex-end",
    background: COLORS.gradient,
    color: "#fff",
    borderBottomRightRadius: 7,
    boxShadow: "0 12px 28px rgba(37,99,235,0.22)"
  },
  typingRow: {
    alignSelf: "flex-start",
    display: "flex",
    gap: 5,
    padding: "11px 15px",
    background: "#fff",
    border: `1px solid ${COLORS.border}`,
    borderRadius: 18,
    borderBottomLeftRadius: 7,
    boxShadow: "0 10px 26px rgba(15,23,42,0.06)"
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: "50%",
    background: COLORS.primary,
    animation: "chat-typing-bounce 1.1s infinite"
  },
  inputRow: {
    display: "flex",
    alignItems: "flex-end",
    gap: 10,
    padding: "12px 14px 14px",
    borderTop: `1px solid ${COLORS.border}`,
    background: "#fff",
    flexShrink: 0
  },
  quickActionsShell: {
    position: "relative",
    background: "#fff",
    borderTop: `1px solid ${COLORS.border}`,
    flexShrink: 0,
    padding: "8px 36px 7px"
  },
  quickActions: {
    display: "flex",
    gap: 9,
    padding: "2px 2px 7px",
    background: "#fff",
    overflowX: "auto",
    overflowY: "hidden",
    overscrollBehaviorX: "contain",
    scrollBehavior: "smooth",
    scrollSnapType: "x proximity",
    WebkitOverflowScrolling: "touch",
    cursor: "grab",
    userSelect: "none",
    touchAction: "pan-x",
    position: "relative",
    maskImage: "linear-gradient(90deg, transparent 0, #000 10px, #000 calc(100% - 10px), transparent 100%)",
    WebkitMaskImage: "linear-gradient(90deg, transparent 0, #000 10px, #000 calc(100% - 10px), transparent 100%)"
  },
  quickNavBtn: {
    position: "absolute",
    top: "44%",
    transform: "translateY(-50%)",
    width: 27,
    height: 31,
    borderRadius: 12,
    border: `1px solid ${COLORS.border}`,
    background: "#f8fbff",
    color: COLORS.primaryDark,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 24,
    lineHeight: 1,
    fontWeight: 900,
    cursor: "pointer",
    boxShadow: "0 8px 18px rgba(15,23,42,0.07)",
    transition: "transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease"
  },
  quickActionBtn: {
    border: `1px solid ${COLORS.border}`,
    background: "#f8fbff",
    color: COLORS.ink,
    borderRadius: 16,
    padding: "10px 11px",
    minWidth: 138,
    fontSize: 12.5,
    fontWeight: 800,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    boxShadow: "0 8px 18px rgba(15,23,42,0.05)",
    transition: "transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease",
    flex: "0 0 auto",
    scrollSnapAlign: "start"
  },
  quickActionIcon: {
    minWidth: 24,
    height: 24,
    borderRadius: 9,
    background: "linear-gradient(135deg, #dbeafe 0%, #ede9fe 100%)",
    color: COLORS.primaryDark,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 11,
    fontWeight: 900
  },
  quickActionBtnDisabled: {
    opacity: 0.55,
    cursor: "not-allowed"
  },
  input: {
    flex: 1,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 18,
    padding: "12px 14px",
    fontSize: 14,
    outline: "none",
    resize: "none",
    fontFamily: "inherit",
    maxHeight: 110,
    background: "#f8fbff",
    color: COLORS.ink,
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8)"
  },
  sendBtn: {
    background: COLORS.gradient,
    border: "none",
    color: "#fff",
    width: 44,
    height: 44,
    borderRadius: 16,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    boxShadow: "0 12px 26px rgba(37,99,235,0.28)"
  },
  sendBtnDisabled: {
    background: "#cbd5e1",
    boxShadow: "none",
    cursor: "not-allowed"
  }
};
