import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Accessibility, ArrowLeft, Award, Briefcase, CheckCircle, Code, Eye, FileText, Globe, Mail, Mic, Phone, Sparkles, User, Users, XCircle } from "lucide-react";
import PortalLayout from "../../components/Portal/Portallayout";
import { reclutadorTheme as t } from "../../components/Portal/portalTheme";
import { reclutadorNav } from "../../components/Portal/Navitems";
import BubleChat from "../Reclutador/ChatBot.jsx";
import { errorAlert, successAlert } from "../../components/Admin/alerts";
import { resolveAssetUrl } from "../../hooks/Sesion/apiSesion.js";
import PdfPreviewModal from "../../components/PdfPreviewModal";
import { useCandidatosVacanteReclutador, useVacantesConCandidatosReclutador, useSolicitarEntrevistaReclutador } from "../../hooks/Reclutador/useDomain.js";
import { ENDPOINTS } from "../../hooks/Reclutador/apiReclutador.js";
export default function Candidatos() {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    data,
    refetch
  } = useVacantesConCandidatosReclutador();
  const {
    obtenerCandidatosVacante,
    actualizarEstadoPostulacion,
    loading
  } = useCandidatosVacanteReclutador();
  const {
    solicitarEntrevista
  } = useSolicitarEntrevistaReclutador();
  const [vacantes, setVacantes] = useState([]);
  const [vacanteSeleccionada, setVacanteSeleccionada] = useState(null);
  const [candidatos, setCandidatos] = useState([]);
  const [candidatoSeleccionado, setCandidatoSeleccionado] = useState(null);
  const [candidatoDestacado, setCandidatoDestacado] = useState(null);
  const [postulacionActualizando, setPostulacionActualizando] = useState(null);
  const [pdfPreview, setPdfPreview] = useState(null);
  const [entrevistaEnviando, setEntrevistaEnviando] = useState(null);
  const [entrevistasEnviadas, setEntrevistasEnviadas] = useState(() => new Set());
  useEffect(() => {
    const listado = data?.data ?? data;
    if (Array.isArray(listado)) setVacantes(listado);
  }, [data]);
  useEffect(() => {
    const rec = location.state?.recomendacionIA;
    if (!rec || vacantes.length === 0) return;
    const vacante = vacantes.find(v => Number(v.id_vacante) === Number(rec.id_vacante));
    if (vacante) {
      verDetalleCandidatos(vacante);
      setCandidatoDestacado({
        id_postulacion: Number(rec.id_postulacion),
        porcentaje_compatibilidad: rec.porcentaje_compatibilidad
      });
    }
    navigate(location.pathname, {
      replace: true,
      state: {}
    });
  }, [vacantes, location.state]);
  const verDetalleCandidatos = async vacante => {
    setVacanteSeleccionada(vacante);
    setCandidatoSeleccionado(null);
    try {
      const result = await obtenerCandidatosVacante(vacante.id_vacante);
      const listado = result?.data ?? result;
      setCandidatos(Array.isArray(listado) ? listado : []);
    } catch (error) {
      console.error("Error al obtener candidatos:", error);
      setCandidatos([]);
    }
  };
  const regresarAListado = () => {
    setVacanteSeleccionada(null);
    setCandidatos([]);
    setCandidatoSeleccionado(null);
    setCandidatoDestacado(null);
    refetch().catch(() => {});
  };
  const cambiarEstadoPostulacion = async (cand, estado) => {
    setPostulacionActualizando(cand.id_postulacion);
    try {
      const result = await actualizarEstadoPostulacion({
        id_postulacion: cand.id_postulacion,
        estado
      });
      if (!result?.success) {
        throw new Error(result?.message || "No se pudo actualizar la postulacion.");
      }
      setCandidatos(prev => prev.map(item => Number(item.id_postulacion) === Number(cand.id_postulacion) ? {
        ...item,
        estado_postulacion: estado
      } : item));
      setCandidatoSeleccionado(prev => prev && Number(prev.id_postulacion) === Number(cand.id_postulacion) ? {
        ...prev,
        estado_postulacion: estado
      } : prev);
      await refetch().catch(() => {});
      await successAlert(estado === "aceptado" ? "Candidato aceptado" : "Candidato rechazado", "El estado de la postulacion se actualizo correctamente.", t);
    } catch (err) {
      await errorAlert("Error al actualizar", err.message || "No se pudo guardar el cambio.", t);
    } finally {
      setPostulacionActualizando(null);
    }
  };
  const mandarEntrevista = async cand => {
    if (!cand?.id_postulacion) return;
    if (entrevistaEnviando) return;
    if (entrevistasEnviadas.has(cand.id_postulacion)) return;
    setEntrevistaEnviando(cand.id_postulacion);
    try {
      const data = await solicitarEntrevista(cand.id_postulacion);
      setEntrevistasEnviadas(prev => {
        const next = new Set(prev);
        next.add(cand.id_postulacion);
        return next;
      });
      await successAlert("Entrevista enviada", data?.mensaje || `Se envio la solicitud de entrevista a ${cand.nombre_completo}.`, t);
    } catch (err) {
      await errorAlert("No se pudo enviar", err.message || "Ocurrio un error al enviar la solicitud de entrevista.", t);
    } finally {
      setEntrevistaEnviando(null);
    }
  };
  const getCvUrl = cand => {
    if (cand?.cv_url) return cand.cv_url;
    if (Number(cand?.tiene_cv ?? 0) && cand?.id_postulacion) {
      return ENDPOINTS.candidatos.cv(cand.id_postulacion);
    }
    return "";
  };
  const getHabilidades = cand => {
    const raw = cand?.habilidades;
    if (Array.isArray(raw)) return raw.map(item => String(item).trim()).filter(Boolean);
    if (!raw) return [];
    const text = String(raw).trim();
    if (!text) return [];
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) return parsed.map(item => String(item).trim()).filter(Boolean);
    } catch {
      return text.split(/[,;\n]/).map(item => item.trim()).filter(Boolean);
    }
    return text.split(/[,;\n]/).map(item => item.trim()).filter(Boolean);
  };
  const getCertificacionPdfUrl = cert => {
    const id = cert?.id_certificaciones ?? cert?.id_certificacion ?? cert?.id;
    return id && Number(cert?.tiene_pdf ?? 0) ? ENDPOINTS.candidatos.certificacionPdf(id) : "";
  };
  const openPdfPreview = (sourceUrl, title) => {
    if (!sourceUrl) return;
    setPdfPreview({
      sourceUrl,
      title
    });
  };
  return <PortalLayout theme={t} navItems={reclutadorNav} pageTitle="Seguimiento de Candidatos">
      <style>{`
        @media (max-width: 920px) {
          .reclutador-candidato-detalle-grid {
            grid-template-columns: 1fr !important;
          }

          .reclutador-cert-card {
            align-items: flex-start !important;
            flex-direction: column !important;
          }
        }
      `}</style>
      {!vacanteSeleccionada && !candidatoSeleccionado && <TableCard>
          <table style={{
        width: "100%",
        borderCollapse: "collapse"
      }}>
            <thead>
              <tr style={{
            borderBottom: `1px solid ${t.border}`,
            background: t.bgElevated
          }}>
                {["Vacante", "Modalidad", "Estado", "Candidatos", "Accion"].map(h => <th key={h} style={{
              textAlign: "left",
              padding: 14,
              fontSize: 13,
              color: t.textMuted
            }}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {vacantes.map(v => <tr key={v.id_vacante} style={{
            borderBottom: `1px solid ${t.border}`
          }}>
                  <td style={{
              padding: 14,
              color: t.textPrimary,
              fontWeight: 600
            }}>{v.titulo_puesto}</td>
                  <td style={{
              padding: 14,
              color: t.textSecondary
            }}>{v.modalidad}</td>
                  <td style={{
              padding: 14
            }}><Estado estado={v.estado} /></td>
                  <td style={{
              padding: 14,
              color: t.textPrimary,
              fontWeight: 700
            }}>
                    <span style={{
                display: "flex",
                alignItems: "center",
                gap: 6
              }}>
                      <Users size={16} style={{
                  color: t.accent
                }} /> {v.total_candidatos}
                    </span>
                  </td>
                  <td style={{
              padding: 14
            }}>
                    <button onClick={() => verDetalleCandidatos(v)} disabled={Number(v.total_candidatos) === 0} style={buttonStyle(Number(v.total_candidatos) === 0)}>
                      <Eye size={14} /> Ver lista
                    </button>
                  </td>
                </tr>)}
            </tbody>
          </table>
        </TableCard>}

      {vacanteSeleccionada && !candidatoSeleccionado && <div style={{
      display: "flex",
      flexDirection: "column",
      gap: 16
    }}>
          <div style={{
        display: "flex",
        alignItems: "center",
        gap: 12
      }}>
            <button onClick={regresarAListado} style={backButtonStyle}><ArrowLeft size={16} /> Volver a Vacantes</button>
            <h2 style={{
          color: t.textPrimary,
          margin: 0,
          fontSize: 18
        }}>
              Candidatos para: <span style={{
            color: t.accent
          }}>{vacanteSeleccionada.titulo_puesto}</span>
            </h2>
          </div>

          {loading ? <div style={{
        color: t.textMuted,
        textAlign: "center",
        padding: 20
      }}>Cargando candidatos...</div> : <div style={{
        display: "flex",
        flexDirection: "column",
        gap: 12
      }}>
              {candidatos.map(cand => {
          const esDestacado = candidatoDestacado?.id_postulacion === Number(cand.id_postulacion);
          return <div key={cand.id_postulacion} style={esDestacado ? cardStyleDestacado : cardStyle}>
                    <div>
                      {esDestacado && <span style={badgeIAStyle}>
                          <Sparkles size={12} />
                          {typeof candidatoDestacado.porcentaje_compatibilidad === "number" ? `Recomendado por IA · ${candidatoDestacado.porcentaje_compatibilidad}% compatible` : "Visto desde el chat"}
                        </span>}
                      <h4 style={{
                color: t.textPrimary,
                margin: 0,
                fontSize: 16,
                fontWeight: 600
              }}>{cand.nombre_completo}</h4>
                      <div style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                flexWrap: "wrap",
                marginTop: 4
              }}>
                        <p style={{
                  fontSize: 12,
                  color: t.textMuted,
                  margin: 0
                }}>Postulado el: {safeDate(cand.fecha_postulacion)}</p>
                        <EstadoPostulacion estado={cand.estado_postulacion} />
                        
                        {cand.entrevista_realizada && <EntrevistaBadge puntuacion={cand.puntuacion_entrevista} />}
                      </div>
                      <div style={{
                display: "flex",
                gap: 16,
                marginTop: 6,
                flexWrap: "wrap"
              }}>
                        <span style={infoBadgeStyle}><Mail size={12} /> {cand.correo}</span>
                        <span style={infoBadgeStyle}><Phone size={12} /> {cand.telefono}</span>
                      </div>
                    </div>
                    <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: 8,
              flexWrap: "wrap"
            }}>
                      <button onClick={() => setCandidatoSeleccionado(cand)} style={actionButtonStyle("perfil")}>
                        <Eye size={14} /> Ver perfil
                      </button>
                      <button onClick={() => cambiarEstadoPostulacion(cand, "aceptado")} disabled={postulacionActualizando === cand.id_postulacion || cand.estado_postulacion === "aceptado"} style={actionButtonStyle("aceptar", postulacionActualizando === cand.id_postulacion || cand.estado_postulacion === "aceptado")}>
                        <CheckCircle size={14} /> Aceptar
                      </button>
                      <button onClick={() => cambiarEstadoPostulacion(cand, "rechazado")} disabled={postulacionActualizando === cand.id_postulacion || cand.estado_postulacion === "rechazado"} style={actionButtonStyle("rechazar", postulacionActualizando === cand.id_postulacion || cand.estado_postulacion === "rechazado")}>
                        <XCircle size={14} /> Rechazar
                      </button>
                    </div>
                  </div>;
        })}
              {candidatos.length === 0 && <div style={{
          color: t.textMuted,
          padding: 20
        }}>Esta vacante aun no tiene candidatos.</div>}
            </div>}
        </div>}

      {candidatoSeleccionado && <div style={{
      display: "flex",
      flexDirection: "column",
      gap: 20
    }}>
          <div style={{
        display: "flex",
        alignItems: "center",
        gap: 12
      }}>
            <button onClick={() => setCandidatoSeleccionado(null)} style={backButtonStyle}><ArrowLeft size={16} /> Volver a Candidatos</button>
            <h2 style={{
          color: t.textPrimary,
          margin: 0,
          fontSize: 18
        }}>Perfil Profesional de {candidatoSeleccionado.nombre_completo}</h2>
            <EstadoPostulacion estado={candidatoSeleccionado.estado_postulacion} />
          </div>
          <div className="reclutador-candidato-detalle-grid" style={{
        display: "grid",
        gridTemplateColumns: "minmax(280px, 0.9fr) 2fr",
        gap: 20,
        alignItems: "start"
      }}>
            <div style={{
          ...sectionStyle,
          display: "flex",
          flexDirection: "column",
          gap: 16
        }}>
              <div style={{
            display: "flex",
            alignItems: "center",
            gap: 14
          }}>
                <AvatarPostulante candidato={candidatoSeleccionado} />
                <div>
                  <h3 style={{
                margin: 0,
                color: t.textPrimary,
                fontSize: 18
              }}>{candidatoSeleccionado.nombre_completo}</h3>
                  <p style={{
                margin: "4px 0 0",
                color: t.textMuted,
                fontSize: 12
              }}>
                    Postulado el {safeDate(candidatoSeleccionado.fecha_postulacion)}
                  </p>
                </div>
              </div>

              <div style={{
            display: "flex",
            flexDirection: "column",
            gap: 10
          }}>
                <InfoLine icon={Mail} label="Correo" value={candidatoSeleccionado.correo} link={`mailto:${candidatoSeleccionado.correo}`} />
                <InfoLine icon={Phone} label="Telefono" value={candidatoSeleccionado.telefono} />
                <InfoLine icon={User} label="Registro" value={safeDate(candidatoSeleccionado.fecha_registro)} />
              </div>

              <div style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap"
          }}>
                {getCvUrl(candidatoSeleccionado) && <button type="button" onClick={() => openPdfPreview(getCvUrl(candidatoSeleccionado), `CV - ${candidatoSeleccionado.nombre_completo}`)} style={{
              ...cvLinkStyle,
              border: "none",
              cursor: "pointer"
            }}>
                    <FileText size={16} /> Ver CV
                  </button>}
                {candidatoSeleccionado.portafolio_url && <a href={withProtocol(candidatoSeleccionado.portafolio_url)} target="_blank" rel="noreferrer" style={secondaryLinkStyle}>
                    <Globe size={15} /> Portafolio
                  </a>}
              </div>

              <div style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap"
          }}>
                <button onClick={() => cambiarEstadoPostulacion(candidatoSeleccionado, "aceptado")} disabled={postulacionActualizando === candidatoSeleccionado.id_postulacion || candidatoSeleccionado.estado_postulacion === "aceptado"} style={actionButtonStyle("aceptar", postulacionActualizando === candidatoSeleccionado.id_postulacion || candidatoSeleccionado.estado_postulacion === "aceptado")}>
                  <CheckCircle size={14} /> Aceptar
                </button>
                <button onClick={() => cambiarEstadoPostulacion(candidatoSeleccionado, "rechazado")} disabled={postulacionActualizando === candidatoSeleccionado.id_postulacion || candidatoSeleccionado.estado_postulacion === "rechazado"} style={actionButtonStyle("rechazar", postulacionActualizando === candidatoSeleccionado.id_postulacion || candidatoSeleccionado.estado_postulacion === "rechazado")}>
                  <XCircle size={14} /> Rechazar
                </button>
              </div>
            </div>

            <div style={{
          display: "flex",
          flexDirection: "column",
          gap: 16
        }}>
              <Section icon={Accessibility} title="Discapacidad">
                {parseDisabilityDescription(candidatoSeleccionado.descripcion_discapacidad).description || "Sin descripcion registrada."}
              </Section>

              <div style={sectionStyle}>
                <h4 style={sectionTitleStyle}><Accessibility size={16} /> Tipos de discapacidad</h4>
                <div style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap"
            }}>
                  {(candidatoSeleccionado.discapacidades || []).map(disc => <span key={disc.id_discapacidad ?? disc.nombre} style={pillStyle("purple")}>{disc.nombre}</span>)}
                  {(candidatoSeleccionado.discapacidades || []).length === 0 && <span style={{
                color: t.textMuted,
                fontSize: 13
              }}>No registradas</span>}
                </div>
                <div style={{
              marginTop: 12
            }}>
                  <span style={pillStyle("info")}>
                    Puede realizar esfuerzo fisico: {formatPhysicalEffort(candidatoSeleccionado.esfuerzo_fisico_posible)}
                  </span>
                  {parseDisabilityDescription(candidatoSeleccionado.descripcion_discapacidad).percentage && <span style={{
                ...pillStyle("info"),
                marginLeft: 8
              }}>
                      Porcentaje: {parseDisabilityDescription(candidatoSeleccionado.descripcion_discapacidad).percentage}
                    </span>}
                </div>
              </div>

              <Section icon={Briefcase} title="Experiencia Laboral">{candidatoSeleccionado.experiencia}</Section>

              <div style={sectionStyle}>
                <h4 style={sectionTitleStyle}><Code size={16} /> Habilidades</h4>
                <div style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap"
            }}>
                  {getHabilidades(candidatoSeleccionado).map(hab => <span key={hab} style={pillStyle("purple")}>{hab.trim()}</span>)}
                  {getHabilidades(candidatoSeleccionado).length === 0 && <span style={{
                color: t.textMuted,
                fontSize: 13
              }}>No especificadas</span>}
                </div>
              </div>

              <div style={sectionStyle}>
                <h4 style={sectionTitleStyle}><Award size={16} /> Certificaciones</h4>
                {(candidatoSeleccionado.certificaciones || []).length === 0 ? <p style={{
              color: t.textMuted,
              margin: 0,
              fontSize: 13
            }}>No hay certificaciones registradas.</p> : <div style={{
              display: "grid",
              gap: 10
            }}>
                    {(candidatoSeleccionado.certificaciones || []).map(cert => <div key={cert.id_certificaciones ?? cert.id_certificacion} className="reclutador-cert-card" style={certCardStyle}>
                        <div>
                          <strong style={{
                    color: t.textPrimary,
                    fontSize: 13
                  }}>{cert.nombre_certificacion || cert.nombre}</strong>
                          <p style={{
                    color: t.textMuted,
                    fontSize: 12,
                    margin: "3px 0"
                  }}>{cert.institucion_dada || cert.institucion || "-"}</p>
                          <p style={{
                    color: t.textMuted,
                    fontSize: 11,
                    margin: 0
                  }}>{safeDate(cert.fecha_emitido || cert.fecha_emision)}</p>
                        </div>
                        {getCertificacionPdfUrl(cert) && <button type="button" onClick={() => openPdfPreview(getCertificacionPdfUrl(cert), cert.nombre_certificacion || cert.nombre || "Certificado")} style={{
                  ...miniLinkStyle,
                  cursor: "pointer"
                }}>
                            Ver PDF
                          </button>}
                      </div>)}
                  </div>}
              </div>
            </div>
          </div>

          
          <div style={entrevistaSectionStyle}>
            <div style={{
          display: "flex",
          alignItems: "center",
          gap: 12
        }}>
              <div style={entrevistaIconWrapStyle}>
                <Mic size={18} color="#fff" />
              </div>
              <div>
                <strong style={{
              color: t.textPrimary,
              fontSize: 14,
              display: "block"
            }}>
                  Entrevista con IA
                </strong>
                <span style={{
              color: t.textMuted,
              fontSize: 12
            }}>
                  {candidatoSeleccionado.entrevista_realizada ? `${candidatoSeleccionado.nombre_completo} ya completo la entrevista de este proceso.` : `Invita a ${candidatoSeleccionado.nombre_completo} a realizar la entrevista real de este proceso.`}
                </span>
              </div>
            </div>

            {candidatoSeleccionado.entrevista_realizada ? <span style={entrevistaCompletadaBadgeStyle}>
                <CheckCircle size={15} />
                Entrevista completada
                {candidatoSeleccionado.puntuacion_entrevista != null ? ` · ${candidatoSeleccionado.puntuacion_entrevista}/10` : ""}
              </span> : <button onClick={() => mandarEntrevista(candidatoSeleccionado)} disabled={entrevistaEnviando === candidatoSeleccionado.id_postulacion || entrevistasEnviadas.has(candidatoSeleccionado.id_postulacion)} style={entrevistaBtnStyle(entrevistaEnviando === candidatoSeleccionado.id_postulacion || entrevistasEnviadas.has(candidatoSeleccionado.id_postulacion))}>
                <Mic size={15} />
                {entrevistasEnviadas.has(candidatoSeleccionado.id_postulacion) ? "Entrevista enviada" : entrevistaEnviando === candidatoSeleccionado.id_postulacion ? "Enviando..." : "Mandar entrevista"}
              </button>}
          </div>
        </div>}
      <BubleChat />
      <PdfPreviewModal open={Boolean(pdfPreview)} sourceUrl={pdfPreview?.sourceUrl} title={pdfPreview?.title} onClose={() => setPdfPreview(null)} theme={t} />
    </PortalLayout>;
}
function AvatarPostulante({
  candidato
}) {
  const foto = resolveAssetUrl(candidato?.foto_perfil || candidato?.avatar || candidato?.imagen);
  return <div style={avatarStyle}>
      {foto ? <img src={foto} alt={candidato?.nombre_completo || "Postulante"} style={{
      width: "100%",
      height: "100%",
      objectFit: "cover"
    }} onError={e => {
      e.currentTarget.style.display = "none";
      const fallback = e.currentTarget.nextSibling;
      if (fallback) fallback.style.display = "flex";
    }} /> : null}
      <span style={{
      display: foto ? "none" : "flex",
      alignItems: "center",
      justifyContent: "center",
      width: "100%",
      height: "100%"
    }}>
        {candidateInitials(candidato)}
      </span>
    </div>;
}
function InfoLine({
  icon: Icon,
  label,
  value,
  link
}) {
  const content = value || "-";
  return <div style={{
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
    minWidth: 0
  }}>
      <Icon size={15} style={{
      color: t.accent,
      marginTop: 2,
      flexShrink: 0
    }} />
      <div style={{
      minWidth: 0
    }}>
        <p style={{
        margin: 0,
        color: t.textMuted,
        fontSize: 11
      }}>{label}</p>
        {link && value ? <a href={link} target="_blank" rel="noreferrer" style={{
        color: t.accent,
        fontSize: 13,
        wordBreak: "break-word"
      }}>
            {content}
          </a> : <p style={{
        margin: 0,
        color: t.textPrimary,
        fontSize: 13,
        wordBreak: "break-word"
      }}>{content}</p>}
      </div>
    </div>;
}
function TableCard({
  children
}) {
  return <div style={{
    background: t.bgSurface,
    border: `1px solid ${t.border}`,
    borderRadius: 12,
    overflow: "hidden"
  }}>{children}</div>;
}
function Section({
  icon: Icon,
  title,
  children
}) {
  return <div style={sectionStyle}>
      <h4 style={sectionTitleStyle}><Icon size={16} /> {title}</h4>
      <p style={{
      color: t.textSecondary,
      margin: 0,
      lineHeight: "1.5",
      fontSize: 14,
      whiteSpace: "pre-line"
    }}>{children}</p>
    </div>;
}
function Estado({
  estado
}) {
  const active = estado === "activa";
  return <span style={{
    padding: "4px 8px",
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 600,
    background: active ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)",
    color: active ? "#10b981" : "#ef4444"
  }}>{estado}</span>;
}
function EstadoPostulacion({
  estado
}) {
  const normalized = String(estado || "pendiente").toLowerCase();
  const styles = {
    aceptado: {
      bg: "rgba(16,185,129,0.16)",
      color: "#34d399",
      border: "rgba(16,185,129,0.35)",
      text: "Aceptado"
    },
    rechazado: {
      bg: "rgba(239,68,68,0.16)",
      color: "#f87171",
      border: "rgba(239,68,68,0.35)",
      text: "Rechazado"
    },
    pendiente: {
      bg: "rgba(245,158,11,0.14)",
      color: "#fbbf24",
      border: "rgba(245,158,11,0.32)",
      text: "Pendiente"
    },
    revision: {
      bg: "rgba(99,102,241,0.16)",
      color: "#a5b4fc",
      border: "rgba(99,102,241,0.35)",
      text: "Revision"
    }
  };
  const current = styles[normalized] || styles.pendiente;
  return <span style={{
    display: "inline-flex",
    alignItems: "center",
    border: `1px solid ${current.border}`,
    background: current.bg,
    color: current.color,
    padding: "3px 8px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 700
  }}>
      {current.text}
    </span>;
}
function EntrevistaBadge({
  puntuacion
}) {
  return <span style={{
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    border: "1px solid rgba(16,185,129,0.35)",
    background: "rgba(16,185,129,0.16)",
    color: "#34d399",
    padding: "3px 8px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 700
  }}>
      <Mic size={11} /> Entrevista realizada{puntuacion != null ? ` · ${puntuacion}/10` : ""}
    </span>;
}
function candidateInitials(candidato = {}) {
  const name = candidato.nombre_completo || `${candidato.nombres || ""} ${candidato.apellidos || ""}`.trim();
  const parts = String(name || "P").trim().split(/\s+/).filter(Boolean);
  return `${parts[0]?.charAt(0) || "P"}${parts[1]?.charAt(0) || ""}`.toUpperCase();
}
function withProtocol(url) {
  if (!url) return "";
  return String(url).trim();
}
function parseDisabilityDescription(value) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) return {
    description: "",
    percentage: ""
  };
  const onlyPercentage = text.match(/^(\d+(?:\.\d+)?)%\s*$/);
  if (onlyPercentage) return {
    description: "",
    percentage: `${onlyPercentage[1]}%`
  };
  const match = text.match(/^(.*?)(?:\s*(?:\||-)\s*)(\d+(?:\.\d+)?)%\s*$/);
  if (!match) return {
    description: text,
    percentage: ""
  };
  return {
    description: match[1].trim(),
    percentage: `${match[2]}%`
  };
}
function formatPhysicalEffort(value) {
  if (value === null || value === undefined || value === "") return "-";
  const numeric = Number(value);
  if (!Number.isNaN(numeric)) return numeric === 1 ? "Si" : "No";
  return String(value);
}
const buttonStyle = disabled => ({
  background: disabled ? t.bgElevated : t.gradient,
  color: disabled ? t.textMuted : "#fff",
  border: "none",
  padding: "6px 12px",
  borderRadius: 8,
  cursor: disabled ? "not-allowed" : "pointer",
  display: "flex",
  alignItems: "center",
  gap: 6,
  fontWeight: 600,
  fontSize: 12
});
const actionButtonStyle = (type, disabled = false) => {
  const variants = {
    perfil: {
      background: t.accentSoft,
      color: t.accent,
      border: "transparent"
    },
    aceptar: {
      background: "rgba(16,185,129,0.14)",
      color: "#34d399",
      border: "rgba(16,185,129,0.35)"
    },
    rechazar: {
      background: "rgba(239,68,68,0.14)",
      color: "#f87171",
      border: "rgba(239,68,68,0.35)"
    }
  };
  const v = variants[type] || variants.perfil;
  return {
    background: disabled ? t.bgElevated : v.background,
    color: disabled ? t.textMuted : v.color,
    border: `1px solid ${disabled ? t.border : v.border}`,
    padding: "8px 12px",
    borderRadius: 8,
    fontWeight: 700,
    cursor: disabled ? "not-allowed" : "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    fontSize: 12,
    opacity: disabled ? 0.7 : 1
  };
};
const backButtonStyle = {
  background: t.bgSurface,
  border: `1px solid ${t.border}`,
  color: t.textPrimary,
  borderRadius: 8,
  padding: "8px 12px",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: 6,
  fontSize: 13,
  fontWeight: 600
};
const cardStyle = {
  background: t.bgSurface,
  border: `1px solid ${t.border}`,
  borderRadius: 12,
  padding: 16,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 16
};
const cardStyleDestacado = {
  ...cardStyle,
  border: `2px solid ${t.accent}`,
  background: t.accentSoft,
  boxShadow: `0 0 0 3px ${t.accentGlow}`
};
const badgeIAStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  fontSize: 11,
  fontWeight: 700,
  color: t.accent,
  background: "#fff",
  padding: "3px 8px",
  borderRadius: 20,
  marginBottom: 6
};
const infoBadgeStyle = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  fontSize: 13,
  color: t.textSecondary
};
const sectionStyle = {
  background: t.bgSurface,
  border: `1px solid ${t.border}`,
  borderRadius: 12,
  padding: 18
};
const cvLinkStyle = {
  textDecoration: "none",
  background: t.gradient,
  color: "#fff",
  padding: "10px",
  borderRadius: 8,
  textAlign: "center",
  fontSize: 13,
  fontWeight: 600,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  marginTop: 10
};
const sectionTitleStyle = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  color: t.accent,
  margin: "0 0 10px 0",
  fontSize: 15,
  fontWeight: 600,
  borderBottom: `1px solid ${t.border}`,
  paddingBottom: 6
};
const avatarStyle = {
  width: 66,
  height: 66,
  borderRadius: "999px",
  overflow: "hidden",
  flexShrink: 0,
  background: t.accentSoft,
  border: `2px solid ${t.accentBorder}`,
  color: t.accent,
  fontWeight: 800,
  fontSize: 22
};
const secondaryLinkStyle = {
  ...cvLinkStyle,
  marginTop: 10,
  background: t.bgElevated,
  color: t.textPrimary,
  border: `1px solid ${t.border}`
};
const miniLinkStyle = {
  textDecoration: "none",
  color: t.accent,
  border: `1px solid ${t.accentBorder}`,
  background: t.accentSoft,
  padding: "6px 10px",
  borderRadius: 8,
  fontSize: 12,
  fontWeight: 700,
  whiteSpace: "nowrap"
};
const certCardStyle = {
  background: t.bgElevated,
  border: `1px solid ${t.border}`,
  borderRadius: 10,
  padding: 12,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12
};
const pillStyle = (type = "default") => {
  const variants = {
    purple: {
      bg: t.accentSoft,
      color: t.accent,
      border: t.accentBorder
    },
    info: {
      bg: "rgba(59,130,246,0.14)",
      color: "#93c5fd",
      border: "rgba(59,130,246,0.35)"
    },
    default: {
      bg: t.bgElevated,
      color: t.textPrimary,
      border: t.border
    }
  };
  const current = variants[type] || variants.default;
  return {
    background: current.bg,
    border: `1px solid ${current.border}`,
    color: current.color,
    padding: "5px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700
  };
};
const entrevistaSectionStyle = {
  background: t.bgSurface,
  border: `1px solid ${t.accentBorder}`,
  borderRadius: 14,
  padding: "18px 20px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 16,
  flexWrap: "wrap",
  boxShadow: `0 0 0 3px ${t.accentGlow}`
};
const entrevistaIconWrapStyle = {
  width: 40,
  height: 40,
  borderRadius: 12,
  flexShrink: 0,
  background: t.gradient,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  boxShadow: `0 4px 14px ${t.accentGlow}`
};
const entrevistaBtnStyle = disabled => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "11px 20px",
  borderRadius: 10,
  border: "none",
  fontSize: 13,
  fontWeight: 700,
  color: "#fff",
  cursor: disabled ? "not-allowed" : "pointer",
  background: disabled ? t.bgElevated : t.gradient,
  boxShadow: disabled ? "none" : `0 6px 16px ${t.accentGlow}`,
  opacity: disabled ? 0.7 : 1,
  whiteSpace: "nowrap",
  transition: "transform 0.15s ease, filter 0.15s ease"
});
const entrevistaCompletadaBadgeStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "11px 20px",
  borderRadius: 10,
  border: "1px solid rgba(16,185,129,0.35)",
  background: "rgba(16,185,129,0.16)",
  color: "#34d399",
  fontSize: 13,
  fontWeight: 700,
  whiteSpace: "nowrap"
};
function safeDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString("es-MX");
}
