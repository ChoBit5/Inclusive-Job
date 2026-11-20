import { useCallback, useEffect, useRef, useState } from "react";
import { useEntrevistaRealPostulante } from "../hooks/Postulante/useDomain.js";
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
function formatTiempoRestante(segundos) {
  if (segundos == null) return "15:00";
  const total = Math.max(0, Number(segundos));
  const minutos = Math.floor(total / 60).toString().padStart(2, "0");
  const segundosRestantes = Math.floor(total % 60).toString().padStart(2, "0");
  return `${minutos}:${segundosRestantes}`;
}
const VIDEO_BITS_POR_SEGUNDO = 400000;
const AUDIO_BITS_POR_SEGUNDO = 32000;
function elegirTipoGrabacion() {
  if (typeof MediaRecorder === "undefined") return "";
  const candidatos = ["video/webm;codecs=vp8,opus", "video/webm", "video/mp4"];
  return candidatos.find(tipo => MediaRecorder.isTypeSupported(tipo)) ?? "";
}
function mensajeErrorCamara(err) {
  switch (err?.name) {
    case "NotAllowedError":
    case "SecurityError":
      return "Necesitas permitir el acceso a la cámara para realizar esta entrevista. Revisa los permisos del navegador y vuelve a abrirla.";
    case "NotFoundError":
      return "No se encontró una cámara en tu dispositivo.";
    case "NotReadableError":
      return "No se pudo usar la cámara porque otra aplicación la está usando.";
    default:
      return "No se pudo activar la cámara. Revisa que esté conectada y permitida.";
  }
}
export default function EntrevistaRealModal({
  vacante,
  onClose,
  onEvaluacionLista
}) {
  const {
    ejecutarEntrevista,
    subirVideoEntrevista
  } = useEntrevistaRealPostulante();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [starting, setStarting] = useState(true);
  const [loading, setLoading] = useState(false);
  const [evaluacion, setEvaluacion] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [initError, setInitError] = useState(false);
  const [expiraEn, setExpiraEn] = useState(null);
  const [tiempoRestante, setTiempoRestante] = useState(null);
  const [finalizandoPorTiempo, setFinalizandoPorTiempo] = useState(false);
  const messagesEndRef = useRef(null);
  const startedRef = useRef(false);
  const finalizarRef = useRef(null);
  const autoFinalizandoRef = useRef(false);
  const mountedRef = useRef(true);
  const streamRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const videoBlobRef = useRef(null);
  const camaraInterrumpidaRef = useRef(false);
  const previewRef = useRef(null);
  const [camaraLista, setCamaraLista] = useState(false);
  const [camaraAviso, setCamaraAviso] = useState("");
  const [videoEstado, setVideoEstado] = useState("idle");
  const [videoError, setVideoError] = useState("");
  const setPreviewNode = useCallback(node => {
    previewRef.current = node;
    if (node && streamRef.current) node.srcObject = streamRef.current;
  }, []);
  function apagarCamara() {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    setCamaraLista(false);
  }
  async function pedirCamara() {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      throw new Error("Tu navegador no permite grabar video. Usa una versión reciente de Chrome, Edge, Firefox o Safari.");
    }
    const video = {
      width: {
        ideal: 640
      },
      height: {
        ideal: 480
      },
      frameRate: {
        ideal: 15
      }
    };
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video,
        audio: true
      });
    } catch (err) {
      if (err?.name !== "NotFoundError") throw new Error(mensajeErrorCamara(err));
      // Sin micrófono: la entrevista es escrita, se continúa solo con video.
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video,
          audio: false
        });
      } catch (errSinAudio) {
        throw new Error(mensajeErrorCamara(errSinAudio));
      }
    }
    if (!mountedRef.current) {
      stream.getTracks().forEach(track => track.stop());
      throw new Error("Entrevista cancelada.");
    }
    streamRef.current = stream;
    stream.getVideoTracks()[0]?.addEventListener("ended", () => {
      camaraInterrumpidaRef.current = true;
      if (mountedRef.current) setCamaraAviso("Se perdió la señal de la cámara. Revisa que siga conectada y permitida.");
    });
    setCamaraLista(true);
  }
  function prepararGrabadora() {
    const tipo = elegirTipoGrabacion();
    const opciones = {
      videoBitsPerSecond: VIDEO_BITS_POR_SEGUNDO,
      audioBitsPerSecond: AUDIO_BITS_POR_SEGUNDO
    };
    if (tipo) opciones.mimeType = tipo;
    const recorder = new MediaRecorder(streamRef.current, opciones);
    chunksRef.current = [];
    recorder.addEventListener("dataavailable", e => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    });
    recorderRef.current = recorder;
  }
  function detenerGrabacion() {
    return new Promise(resolve => {
      const recorder = recorderRef.current;
      const armar = () => {
        const tipo = recorder?.mimeType || chunksRef.current[0]?.type || "video/webm";
        const blob = new Blob(chunksRef.current, {
          type: tipo
        });
        apagarCamara();
        resolve(blob.size > 0 ? blob : null);
      };
      if (!recorder || recorder.state === "inactive") {
        armar();
        return;
      }
      recorder.addEventListener("stop", armar, {
        once: true
      });
      try {
        recorder.stop();
      } catch {
        armar();
      }
    });
  }
  async function enviarVideo(blob) {
    if (!blob) {
      setVideoEstado("sin_video");
      return;
    }
    videoBlobRef.current = blob;
    setVideoEstado("subiendo");
    setVideoError("");
    try {
      await subirVideoEntrevista({
        id_vacante: vacante.id_vacante,
        video: blob,
        camaraInterrumpida: camaraInterrumpidaRef.current
      });
      videoBlobRef.current = null;
      if (mountedRef.current) setVideoEstado("enviado");
    } catch (err) {
      if (mountedRef.current) {
        setVideoError(err instanceof Error ? err.message : "No se pudo enviar el video de verificación.");
        setVideoEstado("error");
      }
    }
  }
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        try {
          recorder.stop();
        } catch {
          // ya estaba detenida
        }
      }
      streamRef.current?.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    };
  }, []);
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    (async () => {
      try {
        await pedirCamara();
        prepararGrabadora();
        const data = await ejecutarEntrevista({
          accion: "iniciar",
          id_vacante: vacante.id_vacante
        });
        if (!mountedRef.current) return;
        recorderRef.current?.start(10000);
        setMessages([{
          sender: "bot",
          text: data.mensaje
        }]);
        setExpiraEn(Number(data.expira_en));
        setTiempoRestante(Number(data.tiempo_restante_segundos));
      } catch (err) {
        apagarCamara();
        if (mountedRef.current) {
          setErrorMsg(err instanceof Error ? err.message : "No se pudo iniciar la entrevista.");
          setInitError(true);
        }
      } finally {
        if (mountedRef.current) setStarting(false);
      }
    })();
  }, []);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth"
    });
  }, [messages, loading]);
  useEffect(() => {
    if (!expiraEn || evaluacion || initError) return undefined;
    const actualizarTiempo = () => {
      const restante = Math.max(0, Math.ceil(expiraEn - Date.now() / 1000));
      setTiempoRestante(restante);
      if (restante === 0 && !loading && !autoFinalizandoRef.current) {
        autoFinalizandoRef.current = true;
        finalizarRef.current?.("tiempo_agotado");
      }
    };
    actualizarTiempo();
    const timer = setInterval(actualizarTiempo, 1000);
    return () => clearInterval(timer);
  }, [expiraEn, evaluacion, initError, loading]);
  function buildHistorial() {
    return messages.map(m => ({
      role: m.sender === "user" ? "user" : "assistant",
      content: m.text
    }));
  }
  async function handleSend() {
    const texto = input.trim();
    if (!texto || loading || evaluacion || initError || tiempoRestante === 0 || finalizandoPorTiempo) return;
    const historial = buildHistorial();
    setMessages(prev => [...prev, {
      sender: "user",
      text: texto
    }]);
    setInput("");
    setErrorMsg("");
    setLoading(true);
    try {
      const data = await ejecutarEntrevista({
        accion: "responder",
        id_vacante: vacante.id_vacante,
        mensaje: texto,
        historial
      });
      setMessages(prev => [...prev, {
        sender: "bot",
        text: data.mensaje
      }]);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "No se pudo continuar la entrevista.");
    } finally {
      setLoading(false);
    }
  }
  async function handleFinalizar(motivoFinalizacion = "manual") {
    if (loading || evaluacion || initError) return;
    if (motivoFinalizacion === "tiempo_agotado") setFinalizandoPorTiempo(true);
    setErrorMsg("");
    setLoading(true);
    try {
      const historial = buildHistorial();
      const videoPendiente = detenerGrabacion();
      const data = await ejecutarEntrevista({
        accion: "finalizar",
        id_vacante: vacante.id_vacante,
        historial,
        motivo_finalizacion: motivoFinalizacion
      });
      setEvaluacion(data.evaluacion);
      onEvaluacionLista?.({
        text: data.text,
        evaluacion: data.evaluacion,
        vacante
      });
      videoPendiente.then(enviarVideo);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "No se pudo evaluar la entrevista. Intenta de nuevo.");
      setInitError(true);
    } finally {
      setLoading(false);
    }
  }
  finalizarRef.current = handleFinalizar;
  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }
  const respuestasUsuario = messages.filter(m => m.sender === "user").length;
  const puedeFinalizar = respuestasUsuario >= 2 && !evaluacion && !initError && tiempoRestante !== 0 && !finalizandoPorTiempo;
  return <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <div>
            <div style={styles.headerTitle}>Entrevista</div>
            <div style={styles.headerSubtitle}>
              {vacante.titulo_puesto}
              {vacante.empresa ? ` · ${vacante.empresa}` : ""}
            </div>
          </div>
          <button onClick={videoEstado === "subiendo" ? undefined : onClose} aria-label="Cerrar" style={styles.closeBtn}>
            <CloseIcon />
          </button>
        </div>

        <div role="status" aria-live="polite" style={styles.timerBar}>
          <div>
            <strong style={styles.timerLabel}>Tiempo restante</strong>
            <span style={styles.timerHint}>Límite total: 15 minutos</span>
          </div>
          <div style={styles.cameraBox}>
            {camaraLista && !evaluacion && <>
                <video ref={setPreviewNode} autoPlay muted playsInline aria-label="Vista previa de tu cámara" style={styles.cameraPreview} />
                <span style={styles.recBadge}>
                  <span style={styles.recDot} />
                  Grabando
                </span>
              </>}
          </div>
          <strong style={styles.timerValue}>{formatTiempoRestante(tiempoRestante)}</strong>
        </div>

        <div style={styles.messagesBox}>
          {starting && <div style={styles.systemNote}>Activando tu cámara y preparando tu entrevista...</div>}

          {messages.map((m, i) => <div key={i} style={{
          ...styles.msg,
          ...(m.sender === "user" ? styles.msgUser : styles.msgBot)
        }}>
              {m.text}
            </div>)}

          {loading && !starting && <div style={styles.typingRow}>
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
              {(evaluacion.tiempo_utilizado_segundos != null || evaluacion.motivo_finalizacion) && <div style={styles.evalTiming}>
                {evaluacion.motivo_finalizacion === "tiempo_agotado" ? "Finalizada por tiempo agotado" : "Finalizada manualmente"}
                {evaluacion.tiempo_utilizado_segundos != null ? ` · Tiempo utilizado: ${formatTiempoRestante(evaluacion.tiempo_utilizado_segundos)}` : ""}
              </div>}
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

          {errorMsg && <div style={styles.errorNote}>{errorMsg}</div>}
          {camaraAviso && !evaluacion && <div role="status" style={styles.timerNotice}>{camaraAviso}</div>}
          {videoEstado === "subiendo" && <div role="status" style={styles.timerNotice}>Enviando el video de verificación. No cierres esta ventana...</div>}
          {videoEstado === "enviado" && <div role="status" style={styles.systemNote}>Video de verificación enviado.</div>}
          {videoEstado === "sin_video" && <div role="status" style={styles.systemNote}>No se grabó video de esta entrevista.</div>}
          {videoEstado === "error" && <div style={styles.errorNote}>
              {videoError || "No se pudo enviar el video de verificación."}
              <div>
                <button type="button" onClick={() => enviarVideo(videoBlobRef.current)} style={styles.retryBtn}>
                  Reintentar envío
                </button>
              </div>
            </div>}
          {finalizandoPorTiempo && !evaluacion && <div role="status" style={styles.timerNotice}>Se agotó el tiempo. Estamos evaluando las respuestas que alcanzaste a enviar...</div>}
          <div ref={messagesEndRef} />
        </div>

        {!evaluacion && !initError && <div style={styles.inputRow}>
            <textarea rows={1} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="Escribe tu respuesta..." style={styles.input} disabled={starting || loading || tiempoRestante === 0 || finalizandoPorTiempo} />
            <button onClick={handleSend} disabled={!input.trim() || starting || loading || tiempoRestante === 0 || finalizandoPorTiempo} aria-label="Enviar respuesta" style={{
          ...styles.sendBtn,
          ...(!input.trim() || starting || loading || tiempoRestante === 0 || finalizandoPorTiempo ? styles.sendBtnDisabled : {})
        }}>
              <SendIcon />
            </button>
          </div>}

        <div style={styles.footer}>
          {evaluacion ? <button onClick={onClose} disabled={videoEstado === "subiendo"} style={{
          ...styles.finishBtn,
          ...(videoEstado === "subiendo" ? styles.finishBtnDisabled : {})
        }}>
              Cerrar
            </button> : initError ? <button onClick={onClose} style={styles.finishBtn}>
              Cerrar
            </button> : <>
              <button onClick={onClose} style={styles.cancelBtn}>
                Cancelar entrevista
              </button>
              <button onClick={() => handleFinalizar("manual")} disabled={!puedeFinalizar || loading} style={{
            ...styles.finishBtn,
            ...(!puedeFinalizar || loading ? styles.finishBtnDisabled : {})
          }}>
                Finalizar y evaluar
              </button>
            </>}
        </div>
      </div>

      <style>{`
        @keyframes entrevista-real-modal-in {
          from { opacity: 0; transform: translateY(18px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes entrevista-real-message-in {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
         @keyframes entrevista-real-typing-pulse {
           0%, 100% { opacity: 0.5; }
           50% { opacity: 1; }
        }
      `}</style>
    </div>;
}
const styles = {
  cameraBox: {
    display: "flex",
    alignItems: "center",
    gap: 8
  },
  cameraPreview: {
    width: 64,
    height: 48,
    objectFit: "cover",
    borderRadius: 10,
    background: "#0f172a",
    border: `1px solid ${COLORS.border}`,
    transform: "scaleX(-1)"
  },
  recBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    fontSize: 11.5,
    fontWeight: 700,
    color: "#b91c1c"
  },
  recDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "#dc2626",
    animation: "entrevista-real-typing-pulse 1.2s ease-in-out infinite"
  },
  retryBtn: {
    marginTop: 8,
    background: COLORS.gradient,
    color: "#fff",
    border: "none",
    borderRadius: 10,
    padding: "7px 14px",
    fontSize: 12.5,
    fontWeight: 700,
    cursor: "pointer"
  },
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
    animation: "entrevista-real-modal-in 0.28s cubic-bezier(.2,.9,.2,1)",
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
  timerBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: "10px 24px",
    background: "#eff6ff",
    borderBottom: `1px solid ${COLORS.border}`,
    color: COLORS.primaryDark,
    flexShrink: 0
  },
  timerLabel: {
    display: "block",
    fontSize: 13
  },
  timerHint: {
    display: "block",
    color: "#475569",
    fontSize: 11.5,
    marginTop: 2
  },
  timerValue: {
    fontVariantNumeric: "tabular-nums",
    fontSize: 18,
    letterSpacing: "0.02em"
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
    borderRadius: 12,
    display: "flex",
    alignItems: "center"
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
    animation: "entrevista-real-message-in 0.22s ease-out"
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
     animation: "entrevista-real-typing-pulse 1.1s infinite"
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
  timerNotice: {
    alignSelf: "center",
    color: "#92400e",
    background: "#fef3c7",
    border: "1px solid #fcd34d",
    borderRadius: 10,
    padding: "8px 12px",
    fontSize: 13,
    textAlign: "center"
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
  evalTiming: {
    color: "#475569",
    fontSize: 12,
    marginBottom: 8
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
    maxHeight: 90,
    background: "#f8fbff"
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
  }
};
