import React from "react";
import { Link } from "react-router-dom";
import fondo from "../assets/img/Designer (21).png";
import img2 from "../assets/img/Designer1.png";
import fondo4 from "../assets/img/fondoQ.png";
import { useComentariosPublicos } from "../data/interface.js";
function formatFecha(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}
function getIniciales(nombre) {
  return nombre.split(" ").slice(0, 2).map(p => p[0]?.toUpperCase() ?? "").join("");
}
const AVATAR_COLORS = ["#4f46e5", "#0ea5e9", "#059669", "#d97706", "#db2777", "#7c3aed", "#0891b2"];
function avatarColor(nombre) {
  let h = 0;
  for (let i = 0; i < nombre.length; i++) h = nombre.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}
function Reveal({
  children,
  delay = 0,
  className = ""
}) {
  const ref = React.useRef(null);
  const [visible, setVisible] = React.useState(false);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        obs.unobserve(el);
      }
    }, {
      threshold: 0.15,
      rootMargin: "0px 0px -80px 0px"
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return <div ref={ref} className={className} style={{
    opacity: visible ? 1 : 0,
    transform: visible ? "translateY(0)" : "translateY(45px)",
    transition: `opacity 700ms ease, transform 700ms ease`,
    transitionDelay: `${delay}ms`
  }}>
      {children}
    </div>;
}
export default function Home() {
  const {
    cargarComentarios,
    publicarComentario
  } = useComentariosPublicos();
  const [active, setActive] = React.useState(null);
  const [comentarios, setComentarios] = React.useState([]);
  const [cargandoComs, setCargandoComs] = React.useState(true);
  const [nombre, setNombre] = React.useState("");
  const [texto, setTexto] = React.useState("");
  const [enviando, setEnviando] = React.useState(false);
  const [feedback, setFeedback] = React.useState({
    msg: "",
    ok: false
  });
  React.useEffect(() => {
    const cargar = async () => {
      try {
        setComentarios(await cargarComentarios());
      } catch {
        setComentarios([]);
      } finally {
        setCargandoComs(false);
      }
    };
    cargar();
  }, [cargarComentarios]);
  const handleEnviar = async e => {
    e.preventDefault();
    setFeedback({
      msg: "",
      ok: false
    });
    if (!nombre.trim()) {
      setFeedback({
        msg: "Escribe tu nombre.",
        ok: false
      });
      return;
    }
    if (!texto.trim()) {
      setFeedback({
        msg: "Escribe tu comentario.",
        ok: false
      });
      return;
    }
    setEnviando(true);
    try {
      const nuevaLista = await publicarComentario({
        nombre,
        comentario: texto
      });
      setComentarios(nuevaLista);
      setNombre("");
      setTexto("");
      setFeedback({
        msg: "¡Comentario publicado!",
        ok: true
      });
      setTimeout(() => setFeedback({
        msg: "",
        ok: false
      }), 3500);
    } catch {
      setFeedback({
        msg: "Error de red. Inténtalo de nuevo.",
        ok: false
      });
    } finally {
      setEnviando(false);
    }
  };
  const scrollToSection = (e, id) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (!el) return;
    const startY = window.scrollY;
    const targetY = el.getBoundingClientRect().top + startY;
    const distance = targetY - startY;
    const duration = 900;
    let startTime = null;
    const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const step = ts => {
      if (!startTime) startTime = ts;
      const p = Math.min((ts - startTime) / duration, 1);
      window.scrollTo({
        top: startY + distance * ease(p),
        behavior: "auto"
      });
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  const data = [{
    icon: "🤖",
    title: "IA Inteligente",
    desc: "Relaciona habilidades con vacantes ideales automáticamente."
  }, {
    icon: "🏢",
    title: "Empresas y Servicios",
    desc: "Accede a empresas verificadas y oportunidades confiables."
  }, {
    icon: "💬",
    title: "Chat integrado",
    desc: "Comunicación directa entre reclutadores y postulantes."
  }, {
    icon: "📄",
    title: "Perfil profesional",
    desc: "Muestra tu experiencia, CV y certificaciones."
  }];
  return <div className="w-screen min-h-screen bg-gray-100 overflow-x-hidden relative left-1/2 -ml-[50vw]">
      <style>{`html { scroll-behavior: smooth; }`}</style>

      
      <header className="w-full bg-indigo-900 text-white shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between px-6 py-4 gap-4">
          <div className="flex items-center gap-3">
            <img src="/logo.webp" alt="Logo" className="w-10 h-10 object-contain bg-white rounded p-1" />
            <h1 className="text-xl font-semibold">InclusiveJobIA</h1>
          </div>
          <nav className="flex flex-wrap justify-center md:justify-start gap-4 text-sm">
            <a href="#quienes" onClick={e => scrollToSection(e, "quienes")} className="hover:opacity-70 cursor-pointer">Quienes somos</a>
            <a href="#empieza" onClick={e => scrollToSection(e, "empieza")} className="hover:opacity-70 cursor-pointer">Empieza tu camino</a>
            <a href="#como-funciona" onClick={e => scrollToSection(e, "como-funciona")} className="hover:opacity-70 cursor-pointer">Como funciona</a>
            <a href="#comentarios" onClick={e => scrollToSection(e, "comentarios")} className="hover:opacity-70 cursor-pointer">Comentarios</a>
          </nav>
          <span className="italic text-sm opacity-80 hidden md:block">"Demostrando que nada realmente te detiene."</span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6">

        
        <section className="relative w-screen left-1/2 -ml-[50vw] min-h-[620px] flex items-center overflow-hidden">
          <div className="absolute inset-0">
            <img src={fondo4} alt="Fondo" className="w-full h-full object-cover object-center" />
            <div className="absolute inset-0 bg-black/60" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
          </div>
          <div className="relative z-10 max-w-7xl mx-auto px-6 w-full">
            <Reveal className="max-w-xl text-white">
              <span className="inline-flex items-center px-4 py-2 rounded-full bg-white/15 backdrop-blur border border-white/20 text-sm font-medium mb-6">
                Plataforma inclusiva con IA
              </span>
              <h2 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
                Encuentra empleo <span className="text-indigo-300">sin barreras</span>
              </h2>
              <p className="text-white/85 mb-8 text-lg leading-relaxed">
                Plataforma inclusiva que conecta personas con discapacidad y adultos mayores
                con oportunidades laborales reales utilizando inteligencia artificial.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/login" className="bg-indigo-700 hover:bg-indigo-600 transition text-white px-7 py-3 rounded-xl shadow-lg font-medium text-center">Iniciar sesión</Link>
                <Link to="/registro" className="bg-white/10 border border-white/30 backdrop-blur hover:bg-white/20 transition text-white px-7 py-3 rounded-xl font-medium text-center">Crear cuenta</Link>
              </div>
            </Reveal>
          </div>
        </section>

        
        <section id="quienes" className="relative py-24 w-screen left-1/2 -ml-[50vw] bg-slate-950 overflow-hidden">
          <div className="absolute -top-32 -right-24 w-96 h-96 bg-indigo-700/20 rounded-full blur-3xl" />
          <div className="absolute bottom-[-120px] -left-24 w-96 h-96 bg-purple-700/20 rounded-full blur-3xl" />
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-indigo-400/40 to-transparent" />
          <div className="relative max-w-6xl mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
              <Reveal>
                <span className="inline-flex items-center px-4 py-2 rounded-full bg-white/10 border border-white/15 text-indigo-200 text-sm font-medium mb-5">Sobre nosotros</span>
                <h3 className="text-3xl md:text-5xl font-bold text-white mb-6 leading-tight">¿Quiénes somos?</h3>
                <p className="text-gray-300 text-lg leading-relaxed">
                  InclusiveJobIA nace para eliminar las barreras en la búsqueda de empleo,
                  ofreciendo una plataforma accesible, segura y adaptada a las necesidades de cada usuario.
                </p>
              </Reveal>
              <Reveal delay={180} className="bg-white/10 backdrop-blur-xl border border-white/15 rounded-3xl p-6 md:p-8 shadow-2xl">
                <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 text-indigo-200 flex items-center justify-center text-2xl mb-5">🤝</div>
                <h4 className="text-xl font-semibold text-white mb-4">Conectamos talento con empresas inclusivas</h4>
                <p className="text-gray-300 leading-relaxed mb-6">
                  Nuestra plataforma utiliza tecnología e inteligencia artificial para acercar oportunidades
                  laborales reales a personas que buscan un empleo digno, accesible y compatible con sus habilidades.
                </p>
                <div className="grid grid-cols-3 gap-4">
                  {[["IA", "Compatibilidad"], ["+Acceso", "Inclusión"], ["Seguro", "Confianza"]].map(([v, l]) => <div key={l} className="bg-white/10 rounded-2xl p-4 border border-white/10">
                      <p className="text-2xl font-bold text-white">{v}</p>
                      <p className="text-xs text-gray-300 mt-1">{l}</p>
                    </div>)}
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        
        <section className="flex flex-col md:flex-row items-center justify-center gap-10 md:gap-16 py-14 max-w-6xl mx-auto px-4">
          <Reveal className="max-w-md text-center md:text-left">
            <h3 className="text-3xl font-bold text-indigo-800 mb-4">Inclusión real en el mercado laboral</h3>
            <p className="text-gray-600 text-lg leading-relaxed">
              Utilizamos tecnología e inteligencia artificial para mejorar la compatibilidad entre
              postulantes y empresas, reduciendo la desigualdad y promoviendo un entorno laboral más justo.
            </p>
          </Reveal>
          <Reveal delay={180} className="flex justify-center">
            <div className="w-64 h-64 rounded-full border border-indigo-200 bg-white flex items-center justify-center">
              <img src={img2} alt="valor" className="w-44 h-44 object-contain" />
            </div>
          </Reveal>
        </section>

        
        <section id="empieza" className="relative py-24 w-screen left-1/2 -ml-[50vw] bg-slate-950 overflow-hidden">
          <div className="absolute -top-32 -left-24 w-96 h-96 bg-indigo-700/20 rounded-full blur-3xl" />
          <div className="absolute bottom-[-120px] -right-24 w-96 h-96 bg-purple-700/20 rounded-full blur-3xl" />
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-indigo-400/40 to-transparent" />
          <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-purple-400/30 to-transparent" />
          <div className="relative max-w-6xl mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
              <Reveal>
                <span className="inline-flex items-center px-4 py-2 rounded-full bg-white/10 border border-white/15 text-indigo-200 text-sm font-medium mb-5">Comienza ahora</span>
                <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 leading-tight">Empieza tu camino laboral hoy mismo</h2>
                <p className="text-gray-300 text-lg leading-relaxed mb-8">
                  Descubre oportunidades inclusivas y conecta con empresas que valoran tu talento,
                  tus habilidades y tu experiencia.
                </p>
              </Reveal>
              <Reveal delay={180} className="bg-white/10 backdrop-blur-xl border border-white/15 rounded-3xl p-6 md:p-8 shadow-2xl">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-200 flex items-center justify-center text-2xl">🚀</div>
                  <div>
                    <h3 className="text-xl font-semibold text-white">Funcionalidades principales</h3>
                    <p className="text-sm text-gray-400">Herramientas pensadas para facilitar tu búsqueda.</p>
                  </div>
                </div>
                <div className="flex flex-col gap-4">
                  {data.map((item, i) => {
                  const isOpen = active === i;
                  return <div key={i} onClick={() => setActive(isOpen ? null : i)} className={`group border rounded-2xl p-4 cursor-pointer transition-all duration-300 ${isOpen ? "bg-white/15 border-indigo-300/40 shadow-xl" : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"}`}>
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl transition ${isOpen ? "bg-indigo-500/25 text-indigo-100" : "bg-white/10 text-indigo-200"}`}>{item.icon}</div>
                            <span className="text-white font-medium">{item.title}</span>
                          </div>
                          <span className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${isOpen ? "rotate-90 bg-indigo-500/20 text-indigo-200" : "bg-white/10 text-gray-400 group-hover:text-white"}`}>→</span>
                        </div>
                        <div className={`overflow-hidden transition-all duration-300 ${isOpen ? "max-h-40 mt-4 opacity-100" : "max-h-0 opacity-0"}`}>
                          <p className="text-sm text-gray-300 leading-relaxed pl-[60px]">{item.desc}</p>
                        </div>
                      </div>;
                })}
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        
        <section id="como-funciona" className="py-20 text-center">
          <div className="max-w-7xl mx-auto px-6">
            <div className="mb-16">
              <h2 className="text-3xl font-bold text-gray-800">¿Cómo funciona InclusiveJobIA?</h2>
              <p className="text-gray-600 mt-3">Descubre cómo nuestra plataforma conecta talento con oportunidades.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-10">
              {[{
              step: "01",
              icon: "👤",
              title: "Crea tu perfil",
              items: ["Agrega tus habilidades", "Sube tu experiencia", "Completa tu CV", "Personaliza tu perfil"]
            }, {
              step: "02",
              icon: "🤖",
              title: "IA analiza tu perfil",
              items: ["Analiza tus habilidades", "Relaciona vacantes", "Detecta oportunidades", "Optimiza tu búsqueda"]
            }, {
              step: "03",
              icon: "📩",
              title: "Postúlate fácilmente",
              items: ["Envía solicitudes", "Contacta empresas", "Recibe respuestas", "Da seguimiento"]
            }].map((item, i) => <Reveal key={i} delay={i * 140} className="bg-white p-7 rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-1 transition text-left">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-indigo-100 text-indigo-700 rounded-lg flex items-center justify-center text-xl">{item.icon}</div>
                    <span className="text-sm font-semibold text-indigo-500">{item.step}</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">{item.title}</h3>
                  <ul className="space-y-2 text-sm text-gray-600">
                    {item.items.map((l, idx) => <li key={idx} className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-indigo-500 rounded-full" />{l}
                      </li>)}
                  </ul>
                </Reveal>)}
            </div>
          </div>
        </section>

        
        <section id="comentarios" className="relative py-10 w-screen left-1/2 -ml-[50vw]">
          <div className="absolute inset-0 w-full h-full">
            <img src={fondo} alt="fondo" className="w-full h-full object-cover object-center" />
            <div className="absolute inset-0 bg-black/60" />
          </div>

          <style>{`.no-scrollbar::-webkit-scrollbar{display:none}.no-scrollbar{-ms-overflow-style:none;scrollbar-width:none}`}</style>

          <div className="relative max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">

            
            <Reveal className="bg-white/90 backdrop-blur p-6 rounded-xl shadow-lg h-[420px] overflow-y-auto no-scrollbar relative">
              <h2 className="text-2xl font-bold mb-6 text-gray-800 text-center">
                Lo que dicen nuestros usuarios
              </h2>

              {cargandoComs && <div className="flex flex-col items-center justify-center gap-3 py-10">
                  <div style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                border: "3px solid #e0e7ff",
                borderTopColor: "#4f46e5",
                animation: "spin 0.8s linear infinite"
              }} />
                  <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                  <p className="text-gray-400 text-sm">Cargando comentarios...</p>
                </div>}

              {!cargandoComs && comentarios.length === 0 && <div className="flex flex-col items-center justify-center gap-2 py-10">
                  <span className="text-4xl">💬</span>
                  <p className="text-gray-500 text-sm text-center">
                    Aún no hay comentarios. ¡Sé el primero en compartir tu experiencia!
                  </p>
                </div>}

              {!cargandoComs && comentarios.length > 0 && <div className="flex flex-col gap-8 px-2 pb-6">
                  {comentarios.map(c => {
                const color = avatarColor(c.nombre);
                const iniciales = getIniciales(c.nombre);
                return <div key={c.id} className="relative bg-white p-6 rounded-2xl shadow-md hover:shadow-xl transition">
                        <div className="absolute -top-6 left-6">
                          <div style={{
                      width: 48,
                      height: 48,
                      borderRadius: "50%",
                      background: color,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff",
                      fontWeight: 700,
                      fontSize: 16,
                      border: "2px solid #fff",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.15)"
                    }}>
                            {iniciales}
                          </div>
                        </div>
                        <p className="text-gray-600 text-sm mt-4 leading-relaxed">"{c.comentario}"</p>
                        <div className="flex items-center justify-between mt-4">
                          <p className="text-sm font-semibold text-gray-800">— {c.nombre}</p>
                          <p className="text-xs text-gray-400">{formatFecha(c.fecha)}</p>
                        </div>
                      </div>;
              })}
                </div>}

              <div className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-white to-transparent pointer-events-none rounded-b-xl" />
            </Reveal>

            
            <Reveal delay={180} className="bg-white/90 backdrop-blur p-6 rounded-xl shadow-lg h-[420px] flex flex-col justify-between" style={{
            position: "relative"
          }}>

              
              <div style={{
              position: "absolute",
              bottom: "80px",
              left: "50%",
              transform: feedback.msg ? "translateX(-50%) translateY(0)" : "translateX(-50%) translateY(8px)",
              opacity: feedback.msg ? 1 : 0,
              transition: "opacity 0.3s ease, transform 0.3s ease",
              pointerEvents: "none",
              zIndex: 10,
              whiteSpace: "nowrap"
            }}>
                <div className={`text-sm font-semibold px-5 py-2 rounded-full shadow-lg ${feedback.ok ? "bg-green-500 text-white" : "bg-red-500 text-white"}`}>
                  {feedback.ok ? "✅ " : "⚠️ "}{feedback.msg}
                </div>
              </div>

              <div>
                <h2 className="text-2xl font-bold mb-6 text-gray-800 text-center">
                  Comparte tu experiencia
                </h2>
                <form onSubmit={handleEnviar} className="flex flex-col gap-4">
                  <input type="text" placeholder="Tu nombre" value={nombre} onChange={e => setNombre(e.target.value)} maxLength={150} className="p-3 rounded-xl bg-gray-100 focus:bg-white border border-transparent focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition" />
                  <textarea placeholder="Escribe tu comentario..." rows="4" value={texto} onChange={e => setTexto(e.target.value)} maxLength={1000} className="p-3 rounded-xl bg-gray-100 focus:bg-white border border-transparent focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition resize-none" />
                  <p className="text-xs text-gray-400 text-right -mt-2">{texto.length}/1000</p>

                  <button type="submit" disabled={enviando} className={`mt-1 text-white py-3 rounded-xl shadow-lg transition-all font-medium ${enviando ? "bg-indigo-400 cursor-not-allowed" : "bg-indigo-800 hover:bg-indigo-700 hover:scale-105"}`}>
                    {enviando ? "Enviando..." : "Enviar comentario"}
                  </button>
                </form>
              </div>
            </Reveal>

          </div>
        </section>

      </main>

      
      <footer className="bg-indigo-900 text-indigo-100">
        <div className="max-w-7xl mx-auto px-6 py-16 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-white rounded" />
              <h1 className="text-lg font-bold text-white">InclusiveJobIA</h1>
            </div>
            <p className="text-sm text-indigo-200">Plataforma enfocada en la inclusión laboral, conectando talento con oportunidades mediante inteligencia artificial.</p>
            <div className="flex gap-4 mt-5">
              <div className="bg-white/20 p-2 rounded-full cursor-pointer hover:bg-white/30 transition">👍</div>
              <div className="bg-white/20 p-2 rounded-full cursor-pointer hover:bg-white/30 transition">💼</div>
            </div>
          </div>
          <div>
            <h3 className="text-white font-semibold mb-4">Contáctanos</h3>
            <ul className="space-y-3 text-sm text-indigo-200">
              <li className="flex items-center gap-2">📧 <span>contacto@inclusivejobia.com</span></li>
              <li className="flex items-center gap-2">📱 <span>+52 55 0000 0000</span></li>
              <li className="flex items-center gap-2">📍 <span>Ciudad de México, México</span></li>
            </ul>
          </div>
          <div>
            <h3 className="text-white font-semibold mb-4">Mantente informado</h3>
            <p className="text-sm text-indigo-200 mb-4">Recibe noticias y actualizaciones de nuestra plataforma.</p>
            <form className="flex flex-col gap-3">
              <input type="email" placeholder="Ingresa tu correo" className="rounded-full px-5 py-3 bg-indigo-800 border border-indigo-700 text-white placeholder-indigo-300 focus:outline-none focus:border-white" />
              <button className="rounded-full bg-white text-indigo-900 px-6 py-3 font-medium hover:bg-indigo-100 transition">Enviar</button>
            </form>
          </div>
        </div>
        <div className="border-t border-indigo-800 py-6 px-6">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between text-sm text-indigo-300 gap-4">
            <p>© 2026 InclusiveJobIA. Todos los derechos reservados.</p>
            <div className="flex flex-col sm:flex-row gap-4">
              <span className="hover:text-white cursor-pointer transition">Términos</span>
              <span className="hover:text-white cursor-pointer transition">Privacidad</span>
              <span className="hover:text-white cursor-pointer transition">Blog</span>
            </div>
          </div>
        </div>
      </footer>
    </div>;
}
