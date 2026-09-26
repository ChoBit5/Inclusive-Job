import { useState, useEffect } from "react";
const Login = () => {
  const [mode, setMode] = useState("aspirante");
  const isAspirante = mode === "aspirante";
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return <div style={styles.container}>
      
      <div style={{
      ...styles.pagesWrapper,
      transform: isAspirante ? "translateX(0vw)" : "translateX(-100vw)"
    }}>
        
        <section style={{
        ...styles.page,
        background: aspirante.background
      }}>
          <Header theme={aspirante} isMobile={isMobile} />
          <Content theme={aspirante} title="inicia sesión postulante" isMobile={isMobile} />
          <br></br>
        </section>

        
        <section style={{
        ...styles.page,
        background: reclutador.background
      }}>
          <Header theme={reclutador} isMobile={isMobile} />
          <Content theme={reclutador} title="inicia sesión reclutador" isMobile={isMobile} />
          <br></br>
        </section>
      </div>

      
      <div style={{
      ...styles.switchWrapper,
      width: isMobile ? "92%" : "340px",
      background: isAspirante ? aspirante.header : reclutador.header
    }}>
        <div style={{
        ...styles.switchIndicator,
        transform: isAspirante ? "translateX(0%)" : "translateX(100%)",
        background: isAspirante ? aspirante.googleBtn : reclutador.googleBtn
      }} />

<button onClick={() => setMode("aspirante")} style={{
        ...styles.switchBtn,
        fontSize: isMobile ? 13 : 16,
        color: isAspirante ? "#EAF2FF" : "#D6D9FF"
      }}>
  Postulante
</button>

<button onClick={() => setMode("reclutador")} style={{
        ...styles.switchBtn,
        fontSize: isMobile ? 13 : 16,
        color: !isAspirante ? "#F1E9FF" : "#E2D6FF"
      }}>
  Reclutador
</button>
      </div>
    </div>;
};
const Header = ({
  theme,
  isMobile
}) => <header style={{
  ...styles.header,
  background: theme.header,
  paddingLeft: isMobile ? 16 : 40,
  paddingRight: isMobile ? 16 : 40
}}>
    <div style={{
    display: "flex",
    alignItems: "center",
    gap: 12
  }}>
      <div style={{
      ...styles.logoBox,
      width: isMobile ? 55 : 90,
      height: isMobile ? 55 : 90,
      background: theme.logoBox
    }}>
        <img src="/logo.webp" style={styles.logo} />
      </div>

      <span style={{
      color: "#fff",
      fontWeight: 800,
      fontSize: isMobile ? 14 : 20
    }}>
        InclusiJob IA
      </span>
    </div>

    <a href="/" style={{
    color: "#fff",
    textDecoration: "none",
    fontWeight: 700,
    fontSize: isMobile ? 14 : 18,
    padding: isMobile ? "6px 10px" : "10px 18px"
  }}>
      ← Volver
    </a>
  </header>;
const Content = ({
  theme,
  title,
  isMobile
}) => <div style={styles.content}>
    <div style={{
    ...styles.centerBox,
    maxWidth: isMobile ? "92%" : 620
  }}>
      <h1 style={{
      ...styles.title,
      fontSize: isMobile ? 28 : 54,
      color: theme.title
    }}>
        {title}
      </h1>

      <form style={styles.form}>
        <button type="button" style={{
        ...styles.googleBtn,
        width: isMobile ? "100%" : 260,
        height: isMobile ? 48 : 58,
        fontSize: isMobile ? 14 : 16,
        background: theme.googleBtn,
        color: theme.googleText
      }}>
          <img src="/logo.webp" alt="Google" style={{
          width: 35,
          height: 35
        }} />
          Entrar con Google
        </button>

        <input placeholder="Correo" style={{
        ...styles.input,
        height: isMobile ? 48 : 58,
        background: theme.input,
        border: `2px solid ${theme.border}`
      }} />

        <input placeholder="Contraseña" style={{
        ...styles.input,
        height: isMobile ? 48 : 58,
        background: theme.input,
        border: `2px solid ${theme.border}`
      }} />

        <button style={{
        ...styles.loginBtn,
        width: isMobile ? "100%" : 260,
        height: isMobile ? 48 : 58,
        background: theme.loginBtn,
        color: theme.loginText
      }}>
          Entrar
        </button>

<a style={{
        ...styles.link,
        fontSize: isMobile ? 12 : 14,
        color: theme.formLink
      }}>
  Recuperar contraseña
</a>

<a style={{
        ...styles.link,
        fontSize: isMobile ? 12 : 14,
        color: theme.formLink
      }}>
  ¿No tienes cuenta?
</a>
      </form>
    </div>
  </div>;
const aspirante = {
  background: "#eef4ff",
  header: "#4f46e5",
  logoBox: "#ffffff",
  title: "#111827",
  input: "#ffffff",
  inputText: "#111827",
  border: "#c7d2fe",
  googleBtn: "#6366f1",
  googleText: "#ffffff",
  loginBtn: "#1e3a8a",
  loginText: "#ffffff",
  formLink: "#1e3a8a"
};
const reclutador = {
  background: "#ede7f6",
  header: "#5e35b1",
  logoBox: "#7e57c2",
  title: "#2a1a3a",
  input: "#ffffff",
  inputText: "#2a1a3a",
  border: "#d1c4e9",
  googleBtn: "#7e57c2",
  googleText: "#ffffff",
  loginBtn: "#5e35b1",
  loginText: "#ffffff",
  formLink: "#3b1b66"
};
const styles = {
  container: {
    width: "100vw",
    height: "100vh",
    overflow: "hidden",
    position: "fixed",
    top: 0,
    left: 0
  },
  pagesWrapper: {
    width: "200vw",
    height: "100vh",
    display: "flex",
    transition: "transform 0.7s ease"
  },
  page: {
    width: "100vw",
    height: "100vh",
    display: "flex",
    flexDirection: "column"
  },
  header: {
    height: 100,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    boxSizing: "border-box"
  },
  logoBox: {
    borderRadius: 14,
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },
  logo: {
    width: "100%",
    height: "100%",
    objectFit: "cover"
  },
  content: {
    flex: 1,
    display: "flex",
    justifyContent: "center",
    alignItems: "center"
  },
  centerBox: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center"
  },
  title: {
    fontWeight: 900,
    marginBottom: 50,
    textAlign: "center"
  },
  form: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: 14,
    alignItems: "center"
  },
  input: {
    width: "100%",
    borderRadius: 999,
    padding: "0 20px",
    fontSize: 16,
    outline: "none"
  },
  googleBtn: {
    borderRadius: 999,
    border: "none",
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10
  },
  loginBtn: {
    borderRadius: 999,
    border: "none",
    fontWeight: 700
  },
  link: {
    textDecoration: "none",
    fontWeight: 600
  },
  switchWrapper: {
    position: "fixed",
    bottom: 25,
    left: "50%",
    transform: "translateX(-50%)",
    height: 60,
    borderRadius: 999,
    display: "flex",
    alignItems: "center",
    padding: 6,
    overflow: "hidden"
  },
  switchIndicator: {
    position: "absolute",
    width: "50%",
    height: "calc(100% - 12px)",
    borderRadius: 999,
    top: 6,
    transition: "transform 0.4s ease"
  },
  switchBtn: {
    flex: 1,
    border: "none",
    background: "transparent",
    fontWeight: 700,
    cursor: "pointer",
    zIndex: 2
  }
};
export default Login;
