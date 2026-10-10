import { useState, useEffect, useRef } from "react";
import Rp from "../components/Rp";
import { rutaPorRol } from "../hooks/Sesion/apiSesion.js";
import { useSesion } from "../hooks/Sesion/useSesion.js";
import { useGoogleDomain } from "../hooks/Google/useDomain.js";
import { errorAlert, successAlert } from "../components/Admin/alerts";
import { GoogleLogin } from "@react-oauth/google";
const LOGIN_ALERT_THEME = {
  bgSurface: "#f8fbff",
  textPrimary: "#0f172a",
  textSecondary: "#475569",
  textMuted: "#94a3b8",
  border: "rgba(37,99,235,0.16)",
  accent: "#2563eb",
  accentHover: "#1d4ed8",
  success: "#16a34a",
  danger: "#dc2626"
};
const Registro = () => {
  const [isMobile, setIsMobile] = useState(false);
  const {
    login
  } = useSesion({
    allowedRoles: ["administrador", "postulante", "reclutador"],
    auto: false
  });
  const {
    loginConGoogle
  } = useGoogleDomain();
  const googleBtnRef = useRef(null);
  const dispararGooglePopup = () => {
    const btn = googleBtnRef.current?.querySelector("div[role=button], button");
    if (btn) btn.click();
  };
  const [form, setForm] = useState({
    correo: "",
    password: ""
  });
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 900px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  const validarLogin = data => {
    const {
      correo,
      password
    } = data;
    if (!correo || !password) return "Correo y contraseña son obligatorios";
    if (correo.length > 100) return "Correo demasiado largo";
    if (password.length > 128) return "Contraseña demasiado larga";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(correo)) return "Correo inválido";
    return null;
  };
  const handleChange = e => {
    const {
      name,
      value
    } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: value
    }));
  };
  const handleSubmit = async e => {
    e.preventDefault();
    const currentData = {
      correo: form.correo,
      password: form.password
    };
    const error = validarLogin(currentData);
    if (error) {
      await errorAlert("Datos inválidos", error, LOGIN_ALERT_THEME);
      return;
    }
    try {
      const {
        session: sesionActual
      } = await login(currentData);
      await successAlert("Sesión iniciada", "Redirigiendo a tu panel...", LOGIN_ALERT_THEME);
      window.location.href = rutaPorRol(sesionActual.user);
    } catch (err) {
      console.error(err);
      await errorAlert("No se pudo iniciar sesión", err.message || "Error de conexión con el servidor", LOGIN_ALERT_THEME);
    }
  };
  return <>
      <div style={{
      ...styles.container,
      flexDirection: isMobile ? "column" : "row"
    }}>

        
        {!isMobile && <div style={{
        ...styles.leftSide,
        width: "55%"
      }}>
            <div style={styles.bigCircle} />
            <div style={{
          ...styles.ball,
          width: 120,
          height: 120,
          top: 80,
          right: 60
        }} />
            <div style={{
          ...styles.ball,
          width: 80,
          height: 80,
          bottom: 100,
          left: 120
        }} />
            <div style={{
          ...styles.ball,
          width: 50,
          height: 50,
          top: 180,
          left: 180
        }} />
            <img src="/inclu1.png" alt="Inclusión" style={styles.image} />
            <div style={styles.leftContent}>
              <h2 style={styles.leftTitle}>
                Inclusión que genera{" "}
                <span style={styles.highlight}>oportunidades</span>
              </h2>
              <p style={styles.leftText}>
                Conectamos talento diverso con empresas comprometidas usando inteligencia artificial.
              </p>
            </div>
          </div>}

        
        <div style={{
        ...styles.rightSide,
        width: isMobile ? "100%" : "45%"
      }}>
          <div style={{
          ...styles.card,
          width: isMobile ? "88%" : 520
        }}>

            <div style={styles.logoRow}>
              <div style={styles.logoWrapper}>
                <div style={styles.logoGlow} />
                <img src="/logo.webp" alt="InclusiJob IA" style={styles.logo} />
              </div>
              <a href="/" style={styles.backBtn}>← Inicio</a>
            </div>

            <h1 style={styles.title}>Inicia sesion</h1>
            <p style={styles.subtitle}>ingresa a InclusiJobIA</p>

            <form onSubmit={handleSubmit}>
              <div style={styles.form}>

                <input type="email" name="correo" placeholder="Correo electrónico" style={styles.input} onChange={handleChange} />

                <input type="password" name="password" placeholder="Contraseña" style={styles.input} onChange={handleChange} />

                <button type="submit" style={styles.registerBtn}>
                  Ingresar
                </button>


                <div style={styles.divider}>
                  <div style={styles.line} />
                  <span style={styles.dividerText}>o continuar con</span>
                  <div style={styles.line} />
                </div>

                
                <div ref={googleBtnRef} style={{
                display: "none"
              }}>
                  <GoogleLogin ux_mode="popup" auto_select={false} cancel_on_tap_outside={true} onSuccess={async credentialResponse => {
                  try {
                    const data = await loginConGoogle({
                      credential: credentialResponse.credential
                    });
                    if (data.success) {
                      await successAlert("Sesión iniciada", "Redirigiendo a tu panel...", LOGIN_ALERT_THEME);
                      window.location.href = rutaPorRol({
                        rol: data.rol
                      });
                    } else {
                      await errorAlert("Error", data.message || "No se pudo autenticar con Google", LOGIN_ALERT_THEME);
                    }
                  } catch (err) {
                    console.error(err);
                    await errorAlert("Error de conexión", "No se pudo conectar con el servidor", LOGIN_ALERT_THEME);
                  }
                }} onError={() => {
                  errorAlert("Error", "No se pudo iniciar sesión con Google", LOGIN_ALERT_THEME);
                }} />
                </div>

                <button type="button" onClick={dispararGooglePopup} style={styles.googleBtn}>
                  <img src="/logo.webp" alt="Google" style={{
                  width: 24,
                  height: 24
                }} />
                  Continuar con Google
                </button>

                <p style={styles.loginText}>
                  ¿Aun no tienes cuenta?{" "}
                  <a href="/registro" style={styles.loginLink}>Regístrate</a>
                </p>

              </div>
            </form>
                     

          </div>
           <Rp />
        </div>
        
      </div>
            

      
    </>;
};
const styles = {
  container: {
    width: "100%",
    minHeight: "100vh",
    display: "flex",
    overflow: "hidden",
    fontFamily: "Poppins, sans-serif",
    background: "linear-gradient(135deg,#eef4ff,#dbeafe)"
  },
  leftSide: {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    padding: 30
  },
  bigCircle: {
    position: "absolute",
    width: 900,
    height: 900,
    borderRadius: "50%",
    background: "linear-gradient(135deg,#bfdbfe,#60a5fa)",
    opacity: 0.22,
    filter: "blur(10px)"
  },
  ball: {
    position: "absolute",
    borderRadius: "50%",
    background: "linear-gradient(135deg,#2563eb,#60a5fa)",
    opacity: 0.25,
    filter: "blur(2px)"
  },
  image: {
    width: "85%",
    maxWidth: 650,
    objectFit: "contain",
    zIndex: 3,
    filter: "drop-shadow(0 20px 40px rgba(37,99,235,0.15))"
  },
  leftContent: {
    textAlign: "center",
    marginTop: 20,
    maxWidth: 550,
    zIndex: 3
  },
  leftTitle: {
    fontSize: "clamp(28px, 5vw, 44px)",
    fontWeight: 800,
    color: "#0f172a",
    marginBottom: 15
  },
  highlight: {
    color: "#4f46e5"
  },
  leftText: {
    color: "#64748b",
    fontSize: 18,
    lineHeight: 1.6
  },
  rightSide: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    gap: 35,
    padding: 40,
    boxSizing: "border-box",
    zIndex: 5
  },
  card: {
    width: "100%",
    maxWidth: 520,
    background: "rgba(255,255,255,0.72)",
    backdropFilter: "blur(20px)",
    border: "1px solid rgba(255,255,255,0.35)",
    borderRadius: 40,
    padding: "50px 45px",
    boxShadow: "0 20px 50px rgba(0,0,0,0.08)"
  },
  logoRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 10
  },
  backBtn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "10px 18px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.72)",
    backdropFilter: "blur(10px)",
    border: "1.5px solid #bfdbfe",
    color: "#1e3a8a",
    fontWeight: 600,
    fontSize: 14,
    textDecoration: "none",
    boxShadow: "0 4px 14px rgba(37,99,235,0.08)",
    transition: "0.2s ease",
    whiteSpace: "nowrap"
  },
  logoWrapper: {
    position: "relative",
    width: 130,
    height: 130,
    marginBottom: 10
  },
  logoGlow: {
    position: "absolute",
    width: "100%",
    height: "100%",
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(96,165,250,0.45), transparent 70%)",
    filter: "blur(15px)"
  },
  logo: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    borderRadius: "50%",
    position: "relative",
    zIndex: 2,
    boxShadow: "0 10px 30px rgba(37,99,235,0.18)"
  },
  title: {
    fontSize: "clamp(38px, 8vw, 64px)",
    fontWeight: 900,
    lineHeight: 1,
    marginBottom: 12,
    color: "#0f172a"
  },
  subtitle: {
    color: "#64748b",
    fontSize: 20,
    marginBottom: 35
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 18
  },
  input: {
    minHeight: 58,
    height: "auto",
    borderRadius: 18,
    padding: "0 22px",
    fontSize: 16,
    outline: "none",
    background: "rgba(255,255,255,0.82)",
    border: "2px solid #bfdbfe",
    transition: "0.3s ease",
    boxShadow: "0 4px 10px rgba(0,0,0,0.03)"
  },
  selectWrapper: {
    position: "relative",
    width: "100%"
  },
  select: {
    width: "100%",
    minHeight: 58,
    borderRadius: 18,
    padding: "0 48px 0 22px",
    fontSize: 16,
    outline: "none",
    background: "rgba(255,255,255,0.82)",
    border: "2px solid #bfdbfe",
    appearance: "none",
    WebkitAppearance: "none",
    cursor: "pointer",
    color: "#0f172a",
    transition: "0.3s ease",
    boxShadow: "0 4px 10px rgba(0,0,0,0.03)"
  },
  selectArrow: {
    position: "absolute",
    right: 18,
    top: "50%",
    transform: "translateY(-50%)",
    pointerEvents: "none",
    fontSize: 18,
    color: "#64748b"
  },
  registerBtn: {
    minHeight: 58,
    border: "none",
    borderRadius: 18,
    color: "#fff",
    fontWeight: 700,
    fontSize: 18,
    cursor: "pointer",
    marginTop: 10,
    background: "linear-gradient(135deg,#4f46e5,#2563eb)",
    boxShadow: "0 10px 25px rgba(37,99,235,0.22)"
  },
  divider: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginTop: 5
  },
  line: {
    flex: 1,
    height: 1,
    background: "#cbd5e1"
  },
  dividerText: {
    color: "#64748b",
    fontSize: 14
  },
  googleBtn: {
    width: "100%",
    height: 64,
    borderRadius: 18,
    background: "rgba(255,255,255,0.92)",
    border: "2px solid #bfdbfe",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    fontWeight: 600,
    cursor: "pointer",
    fontSize: 16,
    transition: "0.3s ease",
    boxShadow: "0 4px 10px rgba(0,0,0,0.04)"
  },
  loginText: {
    textAlign: "center",
    marginTop: 10,
    color: "#64748b",
    fontSize: 15
  },
  loginLink: {
    color: "#4f46e5",
    fontWeight: 700,
    cursor: "pointer"
  }
};
export default Registro;
