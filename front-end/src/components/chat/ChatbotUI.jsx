import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { postulantTheme, reclutadorTheme } from "../Portal/portalTheme";
import { formatChatMessage } from "./messageFormatting.js";

const THEMES = {
  postulante: postulantTheme,
  reclutador: reclutadorTheme
};
const CLOSE_ANIM_MS = 220;

function BotIcon({ size = 18, color = "currentColor" }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="8" width="18" height="12" rx="3" />
    <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    <circle cx="9" cy="14" r="1.2" fill={color} stroke="none" />
    <circle cx="15" cy="14" r="1.2" fill={color} stroke="none" />
    <path d="M9 17.5h6" strokeWidth="1.5" />
    <path d="M12 2v2" strokeWidth="1.5" />
  </svg>;
}

function ChatIcon({ size = 22 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    <path d="M8 10h8M8 14h5" strokeWidth="1.5" />
  </svg>;
}

function CloseIcon({ size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>;
}

function SendIcon({ size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M22 2 11 13" />
    <path d="M22 2 15 22 11 13 2 9l20-7z" />
  </svg>;
}

function TypingDots({ theme }) {
  return <div className="chatbot-typing-dots" aria-label="El asistente está escribiendo">
    {[0, 1, 2].map(index => <span key={index} style={{ background: theme.textMuted, animationDelay: `${index * 0.2}s` }} />)}
  </div>;
}

function FormattedMessage({ content, theme }) {
  const blocks = formatChatMessage(content);
  const renderInline = (tokens, prefix) => tokens.map((token, index) => {
    const key = `${prefix}-${index}`;
    if (token.type === "strong") return <strong key={key}>{token.value}</strong>;
    if (token.type === "em") return <em key={key}>{token.value}</em>;
    if (token.type === "code") return <code key={key} style={{ padding: "1px 5px", borderRadius: "5px", background: theme.accentSoft, color: theme.accent, fontSize: "0.92em" }}>{token.value}</code>;
    return <span key={key}>{token.value}</span>;
  });

  return <div className="chatbot-formatted-message" style={{ display: "grid", gap: "9px", whiteSpace: "pre-line" }}>
    {blocks.map((block, index) => {
      const contentNodes = renderInline(block.content ?? [], `block-${index}`);
      if (block.type === "heading") {
        const Heading = block.level === 1 ? "h3" : "h4";
        return <Heading key={index} style={{ margin: 0, fontSize: block.level === 1 ? "14px" : "13px", lineHeight: 1.3, fontWeight: 750, color: theme.textPrimary }}>{contentNodes}</Heading>;
      }
      if (block.type === "unordered-list" || block.type === "ordered-list") {
        const List = block.type === "unordered-list" ? "ul" : "ol";
        return <List key={index} style={{ margin: 0, paddingLeft: "20px", display: "grid", gap: "5px" }}>{block.items.map((item, itemIndex) => <li key={itemIndex}>{renderInline(item, `block-${index}-item-${itemIndex}`)}</li>)}</List>;
      }
      return <p key={index} style={{ margin: 0 }}>{contentNodes}</p>;
    })}
  </div>;
}

export default function ChatbotUI({
  theme: themeName = "reclutador",
  title = "Asistente InclusiveJob",
  subtitle = "Asistencia inteligente",
  open,
  onOpenChange,
  messages = [],
  value,
  onChange,
  onSend,
  loading = false,
  historyError = null,
  unread = false,
  actions = null,
  emptyContent = null,
  renderMessageContent = null
}) {
  const theme = THEMES[themeName] ?? reclutadorTheme;
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const triggerRef = useRef(null);
  const closeTimerRef = useRef(null);
  const [panelVisible, setPanelVisible] = useState(Boolean(open));
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (open) {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
      setPanelVisible(true);
      setIsClosing(false);
      const focusTimer = setTimeout(() => inputRef.current?.focus(), 80);
      return () => clearTimeout(focusTimer);
    }

    if (!panelVisible) return undefined;
    setIsClosing(true);
    closeTimerRef.current = setTimeout(() => {
      setPanelVisible(false);
      setIsClosing(false);
      triggerRef.current?.focus();
    }, CLOSE_ANIM_MS);
    return () => clearTimeout(closeTimerRef.current);
  }, [open, panelVisible]);

  useLayoutEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading, open, panelVisible, historyError, emptyContent]);

  useEffect(() => () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
  }, []);

  function setOpen(nextOpen) {
    onOpenChange?.(nextOpen);
  }

  function handleKeyDown(event) {
    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    onSend?.();
  }

  function handleInputChange(event) {
    onChange?.(event.target.value);
    event.currentTarget.style.height = "auto";
    event.currentTarget.style.height = `${Math.min(event.currentTarget.scrollHeight, 90)}px`;
  }

  return <>
    <style>{`
      @keyframes chatbotTyping {
        0%,100% { opacity: 0.4; }
        50% { opacity: 1; }
      }
      @keyframes chatbotSlideIn {
        from { opacity: 0; transform: translateY(16px) scale(0.97); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
      @keyframes chatbotSlideOut {
        from { opacity: 1; transform: translateY(0) scale(1); }
        to { opacity: 0; transform: translateY(14px) scale(0.96); }
      }
      @keyframes chatbotMessageIn {
        from { opacity: 0; transform: translateY(8px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes chatbotFabPulse {
        0%,100% { box-shadow: 0 0 0 0 ${theme.accentGlow}; }
        50% { box-shadow: 0 0 0 8px transparent; }
      }
      .chatbot-shell { box-sizing: border-box; position: fixed; bottom: 88px; right: 24px; width: 380px; max-width: calc(100vw - 32px); height: 580px; max-height: calc(100vh - 120px); }
      .chatbot-shell * { box-sizing: border-box; }
      .chatbot-input::placeholder { color: ${theme.textMuted}; }
      .chatbot-input:focus { outline: none; border-color: ${theme.accent} !important; box-shadow: 0 0 0 3px ${theme.accentGlow}; }
      .chatbot-input { font-size: 13px; }
      .chatbot-fab { transition: transform 0.2s ease, box-shadow 0.2s ease; position: fixed; bottom: 24px; right: 24px; }
      .chatbot-fab:hover { transform: scale(1.08); }
      .chatbot-fab:active { transform: scale(0.92); }
      .chatbot-close:hover { background: rgba(255,255,255,0.26) !important; transform: rotate(90deg); }
      .chatbot-close:active { transform: rotate(90deg) scale(0.86); }
      .chatbot-send:active { transform: scale(0.92) !important; }
      .chatbot-typing-dots { display: flex; gap: 4px; align-items: center; padding: 4px 2px; }
      .chatbot-typing-dots span { width: 6px; height: 6px; border-radius: 50%; display: inline-block; animation: chatbotTyping 1.2s ease-in-out infinite; }
      @media (prefers-reduced-motion: reduce) {
        .chatbot-fab, .chatbot-shell, .chatbot-message, .chatbot-typing-dots span { animation: none !important; transition: none !important; }
      }
      @media (max-width: 480px) {
        .chatbot-fab { bottom: 16px; right: 16px; }
        .chatbot-shell { left: 12px; right: 12px; bottom: 80px; width: auto; max-width: none; height: calc(100vh - 104px); max-height: none; border-radius: 16px !important; }
        .chatbot-input { font-size: 16px !important; }
      }
    `}</style>

    <button
      ref={triggerRef}
      className="chatbot-fab"
      type="button"
      onClick={() => setOpen(!open)}
      aria-label={open ? "Cerrar chat" : "Abrir chat"}
      aria-expanded={open}
      style={{
        width: "52px",
        height: "52px",
        borderRadius: "50%",
        background: theme.gradient,
        border: "none",
        cursor: "pointer",
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        boxShadow: `0 8px 24px ${theme.accentGlow}, 0 2px 8px rgba(0,0,0,0.18)`,
        animation: !open ? "chatbotFabPulse 3s ease-in-out infinite" : "none"
      }}
    >
      <span style={{ display: "inline-flex", transition: "transform 0.35s cubic-bezier(0.4,0,0.2,1)", transform: open ? "rotate(225deg)" : "rotate(0deg)" }}>
        {open ? <CloseIcon size={18} /> : <ChatIcon size={22} />}
      </span>
      {unread && !open && <span aria-label="Mensaje nuevo" style={{ position: "absolute", top: -5, right: -5, background: theme.danger, color: "#fff", fontSize: 11, fontWeight: 700, minWidth: 20, height: 20, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", border: `2px solid ${theme.bgSurface}` }}>1</span>}
    </button>

    {panelVisible && <div
      className="chatbot-shell"
      style={{
        background: theme.bgSurface,
        border: `1px solid ${theme.border}`,
        borderRadius: "20px",
        boxShadow: `0 20px 60px rgba(0,0,0,0.22), 0 0 0 1px ${theme.accentBorder}`,
        display: "flex",
        flexDirection: "column",
        zIndex: 50,
        overflow: "hidden",
        transformOrigin: "bottom right",
        pointerEvents: isClosing ? "none" : "auto",
        animation: isClosing ? "chatbotSlideOut 0.22s cubic-bezier(0.4,0,1,1) forwards" : "chatbotSlideIn 0.25s cubic-bezier(0.22,1,0.36,1)"
      }}
    >
      <div style={{ background: theme.gradient, padding: "16px 18px", display: "flex", alignItems: "center", gap: "12px", flexShrink: 0, position: "relative", overflow: "hidden" }}>
        <div aria-hidden="true" style={{ position: "absolute", top: "-30px", right: "-20px", width: "100px", height: "100px", borderRadius: "50%", background: "rgba(255,255,255,0.08)", pointerEvents: "none" }} />
        <div style={{ width: "38px", height: "38px", borderRadius: "12px", background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.28)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <BotIcon size={20} color="#fff" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#fff", lineHeight: 1.2 }}>{title}</h2>
          <p style={{ margin: "3px 0 0", fontSize: "11.5px", color: "rgba(255,255,255,0.78)", display: "flex", alignItems: "center", gap: "5px" }}>
            <span aria-hidden="true" style={{ width: "6px", height: "6px", borderRadius: "50%", background: loading ? "#fbbf24" : theme.success, display: "inline-block", boxShadow: loading ? "0 0 6px #fbbf24" : `0 0 6px ${theme.success}` }} />
            {loading ? "Escribiendo..." : subtitle}
          </p>
        </div>
        <button className="chatbot-close" type="button" onClick={() => setOpen(false)} aria-label="Cerrar chat" style={{ width: "30px", height: "30px", borderRadius: "8px", background: "rgba(255,255,255,0.14)", border: "1px solid rgba(255,255,255,0.22)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff", flexShrink: 0, transition: "background 0.15s, transform 0.2s ease", position: "relative", zIndex: 1 }}>
          <CloseIcon size={14} />
        </button>
      </div>

      <div ref={scrollRef} role="log" aria-label="Conversación con el asistente" aria-live="polite" className="chatbot-messages" style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "10px", background: theme.bg, scrollbarWidth: "thin", scrollbarColor: `${theme.border} transparent` }}>
        {messages.map((message, index) => {
          const isUser = message.role === "user";
          return <div key={message.id ?? index} className="chatbot-message" style={{ display: "flex", alignItems: "flex-end", gap: "8px", justifyContent: isUser ? "flex-end" : "flex-start", animation: "chatbotMessageIn 0.28s cubic-bezier(0.22,1,0.36,1) both" }}>
            {!isUser && <div style={{ width: "28px", height: "28px", borderRadius: "50%", flexShrink: 0, background: theme.accentSoft, border: `1px solid ${theme.accentBorder}`, display: "flex", alignItems: "center", justifyContent: "center" }}><BotIcon size={14} color={theme.accent} /></div>}
            <div style={{ maxWidth: "78%", padding: "10px 14px", borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px", fontSize: "13px", lineHeight: "1.55", whiteSpace: "pre-line", overflowWrap: "anywhere", background: isUser ? theme.gradient : message.error ? `${theme.danger}20` : theme.bgElevated, color: isUser ? "#fff" : message.error ? theme.danger : theme.textPrimary, border: isUser ? "none" : message.error ? `1px solid ${theme.danger}55` : `1px solid ${theme.border}`, boxShadow: isUser ? `0 4px 12px ${theme.accentGlow}` : "0 1px 4px rgba(0,0,0,0.06)" }}>
              {isUser ? message.content : <FormattedMessage content={message.content} theme={theme} />}
              {renderMessageContent?.(message)}
            </div>
          </div>;
        })}
        {emptyContent}
        {historyError && <div role="alert" style={{ alignSelf: "stretch", color: theme.danger, background: `${theme.danger}15`, border: `1px solid ${theme.danger}45`, borderRadius: "10px", padding: "9px 11px", fontSize: 12, lineHeight: 1.4 }}>{historyError}</div>}
        {loading && <div style={{ display: "flex", alignItems: "flex-end", gap: "8px" }}>
          <div style={{ width: "28px", height: "28px", borderRadius: "50%", flexShrink: 0, background: theme.accentSoft, border: `1px solid ${theme.accentBorder}`, display: "flex", alignItems: "center", justifyContent: "center" }}><BotIcon size={14} color={theme.accent} /></div>
          <div style={{ padding: "10px 14px", borderRadius: "18px 18px 18px 4px", background: theme.bgElevated, border: `1px solid ${theme.border}`, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}><TypingDots theme={theme} /></div>
        </div>}
      </div>

      {actions && <div style={{ padding: "0 14px 10px", flexShrink: 0 }}>{actions}</div>}

      <div style={{ padding: "12px 14px", borderTop: `1px solid ${theme.border}`, background: theme.bgSurface, display: "flex", gap: "8px", alignItems: "center", flexShrink: 0 }}>
        <textarea ref={inputRef} className="chatbot-input" aria-label="Mensaje para el asistente" rows={1} value={value} onChange={handleInputChange} onKeyDown={handleKeyDown} placeholder="Escribe un mensaje..." style={{ flex: 1, padding: "10px 14px", minHeight: "38px", maxHeight: "90px", resize: "none", borderRadius: "12px", border: `1px solid ${theme.border}`, background: theme.bgElevated, color: theme.textPrimary, transition: "border-color 0.15s, box-shadow 0.15s", fontFamily: "inherit", lineHeight: 1.35 }} />
        <button className="chatbot-send" type="button" onClick={onSend} disabled={loading || !value?.trim()} aria-label="Enviar mensaje" style={{ width: "38px", height: "38px", borderRadius: "10px", border: "none", cursor: loading || !value?.trim() ? "not-allowed" : "pointer", background: loading || !value?.trim() ? theme.border : theme.gradient, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.15s ease", boxShadow: !loading && value?.trim() ? `0 4px 12px ${theme.accentGlow}` : "none" }}>
          <SendIcon size={15} />
        </button>
      </div>

      <div style={{ padding: "6px 14px 8px", textAlign: "center", fontSize: "10.5px", color: theme.textMuted, background: theme.bgSurface, borderTop: `1px solid ${theme.border}`, flexShrink: 0 }}>InclusiveJob IA · Respuestas generadas por IA</div>
    </div>}
  </>;
}
