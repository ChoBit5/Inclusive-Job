import React from "react";
import { postulantTheme } from '../../components/Portal/portalTheme';
import { useSesion } from "../../hooks/Sesion/useSesion.js";
import { useFormularioPostulante } from "../../hooks/Postulante/useDomain.js";
export default function Formulario() {
  const {
    obtenerEstadoFormulario,
    guardarFormulario
  } = useFormularioPostulante();
  const {
    user,
    loading: cargandoSesion,
    allowed
  } = useSesion({
    allowedRoles: ["postulante"],
    required: true
  });
  const [openSection, setOpenSection] = React.useState(0);
  const [enviando, setEnviando] = React.useState(false);
  const [mensaje, setMensaje] = React.useState({
    texto: "",
    tipo: ""
  });
  const [cargando, setCargando] = React.useState(true);
  const [sinSesion, setSinSesion] = React.useState(false);
  const [opcionesDiscapacidad, setOpcionesDiscapacidad] = React.useState([]);
  const [form, setForm] = React.useState({
    tiposDiscapacidad: [],
    descripcionDiscapacidad: "",
    esfuerzoFisico: "",
    experiencia: "",
    habilidades: "",
    fotoPerfil: null
  });
  const t = postulantTheme;
  React.useEffect(() => {
    let activo = true;
    const cargarFormulario = async () => {
      try {
        const estado = await obtenerEstadoFormulario();
        if (!activo) return;
        const catalogo = Array.isArray(estado?.discapacidades) ? estado.discapacidades : [];
        setOpcionesDiscapacidad(catalogo);
        const tiposSeleccionados = Array.isArray(estado?.tipos_discapacidad) ? estado.tipos_discapacidad.map(id => String(id)) : [];
        if (tiposSeleccionados.length > 0) {
          setForm(prev => ({
            ...prev,
            tiposDiscapacidad: tiposSeleccionados
          }));
        }
      } catch (err) {
        if (activo) {
          setMensaje({
            texto: err.message || "No se pudieron cargar los tipos de discapacidad.",
            tipo: "error"
          });
        }
      } finally {
        if (activo) setCargando(false);
      }
    };
    if (cargandoSesion) return;
    if (!allowed || !user?.id) {
      setSinSesion(true);
      setTimeout(() => {
        window.location.href = "/login";
      }, 2000);
      return;
    }
    setSinSesion(false);
    cargarFormulario();
    return () => {
      activo = false;
    };
  }, [allowed, cargandoSesion, obtenerEstadoFormulario, user?.id]);
  const handleRadio = (name, value) => setForm(prev => ({
    ...prev,
    [name]: value
  }));
  const handleText = e => setForm(prev => ({
    ...prev,
    [e.target.name]: e.target.value
  }));
  const handleFile = e => setForm(prev => ({
    ...prev,
    fotoPerfil: e.target.files[0] || null
  }));
  const handleCheckboxTipo = value => {
    setForm(prev => {
      const yaExiste = prev.tiposDiscapacidad.includes(value);
      return {
        ...prev,
        tiposDiscapacidad: yaExiste ? prev.tiposDiscapacidad.filter(v => v !== value) : [...prev.tiposDiscapacidad, value]
      };
    });
  };
  const camposCompletos = {
    tipoDiscapacidad: form.tiposDiscapacidad.length > 0,
    descripcionDiscapacidad: !!form.descripcionDiscapacidad.trim(),
    esfuerzoFisico: !!form.esfuerzoFisico,
    experiencia: !!form.experiencia.trim(),
    habilidades: !!form.habilidades.trim(),
    fotoPerfil: !!form.fotoPerfil
  };
  const totalCampos = Object.keys(camposCompletos).length;
  const camposLlenos = Object.values(camposCompletos).filter(Boolean).length;
  const formularioListo = camposLlenos === totalCampos;
  const progreso = Math.round(camposLlenos / totalCampos * 100);
  const handleSubmit = async e => {
    e.preventDefault();
    setMensaje({
      texto: "",
      tipo: ""
    });
    if (form.tiposDiscapacidad.length === 0) {
      setMensaje({
        texto: "Selecciona al menos un tipo de discapacidad.",
        tipo: "error"
      });
      setOpenSection(0);
      return;
    }
    if (!form.descripcionDiscapacidad.trim()) {
      setMensaje({
        texto: "Describe tu discapacidad.",
        tipo: "error"
      });
      setOpenSection(0);
      return;
    }
    if (!form.esfuerzoFisico) {
      setMensaje({
        texto: "Indica si puedes realizar esfuerzo físico.",
        tipo: "error"
      });
      setOpenSection(0);
      return;
    }
    if (!form.experiencia.trim()) {
      setMensaje({
        texto: "Describe tu experiencia.",
        tipo: "error"
      });
      setOpenSection(1);
      return;
    }
    if (!form.habilidades.trim()) {
      setMensaje({
        texto: "Describe tus habilidades.",
        tipo: "error"
      });
      setOpenSection(1);
      return;
    }
    if (!form.fotoPerfil) {
      setMensaje({
        texto: "Sube una foto de perfil para continuar.",
        tipo: "error"
      });
      setOpenSection(1);
      return;
    }
    const data = new FormData();
    data.append("id_usuario", String(user.id));
    form.tiposDiscapacidad.forEach(tipo => data.append("tipoDiscapacidad[]", tipo));
    data.append("descripcionDiscapacidad", form.descripcionDiscapacidad);
    data.append("esfuerzoFisico", form.esfuerzoFisico);
    data.append("experiencia", form.experiencia);
    data.append("habilidades", form.habilidades);
    data.append("fotoPerfil", form.fotoPerfil);
    setEnviando(true);
    try {
      const json = await guardarFormulario(data);
      if (json.success) {
        setMensaje({
          texto: "¡Perfil guardado correctamente! Redirigiendo...",
          tipo: "ok"
        });
        setTimeout(() => {
          window.location.href = "/postulante";
        }, 2000);
      } else {
        setMensaje({
          texto: json.mensaje || "Error al guardar.",
          tipo: "error"
        });
      }
    } catch {
      setMensaje({
        texto: "Error de red. Verifica tu conexión.",
        tipo: "error"
      });
    } finally {
      setEnviando(false);
    }
  };
  if (cargando || sinSesion) {
    return <div style={{
      width: "100%",
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(180deg, #F8FBFF 0%, #EFF6FF 100%)",
      fontFamily: "'Poppins', system-ui, sans-serif"
    }}>
        <div style={{
        textAlign: "center"
      }}>
          <div style={{
          width: "56px",
          height: "56px",
          borderRadius: "999px",
          border: "4px solid #DBEAFE",
          borderTopColor: "#2563EB",
          margin: "0 auto 20px",
          animation: "spin 0.9s linear infinite"
        }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <p style={{
          color: "#475569",
          fontSize: "15px",
          fontWeight: 600
        }}>
            {sinSesion ? "No hay sesión activa. Redirigiendo al login..." : "Verificando tu sesión..."}
          </p>
        </div>
      </div>;
  }
  return <div style={{
    width: "100%",
    minHeight: "100vh",
    overflowX: "hidden",
    background: `linear-gradient(180deg, ${t.bgElevated} 0%, ${t.accentSoft} 100%)`
  }}>
      <section style={{
      position: 'relative',
      overflow: 'hidden',
      minHeight: '100vh',
      padding: '70px 18px',
      display: 'flex',
      alignItems: 'center',
      fontFamily: "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      background: "linear-gradient(180deg, #F8FBFF 0%, #EFF6FF 35%, #93C5FD 65%, #203361 100%)"
    }}>

        
        <div style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 0
      }}>
          <div style={{
          position: 'absolute',
          top: '-140px',
          right: '-120px',
          width: '390px',
          height: '390px',
          borderRadius: '999px',
          background: 'rgba(37, 99, 235, 0.12)',
          border: '1px solid rgba(37, 99, 235, 0.20)',
          filter: 'blur(1px)'
        }} />
          <div style={{
          position: 'absolute',
          top: '190px',
          left: '-170px',
          width: '350px',
          height: '350px',
          borderRadius: '999px',
          background: 'rgba(14, 165, 233, 0.13)',
          border: '1px solid rgba(14, 165, 233, 0.22)'
        }} />
          <div style={{
          position: 'absolute',
          top: '38%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '620px',
          height: '620px',
          borderRadius: '999px',
          background: 'rgba(37, 99, 235, 0.07)',
          filter: 'blur(18px)',
          opacity: 0.75
        }} />
          <div style={{
          position: 'absolute',
          bottom: '80px',
          right: '55px',
          width: '240px',
          height: '240px',
          borderRadius: '999px',
          background: 'rgba(37, 99, 235, 0.08)',
          border: `1px solid ${t.accentBorder}`
        }} />
          <div style={{
          position: 'absolute',
          top: '28%',
          left: '24%',
          width: '28px',
          height: '28px',
          borderRadius: '999px',
          background: 'rgba(37, 99, 235, 0.18)'
        }} />
          <div style={{
          position: 'absolute',
          bottom: '18%',
          left: '16%',
          width: '38px',
          height: '38px',
          borderRadius: '999px',
          background: 'rgba(14, 165, 233, 0.16)'
        }} />
        </div>

        <div style={{
        position: 'relative',
        zIndex: 1,
        width: '100%',
        maxWidth: '1050px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px'
      }}>

          
          <div style={{
          background: "linear-gradient(135deg, #2448C7 0%, #2563EB 45%, #0EA5E9 100%)",
          borderRadius: '26px',
          padding: '34px',
          boxShadow: '0 24px 60px rgba(37, 99, 235, 0.28)',
          position: 'relative',
          overflow: 'hidden',
          color: '#fff'
        }}>
            <div style={{
            position: 'absolute',
            top: '-80px',
            right: '-70px',
            width: '240px',
            height: '240px',
            borderRadius: '999px',
            background: 'rgba(255,255,255,0.16)'
          }} />
            <div style={{
            position: 'absolute',
            bottom: '-100px',
            left: '-70px',
            width: '230px',
            height: '230px',
            borderRadius: '999px',
            background: 'rgba(255,255,255,0.10)'
          }} />
            <div style={{
            position: 'relative',
            zIndex: 1
          }}>
              <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '7px 14px',
              borderRadius: '999px',
              background: 'rgba(255,255,255,0.16)',
              border: '1px solid rgba(255,255,255,0.25)',
              color: '#fff',
              fontSize: '12px',
              fontWeight: 800,
              marginBottom: '16px'
            }}>
                ✨ Evaluación inicial
              </span>
              <h1 style={{
              margin: 0,
              fontSize: 'clamp(32px, 4vw, 46px)',
              lineHeight: 1.1,
              fontWeight: 900,
              color: '#fff',
              letterSpacing: '-1px'
            }}>
                Evaluación de Perfil
              </h1>
              <p style={{
              margin: '14px 0 0',
              maxWidth: '760px',
              fontSize: '15px',
              lineHeight: 1.8,
              color: 'rgba(255,255,255,0.86)'
            }}>
                Ayúdanos a conocer tus necesidades, habilidades y experiencia profesional para recomendarte oportunidades laborales más compatibles contigo.
              </p>
              <div style={{
              display: 'flex',
              gap: '10px',
              flexWrap: 'wrap',
              marginTop: '24px'
            }}>
                {['Accesibilidad', 'Experiencia', 'Habilidades', 'Perfil profesional'].map(item => <span key={item} style={{
                padding: '7px 12px',
                borderRadius: '999px',
                background: 'rgba(255,255,255,0.14)',
                border: '1px solid rgba(255,255,255,0.22)',
                color: '#fff',
                fontSize: '12px',
                fontWeight: 600
              }}>{item}</span>)}
              </div>
            </div>
          </div>

          
          <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '14px'
        }}>
            {[{
            label: 'Experiencia',
            value: 'Valorada',
            desc: 'Tomamos en cuenta tu trayectoria'
          }, {
            label: 'Perfil laboral',
            value: 'Inicial',
            desc: 'Datos clave para conocer tus necesidades'
          }, {
            label: 'Ajustes requeridos',
            value: 'Personalizados',
            desc: 'Información para adaptar oportunidades'
          }].map(item => <div key={item.label} style={{
            background: '#FFFFFF',
            border: '1px solid rgba(37, 99, 235, 0.14)',
            borderRadius: '18px',
            padding: '18px',
            boxShadow: '0 12px 30px rgba(37, 99, 235, 0.08)'
          }}>
                <p style={{
              margin: 0,
              fontSize: '12px',
              color: '#64748B',
              fontWeight: 700
            }}>{item.label}</p>
                <h3 style={{
              margin: '6px 0 4px',
              fontSize: '24px',
              color: '#0F172A',
              fontWeight: 900
            }}>{item.value}</h3>
                <p style={{
              margin: 0,
              fontSize: '12px',
              color: '#64748B'
            }}>{item.desc}</p>
              </div>)}
          </div>

          
          <div style={{
          background: '#FFFFFF',
          border: '1px solid rgba(37, 99, 235, 0.14)',
          borderRadius: '18px',
          padding: '18px 22px',
          boxShadow: '0 12px 30px rgba(37, 99, 235, 0.08)'
        }}>
            <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '10px'
          }}>
              <p style={{
              margin: 0,
              fontSize: '13px',
              fontWeight: 700,
              color: '#0F172A'
            }}>
                Progreso del formulario
              </p>
              <span style={{
              fontSize: '13px',
              fontWeight: 800,
              color: formularioListo ? '#059669' : '#2563EB'
            }}>
                {camposLlenos}/{totalCampos} campos — {progreso}%
              </span>
            </div>
            <div style={{
            height: '8px',
            borderRadius: '999px',
            background: '#EFF6FF',
            overflow: 'hidden'
          }}>
              <div style={{
              height: '100%',
              width: `${progreso}%`,
              borderRadius: '999px',
              background: formularioListo ? 'linear-gradient(90deg,#059669,#34d399)' : 'linear-gradient(90deg,#2448C7,#0EA5E9)',
              transition: 'width 0.4s ease'
            }} />
            </div>
            <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            marginTop: '12px'
          }}>
              {[{
              key: 'tipoDiscapacidad',
              label: 'Tipo de discapacidad'
            }, {
              key: 'descripcionDiscapacidad',
              label: 'Descripción'
            }, {
              key: 'esfuerzoFisico',
              label: 'Esfuerzo físico'
            }, {
              key: 'experiencia',
              label: 'Experiencia'
            }, {
              key: 'habilidades',
              label: 'Habilidades'
            }, {
              key: 'fotoPerfil',
              label: 'Foto de perfil'
            }].map(({
              key,
              label
            }) => <span key={key} style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '11px',
              fontWeight: 600,
              padding: '4px 10px',
              borderRadius: '999px',
              background: camposCompletos[key] ? '#d1fae5' : '#f1f5f9',
              color: camposCompletos[key] ? '#065f46' : '#64748B',
              border: `1px solid ${camposCompletos[key] ? '#6ee7b7' : '#e2e8f0'}`,
              transition: 'all 0.25s ease'
            }}>
                  {camposCompletos[key] ? '✓' : '○'} {label}
                </span>)}
            </div>
          </div>

          
          {mensaje.texto && <div style={{
          padding: '14px 20px',
          borderRadius: '14px',
          fontSize: '14px',
          fontWeight: 600,
          textAlign: 'center',
          background: mensaje.tipo === "ok" ? "#f0fdf4" : "#fef2f2",
          border: `1px solid ${mensaje.tipo === "ok" ? "#86efac" : "#fca5a5"}`,
          color: mensaje.tipo === "ok" ? "#15803d" : "#dc2626"
        }}>
              {mensaje.tipo === "ok" ? "✅ " : "⚠️ "}{mensaje.texto}
            </div>}

          
          <form onSubmit={handleSubmit} style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>

            {[{
            icon: '♿',
            index: 0,
            title: 'Sobre la discapacidad',
            desc: 'Información necesaria para adaptar oportunidades laborales a tus necesidades.',
            content: <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '26px'
            }}>
                    <div>
                      <p style={{
                  margin: '0 0 12px',
                  fontSize: '14px',
                  fontWeight: 750,
                  color: t.textPrimary
                }}>
                        ¿Cuál es tu tipo de discapacidad? <span style={{
                    fontWeight: 500,
                    color: t.textMuted
                  }}>(puedes elegir más de una)</span>
                      </p>
                      {opcionesDiscapacidad.length === 0 ? <div style={{
                  padding: '14px 15px',
                  borderRadius: '14px',
                  border: `1px solid ${t.border}`,
                  background: t.bgElevated,
                  color: t.textMuted,
                  fontSize: '13px'
                }}>
                          No se pudieron cargar los tipos de discapacidad. Intenta actualizar la pagina.
                        </div> : <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                  gap: '12px'
                }}>
                          {opcionesDiscapacidad.map(op => {
                    const id = String(op.id_tipo_discapacidad);
                    const seleccionado = form.tiposDiscapacidad.includes(id);
                    return <label key={id} style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                      padding: '14px 15px',
                      borderRadius: '14px',
                      border: `1px solid ${seleccionado ? t.accent : t.border}`,
                      background: seleccionado ? t.accentSoft : t.bgElevated,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      color: t.textSecondary,
                      fontSize: '13px',
                      fontWeight: 500
                    }}>
                                <input type="checkbox" name="tipoDiscapacidad" value={id} checked={seleccionado} onChange={() => handleCheckboxTipo(id)} style={{
                        accentColor: t.accent,
                        marginTop: '2px'
                      }} />
                                <span>
                                  <strong style={{
                          display: 'block',
                          color: t.textPrimary,
                          fontSize: '13px'
                        }}>{op.nombre_discapacidad}</strong>
                                  {op.descripcion && <small style={{
                          display: 'block',
                          color: t.textMuted,
                          fontSize: '11.5px',
                          lineHeight: 1.45,
                          marginTop: '3px'
                        }}>{op.descripcion}</small>}
                                </span>
                              </label>;
                  })}
                        </div>}
                    </div>

                    <div>
                      <p style={{
                  margin: '0 0 12px',
                  fontSize: '14px',
                  fontWeight: 750,
                  color: t.textPrimary
                }}>
                        ¿En qué consiste tu discapacidad y qué ajustes requieres?
                      </p>
                      <textarea name="descripcionDiscapacidad" rows="5" value={form.descripcionDiscapacidad} onChange={handleText} placeholder="Describe brevemente tu situación y los ajustes que consideras necesarios..." style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '15px',
                  borderRadius: '14px',
                  border: `1px solid ${t.border}`,
                  background: t.bgElevated,
                  color: t.textPrimary,
                  fontSize: '13.5px',
                  outline: 'none',
                  resize: 'none',
                  lineHeight: 1.6
                }} onFocus={e => {
                  e.currentTarget.style.borderColor = t.accent;
                  e.currentTarget.style.boxShadow = `0 0 0 4px ${t.accentGlow}`;
                }} onBlur={e => {
                  e.currentTarget.style.borderColor = t.border;
                  e.currentTarget.style.boxShadow = 'none';
                }} />
                    </div>

                    <div>
                      <p style={{
                  margin: '0 0 12px',
                  fontSize: '14px',
                  fontWeight: 750,
                  color: t.textPrimary
                }}>
                        ¿Puedes realizar esfuerzo físico?
                      </p>
                      <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: '12px'
                }}>
                        {['Sí', 'No'].map(op => <label key={op} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '14px 15px',
                    borderRadius: '14px',
                    border: `1px solid ${form.esfuerzoFisico === op ? t.accent : t.border}`,
                    background: form.esfuerzoFisico === op ? t.accentSoft : t.bgElevated,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    color: t.textSecondary,
                    fontSize: '13px',
                    fontWeight: 500
                  }}>
                            <input type="radio" name="esfuerzoFisico" value={op} checked={form.esfuerzoFisico === op} onChange={() => handleRadio('esfuerzoFisico', op)} style={{
                      accentColor: t.accent
                    }} />
                            <span>{op}</span>
                          </label>)}
                      </div>
                    </div>
                  </div>
          }, {
            icon: '💼',
            index: 1,
            title: 'Perfil profesional',
            desc: 'Información sobre tu experiencia, habilidades y presentación profesional.',
            content: <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '26px'
            }}>
                    <div>
                      <p style={{
                  margin: '0 0 12px',
                  fontSize: '14px',
                  fontWeight: 750,
                  color: t.textPrimary
                }}>
                        ¿Cuántos años tienes de experiencia y en qué?
                      </p>
                      <textarea name="experiencia" rows="4" value={form.experiencia} onChange={handleText} placeholder="Ejemplo: Tengo 2 años de experiencia en atención al cliente, ventas o soporte técnico..." style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '15px',
                  borderRadius: '14px',
                  border: `1px solid ${t.border}`,
                  background: t.bgElevated,
                  color: t.textPrimary,
                  fontSize: '13.5px',
                  outline: 'none',
                  resize: 'none',
                  lineHeight: 1.6
                }} onFocus={e => {
                  e.currentTarget.style.borderColor = t.accent;
                  e.currentTarget.style.boxShadow = `0 0 0 4px ${t.accentGlow}`;
                }} onBlur={e => {
                  e.currentTarget.style.borderColor = t.border;
                  e.currentTarget.style.boxShadow = 'none';
                }} />
                    </div>

                    <div>
                      <p style={{
                  margin: '0 0 12px',
                  fontSize: '14px',
                  fontWeight: 750,
                  color: t.textPrimary
                }}>
                        ¿Cuáles son tus habilidades?
                      </p>
                      <textarea name="habilidades" rows="4" value={form.habilidades} onChange={handleText} placeholder="Ejemplo: Comunicación, manejo de computadora, trabajo en equipo..." style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '15px',
                  borderRadius: '14px',
                  border: `1px solid ${t.border}`,
                  background: t.bgElevated,
                  color: t.textPrimary,
                  fontSize: '13.5px',
                  outline: 'none',
                  resize: 'none',
                  lineHeight: 1.6
                }} onFocus={e => {
                  e.currentTarget.style.borderColor = t.accent;
                  e.currentTarget.style.boxShadow = `0 0 0 4px ${t.accentGlow}`;
                }} onBlur={e => {
                  e.currentTarget.style.borderColor = t.border;
                  e.currentTarget.style.boxShadow = 'none';
                }} />
                    </div>

                    <div>
                      <p style={{
                  margin: '0 0 12px',
                  fontSize: '14px',
                  fontWeight: 750,
                  color: t.textPrimary
                }}>
                        Foto de perfil profesional <span style={{
                    color: '#dc2626',
                    fontSize: '12px',
                    fontWeight: 600
                  }}>* obligatoria</span>
                      </p>
                      <label style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '100%',
                  minHeight: '185px',
                  boxSizing: 'border-box',
                  border: `2px dashed ${form.fotoPerfil ? '#059669' : t.accentBorder}`,
                  background: form.fotoPerfil ? 'rgba(5,150,105,0.05)' : t.accentSoft,
                  borderRadius: '18px',
                  cursor: 'pointer',
                  padding: '26px',
                  textAlign: 'center',
                  transition: 'all 0.2s ease'
                }} onMouseEnter={e => {
                  e.currentTarget.style.borderColor = form.fotoPerfil ? '#059669' : t.accent;
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }} onMouseLeave={e => {
                  e.currentTarget.style.borderColor = form.fotoPerfil ? '#059669' : t.accentBorder;
                  e.currentTarget.style.transform = 'translateY(0)';
                }}>
                        <div style={{
                    width: '58px',
                    height: '58px',
                    borderRadius: '16px',
                    background: t.bgSurface,
                    border: `1px solid ${form.fotoPerfil ? '#6ee7b7' : t.accentBorder}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '25px',
                    marginBottom: '12px'
                  }}>
                          {form.fotoPerfil ? '✅' : '📷'}
                        </div>
                        <p style={{
                    margin: 0,
                    fontSize: '14px',
                    fontWeight: 700,
                    color: form.fotoPerfil ? '#059669' : t.textPrimary
                  }}>
                          {form.fotoPerfil ? `${form.fotoPerfil.name}` : 'Haz clic para subir una imagen'}
                        </p>
                        <p style={{
                    margin: '5px 0 0',
                    fontSize: '12px',
                    color: t.textMuted
                  }}>
                          Formatos: JPG, PNG o WEBP · Máx. 5 MB
                        </p>
                        <input type="file" name="fotoPerfil" accept="image/*" onChange={handleFile} style={{
                    display: 'none'
                  }} />
                      </label>
                    </div>
                  </div>
          }].map(section => {
            const isOpen = openSection === section.index;
            return <div key={section.title} style={{
              width: '100%',
              display: 'flex',
              flexDirection: 'column'
            }}>
                  <button type="button" onClick={() => setOpenSection(isOpen ? null : section.index)} style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '18px',
                cursor: 'pointer',
                background: isOpen ? `linear-gradient(135deg, ${t.accentSoft}, ${t.bgSurface})` : t.bgSurface,
                border: `1px solid ${isOpen ? t.accentBorder : t.border}`,
                borderRadius: '22px',
                padding: '20px',
                textAlign: 'left',
                transition: 'all 0.25s ease',
                boxShadow: isOpen ? `0 18px 40px ${t.accentGlow}` : '0 10px 28px rgba(15, 23, 42, 0.04)'
              }}>
                    <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px'
                }}>
                      <span style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '15px',
                    background: t.accentSoft,
                    border: `1px solid ${t.accentBorder}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '22px',
                    flexShrink: 0
                  }}>
                        {section.icon}
                      </span>
                      <div>
                        <h2 style={{
                      margin: 0,
                      fontSize: '15px',
                      fontWeight: 800,
                      color: t.textPrimary
                    }}>{section.title}</h2>
                        <p style={{
                      margin: '4px 0 0',
                      fontSize: '12.5px',
                      color: t.textSecondary,
                      lineHeight: 1.5
                    }}>{section.desc}</p>
                      </div>
                    </div>
                    <span style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '999px',
                  background: isOpen ? `linear-gradient(135deg, ${t.accentSoft}, ${t.bgSurface})` : t.bgElevated,
                  border: `1px solid ${isOpen ? t.accentBorder : t.border}`,
                  color: isOpen ? t.accent : t.textSecondary,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'all 0.3s ease',
                  flexShrink: 0
                }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M7 10L12 15L17 10" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </span>
                  </button>

                  <div style={{
                width: '100%',
                overflow: 'hidden',
                maxHeight: isOpen ? '1300px' : '0px',
                opacity: isOpen ? 1 : 0,
                transform: isOpen ? 'translateY(0)' : 'translateY(-8px)',
                transition: 'all 0.45s ease',
                paddingTop: isOpen ? '14px' : '0px'
              }}>
                    <div style={{
                  background: t.bgSurface,
                  border: `1px solid ${t.border}`,
                  borderRadius: '18px',
                  padding: '22px',
                  boxShadow: '0 10px 30px rgba(15, 23, 42, 0.04)'
                }}>
                      {section.content}
                    </div>
                  </div>
                </div>;
          })}

            
            <div style={{
            background: '#FFFFFF',
            border: '1px solid rgba(37, 99, 235, 0.14)',
            borderRadius: '22px',
            padding: '0',
            textAlign: 'center',
            marginTop: '10px',
            boxShadow: '0 16px 40px rgba(37, 99, 235, 0.08)',
            overflow: 'hidden'
          }}>
              <div style={{
              height: '8px',
              background: formularioListo ? 'linear-gradient(90deg,#059669,#34d399)' : 'linear-gradient(90deg, #2448C7 0%, #2563EB 45%, #0EA5E9 100%)',
              transition: 'background 0.4s ease'
            }} />
              <div style={{
              padding: '26px'
            }}>
                <p style={{
                margin: '0 auto 18px',
                maxWidth: '720px',
                fontSize: '13.5px',
                lineHeight: 1.7,
                color: '#475569'
              }}>
                  {formularioListo ? '✅ Todo listo. Puedes enviar tu evaluación.' : `Completa los ${totalCampos - camposLlenos} campo${totalCampos - camposLlenos !== 1 ? 's' : ''} restante${totalCampos - camposLlenos !== 1 ? 's' : ''} para poder enviar.`}
                </p>
                <button type="submit" disabled={enviando || !formularioListo} title={!formularioListo ? 'Completa todos los campos antes de enviar' : ''} style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                background: enviando ? '#93c5fd' : formularioListo ? 'linear-gradient(135deg, #059669 0%, #10b981 100%)' : '#cbd5e1',
                border: 'none',
                borderRadius: '14px',
                padding: '13px 28px',
                color: '#fff',
                fontSize: '14px',
                fontWeight: 800,
                cursor: enviando || !formularioListo ? 'not-allowed' : 'pointer',
                boxShadow: formularioListo && !enviando ? '0 14px 30px rgba(5,150,105,0.32)' : 'none',
                transition: 'all 0.3s ease',
                opacity: !formularioListo && !enviando ? 0.7 : 1
              }} onMouseEnter={e => {
                if (!enviando && formularioListo) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 18px 40px rgba(5,150,105,0.38)';
                }
              }} onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = formularioListo && !enviando ? '0 14px 30px rgba(5,150,105,0.32)' : 'none';
              }}>
                  {enviando ? 'Guardando...' : formularioListo ? 'Enviar evaluación →' : `Faltan ${totalCampos - camposLlenos} campo${totalCampos - camposLlenos !== 1 ? 's' : ''}`}
                </button>
              </div>
            </div>
          </form>
        </div>
      </section>
    </div>;
}
