import { useEffect, useId, useRef, useState } from "react";
import { useEntrevistaIA } from "../hooks/Postulante/useDomain.js";
import { useFocusTrap } from "./useFocusTrap.js";
const COLORS = {
  primary: "#2563eb",
  primaryDark: "#1e40af",
  accent: "#7c3aed",
  bg: "#eef6ff",
  border: "#dbe7ff",
  gradient: "linear-gradient(135deg, #1e40af 0%, #2563eb 42%, #7c3aed 72%, #06b6d4 100%)"
};
function CloseIcon({
  size = 20
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
export default function EntrevistaModal({
  vacante,
  onClose,
  onEvaluacionLista
}) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [starting, setStarting] = useState(true);
  const [evaluacion, setEvaluacion] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const {
    iniciarEntrevista,
    responderEntrevista,
    finalizarEntrevista,
    loading
  } = useEntrevistaIA();
  const messagesEndRef = useRef(null);
  const startedRef = useRef(false);
  const requestLockRef = useRef(false);
  const dialogRef = useRef(null);
  const titleId = useId();
  const inputId = useId();
  const statusId = useId();

  useFocusTrap({ open: true, containerRef: dialogRef, onClose });
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    (async () => {
      try {
        const data = await iniciarEntrevista(vacante.id_vacante);
        setMessages([{
          sender: "bot",
          text: data.mensaje
        }]);
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : "No se pudo iniciar la entrevista.");
      } finally {
        setStarting(false);
      }
    })();
  }, [iniciarEntrevista, vacante.id_vacante]);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth"
    });
  }, [messages, loading]);
  function buildHistorial() {
    return messages.map(m => ({
      role: m.sender === "user" ? "user" : "assistant",
      content: m.text
    }));
  }
  async function handleSend() {
    const texto = input.trim();
    if (!texto || loading || requestLockRef.current || evaluacion) return;
    const historial = buildHistorial();
    requestLockRef.current = true;
    setMessages(prev => [...prev, {
      sender: "user",
      text: texto
    }]);
    setInput("");
    setErrorMsg("");
    try {
      const data = await responderEntrevista(vacante.id_vacante, historial, texto);
      setMessages(prev => [...prev, {
        sender: "bot",
        text: data.mensaje
      }]);
    } catch (err) {
      setMessages(prev => {
        const last = prev[prev.length - 1];
        return last?.sender === "user" && last.text === texto ? prev.slice(0, -1) : prev;
      });
      setInput(texto);
      setErrorMsg(err instanceof Error ? err.message : "No se pudo continuar la entrevista.");
    } finally {
      requestLockRef.current = false;
    }
  }
  async function handleFinalizar() {
    if (loading || requestLockRef.current || evaluacion) return;
    requestLockRef.current = true;
    setErrorMsg("");
    try {
      const historial = buildHistorial();
      const data = await finalizarEntrevista(vacante.id_vacante, historial);
      setEvaluacion(data.evaluacion);
      onEvaluacionLista?.({
        text: data.text,
        evaluacion: data.evaluacion,
        vacante
      });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "No se pudo evaluar la entrevista. Intenta de nuevo.");
    } finally {
      requestLockRef.current = false;
    }
  }
  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }
  const respuestasUsuario = messages.filter(m => m.sender === "user").length;
  const isBusy = loading || requestLockRef.current;
  const puedeFinalizar = respuestasUsuario >= 2 && !evaluacion && !isBusy;
  return <div style={styles.overlay}>
      <div ref={dialogRef} style={styles.modal} className="entrevista-modal-motion" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
        <div style={styles.header}>
          <div>
            <div id={titleId} style={styles.headerTitle}>Entrevista simulada</div>
            <div style={styles.headerSubtitle}>
              {vacante.titulo_puesto} · {vacante.empresa}
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar entrevista simulada" style={styles.closeBtn}>
            <CloseIcon />
          </button>
        </div>

        <div style={styles.messagesBox} role="log" aria-live="polite" aria-relevant="additions text">
          {starting && <div style={styles.systemNote} role="status">Preparando tu entrevista simulada...</div>}

          {messages.map((m, i) => <div key={i} className="entrevista-modal-message" style={{
          ...styles.msg,
          ...(m.sender === "user" ? styles.msgUser : styles.msgBot)
        }}>
              {m.text}
            </div>)}

          {loading && !starting && <div className="entrevista-modal-typing" style={styles.typingRow} role="status" aria-label="La inteligencia artificial está preparando la siguiente pregunta">
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

          {evaluacion && <div style={styles.evalCard}>
              <strong style={styles.evalScore}>{evaluacion.puntuacion}/10</strong>
              <p style={styles.evalText}>{evaluacion.resumen}</p>

              {evaluacion.fortalezas?.length > 0 && <>
                  <div style={styles.evalHeading}>Fortalezas</div>
                  <ul style={styles.evalList}>
                    {evaluacion.fortalezas.map((f, i) => <li key={i}>{f}</li>)}
                  </ul>
                </>}

              {evaluacion.areas_mejora?.length > 0 && <>
                  <div style={styles.evalHeading}>Areas de mejora</div>
                  <ul style={styles.evalList}>
                    {evaluacion.areas_mejora.map((a, i) => <li key={i}>{a}</li>)}
                  </ul>
                </>}

              <p style={styles.evalConsejo}>{evaluacion.consejo_final}</p>
              <p style={styles.evalDisclaimer}>Evaluacion generada con IA; puede equivocarse.</p>
            </div>}

          {errorMsg && <div style={styles.errorNote} role="alert" aria-live="assertive">{errorMsg}</div>}
          <div ref={messagesEndRef} />
        </div>

        <div id={statusId} style={styles.srOnly} role="status" aria-live="polite">
          {starting ? "Preparando tu entrevista simulada." : loading ? "Esperando respuesta de la inteligencia artificial." : ""}
        </div>

        {!evaluacion && <div style={styles.inputRow}>
            <label htmlFor={inputId} style={styles.srOnly}>Tu respuesta</label>
            <textarea id={inputId} rows={1} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="Escribe tu respuesta..." aria-describedby={statusId} style={styles.input} disabled={starting || isBusy} />
            <button type="button" onClick={handleSend} disabled={!input.trim() || starting || isBusy} aria-label="Enviar respuesta" style={{
          ...styles.sendBtn,
          ...(!input.trim() || starting || isBusy ? styles.sendBtnDisabled : {})
        }}>
              <SendIcon />
            </button>
          </div>}

        <div style={styles.footer}>
          {!evaluacion ? <>
              <button type="button" onClick={onClose} style={styles.cancelBtn}>
                Cancelar entrevista
              </button>
              <button type="button" onClick={handleFinalizar} disabled={!puedeFinalizar} style={{
            ...styles.finishBtn,
            ...(!puedeFinalizar || loading ? styles.finishBtnDisabled : {})
          }}>
                Finalizar y evaluar
              </button>
            </> : <button type="button" onClick={onClose} style={styles.finishBtn}>
              Cerrar
            </button>}
        </div>
      </div>

      <style>{`
        @keyframes entrevista-modal-in {
          from { opacity: 0; transform: translateY(18px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes entrevista-message-in {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes entrevista-typing-pulse {
          0%, 60%, 100% { opacity: 0.45; }
          30% { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .entrevista-modal-motion,
          .entrevista-modal-message,
          .entrevista-modal-typing { animation: none !important; }
        }
      `}</style>
    </div>;
}
const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15, 23, 42, 0.62)",
    backdropFilter: "blur(6px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000000,
    padding: 16
  },
  modal: {
    width: 760,
    maxWidth: "100%",
    height: "80vh",
    maxHeight: 760,
    background: "#fff",
    borderRadius: 28,
    boxShadow: "0 28px 90px rgba(15,23,42,0.38)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    border: "1px solid rgba(219,231,255,0.95)",
    animation: "entrevista-modal-in 0.28s cubic-bezier(.2,.9,.2,1)",
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
  },
  header: {
    background: COLORS.gradient,
    color: "#fff",
    padding: "20px 24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexShrink: 0
  },
  headerTitle: {
    fontWeight: 850,
    fontSize: 18,
    letterSpacing: "-0.2px"
  },
  headerSubtitle: {
    fontSize: 13,
    opacity: 0.85,
    marginTop: 2
  },
  closeBtn: {
    background: "rgba(255,255,255,0.15)",
    border: "1px solid rgba(255,255,255,0.24)",
    color: "#fff",
    cursor: "pointer",
    padding: 6,
    width: 44,
    height: 44,
    borderRadius: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },
  messagesBox: {
    flex: 1,
    overflowY: "auto",
    padding: 24,
    display: "flex",
    flexDirection: "column",
    gap: 12,
    background: "radial-gradient(circle at top left, rgba(37,99,235,0.10), transparent 34%), linear-gradient(180deg, #f8fbff 0%, #eef6ff 100%)"
  },
  systemNote: {
    alignSelf: "center",
    color: "#6b7280",
    fontSize: 13,
    fontStyle: "italic"
  },
  msg: {
    maxWidth: "80%",
    padding: "11px 15px",
    borderRadius: 18,
    fontSize: 14.5,
    lineHeight: 1.45,
    wordWrap: "break-word",
    whiteSpace: "pre-line",
    animation: "entrevista-message-in 0.22s ease-out"
  },
  msgBot: {
    alignSelf: "flex-start",
    background: "#fff",
    border: `1px solid ${COLORS.border}`,
    borderBottomLeftRadius: 7,
    color: "#1f1f1f"
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
    gap: 4,
    padding: "10px 14px",
    background: "#fff",
    border: `1px solid ${COLORS.border}`,
    borderRadius: 18,
    borderBottomLeftRadius: 7
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: COLORS.primary,
    animation: "entrevista-typing-pulse 1.1s infinite"
  },
  errorNote: {
    alignSelf: "center",
    color: "#b91c1c",
    background: "#fee2e2",
    border: "1px solid #fecaca",
    borderRadius: 10,
    padding: "8px 12px",
    fontSize: 13
  },
  evalCard: {
    alignSelf: "stretch",
    background: "#fff",
    border: "1px solid #ddd6fe",
    borderRadius: 18,
    padding: 16,
    boxShadow: "0 8px 20px rgba(79, 70, 229, 0.1)"
  },
  evalScore: {
    display: "inline-block",
    background: "#eef2ff",
    color: COLORS.primaryDark,
    border: "1px solid #c4b5fd",
    borderRadius: 999,
    padding: "4px 12px",
    fontSize: 14,
    marginBottom: 8
  },
  evalText: {
    fontSize: 13.5,
    color: "#374151",
    margin: "6px 0 10px"
  },
  evalHeading: {
    fontSize: 12,
    fontWeight: 800,
    color: "#5b21b6",
    textTransform: "uppercase",
    marginTop: 8,
    marginBottom: 4
  },
  evalList: {
    margin: "0 0 6px",
    paddingLeft: 18,
    fontSize: 13,
    color: "#374151",
    lineHeight: 1.5
  },
  evalConsejo: {
    fontSize: 13.5,
    color: "#1f1f1f",
    fontWeight: 600,
    marginTop: 10
  },
  evalDisclaimer: {
    fontSize: 11,
    color: "#9ca3af",
    marginTop: 8
  },
  inputRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderTop: `1px solid ${COLORS.border}`,
    background: "#fff",
    flexShrink: 0
  },
  input: {
    flex: 1,
    border: "1px solid #e0e0e6",
    borderRadius: 18,
    padding: "12px 15px",
    fontSize: 14,
    outline: "none",
    resize: "none",
    fontFamily: "inherit",
    maxHeight: 90
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
    flexShrink: 0
  },
  sendBtnDisabled: {
    background: "#c7c7d1",
    cursor: "not-allowed"
  },
  footer: {
    display: "flex",
    gap: 10,
    padding: "12px 16px 16px",
    borderTop: `1px solid ${COLORS.border}`,
    background: "#fff",
    flexShrink: 0
  },
  cancelBtn: {
    flex: 1,
    border: "1px solid #e5e5ea",
    background: "#fff",
    color: "#4b5563",
    borderRadius: 14,
    padding: "10px 14px",
    fontSize: 13.5,
    fontWeight: 700,
    cursor: "pointer"
  },
  finishBtn: {
    flex: 1,
    border: "none",
    background: COLORS.gradient,
    color: "#fff",
    borderRadius: 14,
    padding: "10px 14px",
    fontSize: 13.5,
    fontWeight: 800,
    cursor: "pointer"
  },
  finishBtnDisabled: {
    opacity: 0.5,
    cursor: "not-allowed"
  },
  srOnly: {
    position: "absolute",
    width: 1,
    height: 1,
    padding: 0,
    margin: -1,
    overflow: "hidden",
    clip: "rect(0, 0, 0, 0)",
    whiteSpace: "nowrap",
    border: 0
  }
};
