import { Briefcase, UserCircle2, Bot } from "lucide-react";
const postulante = () => {
  return <div style={styles.container}>

      <style>{`
        @media (max-width: 900px) {

          .mainContent {
            flex-direction: column !important;
            padding: 20px !important;
            gap: 20px !important;
            overflow-y: auto !important;
            height: calc(100vh - 120px) !important;
          }

          .leftColumn,
          .rightColumn {
            width: 100% !important;
          }

          .navbar {
            padding: 0 15px !important;
            gap: 10px !important;
          }

          .logoSection {
            gap: 10px !important;
          }

          .title {
            font-size: 1.4rem !important;
            line-height: 1.1 !important;
          }

          .logoutBtn {
            font-size: 0.95rem !important;
            padding: 6px 10px !important;
            border-radius: 8px;
          }

          .vacantesBtn span {
            font-size: 1.4rem !important;
          }

          .historyCard {
            flex-direction: column !important;
            height: auto !important;
            gap: 15px;
          }

          .reviewButton {
            width: 100% !important;
          }

        }
      `}</style>

      <header style={styles.navbar} className="navbar">
        <div style={styles.logoSection} className="logoSection">
          <div style={styles.logo}>
            <img src="/logo.webp" alt="logo" />
          </div>

          <h1 style={styles.title}>InclusiveJobIA</h1>
        </div>

        <button style={styles.logoutButton} className="logoutBtn">
          Cerrar Sesión
        </button>
      </header>

      <main style={styles.mainContent} className="mainContent">

        <div style={styles.leftColumn} className="leftColumn">

          <section style={styles.profileCard}>
            <img src="/logo.webp" alt="Perfil" style={styles.profileImage} />
            <h2 style={styles.name}>[nomPost]</h2>
            <button style={styles.editButton}>
              Editar Perfil
            </button>
          </section>

          <section style={styles.emptyCard}>
            <div style={styles.dataBox}>
              <div style={styles.dataRow}>
                <span style={styles.label}>Edad:</span>
                <span>28</span>
              </div>
              <div style={styles.dataRow}>
                <span style={styles.label}>Correo:</span>
                <span>postulante@email.com</span>
              </div>
              <div style={styles.dataRow}>
                <span style={styles.label}>Teléfono:</span>
                <span>55 1234 5678</span>
              </div>
              <div style={styles.dataRow}>
                <span style={styles.label}>Ubicación:</span>
                <span>Estado de México</span>
              </div>
            </div>
          </section>

        </div>

        <div style={styles.rightColumn} className="rightColumn">

          <section style={styles.cvCard}>
            <img src="/logo.webp" alt="CV" style={styles.cvImage} />
            <br />
            <button style={styles.cvButton}>
              Revisar CV
            </button>
          </section>

          <button style={styles.actionCard} className="vacantesBtn">
            <Briefcase size={75} color="#EAF6FB" />
            <span style={styles.actionText}>
              Vacantes Aplicadas
            </span>
          </button>

          <section style={styles.historyCard} className="historyCard">
            <div style={styles.historyLeft}>
              <UserCircle2 size={170} color="#DFF6FF" />
            </div>

            <div style={styles.historyRight}>
              <h3 style={styles.historyText}>
                Postulaciones realizadas: 12
              </h3>

              <button style={styles.reviewButton}>
                Revisar historial de postulaciones
              </button>
            </div>
          </section>

        </div>

      </main>
<button style={styles.chatButton}>
  <Bot size={32} color="#0A2647" />
</button>
    </div>;
};
const CARD_HEIGHT = "430px";
const styles = {
  chatIcon: {
    width: "clamp(26px, 2vw, 34px)",
    height: "clamp(26px, 2vw, 34px)"
  },
  container: {
    backgroundColor: "#EAF6FB",
    fontFamily: "'Courier New', monospace",
    width: "100vw",
    height: "100vh",
    position: "fixed",
    top: 0,
    left: 0,
    overflow: "auto"
  },
  navbar: {
    width: "100%",
    height: "120px",
    backgroundColor: "#0A2647",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 70px"
  },
  logoSection: {
    display: "flex",
    alignItems: "center",
    gap: "25px"
  },
  logo: {
    width: "80px",
    height: "80px",
    borderRadius: "12px",
    backgroundColor: "#DFF6FF"
  },
  title: {
    color: "#F4FBFF",
    fontSize: "2.8rem"
  },
  logoutButton: {
    background: "transparent",
    border: "none",
    color: "#F4FBFF",
    fontSize: "1.6rem",
    cursor: "pointer"
  },
  mainContent: {
    display: "flex",
    gap: "50px",
    padding: "40px",
    boxSizing: "border-box",
    height: "100%"
  },
  leftColumn: {
    width: "50%",
    display: "flex",
    flexDirection: "column",
    gap: "25px"
  },
  rightColumn: {
    width: "50%",
    display: "flex",
    flexDirection: "column",
    gap: "25px"
  },
  profileCard: {
    width: "100%",
    height: CARD_HEIGHT,
    minHeight: CARD_HEIGHT,
    boxSizing: "border-box",
    backgroundColor: "#144272",
    borderRadius: "30px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center"
  },
  cvCard: {
    width: "100%",
    height: CARD_HEIGHT,
    minHeight: CARD_HEIGHT,
    boxSizing: "border-box",
    backgroundColor: "#144272",
    borderRadius: "30px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center"
  },
  profileImage: {
    width: "190px",
    height: "190px",
    borderRadius: "50%"
  },
  cvImage: {
    width: "190px",
    height: "190px"
  },
  name: {
    fontSize: "3rem",
    color: "#F4FBFF"
  },
  editButton: {
    background: "transparent",
    border: "none",
    color: "#F4FBFF"
  },
  emptyCard: {
    width: "100%",
    height: "180px",
    backgroundColor: "#144272",
    borderRadius: "30px",
    padding: "20px"
  },
  dataBox: {
    color: "#F4FBFF",
    display: "flex",
    flexDirection: "column",
    gap: "12px"
  },
  dataRow: {
    display: "flex",
    justifyContent: "space-between"
  },
  label: {
    fontWeight: "bold"
  },
  cvButton: {
    background: "transparent",
    border: "2px solid #DFF6FF",
    color: "#F4FBFF",
    padding: "10px 20px",
    cursor: "pointer"
  },
  actionCard: {
    width: "100%",
    height: "130px",
    backgroundColor: "#144272",
    borderRadius: "30px",
    border: "none",
    display: "flex",
    alignItems: "center",
    gap: "35px",
    paddingLeft: "45px",
    color: "#F4FBFF",
    fontSize: "2.5rem",
    fontWeight: "bold",
    cursor: "pointer"
  },
  actionText: {
    fontSize: "2.4rem"
  },
  historyCard: {
    width: "100%",
    height: "220px",
    backgroundColor: "#0A2647",
    borderRadius: "30px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "20px"
  },
  historyLeft: {
    width: "35%",
    display: "flex",
    justifyContent: "center"
  },
  historyRight: {
    width: "65%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "20px"
  },
  historyText: {
    color: "#F4FBFF",
    fontSize: "2rem"
  },
  reviewButton: {
    width: "360px",
    height: "60px",
    backgroundColor: "transparent",
    border: "2px solid #DFF6FF",
    color: "#F4FBFF",
    fontSize: "1.1rem",
    cursor: "pointer"
  },
  chatButton: {
    position: "fixed",
    bottom: "25px",
    left: "25px",
    width: "clamp(65px, 5vw, 85px)",
    height: "clamp(65px, 5vw, 85px)",
    borderRadius: "50%",
    backgroundColor: "#EAF6FB",
    border: "2px solid #0A2647",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    boxShadow: "0 8px 20px rgba(10, 38, 71, 0.25)",
    transition: "all 0.2s ease-in-out"
  }
};
export default postulante;
