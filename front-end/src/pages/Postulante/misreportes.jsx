import { useEffect, useState } from 'react';
import { MapPin, Eye, X, Briefcase, Star, Calendar, Accessibility, Bookmark, CheckCircle } from 'lucide-react';
import PortalLayout from '../../components/Portal/Portallayout';
import { postulantTheme as t } from '../../components/Portal/portalTheme';
import { postulantNav } from '../../components/Portal/Navitems';
import { useReportesPostulante } from '../../hooks/Postulante/useDomain.js';
import { confirmAction, confirmDelete, successAlert, errorAlert } from '../../components/Admin/alerts';
const MOCK_USER = {
  nombre: 'Luis',
  rol: 'Postulante'
};
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
function formatFecha(fecha) {
  if (!fecha) return '—';
  return new Date(fecha).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}
function formatSalario(min, max) {
  const fmt = n => Number(n).toLocaleString('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0
  });
  return `${fmt(min)} – ${fmt(max)}`;
}
function ModalReporte({
  postulacion,
  onClose
}) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);
  if (!postulacion) return null;
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
      </div>
    </div>;
}
function ModalEditarReporte({
  reporte,
  onClose,
  onSave
}) {
  const [motivo, setMotivo] = useState(reporte?.motivo || '');
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);
  if (!reporte) return null;
  return <div onClick={onClose} style={{
    position: 'fixed',
    inset: 0,
    background: 'rgba(15,23,41,.50)',
    backdropFilter: 'blur(10px)',
    zIndex: 1200,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '20px'
  }}>

      <div onClick={e => e.stopPropagation()} style={{
      width: '100%',
      maxWidth: '650px',
      background: '#fff',
      borderRadius: '24px',
      overflow: 'hidden',
      border: `1px solid ${t.border}`,
      boxShadow: '0 30px 80px rgba(15,23,41,.22)',
      animation: 'fadeModal .18s ease'
    }}>

        
        <div style={{
        background: 'linear-gradient(135deg,#1e40af 0%,#2563eb 50%,#0ea5e9 100%)',
        padding: '28px',
        color: '#fff',
        position: 'relative'
      }}>

          <div style={{
          position: 'absolute',
          width: '220px',
          height: '220px',
          borderRadius: '50%',
          background: 'rgba(255,255,255,.08)',
          right: '-80px',
          top: '-80px',
          filter: 'blur(40px)'
        }} />

          <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: '14px',
          alignItems: 'flex-start'
        }}>

            <div>

              <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '14px',
              background: 'rgba(255,255,255,.18)',
              border: '1px solid rgba(255,255,255,.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '14px'
            }}>
                <Bookmark size={20} />
              </div>

              <h2 style={{
              margin: 0,
              fontSize: '26px',
              fontWeight: 800
            }}>
                Editar reporte
              </h2>

              <p style={{
              margin: '8px 0 0',
              opacity: .88,
              fontSize: '14px'
            }}>
                Actualiza el motivo del reporte enviado.
              </p>

            </div>

            <button onClick={onClose} style={{
            width: '38px',
            height: '38px',
            border: 'none',
            borderRadius: '12px',
            background: 'rgba(255,255,255,.16)',
            color: '#fff',
            cursor: 'pointer'
          }}>
              <X size={16} />
            </button>

          </div>

        </div>

        
        <div style={{
        padding: '26px'
      }}>

          
          <div style={{
          background: '#f8fafc',
          border: `1px solid ${t.border}`,
          borderRadius: '16px',
          padding: '16px',
          marginBottom: '18px'
        }}>

            <div style={{
            fontSize: '11px',
            color: t.textMuted,
            textTransform: 'uppercase',
            letterSpacing: '.8px',
            marginBottom: '8px'
          }}>
              Vacante reportada
            </div>

            <div style={{
            fontSize: '18px',
            fontWeight: 700,
            color: t.textPrimary
          }}>
              {reporte.vacante}
            </div>

          </div>

          
          <div>

            <label style={{
            display: 'block',
            marginBottom: '8px',
            fontWeight: 700,
            color: t.textPrimary
          }}>
              Motivo del reporte
            </label>

            <textarea value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Describe el motivo..." style={{
            width: '100%',
            minHeight: '180px',
            resize: 'vertical',
            border: `1px solid ${t.border}`,
            borderRadius: '16px',
            padding: '18px',
            fontSize: '15px',
            lineHeight: 1.6,
            background: '#fbfdff',
            outline: 'none',
            transition: '.18s'
          }} />

            <div style={{
            marginTop: '8px',
            textAlign: 'right',
            color: t.textMuted,
            fontSize: '12px'
          }}>
              {motivo.length} caracteres
            </div>

          </div>

        </div>

        
        <div style={{
        padding: '22px',
        borderTop: `1px solid ${t.border}`,
        display: 'flex',
        justifyContent: 'end',
        gap: '10px'
      }}>

          <button onClick={onClose} style={{
          height: '46px',
          padding: '0 18px',
          borderRadius: '12px',
          border: `1px solid ${t.border}`,
          background: '#fff',
          cursor: 'pointer',
          fontWeight: 700
        }}>
            Cancelar
          </button>

          <button onClick={() => onSave(motivo)} style={{
          height: '46px',
          padding: '0 22px',
          borderRadius: '12px',
          border: 'none',
          background: 'linear-gradient(135deg,#2563eb,#0ea5e9)',
          color: '#fff',
          fontWeight: 700,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
            <CheckCircle size={15} />
            Guardar cambios
          </button>

        </div>

      </div>

      <style>{`
        @keyframes fadeModal{
          from{
            opacity:0;
            transform:translateY(12px) scale(.98);
          }
          to{
            opacity:1;
            transform:translateY(0) scale(1);
          }
        }
      `}</style>

    </div>;
}
export default function PostulanteDashboard() {
  const {
    listarReportes,
    eliminarReporte: eliminarReporteApi,
    editarReporte: editarReporteApi
  } = useReportesPostulante();
  const [reportes, setReportes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [reporteSeleccionado, setReporteSeleccionado] = useState(null);
  const [modalEditar, setModalEditar] = useState(null);
  async function eliminarReporte(id) {
    try {
      const data = await eliminarReporteApi(id);
      if (data.ok) {
        setReportes(prev => prev.filter(r => r.id !== id));
        if (reporteSeleccionado?.id === id) {
          setReporteSeleccionado(null);
        }
        await successAlert('Reporte eliminado', 'El reporte se eliminó correctamente.', t);
      } else {
        await errorAlert('No se pudo eliminar', data.msg, t);
      }
    } catch (error) {
      console.log(error);
      await errorAlert('Error de conexión', 'No se pudo conectar con el servidor.', t);
    }
  }
  async function confirmarEliminarReporte(id) {
    const confirmado = await confirmDelete('', t);
    if (!confirmado) return;
    await eliminarReporte(id);
  }
  async function editarReporte(id, motivo) {
    const confirmado = await confirmAction({
      title: '¿Guardar cambios?',
      html: 'Se actualizará el motivo del reporte.',
      confirmText: 'Guardar',
      cancelText: 'Cancelar',
      icon: 'question',
      theme: t
    });
    if (!confirmado) return;
    try {
      const data = await editarReporteApi(id, motivo);
      if (data.ok) {
        setReportes(prev => prev.map(r => r.id === id ? {
          ...r,
          motivo
        } : r));
        setModalEditar(null);
        await successAlert('Reporte actualizado', 'Los cambios fueron guardados correctamente.', t);
      } else {
        console.log(data.msg);
      }
    } catch (error) {
      console.log(error);
      await errorAlert('Error de conexión', 'No se pudo conectar con el servidor.', t);
    }
  }
  useEffect(() => {
    cargarReportes();
  }, []);
  async function cargarReportes() {
    try {
      const data = await listarReportes();
      if (data.ok) {
        setReportes(data.data);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  }
  const reportesFiltrados = reportes.filter(r => {
    const texto = `
      ${r.vacante || ''}
      ${r.modalidad || ''}
      ${r.motivo || ''}
      ${r.fecha || ''}
    `.toLowerCase();
    return texto.includes(busqueda.toLowerCase());
  });
  return <PortalLayout theme={t} navItems={postulantNav} user={MOCK_USER} pageTitle="Reportes realizados">

      
      {reporteSeleccionado && <ModalReporte postulacion={reporteSeleccionado} onClose={() => setReporteSeleccionado(null)} />}

      {modalEditar && <ModalEditarReporte reporte={modalEditar} onClose={() => setModalEditar(null)} onSave={motivo => {
      setModalEditar(null);
      editarReporte(modalEditar.id, motivo);
    }} />}

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
        }}>
            Seguimiento de reportes
          </p>

          <h1 style={{
          margin: 0,
          fontSize: '44px',
          fontWeight: 800
        }}>
            Reportes realizados
          </h1>

          <p style={{
          marginTop: '16px',
          maxWidth: '700px',
          lineHeight: 1.6
        }}>
            Consulta los reportes que realizaste sobre vacantes.
          </p>
        </div>

        <Card>
          <SectionHead title="Mis reportes" />

          <div style={{
          padding: '20px 22px',
          borderBottom: `1px solid ${t.border}`
        }}>
            <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar por vacante, ubicación o motivo..." style={{
            width: '100%',
            padding: '12px 16px',
            border: `1px solid ${t.border}`,
            borderRadius: '12px',
            outline: 'none',
            fontSize: '14px',
            color: t.textPrimary,
            background: '#fff'
          }} />
          </div>

          {loading ? <div style={{
          padding: '30px'
        }}>Cargando reportes...</div> : reportesFiltrados.length === 0 ? <div style={{
          padding: '40px',
          textAlign: 'center',
          color: t.textMuted
        }}>
              {busqueda ? 'No se encontraron reportes' : 'Sin reportes realizados'}
            </div> : <div style={{
          overflowX: 'auto'
        }}>
              <table style={{
            width: '100%',
            borderCollapse: 'collapse'
          }}>
                <thead>
                  <tr>
                    {['VACANTE', 'UBICACIÓN', 'MOTIVO', 'FECHA', 'ACCIONES'].map(h => <th key={h} style={{
                  padding: '18px 22px',
                  textAlign: 'left',
                  fontSize: '13px',
                  letterSpacing: '1px',
                  fontWeight: 600,
                  color: t.textMuted,
                  borderBottom: `1px solid ${t.border}`
                }}>
                        {h}
                      </th>)}
                  </tr>
                </thead>

                <tbody>
                  {reportesFiltrados.map((r, i) => <tr key={r.id} style={{
                borderBottom: i < reportesFiltrados.length - 1 ? `1px solid ${t.border}` : 'none'
              }}>
                      <td style={{
                  padding: '22px'
                }}>
                        <div style={{
                    fontWeight: 600,
                    fontSize: '18px',
                    color: t.textPrimary
                  }}>
                          {r.vacante}
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
                          <MapPin size={14} />
                          {r.modalidad}
                        </div>
                      </td>

                      <td style={{
                  padding: '22px',
                  maxWidth: '350px'
                }}>
                        <div style={{
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    color: t.textPrimary
                  }}>
                          {r.motivo}
                        </div>
                      </td>

                      <td style={{
                  padding: '22px',
                  whiteSpace: 'nowrap'
                }}>
                        {new Date(r.fecha).toLocaleDateString('es-MX', {
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

                        
                        <button onClick={() => setReporteSeleccionado(r)} style={{
                      width: '40px',
                      height: '40px',
                      border: `1px solid ${t.border}`,
                      background: '#fff',
                      borderRadius: '10px',
                      cursor: 'pointer'
                    }}>
                        <Eye size={16} color={t.accent} />
                        </button>

                        
                        <button onClick={() => setModalEditar(r)} style={{
                      width: '40px',
                      height: '40px',
                      border: `1px solid #93c5fd`,
                      background: '#eff6ff',
                      borderRadius: '10px',
                      cursor: 'pointer'
                    }}>
                        ✏️
                        </button>

                        
                        <button onClick={() => confirmarEliminarReporte(r.id)} style={{
                      width: '40px',
                      height: '40px',
                      border: `1px solid #fecaca`,
                      background: '#fff5f5',
                      borderRadius: '10px',
                      cursor: 'pointer'
                    }}>
                        <X size={16} color="#dc2626" />
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
