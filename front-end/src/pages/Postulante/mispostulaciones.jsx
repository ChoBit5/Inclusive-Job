import { useEffect, useState } from 'react';
import { MapPin, Eye, X, Briefcase, Star, Calendar, Accessibility } from 'lucide-react';
import PortalLayout from '../../components/Portal/Portallayout';
import { postulantTheme as t } from '../../components/Portal/portalTheme';
import { postulantNav } from '../../components/Portal/Navitems';
import { usePostulacionesPostulante } from '../../data/interface.js';
import { confirmDelete, successAlert, errorAlert } from '../../components/Admin/alerts';
const MOCK_USER = {
  nombre: 'Luis',
  rol: 'Postulante'
};
const ESTADO_STYLE = {
  revisando: {
    bg: '#fef3c7',
    text: '#92400e',
    border: '#fde68a',
    dot: '#d97706'
  },
  aceptado: {
    bg: '#dcfce7',
    text: '#166534',
    border: '#86efac',
    dot: '#059669'
  },
  rechazado: {
    bg: '#fee2e2',
    text: '#991b1b',
    border: '#fca5a5',
    dot: '#dc2626'
  }
};
function formatFecha(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${parseInt(d)} ${meses[parseInt(m) - 1]} ${y}`;
}
function formatSalario(min, max) {
  const fmt = n => `$${Number(n).toLocaleString('es-MX')}`;
  return `${fmt(min)} – ${fmt(max)} MXN`;
}
function Badge({
  estado
}) {
  const s = ESTADO_STYLE[estado?.toLowerCase()] || ESTADO_STYLE.revisando;
  return <span style={{
    padding: '7px 14px',
    borderRadius: '999px',
    background: s.bg,
    color: s.text,
    border: `1px solid ${s.border}`,
    fontSize: '12px',
    fontWeight: 700
  }}>
      {estado}
    </span>;
}
function Card({
  children
}) {
  return <div style={{
    background: '#fff',
    border: `1px solid ${t.border}`,
    borderRadius: '18px',
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(15,23,41,.05)'
  }}>
      {children}
    </div>;
}
function SectionHead({
  title
}) {
  return <div style={{
    padding: '18px 22px',
    borderBottom: `1px solid ${t.border}`
  }}>
      <h2 style={{
      margin: 0,
      fontSize: '16px',
      fontWeight: 700,
      color: t.textPrimary
    }}>
        {title}
      </h2>
    </div>;
}
function ModalPostulacion({
  postulacion,
  onClose,
  onDespostular
}) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);
  if (!postulacion) return null;
  const estadoKey = postulacion.estado?.toLowerCase() || 'revisando';
  const s = ESTADO_STYLE[estadoKey] || ESTADO_STYLE.revisando;
  return <div onClick={onClose} style={{
    position: 'fixed',
    inset: 0,
    background: 'rgba(15,23,41,0.45)',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px'
  }}>
      <div onClick={e => e.stopPropagation()} style={{
      background: '#fff',
      borderRadius: '20px',
      position: 'relative',
      width: '100%',
      maxWidth: '640px',
      border: `1px solid ${t.border}`,
      boxShadow: '0 20px 60px rgba(15,23,41,0.18)',
      overflow: 'hidden',
      maxHeight: '90vh',
      display: 'flex',
      flexDirection: 'column'
    }}>
        
        <div style={{
        background: 'linear-gradient(135deg,#1e40af 0%,#2563eb 50%,#0ea5e9 100%)',
        padding: '24px 24px 20px',
        flexShrink: 0
      }}>
          <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '12px',
          marginBottom: '14px'
        }}>
            <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            flex: 1
          }}>
              <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'rgba(255,255,255,0.18)',
              border: '1px solid rgba(255,255,255,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
                <Briefcase size={18} color="#fff" />
              </div>
              <div style={{
              flex: 1
            }}>
                <h2 style={{
                margin: '0 0 3px',
                fontSize: '19px',
                fontWeight: 500,
                color: '#fff',
                lineHeight: 1.2
              }}>
                  {postulacion.vacante}
                </h2>
                <p style={{
                margin: 0,
                fontSize: '12px',
                color: 'rgba(255,255,255,0.8)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                  <Briefcase size={11} /> {postulacion.empresa || '—'}
                </p>
              </div>
            </div>
            <button onClick={onClose} style={{
            width: '30px',
            height: '30px',
            borderRadius: '8px',
            background: 'rgba(255,255,255,0.15)',
            border: '1px solid rgba(255,255,255,0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#fff',
            flexShrink: 0
          }}>
              <X size={15} />
            </button>
          </div>

          
          <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px'
        }}>
            <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 10px',
            borderRadius: '999px',
            fontSize: '11px',
            fontWeight: 500,
            background: 'rgba(255,255,255,0.18)',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.28)'
          }}>
              <MapPin size={10} /> {postulacion.modalidad || '—'}
            </span>
            {postulacion.match && <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 10px',
            borderRadius: '999px',
            fontSize: '11px',
            fontWeight: 500,
            background: '#05966980',
            color: '#fff',
            border: '1px solid #05966950'
          }}>
                <Star size={10} style={{
              fill: '#fff'
            }} /> {postulacion.match}% match
              </span>}
            <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 10px',
            borderRadius: '999px',
            fontSize: '11px',
            fontWeight: 500,
            background: 'rgba(255,255,255,0.18)',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.28)'
          }}>
              <Calendar size={10} /> Postulado el {formatFecha(postulacion.fecha)}
            </span>
          </div>
        </div>

        
        <div style={{
        padding: '18px 20px',
        overflowY: 'auto',
        flex: 1
      }}>

          
          <div style={{
          background: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: '12px',
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          marginBottom: '16px'
        }}>
            <div>
              <p style={{
              margin: '0 0 2px',
              fontSize: '11px',
              color: '#2563eb',
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
                Rango salarial
              </p>
              <p style={{
              margin: 0,
              fontSize: '20px',
              fontWeight: 500,
              color: '#1e40af'
            }}>
                {postulacion.salario_min && postulacion.salario_max ? formatSalario(postulacion.salario_min, postulacion.salario_max) : '—'}
              </p>
            </div>
            <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            borderRadius: '999px',
            fontSize: '12px',
            fontWeight: 500,
            background: s.bg,
            color: s.text,
            border: `1px solid ${s.border}`
          }}>
              <span style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: s.dot
            }} />
              {postulacion.estado}
            </span>
          </div>

          
          <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '10px',
          marginBottom: '16px'
        }}>
            {[{
            label: 'Publicación',
            value: formatFecha(postulacion.fecha_publicacion),
            icon: Calendar
          }, {
            label: 'Cierre',
            value: formatFecha(postulacion.fecha_cierre),
            icon: Calendar
          }, {
            label: 'Modalidad',
            value: postulacion.modalidad || '—',
            icon: MapPin
          }].map(({
            label,
            value,
            icon: Icon
          }) => <div key={label} style={{
            background: '#f8fafc',
            border: `1px solid ${t.border}`,
            borderRadius: '12px',
            padding: '10px 12px'
          }}>
                <p style={{
              margin: '0 0 4px',
              fontSize: '11px',
              color: '#9ca3af',
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
                  <Icon size={11} /> {label}
                </p>
                <p style={{
              margin: 0,
              fontSize: '14px',
              fontWeight: 500,
              color: '#111827'
            }}>
                  {value}
                </p>
              </div>)}
          </div>

          
          {postulacion.descripcion_puesto && <div style={{
          marginBottom: '16px'
        }}>
              <p style={{
            margin: '0 0 8px',
            fontSize: '11px',
            fontWeight: 500,
            color: '#6b7280',
            textTransform: 'uppercase',
            letterSpacing: '0.6px',
            paddingBottom: '6px',
            borderBottom: `1px solid ${t.border}`
          }}>
                Descripción del puesto
              </p>
              <p style={{
            margin: 0,
            fontSize: '13px',
            color: '#374151',
            lineHeight: 1.6
          }}>
                {postulacion.descripcion_puesto}
              </p>
            </div>}

          
          {postulacion.requisitos?.length > 0 && <div style={{
          marginBottom: '16px'
        }}>
              <p style={{
            margin: '0 0 8px',
            fontSize: '11px',
            fontWeight: 500,
            color: '#6b7280',
            textTransform: 'uppercase',
            letterSpacing: '0.6px',
            paddingBottom: '6px',
            borderBottom: `1px solid ${t.border}`
          }}>
                Requisitos
              </p>
              <ul style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '6px'
          }}>
                {(Array.isArray(postulacion.requisitos) ? postulacion.requisitos : postulacion.requisitos.split('\n').filter(Boolean)).map((req, i) => <li key={i} style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              fontSize: '13px',
              color: '#374151',
              lineHeight: 1.4
            }}>
                    <span style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#2563eb',
                flexShrink: 0,
                marginTop: '5px'
              }} />
                    {req}
                  </li>)}
              </ul>
            </div>}

          
          {postulacion.discapacidades?.length > 0 && <div>
              <p style={{
            margin: '0 0 8px',
            fontSize: '11px',
            fontWeight: 500,
            color: '#6b7280',
            textTransform: 'uppercase',
            letterSpacing: '0.6px',
            paddingBottom: '6px',
            borderBottom: `1px solid ${t.border}`
          }}>
                Adaptaciones de accesibilidad disponibles
              </p>
              <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '6px'
          }}>
                {postulacion.discapacidades.map(d => <span key={d} style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px',
              color: '#2563eb',
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              padding: '3px 9px',
              borderRadius: '6px',
              fontWeight: 500
            }}>
                    <Accessibility size={10} /> {d}
                  </span>)}
              </div>
            </div>}
        </div>

        
        <div style={{
        padding: '14px 20px',
        borderTop: `1px solid ${t.border}`,
        display: 'flex',
        justifyContent: 'flex-end',
        flexShrink: 0,
        background: '#fff'
      }}>
          <button onClick={() => onDespostular(postulacion.id)} style={{
          background: '#fff5f5',
          color: '#dc2626',
          border: '1px solid #fecaca',
          borderRadius: '12px',
          padding: '10px 18px',
          fontSize: '13px',
          fontWeight: 600,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
            <X size={14} />
            Despostularme
          </button>
        </div>
      </div>
    </div>;
}
export default function PostulanteDashboard() {
  const {
    listarPostulaciones,
    despostular: despostularApi
  } = usePostulacionesPostulante();
  const [postulaciones, setPostulaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [postulacionSeleccionada, setPostulacionSeleccionada] = useState(null);
  useEffect(() => {
    cargarPostulaciones();
  }, []);
  async function cargarPostulaciones() {
    try {
      const data = await listarPostulaciones();
      if (data.ok) {
        setPostulaciones(data.data);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  }
  async function despostular(id) {
    const confirmado = await confirmDelete('', t);
    if (!confirmado) return;
    try {
      const data = await despostularApi(id);
      if (!data.ok) {
        await errorAlert('No se pudo despostular', data.msg || 'Ocurrió un error al procesar la solicitud.', t);
        return;
      }
      setPostulaciones(prev => prev.filter(p => p.id !== id));
      setPostulacionSeleccionada(null);
      await successAlert('Postulación cancelada', 'Te despostulaste correctamente de esta vacante.', t);
    } catch (error) {
      console.log(error);
      await errorAlert('Error de conexión', 'No se pudo conectar con el servidor.', t);
    }
  }
  const postulacionesFiltradas = postulaciones.filter(p => {
    const texto = `${p.vacante || ''} ${p.modalidad || ''} ${p.estado || ''} ${p.fecha || ''}`.toLowerCase();
    return texto.includes(busqueda.toLowerCase());
  });
  return <PortalLayout theme={t} navItems={postulantNav} user={MOCK_USER} pageTitle="Mis postulaciones">

      
      {postulacionSeleccionada && <ModalPostulacion postulacion={postulacionSeleccionada} onClose={() => setPostulacionSeleccionada(null)} onDespostular={despostular} />}

      <div style={{
      maxWidth: '1400px',
      margin: '0 auto',
      display: 'flex',
      flexDirection: 'column',
      gap: '24px'
    }}>

        <div style={{
        borderRadius: '24px',
        padding: '40px',
        color: '#fff',
        background: 'linear-gradient(135deg,#1e40af 0%,#2563eb 50%,#0ea5e9 100%)',
        minHeight: '220px',
        display: 'flex',
        justifyContent: 'center',
        flexDirection: 'column'
      }}>
          <p style={{
          margin: '0 0 8px',
          opacity: .85
        }}>Seguimiento de procesos</p>
          <h1 style={{
          margin: 0,
          fontSize: '44px',
          fontWeight: 800
        }}>Estado de tus postulaciones</h1>
          <p style={{
          marginTop: '16px',
          maxWidth: '700px',
          lineHeight: 1.6
        }}>Consulta el avance de cada solicitud.</p>
        </div>

        <Card>
          <SectionHead title="Mis postulaciones" />
          <div style={{
          padding: '20px 22px',
          borderBottom: `1px solid ${t.border}`
        }}>
            <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar vacante, ubicación o estado..." style={{
            width: '100%',
            padding: '12px 16px',
            border: `1px solid ${t.border}`,
            borderRadius: '12px',
            outline: 'none',
            fontSize: '14px',
            background: '#fff',
            color: t.textPrimary
          }} />
          </div>

          {loading ? <div style={{
          padding: '30px'
        }}>Cargando postulaciones...</div> : postulacionesFiltradas.length === 0 ? <div style={{
          padding: '40px',
          textAlign: 'center',
          color: t.textMuted
        }}>
              {busqueda ? 'No se encontraron postulaciones' : 'No tienes postulaciones'}
            </div> : <div style={{
          overflowX: 'auto'
        }}>
              <table style={{
            width: '100%',
            borderCollapse: 'collapse'
          }}>
                <thead>
                  <tr>
                    {['VACANTE', 'UBICACIÓN', 'ESTADO', 'FECHA', 'ACCIONES'].map(h => <th key={h} style={{
                  padding: '18px 22px',
                  textAlign: 'left',
                  fontSize: '13px',
                  fontWeight: 600,
                  letterSpacing: '1px',
                  color: t.textMuted,
                  borderBottom: `1px solid ${t.border}`
                }}>
                        {h}
                      </th>)}
                  </tr>
                </thead>
                <tbody>
                  {postulacionesFiltradas.map((p, i) => <tr key={p.id} style={{
                borderBottom: i < postulacionesFiltradas.length - 1 ? `1px solid ${t.border}` : 'none'
              }}>
                      <td style={{
                  padding: '22px'
                }}>
                        <div style={{
                    fontWeight: 600,
                    fontSize: '18px',
                    color: t.textPrimary
                  }}>
                          {p.vacante}
                        </div>
                      </td>
                      <td style={{
                  padding: '22px'
                }}>
                        <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    color: t.textMuted
                  }}>
                          <MapPin size={14} /> {p.modalidad}
                        </div>
                      </td>
                      <td style={{
                  padding: '22px'
                }}>
                        <Badge estado={p.estado} />
                      </td>
                      <td style={{
                  padding: '22px',
                  whiteSpace: 'nowrap'
                }}>
                        {new Date(p.fecha).toLocaleDateString('es-MX', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })}
                      </td>
                      <td style={{
                  padding: '22px'
                }}>
                        <div style={{
                    display: 'flex',
                    gap: '8px'
                  }}>
                          
                          <button onClick={() => setPostulacionSeleccionada(p)} style={{
                      width: '40px',
                      height: '40px',
                      border: `1px solid ${t.border}`,
                      background: '#fff',
                      borderRadius: '10px',
                      cursor: 'pointer'
                    }}>
                            <Eye size={16} color={t.accent} />
                          </button>
                          <button onClick={() => despostular(p.id)} style={{
                      width: '40px',
                      height: '40px',
                      border: '1px solid #fecaca',
                      background: '#fff5f5',
                      borderRadius: '10px',
                      cursor: 'pointer'
                    }}>
                            <X size={16} color='#dc2626' />
                          </button>
                        </div>
                      </td>
                    </tr>)}
                </tbody>
              </table>
            </div>}
        </Card>
      </div>
    </PortalLayout>;
}
