import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAnalisisCvIA, usePostulanteChat, usePostulanteChatHistorial, useRecomendacionVacantesIA, usePostulacionesEntrevistaIA } from "../hooks/Postulante/useDomain.js";
import EntrevistaModal from "./modal_entrevista";
import EntrevistaRealModal from "./modal_entrevista_real";
import ChatbotUI from "./chat/ChatbotUI.jsx";
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
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
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
    cargarHistorial,
    error: historialError
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
  const openRef = useRef(open);
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
  async function handleSend() {
    const text = input.trim();
    if (!text || typing || sendingMessage) return;
    setMessages(prev => [...prev, {
      sender: "user",
      text
    }]);
    setInput("");
    setTyping(true);
    try {
      const reply = await enviarMensaje(text);
      setMessages(prev => [...prev, {
        sender: "bot",
        text: reply
      }]);
      if (!openRef.current) setHasUnread(true);
    } catch {
      setInput(text);
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

  const normalizedMessages = messages.map((message, index) => ({
    id: "applicant-" + index,
    role: message.sender === "user" ? "user" : "assistant",
    content: message.text ?? "",
    data: message
  }));
  const renderMessageContent = message => {
    const data = message.data;
    return <>
      {data.type === "recommendations" && <RecommendationCards recomendaciones={data.recomendaciones} onOpenVacante={handleOpenVacante} />}
      {data.type === "postulaciones-entrevista" && <PostulacionesEntrevistaCards postulaciones={data.postulaciones} onSimular={handleAbrirEntrevista} />}
      {data.type === "entrevista-solicitada" && <EntrevistaSolicitadaCard vacante={data.vacante} onIniciar={handleAbrirEntrevista} />}
      {data.type === "entrevista-real-solicitada" && <EntrevistaRealSolicitadaCard vacante={data.vacante} onIniciar={handleAbrirEntrevistaReal} />}
      {data.type === "cv-analysis" && <button type="button" onClick={handleOpenCertificaciones} style={styles.cvAnalysisButton}>Ver recomendaciones completas</button>}
    </>;
  };
  const suggestionsVisible = (messages.length === 1 || suggestionsOpen) && !isSending;
  const suggestions = suggestionsVisible ? <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "4px" }}>
    {[{
      label: "¿Puedes recomendarme vacantes según mi perfil?",
      action: () => {
        setSuggestionsOpen(false);
        handleRecommendVacantes();
      }
    }, {
      label: "¿Puedes revisar mi CV y darme recomendaciones?",
      action: () => {
        setSuggestionsOpen(false);
        handleReviewCv();
      }
    }, {
      label: "¿Podemos practicar una entrevista para una de mis postulaciones?",
      action: () => {
        setSuggestionsOpen(false);
        handleSimularEntrevista();
      }
    }, {
      label: "¿Cómo puedo usar InclusiveJob?",
      action: () => {
        setSuggestionsOpen(false);
        handleAppHelp();
      }
    }].map((suggestion, index) => <button key={suggestion.label} type="button" onClick={suggestion.action} style={{ textAlign: "left", fontSize: "12px", padding: "8px 12px", borderRadius: "10px", cursor: "pointer", border: `1px solid ${COLORS.border}`, background: COLORS.surface, color: COLORS.muted, fontWeight: 500, lineHeight: 1.4, transition: "all 0.15s ease", animation: "chatbotMessageIn 0.3s ease both", animationDelay: `${0.15 + index * 0.06}s` }}>{suggestion.label}</button>)}
  </div> : null;
  const suggestionsToggle = messages.length > 1 ? <button type="button" onClick={() => setSuggestionsOpen(value => !value)} disabled={isSending} style={{ width: "100%", padding: "8px 12px", borderRadius: "10px", border: `1px solid ${COLORS.border}`, background: COLORS.surface, color: COLORS.primaryDark, fontSize: "12px", fontWeight: 600, cursor: isSending ? "not-allowed" : "pointer", opacity: isSending ? 0.65 : 1 }}>{suggestionsOpen ? "Ocultar preguntas" : "Mostrar preguntas"}</button> : null;
  function handleOpenChange(nextOpen) {
    setOpen(nextOpen);
    if (nextOpen) setHasUnread(false);
  }
  return <>
    <ChatbotUI
      theme="postulante"
      title="Asistente InclusiveJob"
      subtitle="Soporte inteligente para postulantes"
      open={open}
      onOpenChange={handleOpenChange}
      messages={normalizedMessages}
      value={input}
      onChange={setInput}
      onSend={handleSend}
      loading={isSending}
      historyError={historialError}
      unread={hasUnread}
      actions={suggestionsToggle}
      emptyContent={suggestions}
      renderMessageContent={renderMessageContent}
    />
    {entrevista.open && entrevista.vacante && <EntrevistaModal vacante={entrevista.vacante} onClose={handleCerrarEntrevista} onEvaluacionLista={handleEvaluacionEntrevista} />}
    {entrevistaReal.open && entrevistaReal.vacante && <EntrevistaRealModal vacante={entrevistaReal.vacante} onClose={handleCerrarEntrevistaReal} onEvaluacionLista={handleEvaluacionEntrevistaReal} />}
  </>;
}

const styles = {
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
    animation: "chatbotMessageIn 0.28s ease both"
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
};
