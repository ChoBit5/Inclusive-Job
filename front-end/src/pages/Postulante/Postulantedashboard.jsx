import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, BookmarkCheck, Award, Accessibility, Clock, CheckCircle, ArrowRight, Sparkles, MapPin, Briefcase, ChevronRight, FileText, Bell } from 'lucide-react';
import PortalLayout from '../../components/Portal/Portallayout';
import { postulantTheme as t } from '../../components/Portal/portalTheme';
import { postulantNav } from '../../components/Portal/Navitems';
import { usePostulanteDashboard } from '../../data/interface.js';
function useCountUp(end, duration = 1200) {
  const [v, setV] = useState(0);
  const raf = useRef(null);
  useEffect(() => {
    const s = performance.now();
    const step = now => {
      const p = Math.min((now - s) / duration, 1);
      setV(Math.floor((1 - Math.pow(1 - p, 4)) * end));
      if (p < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [end, duration]);
  return v;
}
function formatSalario(min, max) {
  const fmt = n => `$${Number(n).toLocaleString('es-MX')}`;
  if (!min && !max) return 'Salario a convenir';
  if (!max) return `Desde ${fmt(min)} MXN`;
  if (!min) return `Hasta ${fmt(max)} MXN`;
  return `${fmt(min)} - ${fmt(max)} MXN`;
}
const ESTADO_STYLE = {
  pendiente: {
    bg: '#fef3c7',
    text: '#92400e',
    border: '#fde68a'
  },
  entrevista: {
    bg: '#ede9fe',
    text: '#5b21b6',
    border: '#c4b5fd'
  },
  aceptado: {
    bg: '#d1fae5',
    text: '#065f46',
    border: '#6ee7b7'
  },
  rechazado: {
    bg: '#fee2e2',
    text: '#991b1b',
    border: '#fca5a5'
  }
};
function StatCard({
  label,
  value,
  icon: Icon,
  color
}) {
  const n = useCountUp(value);
  return <div style={{
    background: '#fff',
    border: `1px solid ${t.border}`,
    borderRadius: '16px',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    boxShadow: '0 1px 4px rgba(15,23,41,0.05)',
    transition: 'transform 0.2s, box-shadow 0.2s',
    cursor: 'default'
  }} onMouseEnter={e => {
    e.currentTarget.style.transform = 'translateY(-2px)';
    e.currentTarget.style.boxShadow = `0 8px 24px ${color}18`;
  }} onMouseLeave={e => {
    e.currentTarget.style.transform = 'none';
    e.currentTarget.style.boxShadow = '0 1px 4px rgba(15,23,41,0.05)';
  }}>
      <div style={{
      width: '40px',
      height: '40px',
      borderRadius: '12px',
      background: `${color}12`,
      border: `1px solid ${color}25`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
        <Icon size={19} style={{
        color
      }} />
      </div>
      <div>
        <p style={{
        margin: 0,
        fontSize: '30px',
        fontWeight: 800,
        color: t.textPrimary,
        letterSpacing: '-1.5px',
        lineHeight: 1
      }}>{n}</p>
        <p style={{
        margin: '4px 0 0',
        fontSize: '12.5px',
        color: t.textSecondary
      }}>{label}</p>
      </div>
    </div>;
}
function Badge({
  estado
}) {
  const s = ESTADO_STYLE[estado] || ESTADO_STYLE.pendiente;
  return <span style={{
    display: 'inline-flex',
    alignItems: 'center',
    padding: '3px 10px',
    borderRadius: '999px',
    fontSize: '11px',
    fontWeight: 600,
    background: s.bg,
    color: s.text,
    border: `1px solid ${s.border}`
  }}>
      {estado}
    </span>;
}
function Card({
  children,
  style = {}
}) {
  return <div style={{
    background: '#fff',
    border: `1px solid ${t.border}`,
    borderRadius: '18px',
    overflow: 'hidden',
    boxShadow: '0 1px 4px rgba(15,23,41,0.05)',
    ...style
  }}>
      {children}
    </div>;
}
function SectionHead({
  title,
  sub,
  action,
  onAction
}) {
  return <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '18px 20px',
    borderBottom: `1px solid ${t.border}`
  }}>
      <div>
        <h2 style={{
        margin: 0,
        fontSize: '14px',
        fontWeight: 700,
        color: t.textPrimary
      }}>{title}</h2>
        {sub && <p style={{
        margin: '2px 0 0',
        fontSize: '12px',
        color: t.textMuted
      }}>{sub}</p>}
      </div>
      {action && <button onClick={onAction} style={{
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      fontSize: '12px',
      color: t.accent,
      fontWeight: 600,
      padding: '4px 8px',
      borderRadius: '6px'
    }}>
          {action} <ArrowRight size={13} />
        </button>}
    </div>;
}
function CompatibleBadge() {
  const color = '#2563eb';
  return <span style={{
    display: 'flex',
    alignItems: 'center',
    gap: '3px',
    fontSize: '12px',
    fontWeight: 700,
    color,
    background: `${color}10`,
    border: `1px solid ${color}25`,
    padding: '3px 9px',
    borderRadius: '999px'
  }}>
      <Sparkles size={11} />Compatible
    </span>;
}
export default function PostulanteDashboard() {
  const navigate = useNavigate();
  const {
    data,
    loading,
    error,
    refetch
  } = usePostulanteDashboard();
  const dashboardUser = data?.user ?? {};
  const perfilCompletado = Number(data?.perfil?.completado ?? 0);
  const checklist = data?.perfil?.checklist ?? [];
  const postulacionesRecientes = data?.postulaciones_recientes ?? [];
  const vacantesRecomendadas = data?.vacantes_recomendadas ?? [];
  const stats = [{
    label: 'Postulaciones',
    value: Number(data?.stats?.postulaciones ?? 0),
    icon: BookmarkCheck,
    color: '#2563eb'
  }, {
    label: 'En proceso',
    value: Number(data?.stats?.en_proceso ?? 0),
    icon: Clock,
    color: '#7c3aed'
  }, {
    label: 'Aceptadas',
    value: Number(data?.stats?.aceptadas ?? 0),
    icon: CheckCircle,
    color: '#059669'
  }, {
    label: 'Vacantes nuevas',
    value: Number(data?.stats?.vacantes_nuevas ?? 0),
    icon: Sparkles,
    color: '#0ea5e9'
  }];
  const perfilCompleto = perfilCompletado >= 100;
  const pasosPendientes = checklist.filter(c => !c.done).length;
  const firstName = (dashboardUser.nombre || 'Postulante').split(' ')[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches';
  return <PortalLayout theme={t} navItems={postulantNav} user={dashboardUser} pageTitle="Inicio" notifications={stats[3].value} headerActions={<button onClick={() => navigate('/postulante/vacantes')} style={{
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    background: t.gradient,
    border: 'none',
    borderRadius: '10px',
    padding: '8px 16px',
    color: '#fff',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: `0 4px 14px ${t.accentGlow}`
  }}>
          <Search size={14} /> Buscar vacantes
        </button>}>
      
      <style>{`
        @keyframes floatBlob {
          0%,100%{transform:translate(0,0) scale(1)}
          50%{transform:translate(15px,-20px) scale(1.05)}
        }
        .hero-blob {
          position:absolute; border-radius:50%; filter:blur(60px); pointer-events:none; animation:floatBlob 10s ease-in-out infinite;
        }
      `}</style>

      <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
      maxWidth: '1400px',
      margin: '0 auto',
      position: 'relative'
    }}>
        {loading && <Card>
            <div style={{
          padding: '18px 20px',
          color: t.textSecondary,
          fontSize: '13px',
          fontWeight: 600
        }}>
              Cargando tu dashboard...
            </div>
          </Card>}

        {error && <div style={{
        padding: '14px 20px',
        borderRadius: '14px',
        background: '#fef2f2',
        border: '1px solid #fca5a5',
        color: '#dc2626',
        fontSize: '14px',
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px'
      }}>
            <span>No se pudo cargar tu dashboard: {error}</span>
            <button onClick={refetch} style={{
          border: '1px solid #fca5a5',
          background: '#fff',
          color: '#991b1b',
          borderRadius: '8px',
          padding: '6px 10px',
          fontWeight: 700,
          cursor: 'pointer'
        }}>
              Reintentar
            </button>
          </div>}

        
        <div style={{
        position: 'relative',
        borderRadius: '20px',
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 50%, #0ea5e9 100%)',
        padding: '32px 28px',
        color: '#fff',
        minHeight: '160px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: '20px'
      }}>
          
          <div className="hero-blob" style={{
          width: '300px',
          height: '300px',
          background: 'rgba(255,255,255,0.08)',
          top: '-80px',
          right: '-60px',
          animationDelay: '0s'
        }} />
          <div className="hero-blob" style={{
          width: '200px',
          height: '200px',
          background: 'rgba(14,165,233,0.25)',
          bottom: '-60px',
          left: '30%',
          animationDelay: '3s'
        }} />
          <div style={{
          position: 'relative',
          zIndex: 1
        }}>
            <p style={{
            margin: '0 0 4px',
            fontSize: '13px',
            opacity: 0.8,
            fontWeight: 500
          }}>{greeting},</p>
            <h1 style={{
            margin: '0 0 6px',
            fontSize: '26px',
            fontWeight: 800,
            letterSpacing: '-0.5px',
            lineHeight: 1.1
          }}>
              {firstName} 👋
            </h1>
            <p style={{
            margin: 0,
            fontSize: '14px',
            opacity: 0.8
          }}>
              Tienes <strong style={{
              color: '#bfdbfe'
            }}>{stats[3].value} vacantes nuevas</strong> compatibles con tu perfil.
            </p>
          </div>

          
          <div style={{
          position: 'relative',
          zIndex: 1,
          background: 'rgba(255,255,255,0.12)',
          borderRadius: '12px',
          padding: '14px 16px',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.2)',
          maxWidth: '400px'
        }}>
            <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '8px'
          }}>
              <span style={{
              fontSize: '12.5px',
              fontWeight: 600
            }}>Perfil completado</span>
              <span style={{
              fontSize: '12.5px',
              fontWeight: 800,
              color: '#bfdbfe'
            }}>{perfilCompletado}%</span>
            </div>
            <div style={{
            height: '6px',
            borderRadius: '999px',
            background: 'rgba(255,255,255,0.2)'
          }}>
              <div style={{
              height: '100%',
              width: `${perfilCompletado}%`,
              borderRadius: '999px',
              background: '#fff',
              transition: 'width 1s ease'
            }} />
            </div>
            <p style={{
            margin: '8px 0 0',
            fontSize: '11px',
            opacity: 0.75
          }}>
              {perfilCompleto ? 'Tu perfil ya esta completo y listo para recibir mejores oportunidades.' : 'Completa tu CV y certificaciones para mejorar tus resultados.'}
            </p>
          </div>
        </div>

        
        <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: '14px'
      }}>
          {stats.map(s => <StatCard key={s.label} {...s} />)}
        </div>

        
        <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr',
        gap: '16px'
      }} className="xl:!grid-cols-[1fr_360px]">

          
          <Card>
            <SectionHead title="Fortaleza de tu perfil" sub="Completa los pasos para aparecer primero ante los reclutadores" action="Completar perfil" onAction={() => navigate('/formulario')} />
            <div style={{
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}>

              
              <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '20px',
              flexWrap: 'wrap'
            }}>
                
                <div style={{
                position: 'relative',
                width: '88px',
                height: '88px',
                flexShrink: 0
              }}>
                  <svg width="88" height="88" style={{
                  transform: 'rotate(-90deg)'
                }}>
                    
                    <circle cx="44" cy="44" r="36" fill="none" stroke={t.border} strokeWidth="7" />
                    
                    <circle cx="44" cy="44" r="36" fill="none" stroke="url(#ringGrad)" strokeWidth="7" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 36}`} strokeDashoffset={`${2 * Math.PI * 36 * (1 - perfilCompletado / 100)}`} style={{
                    transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)'
                  }} />
                    <defs>
                      <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#2563eb" />
                        <stop offset="100%" stopColor="#0ea5e9" />
                      </linearGradient>
                    </defs>
                  </svg>
                  
                  <div style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                    <span style={{
                    fontSize: '20px',
                    fontWeight: 800,
                    color: t.textPrimary,
                    letterSpacing: '-1px',
                    lineHeight: 1
                  }}>
                      {perfilCompletado}%
                    </span>
                  </div>
                </div>

                
                <div style={{
                flex: 1,
                minWidth: '180px'
              }}>
                  <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: perfilCompleto ? '#d1fae5' : '#fef3c7',
                  border: `1px solid ${perfilCompleto ? '#6ee7b7' : '#fde68a'}`,
                  borderRadius: '999px',
                  padding: '3px 10px',
                  marginBottom: '8px'
                }}>
                    <span style={{
                    fontSize: '12px'
                  }}>{perfilCompleto ? '✓' : '⚡'}</span>
                    <span style={{
                    fontSize: '11.5px',
                    fontWeight: 700,
                    color: perfilCompleto ? '#065f46' : '#92400e'
                  }}>
                      {perfilCompleto ? 'Perfil completado' : 'Perfil en construccion'}
                    </span>
                  </div>
                  <p style={{
                  margin: '0 0 4px',
                  fontSize: '14px',
                  fontWeight: 700,
                  color: t.textPrimary
                }}>
                    {perfilCompleto ? 'Tu perfil esta completo y listo para destacar' : `Te faltan ${pasosPendientes} pasos para el perfil completo`}
                  </p>
                  <p style={{
                  margin: 0,
                  fontSize: '12.5px',
                  color: t.textSecondary,
                  lineHeight: 1.5
                }}>
                    {perfilCompleto ? 'Ya tienes la informacion clave para que los reclutadores evaluen mejor tu perfil.' : <>Un perfil al 100% aparece <strong style={{
                      color: t.accent
                    }}>4x mas</strong> en busquedas de reclutadores.</>}
                  </p>
                </div>
              </div>

              
              <ul style={{
              margin: 0,
              padding: 0,
              listStyle: 'none',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
                {checklist.map(item => <li key={item.id} onClick={() => !item.done && navigate(item.path)} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 14px',
                borderRadius: '10px',
                border: `1px solid ${item.done ? 'rgba(5,150,105,0.2)' : t.border}`,
                background: item.done ? 'rgba(5,150,105,0.04)' : t.bgElevated,
                cursor: item.done ? 'default' : 'pointer',
                transition: 'border-color 0.15s, background 0.15s'
              }} onMouseEnter={e => {
                if (!item.done) {
                  e.currentTarget.style.borderColor = t.accentBorder;
                  e.currentTarget.style.background = t.accentSoft;
                }
              }} onMouseLeave={e => {
                if (!item.done) {
                  e.currentTarget.style.borderColor = t.border;
                  e.currentTarget.style.background = t.bgElevated;
                }
              }}>
                    
                    <div style={{
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  flexShrink: 0,
                  background: item.done ? '#059669' : 'transparent',
                  border: `2px solid ${item.done ? '#059669' : t.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s'
                }}>
                      {item.done ? <CheckCircle size={13} style={{
                    color: '#fff'
                  }} /> : <span style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: t.textMuted,
                    display: 'block'
                  }} />}
                    </div>

                    
                    <span style={{
                  flex: 1,
                  fontSize: '13px',
                  fontWeight: item.done ? 500 : 600,
                  color: item.done ? '#059669' : t.textPrimary,
                  textDecoration: item.done ? 'line-through' : 'none',
                  opacity: item.done ? 0.7 : 1
                }}>
                      {item.label}
                    </span>

                    
                    <span style={{
                  fontSize: '11px',
                  color: item.done ? '#059669' : t.textMuted,
                  fontWeight: 600,
                  flexShrink: 0
                }}>
                      +{item.peso}%
                    </span>

                    
                    {!item.done && <ChevronRight size={14} style={{
                  color: t.accent,
                  flexShrink: 0
                }} />}
                  </li>)}
              </ul>

            </div>
          </Card>

          
          <Card>
            <SectionHead title="Estado de postulaciones" action="Ver todas" onAction={() => navigate('/postulante/postulaciones')} />
            <ul style={{
            margin: 0,
            padding: 0,
            listStyle: 'none'
          }}>
              {postulacionesRecientes.length > 0 ? postulacionesRecientes.map((p, i) => <li key={p.id} style={{
              padding: '14px 20px',
              borderBottom: i < postulacionesRecientes.length - 1 ? `1px solid ${t.border}` : 'none',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
                  <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: '8px'
              }}>
                    <div style={{
                  flex: 1,
                  minWidth: 0
                }}>
                      <p style={{
                    margin: 0,
                    fontSize: '13.5px',
                    fontWeight: 700,
                    color: t.textPrimary,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>{p.vacante}</p>
                      <p style={{
                    margin: '2px 0 0',
                    fontSize: '11.5px',
                    color: t.textMuted
                  }}>{p.empresa}</p>
                    </div>
                    <Badge estado={p.estado} />
                  </div>
                  <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                    <span style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '11px',
                  color: t.textMuted
                }}>
                      <MapPin size={10} />{p.modalidad}
                    </span>
                    <span style={{
                  color: t.border
                }}>·</span>
                    <span style={{
                  fontSize: '11px',
                  color: t.textMuted
                }}>
                      {new Date(p.fecha).toLocaleDateString('es-MX', {
                    day: 'numeric',
                    month: 'short'
                  })}
                    </span>
                  </div>
                </li>) : <li style={{
              padding: '18px 20px',
              color: t.textMuted,
              fontSize: '13px'
            }}>
                  Aun no tienes postulaciones recientes.
                </li>}
            </ul>
          </Card>
        </div>

        
        <Card>
          <SectionHead title="Vacantes recomendadas para ti" sub="Basadas en tu perfil y discapacidades registradas" action="Ver más" onAction={() => navigate('/postulante/vacantes')} />
          <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '0'
        }}>
            {vacantesRecomendadas.length > 0 ? vacantesRecomendadas.map((v, i) => <div key={v.id} style={{
            padding: '20px',
            borderRight: i < vacantesRecomendadas.length - 1 ? `1px solid ${t.border}` : 'none',
            borderBottom: 'none',
            cursor: 'pointer',
            transition: 'background 0.15s'
          }} onMouseEnter={e => e.currentTarget.style.background = t.bgElevated} onMouseLeave={e => e.currentTarget.style.background = 'transparent'} onClick={() => navigate('/postulante/vacantes')}>
                
                <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '12px'
            }}>
                  <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: t.accentSoft,
                border: `1px solid ${t.accentBorder}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                    <Briefcase size={16} style={{
                  color: t.accent
                }} />
                  </div>
                  <CompatibleBadge />
                </div>

                <h3 style={{
              margin: '0 0 4px',
              fontSize: '14px',
              fontWeight: 700,
              color: t.textPrimary,
              lineHeight: 1.3
            }}>{v.titulo}</h3>
                <p style={{
              margin: '0 0 10px',
              fontSize: '12px',
              color: t.textSecondary
            }}>{v.empresa}</p>

                <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '6px',
              marginBottom: '12px'
            }}>
                  <span style={{
                fontSize: '11px',
                color: t.textMuted,
                background: t.bgElevated,
                border: `1px solid ${t.border}`,
                padding: '2px 8px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '3px'
              }}>
                    <MapPin size={10} />{v.modalidad}
                  </span>
                  {(v.discapacidades || []).map(d => <span key={d} style={{
                fontSize: '11px',
                color: t.accent,
                background: t.accentSoft,
                border: `1px solid ${t.accentBorder}`,
                padding: '2px 8px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '3px'
              }}>
                      <Accessibility size={9} />{d}
                    </span>)}
                </div>

                <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
                  <span style={{
                fontSize: '13px',
                fontWeight: 700,
                color: t.textPrimary
              }}>{v.salario || formatSalario(v.salario_min, v.salario_max)}</span>
                  <span style={{
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                fontSize: '12px',
                color: t.accent,
                fontWeight: 600
              }}>
                    Postularme <ChevronRight size={13} />
                  </span>
                </div>
              </div>) : <div style={{
            padding: '22px 20px',
            color: t.textMuted,
            fontSize: '13px'
          }}>
                No encontramos vacantes nuevas compatibles por ahora.
              </div>}
          </div>
        </Card>

        
        <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: '12px'
      }}>
          {[{
          label: 'Subir certificación',
          icon: Award,
          path: '/postulante/certificaciones',
          color: '#7c3aed'
        }, {
          label: 'Actualizar perfil',
          icon: FileText,
          path: '/formulario',
          color: '#2563eb'
        }, {
          label: 'Mis discapacidades',
          icon: Accessibility,
          path: '/formulario',
          color: '#0ea5e9'
        }, {
          label: 'Reportar vacante',
          icon: Bell,
          path: '/postulante/reportes',
          color: '#ef4444'
        }].map(a => <button key={a.label} onClick={() => navigate(a.path)} style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: '10px',
          background: '#fff',
          border: `1px solid ${t.border}`,
          borderRadius: '14px',
          padding: '16px',
          cursor: 'pointer',
          textAlign: 'left',
          transition: 'border-color 0.15s, transform 0.15s, box-shadow 0.15s',
          boxShadow: '0 1px 4px rgba(15,23,41,0.05)'
        }} onMouseEnter={e => {
          e.currentTarget.style.borderColor = a.color + '40';
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = `0 8px 20px ${a.color}12`;
        }} onMouseLeave={e => {
          e.currentTarget.style.borderColor = t.border;
          e.currentTarget.style.transform = 'none';
          e.currentTarget.style.boxShadow = '0 1px 4px rgba(15,23,41,0.05)';
        }}>
              <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: `${a.color}10`,
            border: `1px solid ${a.color}20`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
                <a.icon size={17} style={{
              color: a.color
            }} />
              </div>
              <span style={{
            fontSize: '13px',
            fontWeight: 600,
            color: t.textPrimary,
            lineHeight: 1.3
          }}>{a.label}</span>
            </button>)}
        </div>
      </div>
    </PortalLayout>;
}
