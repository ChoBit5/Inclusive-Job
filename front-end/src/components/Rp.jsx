import { useState } from "react";
import { useRecuperarPassword } from "../data/interface.js";
export default function Rp() {
  const {
    recuperar
  } = useRecuperarPassword();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState({
    texto: "",
    tipo: ""
  });
  const validarEmail = email => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };
  const handleEnviar = async e => {
    e.preventDefault();
    if (!email.trim()) {
      setMensaje({
        texto: "Ingresa tu correo.",
        tipo: "error"
      });
      return;
    }
    if (!validarEmail(email)) {
      setMensaje({
        texto: "Correo inválido.",
        tipo: "error"
      });
      return;
    }
    setLoading(true);
    setMensaje({
      texto: "",
      tipo: ""
    });
    try {
      const data = await recuperar(email);
      if (!data.error) {
        setMensaje({
          texto: "Revisa tu correo para restablecer contraseña.",
          tipo: "exito"
        });
        setEmail("");
        setTimeout(() => {
          setOpen(false);
          setMensaje({
            texto: "",
            tipo: ""
          });
        }, 2500);
      } else {
        setMensaje({
          texto: data.error || "Error al enviar correo.",
          tipo: "error"
        });
      }
    } catch (error) {
      setMensaje({
        texto: error instanceof Error ? error.message : "Error de conexión con el servidor.",
        tipo: "error"
      });
    } finally {
      setLoading(false);
    }
  };
  return <>
      
      <button type="button" onClick={() => setOpen(true)} style={{
      background: "none",
      border: "none",
      color: "#4f46e5",
      cursor: "pointer"
    }} onMouseEnter={e => e.currentTarget.style.color = "#1e3a8a"} onMouseLeave={e => e.currentTarget.style.color = "#4f46e5"}>
        ¿Olvidaste tu contraseña?
      </button>

      
      {open && <div style={{
      position: "fixed",
      inset: 0,
      zIndex: 999,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "1rem"
    }} onClick={() => setOpen(false)}>
          
          <div style={{
        position: "absolute",
        inset: 0,
        backgroundColor: "rgba(55, 48, 163, 0.35)",
        backdropFilter: "blur(12px)"
      }} />

          
          <div style={{
        position: "relative",
        zIndex: 10,
        width: "100%",
        maxWidth: "28rem",
        backgroundColor: "#fff",
        borderRadius: "2rem",
        boxShadow: "0 20px 35px -8px rgba(0, 0, 0, 0.25)",
        padding: "2rem"
      }} onClick={e => e.stopPropagation()}>
            
            <button type="button" onClick={() => setOpen(false)} style={{
          position: "absolute",
          top: "1rem",
          right: "1rem",
          background: "transparent",
          border: "none",
          fontSize: "1.5rem",
          cursor: "pointer",
          color: "#9ca3af",
          transition: "0.2s ease"
        }} onMouseEnter={e => e.currentTarget.style.color = "#4b5563"} onMouseLeave={e => e.currentTarget.style.color = "#9ca3af"}>
              ✕
            </button>

            
            <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center"
        }}>
              <div style={{
            width: "4rem",
            height: "4rem",
            overflow: "hidden",
            borderRadius: "1rem",
            marginBottom: "1rem",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
          }}>
                <img src="/logo.webp" alt="InclusiJob IA" style={{
              width: "100%",
              height: "100%",
              objectFit: "cover"
            }} />
              </div>

              <h2 style={{
            fontSize: "1.8rem",
            fontWeight: 800,
            color: "#0f172a",
            marginBottom: "0.5rem"
          }}>
                Recuperar contraseña
              </h2>

              <p style={{
            color: "#64748b",
            fontSize: "0.9rem",
            marginTop: "0.5rem"
          }}>
                Ingresa tu correo electrónico y te enviaremos las instrucciones para restablecer tu contraseña.
              </p>

              <form onSubmit={handleEnviar} style={{
            width: "100%",
            marginTop: "1.5rem"
          }}>
                <input type="email" placeholder="correo@ejemplo.com" value={email} onChange={e => setEmail(e.target.value)} style={{
              width: "100%",
              padding: "0.75rem 1rem",
              borderRadius: "0.75rem",
              border: "1px solid #d1d5db",
              outline: "none",
              fontSize: "1rem",
              transition: "0.2s ease"
            }} onFocus={e => e.currentTarget.style.borderColor = "#4f46e5"} onBlur={e => e.currentTarget.style.borderColor = "#d1d5db"} />

                {mensaje.texto && <p style={{
              marginTop: "0.5rem",
              fontSize: "0.85rem",
              color: mensaje.tipo === "error" ? "#dc2626" : "#10b981"
            }}>
                    {mensaje.texto}
                  </p>}

                <div style={{
              display: "flex",
              gap: "0.75rem",
              marginTop: "1.5rem"
            }}>
                  <button type="button" onClick={() => setOpen(false)} style={{
                flex: 1,
                padding: "0.75rem",
                borderRadius: "0.75rem",
                border: "1px solid #d1d5db",
                background: "#fff",
                color: "#374151",
                fontWeight: 500,
                cursor: "pointer",
                transition: "0.2s ease"
              }} onMouseEnter={e => e.currentTarget.style.background = "#f3f4f6"} onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
                    Cancelar
                  </button>

                  <button type="submit" disabled={loading} style={{
                flex: 1,
                padding: "0.75rem",
                borderRadius: "0.75rem",
                border: "none",
                background: "#4f46e5",
                color: "#fff",
                fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.6 : 1,
                transition: "0.2s ease"
              }} onMouseEnter={e => {
                if (!loading) e.currentTarget.style.background = "#4338ca";
              }} onMouseLeave={e => {
                if (!loading) e.currentTarget.style.background = "#4f46e5";
              }}>
                    {loading ? "Enviando..." : "Enviar"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>}
    </>;
}
