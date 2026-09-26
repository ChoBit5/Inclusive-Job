import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BubleChat from '../Reclutador/ChatBot.jsx';
import { AlertTriangle, ArrowRight, Briefcase, Plus, TrendingUp, Users } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import PortalLayout from '../../components/Portal/Portallayout';
import { reclutadorNav } from '../../components/Portal/Navitems';
import { reclutadorTheme as t } from '../../components/Portal/portalTheme';
import { errorAlert, successAlert } from '../../components/Admin/alerts';
import { resolveAssetUrl } from '../../data/interface.js';
import { useDiscapacidadesReclutador, useGuardarVacanteReclutador, useMejorarRedaccionReclutador, useReclutadorDashboard } from '../../data/interface.js';
import { INITIAL_VACANTE_FORM, VacanteFormModal, validateVacanteForm } from './components/VacanteFormModal';
const ESTADO_COLOR = {
  activa: {
    bg: 'rgba(16,185,129,0.12)',
    text: '#6ee7b7',
    border: 'rgba(16,185,129,0.3)'
  },
  cerrada: {
    bg: 'rgba(100,116,139,0.12)',
    text: '#94a3b8',
    border: 'rgba(100,116,139,0.3)'
  },
  pendiente: {
    bg: 'rgba(245,158,11,0.12)',
    text: '#fbbf24',
    border: 'rgba(245,158,11,0.3)'
  },
  entrevista: {
    bg: 'rgba(99,102,241,0.12)',
    text: '#a5b4fc',
    border: 'rgba(99,102,241,0.3)'
  },
  aceptado: {
    bg: 'rgba(16,185,129,0.12)',
    text: '#6ee7b7',
    border: 'rgba(16,185,129,0.3)'
  },
  rechazado: {
    bg: 'rgba(239,68,68,0.12)',
    text: '#fca5a5',
    border: 'rgba(239,68,68,0.3)'
  }
};
function useCountUp(end, duration = 1200) {
  const [v, setV] = useState(0);
  const raf = useRef(null);
  useEffect(() => {
    const start = performance.now();
    const step = now => {
      const p = Math.min((now - start) / duration, 1);
      const e = 1 - Math.pow(1 - p, 4);
      setV(Math.floor(e * end));
      if (p < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [end, duration]);
  return v;
}
function StatCard({
  label,
  value,
  icon: Icon,
  color
}) {
  const animated = useCountUp(value);
  return <div style={{
    background: t.bgSurface,
    border: `1px solid ${t.border}`,
    borderRadius: '16px',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    transition: 'border-color 0.2s, transform 0.2s',
    cursor: 'default'
  }} onMouseEnter={e => {
    e.currentTarget.style.borderColor = t.accentBorder;
    e.currentTarget.style.transform = 'translateY(-2px)';
  }} onMouseLeave={e => {
    e.currentTarget.style.borderColor = t.border;
    e.currentTarget.style.transform = 'none';
  }}>
      <div style={{
      width: '40px',
      height: '40px',
      borderRadius: '12px',
      background: `${color}18`,
      border: `1px solid ${color}30`,
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
        fontSize: '28px',
        fontWeight: 800,
        color: t.textPrimary,
        letterSpacing: '-1px',
        lineHeight: 1
      }}>
          {animated.toLocaleString()}
        </p>
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
  const c = ESTADO_COLOR[estado] || ESTADO_COLOR.pendiente;
  return <span style={{
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 10px',
    borderRadius: '999px',
    fontSize: '11px',
    fontWeight: 600,
    background: c.bg,
    color: c.text,
    border: `1px solid ${c.border}`
  }}>
      {estado}
    </span>;
}
function Card({
  children,
  style = {}
}) {
  return <div style={{
    background: t.bgSurface,
    border: `1px solid ${t.border}`,
    borderRadius: '16px',
    overflow: 'hidden',
    ...style
  }}>
      {children}
    </div>;
}
function SectionHeader({
  title,
  action,
  onAction
}) {
  return <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: `1px solid ${t.border}`
  }}>
      <h2 style={{
      margin: 0,
      fontSize: '14px',
      fontWeight: 700,
      color: t.textPrimary
    }}>{title}</h2>
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
function CustomTooltip({
  active,
  payload,
  label
}) {
  if (!active || !payload?.length) return null;
  return <div style={{
    background: t.bgElevated,
    border: `1px solid ${t.accentBorder}`,
    borderRadius: '10px',
    padding: '10px 14px',
    fontSize: '12px'
  }}>
      <p style={{
      margin: '0 0 6px',
      color: t.textMuted,
      fontWeight: 600
    }}>{label}</p>
      {payload.map(e => <p key={e.dataKey} style={{
      margin: '2px 0',
      color: e.color
    }}>
          {e.name}: <strong style={{
        color: t.textPrimary
      }}>{e.value}</strong>
        </p>)}
    </div>;
}
export default function ReclutadorDashboard() {
  const navigate = useNavigate();
  const {
    data,
    loading,
    error,
    refetch
  } = useReclutadorDashboard();
  const {
    data: discapacidadesData,
    loading: loadingDiscapacidades
  } = useDiscapacidadesReclutador();
  const {
    guardarVacante,
    loading: guardandoVacante
  } = useGuardarVacanteReclutador();
  const {
    mejorarTexto
  } = useMejorarRedaccionReclutador();
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState(INITIAL_VACANTE_FORM);
  const [iaLoading, setIaLoading] = useState({});
  const [iaSugerencias, setIaSugerencias] = useState({});
  const dashboard = data?.data ?? data ?? {};
  const currentUser = dashboard?.user ?? {};
  const currentEmpresa = dashboard?.empresa ?? {};
  const currentUserAvatar = resolveAssetUrl(currentUser.avatar || currentUser.foto_perfil);
  const empresaEstado = String(currentEmpresa.estado || '').toLowerCase();
  const empresaEstadoValidacion = Number(currentEmpresa.estado_validacion ?? (currentEmpresa.aprobada ? 1 : 0));
  const empresaRechazada = empresaEstado === 'rechazada' || empresaEstadoValidacion === 2 || currentEmpresa.requiere_reenvio === true;
  const empresaAprobada = Boolean(currentEmpresa && (currentEmpresa.aprobada ?? currentEmpresa.estado === 'aprobada'));
  const catalogoDiscapacidades = useMemo(() => {
    const payload = discapacidadesData?.data;
    if (Array.isArray(payload)) return payload;
    return payload?.discapacidades ?? [];
  }, [discapacidadesData]);
  const stats = [{
    label: 'Vacantes activas',
    value: Number(dashboard?.stats?.vacantes_activas ?? 0),
    icon: Briefcase,
    color: '#7c3aed'
  }, {
    label: 'Candidatos totales',
    value: Number(dashboard?.stats?.candidatos_totales ?? 0),
    icon: Users,
    color: '#8b5cf6'
  }, {
    label: 'Postulaciones hoy',
    value: Number(dashboard?.stats?.postulaciones_hoy ?? 0),
    icon: TrendingUp,
    color: '#6d28d9'
  }, {
    label: 'Reportes activos',
    value: Number(dashboard?.stats?.reportes_activos ?? 0),
    icon: AlertTriangle,
    color: '#f59e0b'
  }];
  const chartData = dashboard?.chart ?? [];
  const vacantesRecientes = dashboard?.vacantes_recientes ?? [];
  const candidatosRecientes = dashboard?.candidatos_recientes ?? [];
  const closeModal = () => {
    setShowModal(false);
    setFormData(INITIAL_VACANTE_FORM);
    setIaSugerencias({});
  };
  const openModal = () => {
    setFormData(INITIAL_VACANTE_FORM);
    setIaSugerencias({});
    setShowModal(true);
  };
  const guardarNuevaVacante = async e => {
    e.preventDefault();
    if (!empresaAprobada) {
      await errorAlert(empresaRechazada ? 'Empresa rechazada' : 'Empresa pendiente', empresaRechazada ? 'Tu empresa fue rechazada. Corrige y reenvia los datos de tu empresa para una nueva validacion.' : 'No puedes publicar vacantes hasta que tu empresa sea validada.', t);
      return;
    }
    const validationMessage = validateVacanteForm(formData);
    if (validationMessage) {
      await errorAlert('Datos invalidos', validationMessage, t);
      return;
    }
    try {
      const resultado = await guardarVacante(formData);
      if (!resultado?.success) {
        await errorAlert('Error al guardar', resultado?.message || 'No se pudo guardar la vacante.', t);
        return;
      }
      closeModal();
      await refetch();
      await successAlert('Vacante publicada', 'La vacante se guardo correctamente.', t);
    } catch (err) {
      console.error('Error al guardar vacante:', err);
      await errorAlert('Error de conexion', err.message || 'No se pudo conectar con el servidor.', t);
    }
  };
  const handleMejorarIA = async campo => {
    setIaLoading(prev => ({
      ...prev,
      [campo]: true
    }));
    setIaSugerencias(prev => ({
      ...prev,
      [campo]: null
    }));
    try {
      const data = await mejorarTexto({
        campo,
        texto: formData[campo] || '',
        contexto: {
          titulo_puesto: formData.titulo_puesto,
          descripcion_puesto: formData.descripcion_puesto,
          requisitos: formData.requisitos,
          modalidad: formData.modalidad
        }
      });
      setIaSugerencias(prev => ({
        ...prev,
        [campo]: data
      }));
    } catch (err) {
      await errorAlert('No se pudo mejorar el texto', err.message || 'Intenta de nuevo en unos segundos.', t);
    } finally {
      setIaLoading(prev => ({
        ...prev,
        [campo]: false
      }));
    }
  };
  const handleAplicarIA = (campo, texto) => {
    setFormData(prev => ({
      ...prev,
      [campo]: texto
    }));
    setIaSugerencias(prev => ({
      ...prev,
      [campo]: null
    }));
  };
  return <PortalLayout theme={t} navItems={reclutadorNav} user={currentUser} pageTitle="Dashboard" notifications={stats[3].value} headerActions={empresaAprobada && <button onClick={openModal} style={{
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
    cursor: 'pointer'
  }}>
            <Plus size={15} />
            Nueva vacante
          </button>}>
      <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
      maxWidth: '1400px',
      margin: '0 auto'
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
        background: 'rgba(239,68,68,0.10)',
        border: '1px solid rgba(239,68,68,0.28)',
        color: '#fca5a5',
        fontSize: '14px',
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px'
      }}>
            <span>No se pudo cargar tu dashboard: {error}</span>
            <button onClick={refetch} style={{
          border: '1px solid rgba(239,68,68,0.35)',
          background: t.bgSurface,
          color: '#fca5a5',
          borderRadius: '8px',
          padding: '6px 10px',
          fontWeight: 700,
          cursor: 'pointer'
        }}>
              Reintentar
            </button>
          </div>}

        {!empresaAprobada && <div style={{
        background: empresaRechazada ? 'rgba(239,68,68,0.10)' : 'rgba(245,158,11,0.08)',
        border: `1px solid ${empresaRechazada ? 'rgba(239,68,68,0.30)' : 'rgba(245,158,11,0.25)'}`,
        borderRadius: '14px',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        flexWrap: 'wrap'
      }}>
            <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
              <AlertTriangle size={20} style={{
            color: empresaRechazada ? '#ef4444' : '#f59e0b',
            flexShrink: 0
          }} />
              <div>
                <p style={{
              margin: 0,
              fontSize: '14px',
              fontWeight: 700,
              color: empresaRechazada ? '#fca5a5' : '#fbbf24'
            }}>
                  {empresaRechazada ? 'Empresa rechazada' : 'Empresa pendiente de validacion'}
                </p>
                <p style={{
              margin: 0,
              fontSize: '12px',
              color: empresaRechazada ? '#fecaca' : '#92400e'
            }}>
                  {empresaRechazada ? 'Corrige y reenvia los datos de tu empresa para que administracion pueda revisarla de nuevo.' : 'Registra y espera que el administrador valide tu empresa para publicar vacantes.'}
                </p>
              </div>
            </div>
            <button onClick={() => navigate('/reclutador/empresa')} style={{
          background: empresaRechazada ? '#ef4444' : '#f59e0b',
          border: 'none',
          borderRadius: '8px',
          padding: '8px 16px',
          color: empresaRechazada ? '#fff' : '#1c1917',
          fontSize: '13px',
          fontWeight: 700,
          cursor: 'pointer',
          flexShrink: 0
        }}>
              {empresaRechazada ? 'Reenviar datos' : 'Ver empresa'}
            </button>
          </div>}

        <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '14px'
      }}>
          <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          flexShrink: 0,
          background: t.accentSoft,
          border: `2px solid ${t.accentBorder}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '18px',
          fontWeight: 800,
          color: t.accent,
          overflow: 'hidden'
        }}>
            {currentUserAvatar ? <img src={currentUserAvatar} alt={`Foto de perfil de ${currentUser.nombre || 'Reclutador'}`} style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover'
          }} onError={e => {
            e.currentTarget.style.display = 'none';
            e.currentTarget.nextSibling.style.display = 'block';
          }} /> : null}
            <span style={{
            display: currentUserAvatar ? 'none' : 'block'
          }}>
              {(currentUser.nombre || 'Reclutador').split(' ').slice(0, 2).map(w => w[0]).join('')}
            </span>
          </div>
          <div>
            <h1 style={{
            margin: 0,
            fontSize: '20px',
            fontWeight: 800,
            color: t.textPrimary,
            letterSpacing: '-0.3px'
          }}>
              Bienvenido, {(currentUser.nombre || 'Reclutador').split(' ')[0]}
            </h1>
            <p style={{
            margin: 0,
            fontSize: '13px',
            color: t.textSecondary
          }}>
              {new Date().toLocaleDateString('es-MX', {
              weekday: 'long',
              day: 'numeric',
              month: 'long'
            })}
              {' - '}<span style={{
              color: t.accent
            }}>{currentEmpresa.nombre || 'Sin empresa registrada'}</span>
            </p>
          </div>
        </div>

        <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '14px'
      }}>
          {stats.map(s => <StatCard key={s.label} {...s} />)}
        </div>

        <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr',
        gap: '16px'
      }} className="xl:!grid-cols-[1fr_340px]">
          <Card>
            <SectionHeader title="Actividad de la semana" action="Ver analitica" />
            <div style={{
            padding: '20px'
          }}>
              <div style={{
              display: 'flex',
              gap: '16px',
              marginBottom: '16px'
            }}>
                {[{
                label: 'Postulaciones',
                color: '#7c3aed'
              }, {
                label: 'Vistas',
                color: '#4f46e5'
              }].map(l => <span key={l.label} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                color: t.textSecondary
              }}>
                    <span style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: l.color,
                  display: 'inline-block'
                }} />
                    {l.label}
                  </span>)}
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartData} margin={{
                top: 5,
                right: 5,
                left: -20,
                bottom: 0
              }}>
                  <defs>
                    <linearGradient id="gPost" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gVistas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={t.border} vertical={false} />
                  <XAxis dataKey="day" tick={{
                  fill: t.textMuted,
                  fontSize: 11
                }} axisLine={false} tickLine={false} />
                  <YAxis tick={{
                  fill: t.textMuted,
                  fontSize: 11
                }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{
                  stroke: t.accentBorder
                }} />
                  <Area type="monotone" dataKey="postulaciones" name="Postulaciones" stroke="#7c3aed" strokeWidth={2} fill="url(#gPost)" dot={false} />
                  <Area type="monotone" dataKey="vistas" name="Vistas" stroke="#4f46e5" strokeWidth={2} fill="url(#gVistas)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card>
            <SectionHeader title="Candidatos recientes" action="Ver todos" onAction={() => navigate('/reclutador/candidatos')} />
            <ul style={{
            margin: 0,
            padding: 0,
            listStyle: 'none'
          }}>
              {candidatosRecientes.length > 0 ? candidatosRecientes.map((c, i) => <li key={c.id} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 20px',
              borderBottom: i < candidatosRecientes.length - 1 ? `1px solid ${t.border}` : 'none'
            }}>
                  <div style={{
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                flexShrink: 0,
                background: t.accentSoft,
                border: `1px solid ${t.accentBorder}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: 700,
                color: t.accent
              }}>
                    {c.nombre.split(' ').map(w => w[0]).join('')}
                  </div>
                  <div style={{
                flex: 1,
                minWidth: 0
              }}>
                    <p style={{
                  margin: 0,
                  fontSize: '13px',
                  fontWeight: 600,
                  color: t.textPrimary,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>{c.nombre}</p>
                    <p style={{
                  margin: 0,
                  fontSize: '11px',
                  color: t.textMuted
                }}>{c.vacante} - {c.tiempo}</p>
                  </div>
                  <Badge estado={c.estado} />
                </li>) : <li style={{
              padding: '16px 20px',
              color: t.textMuted,
              fontSize: '13px'
            }}>
                  Aun no hay candidatos recientes.
                </li>}
            </ul>
          </Card>
        </div>

        <Card>
          <SectionHeader title="Mis vacantes" action="Gestionar" onAction={() => navigate('/reclutador/vacantes')} />
          <div style={{
          overflowX: 'auto'
        }}>
            <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '13px'
          }}>
              <thead>
                <tr style={{
                borderBottom: `1px solid ${t.border}`
              }}>
                  {['Vacante', 'Postulaciones', 'Dias activa', 'Estado', ''].map(h => <th key={h} style={{
                  padding: '10px 20px',
                  textAlign: 'left',
                  color: t.textMuted,
                  fontWeight: 600,
                  fontSize: '11.5px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  whiteSpace: 'nowrap'
                }}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {vacantesRecientes.length > 0 ? vacantesRecientes.map((v, i) => <tr key={v.id} style={{
                borderBottom: i < vacantesRecientes.length - 1 ? `1px solid ${t.border}` : 'none'
              }}>
                    <td style={{
                  padding: '13px 20px',
                  color: t.textPrimary,
                  fontWeight: 600
                }}>{v.titulo}</td>
                    <td style={{
                  padding: '13px 20px',
                  color: t.textSecondary
                }}>
                      <span style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}><Users size={13} style={{
                      color: t.accent
                    }} />{v.postulaciones}</span>
                    </td>
                    <td style={{
                  padding: '13px 20px',
                  color: t.textSecondary
                }}>{v.dias}d</td>
                    <td style={{
                  padding: '13px 20px'
                }}><Badge estado={v.estado} /></td>
                    <td style={{
                  padding: '13px 20px'
                }}>
                      <button onClick={() => navigate(`/reclutador/vacantes/${v.id}`)} style={{
                    background: t.accentSoft,
                    border: `1px solid ${t.accentBorder}`,
                    borderRadius: '7px',
                    padding: '5px 12px',
                    color: t.accent,
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}>Ver</button>
                    </td>
                  </tr>) : <tr>
                    <td colSpan="5" style={{
                  padding: '18px 20px',
                  color: t.textMuted
                }}>
                      Aun no tienes vacantes registradas.
                    </td>
                  </tr>}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {showModal && <VacanteFormModal editingVacante={null} formData={formData} setFormData={setFormData} discapacidades={catalogoDiscapacidades} loadingDiscapacidades={loadingDiscapacidades} saving={guardandoVacante} onClose={closeModal} onSubmit={guardarNuevaVacante} iaLoading={iaLoading} iaSugerencias={iaSugerencias} onMejorarIA={handleMejorarIA} onAplicarIA={handleAplicarIA} />}
      <BubleChat />
    </PortalLayout>;
}
