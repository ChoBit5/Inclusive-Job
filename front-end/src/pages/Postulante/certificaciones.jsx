import { useRef, useState, useEffect } from 'react';
import { ArrowRight, FileText, Eye, Pencil, Award, Upload, Loader, Trash2, Sparkles, Calendar } from 'lucide-react';
import PortalLayout from '../../components/Portal/Portallayout';
import { postulantTheme as t } from '../../components/Portal/portalTheme';
import { postulantNav } from '../../components/Portal/Navitems';
import PdfPreviewModal from '../../components/PdfPreviewModal';
import { useAnalisisCvIA, useDocumentosPostulante, usePostulanteChatHistorial } from '../../data/interface.js';
import { confirmDelete, successAlert, errorAlert } from '../../components/Admin/alerts';
const MOCK_USER = {
  nombre: 'Luis',
  rol: 'Postulante',
  discapacidades: ['Visual'],
  completado: 100
};
const HOY = new Date().toISOString().split('T')[0];
function parseStoredChatPayload(value) {
  if (!value) return null;
  if (typeof value === 'object') return value;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}
function cleanAiText(value) {
  return String(value ?? '').replace(/\[INSERTAR % O NUMERO\]/gi, '[PORCENTAJE O METRICA]').replace(/\[INSERTAR % O NÚMERO\]/gi, '[PORCENTAJE O METRICA]').replace(/\[INSERTAR %\]/gi, '[PORCENTAJE O METRICA]').replace(/\[INSERTAR NUMERO\]/gi, '[PORCENTAJE O METRICA]').replace(/\[INSERTAR NÚMERO\]/gi, '[PORCENTAJE O METRICA]').replace(/\[INSERTAR\]/gi, '[PORCENTAJE O METRICA]');
}
function cleanAiValue(value) {
  if (typeof value === 'string') return cleanAiText(value);
  if (Array.isArray(value)) return value.map(cleanAiValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, cleanAiValue(item)]));
  }
  return value;
}
function normalizeCvAnalysisResponse(data) {
  const parsedPayload = parseStoredChatPayload(data?.respuesta_ia) ?? parseStoredChatPayload(data?.respuesta) ?? parseStoredChatPayload(data?.data) ?? null;
  const nestedPayload = parseStoredChatPayload(data?.payload) ?? parseStoredChatPayload(data?.resultado) ?? null;
  const analysis = data?.analisis ?? data?.analysis ?? data?.resultado?.analisis ?? data?.data?.analisis ?? data?.payload?.analisis ?? parsedPayload?.analisis ?? nestedPayload?.analisis ?? null;
  if (analysis) return cleanAiValue(analysis);
  const summary = data?.chat_resumen ?? data?.resumen_chat ?? data?.resumen ?? data?.text ?? data?.respuesta ?? data?.data?.chat_resumen ?? data?.data?.resumen_chat ?? data?.payload?.chat_resumen ?? data?.payload?.text ?? data?.message ?? data?.msg ?? parsedPayload?.chat_resumen ?? parsedPayload?.resumen_chat ?? parsedPayload?.text ?? nestedPayload?.chat_resumen ?? nestedPayload?.resumen_chat ?? nestedPayload?.text ?? null;
  if (!summary) return null;
  return {
    resumen_chat: cleanAiText(summary),
    diagnostico_ats: {
      puntuacion: '-',
      comentario: cleanAiText(summary)
    }
  };
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
    boxShadow: '0 1px 4px rgba(15,23,41,.05)',
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
    justifyContent: 'space-between',
    alignItems: 'center',
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
        margin: '4px 0 0',
        fontSize: '12px',
        color: t.textMuted
      }}>{sub}</p>}
      </div>
      {action && <button type="button" onClick={onAction} style={{
      display: 'flex',
      gap: '4px',
      alignItems: 'center',
      border: 'none',
      background: 'transparent',
      cursor: 'pointer',
      color: t.accent,
      fontWeight: 600
    }}>
          {action}<ArrowRight size={13} />
        </button>}
    </div>;
}
function ActionBtn({
  icon,
  label,
  onClick,
  disabled = false
}) {
  return <button type="button" className="ij-action-btn" onClick={onClick} disabled={disabled} style={{
    display: 'flex',
    alignItems: 'center',
    gap: '7px',
    padding: '9px 14px',
    borderRadius: '14px',
    border: disabled ? '1px solid #e5e7eb' : '1px solid #dbeafe',
    background: disabled ? '#f3f4f6' : 'linear-gradient(180deg,#ffffff 0%,#f8fbff 100%)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: '12px',
    fontWeight: 800,
    opacity: disabled ? 0.6 : 1,
    color: '#1e40af',
    boxShadow: disabled ? 'none' : '0 8px 18px rgba(37,99,235,.08)',
    transition: 'transform .28s cubic-bezier(.22,1,.36,1), box-shadow .28s cubic-bezier(.22,1,.36,1), border-color .28s ease'
  }}>
      {icon}{label}
    </button>;
}
function AiGradientBtn({
  icon,
  label,
  onClick,
  disabled = false
}) {
  return <button type="button" className="ij-ai-btn" onClick={onClick} disabled={disabled} style={{
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    minHeight: '48px',
    padding: '0 18px',
    borderRadius: '999px',
    border: '1px solid rgba(255,255,255,0.35)',
    background: disabled ? '#7c3aed' : 'linear-gradient(135deg, #2563eb 0%, #7c3aed 58%, #0ea5e9 100%)',
    color: '#fff',
    fontSize: '13px',
    fontWeight: 900,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.72 : 1,
    boxShadow: '0 14px 32px rgba(37,99,235,0.28), 0 0 18px rgba(124,58,237,0.22)',
    transition: 'transform .32s cubic-bezier(.22,1,.36,1), box-shadow .32s cubic-bezier(.22,1,.36,1), opacity .2s ease',
    whiteSpace: 'nowrap'
  }}>
      {icon}{label}
    </button>;
}
export default function PostulanteDashboard() {
  const {
    obtenerCvBlob,
    verificarCv,
    subirCv,
    listarCertificaciones,
    guardarCertificacion: guardarCertificacionApi,
    eliminarCertificacion: eliminarCertificacionApi,
    certificacionesUrl: CERT_URL
  } = useDocumentosPostulante();
  const fileInputRef = useRef(null);
  const iframeRef = useRef(null);
  const dateInputRef = useRef(null);
  const [subiendo, setSubiendo] = useState(false);
  const [tieneCV, setTieneCV] = useState(null);
  const [cvPreviewUrl, setCvPreviewUrl] = useState('');
  const [analisisCV, setAnalisisCV] = useState(null);
  const {
    analizarCV,
    loading: analizandoCV
  } = useAnalisisCvIA();
  const {
    cargarHistorial
  } = usePostulanteChatHistorial();
  const [certificaciones, setCertificaciones] = useState(null);
  const [modalCert, setModalCert] = useState(false);
  const [guardandoCert, setGuardandoCert] = useState(false);
  const [editandoCert, setEditandoCert] = useState(null);
  const [pdfPreview, setPdfPreview] = useState(null);
  const [formCert, setFormCert] = useState({
    nombre: '',
    institucion: '',
    fecha: '',
    pdf: null
  });
  const abrirCalendarioCertificacion = () => {
    const input = dateInputRef.current;
    if (!input) return;
    if (typeof input.showPicker === 'function') {
      input.showPicker();
      return;
    }
    input.focus();
    input.click();
  };
  useEffect(() => {
    let active = true;
    let objectUrl = '';
    async function cargarCvPreview() {
      try {
        const existeCv = await verificarCv();
        if (!active) return;
        setTieneCV(existeCv);
        if (!existeCv) {
          setCvPreviewUrl('');
          return;
        }
        const blob = await obtenerCvBlob();
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setCvPreviewUrl(objectUrl);
      } catch {
        if (!active) return;
        setTieneCV(false);
        setCvPreviewUrl('');
      }
    }
    cargarCvPreview();
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [obtenerCvBlob, verificarCv]);
  useEffect(() => {
    listarCertificaciones().then(data => setCertificaciones(data.ok ? data.certificaciones : [])).catch(() => setCertificaciones([]));
  }, [listarCertificaciones]);
  useEffect(() => {
    let active = true;
    cargarHistorial().then(rows => {
      if (!active || !Array.isArray(rows)) return;
      const lastCvAnalysis = [...rows].reverse().find(row => row.resultado === 'analizar_cv');
      const payload = parseStoredChatPayload(lastCvAnalysis?.respuesta_ia);
      if (payload?.analisis) {
        setAnalisisCV(cleanAiValue(payload.analisis));
      }
    }).catch(() => {});
    return () => {
      active = false;
    };
  }, [cargarHistorial]);
  async function subirCV(file) {
    if (file.type !== 'application/pdf') {
      alert('Solo se permiten archivos PDF.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('El archivo no debe superar 5 MB.');
      return;
    }
    setSubiendo(true);
    try {
      const formData = new FormData();
      formData.append('cv', file);
      const data = await subirCv(formData);
      if (data.ok) {
        await successAlert('CV actualizado', 'Tu currículum se actualizó correctamente.', t);
        setTieneCV(true);
        const blob = await obtenerCvBlob();
        const nextUrl = URL.createObjectURL(blob);
        setCvPreviewUrl(prev => {
          if (prev) URL.revokeObjectURL(prev);
          return nextUrl;
        });
        if (iframeRef.current) {
          iframeRef.current.src = nextUrl;
        }
      } else {
        await errorAlert('No se pudo actualizar', data.msg ?? 'No se pudo actualizar el CV.', t);
      }
    } catch (e) {
      console.error(e);
      await errorAlert('Error de conexión', 'No se pudo conectar con el servidor.', t);
    } finally {
      setSubiendo(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }
  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (file) subirCV(file);
  }
  async function analizarCvActual() {
    if (tieneCV !== true) {
      await errorAlert('No hay CV para analizar', 'Sube un CV en PDF antes de pedir recomendaciones.', t);
      return;
    }
    try {
      const data = await analizarCV();
      const normalizedAnalysis = normalizeCvAnalysisResponse(data);
      if (!normalizedAnalysis) {
        await errorAlert('Respuesta incompleta', 'La IA respondio, pero no envio recomendaciones para mostrar.', t);
        return;
      }
      setAnalisisCV(normalizedAnalysis);
    } catch (err) {
      console.error(err);
      await errorAlert('No se pudo analizar', err instanceof Error ? err.message : 'No se pudo generar el analisis del CV.', t);
    }
  }
  async function abrirCv() {
    try {
      if (cvPreviewUrl) {
        setPdfPreview({
          sourceUrl: cvPreviewUrl,
          title: 'Mi CV'
        });
        return;
      }
      const blob = await obtenerCvBlob();
      const nextUrl = URL.createObjectURL(blob);
      setCvPreviewUrl(prev => {
        if (prev) URL.revokeObjectURL(prev);
        return nextUrl;
      });
      setPdfPreview({
        sourceUrl: nextUrl,
        title: 'Mi CV'
      });
    } catch {
      await errorAlert('No se pudo abrir el CV', 'No fue posible recuperar el archivo PDF en este momento.', t);
    }
  }
  function abrirNuevaCert() {
    setEditandoCert(null);
    setFormCert({
      nombre: '',
      institucion: '',
      fecha: '',
      pdf: null
    });
    setModalCert(true);
  }
  function abrirEditarCert(cert) {
    setEditandoCert(cert.id);
    setFormCert({
      nombre: cert.nombre,
      institucion: cert.emisor,
      fecha: cert.fecha,
      pdf: null
    });
    setModalCert(true);
  }
  async function recargarCertificaciones() {
    const data = await listarCertificaciones();
    setCertificaciones(data.ok ? data.certificaciones : []);
  }
  async function guardarCertificacion() {
    if (!formCert.nombre.trim() || !formCert.institucion.trim() || !formCert.fecha) {
      alert('Completa todos los campos');
      return;
    }
    if (!editandoCert && !formCert.pdf) {
      alert('Selecciona un PDF');
      return;
    }
    try {
      setGuardandoCert(true);
      const formData = new FormData();
      formData.append('nombre_certificacion', formCert.nombre);
      formData.append('institucion_dada', formCert.institucion);
      formData.append('fecha_emitido', formCert.fecha);
      if (editandoCert) formData.append('id', editandoCert);
      if (formCert.pdf) formData.append('pdf', formCert.pdf);
      const data = await guardarCertificacionApi(formData);
      if (data.ok) {
        await recargarCertificaciones();
        setModalCert(false);
        await successAlert(editandoCert ? 'Certificación actualizada' : 'Certificación creada', editandoCert ? 'Los cambios fueron guardados correctamente.' : 'La certificación fue registrada correctamente.', t);
      } else {
        await errorAlert('No se pudo guardar', data.msg, t);
      }
    } catch (err) {
      console.error(err);
      await errorAlert('Error de conexión', 'No se pudo conectar con el servidor.', t);
    } finally {
      setGuardandoCert(false);
    }
  }
  async function eliminarCertificacion(id) {
    const confirmado = await confirmDelete('', t);
    if (!confirmado) return;
    try {
      const data = await eliminarCertificacionApi(id);
      if (data.ok) {
        setCertificaciones(prev => prev.filter(c => c.id !== id));
        await successAlert('Certificación eliminada', 'La certificación fue eliminada correctamente.', t);
      } else {
        await errorAlert('No se pudo eliminar', data.msg, t);
      }
    } catch (err) {
      console.error(err);
      await errorAlert('Error de conexión', 'No se pudo conectar con el servidor.', t);
    }
  }
  const cvActionDisabled = analizandoCV || subiendo || tieneCV === null;
  return <PortalLayout theme={t} navItems={postulantNav} user={MOCK_USER} pageTitle="Capacitaciones">
      <style>{`
        .cards-grid { display:grid; grid-template-columns:1fr 1fr; gap:20px; }
        .cert-row   { display:flex; justify-content:space-between; align-items:flex-start; }
        .cert-btns  { display:flex; flex-direction:column; gap:8px; }
        .ij-action-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          border-color: #bfdbfe;
          box-shadow: 0 14px 28px rgba(37,99,235,.14);
        }
        .ij-ai-btn:hover:not(:disabled) {
          transform: translateY(-3px) scale(1.015);
          box-shadow: 0 18px 38px rgba(37,99,235,.34), 0 0 22px rgba(124,58,237,.26);
        }
        .ij-float-ai {
          animation: ij-soft-float 7s ease-in-out infinite;
          transition: transform .32s cubic-bezier(.22,1,.36,1), box-shadow .32s cubic-bezier(.22,1,.36,1), opacity .2s ease;
        }
        .ij-float-ai:hover:not(:disabled) {
          transform: translateY(-3px) scale(1.015);
          box-shadow: 0 18px 38px rgba(37,99,235,.34), 0 0 22px rgba(124,58,237,.26);
        }
        @media(max-width:900px){
          .cards-grid { grid-template-columns:1fr; }
          .cert-row   { flex-direction:column; gap:14px; }
          .cert-btns  { flex-direction:row; flex-wrap:wrap; justify-content:flex-start !important; }
          .cert-btns .ij-action-btn { flex:1 1 120px; justify-content:center; }
        }
        @media(max-width:560px){
          .cert-btns { width:100%; }
          .cert-btns .ij-action-btn { flex:1 1 100%; }
        }
        @keyframes spin { to { transform:rotate(360deg); } }
        @keyframes ij-soft-float { 0%,100%{ transform:translateY(0); } 50%{ transform:translateY(-3px); } }
      `}</style>

      <div style={{
      maxWidth: '1400px',
      margin: '0 auto'
    }}>

        
        <div style={{
        position: 'relative',
        borderRadius: '24px',
        overflow: 'hidden',
        background: 'linear-gradient(135deg,#1e40af 0%,#2563eb 50%,#0ea5e9 100%)',
        padding: '40px',
        color: '#fff',
        minHeight: '220px',
        marginBottom: '28px',
        display: 'flex',
        alignItems: 'center'
      }}>
          <div style={{
          position: 'absolute',
          width: '340px',
          height: '340px',
          borderRadius: '50%',
          background: 'rgba(255,255,255,.08)',
          top: '-90px',
          right: '-80px',
          filter: 'blur(70px)'
        }} />
          <div style={{
          position: 'absolute',
          width: '250px',
          height: '250px',
          borderRadius: '50%',
          background: 'rgba(14,165,233,.25)',
          left: '35%',
          bottom: '-90px',
          filter: 'blur(70px)'
        }} />
          <div style={{
          position: 'relative',
          zIndex: 1
        }}>
            <p style={{
            margin: 0,
            opacity: .85
          }}>Perfil profesional</p>
            <h1 style={{
            margin: '10px 0',
            fontSize: '44px',
            fontWeight: 800,
            lineHeight: 1.1
          }}>CV y capacitaciones</h1>
            <p style={{
            maxWidth: '700px',
            fontSize: '16px',
            opacity: .9,
            lineHeight: 1.6
          }}>
              Mantén actualizado tu currículum y agrega certificaciones para destacar frente a reclutadores.
            </p>
          </div>
        </div>

        
        <div className="cards-grid">

          
          <Card>
            <SectionHead title="Mi CV" />
            <div style={{
            padding: '20px',
            borderBottom: `1px solid ${t.border}`
          }}>
              {tieneCV === null && <div style={{
              height: '420px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '12px',
              background: '#f8f9fb'
            }}>
                  <Loader size={24} color={t.accent} style={{
                animation: 'spin 1s linear infinite'
              }} />
                </div>}
              {tieneCV === false && <div style={{
              height: '420px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              color: t.textMuted,
              background: '#f8fafc',
              border: `1px dashed ${t.border}`,
              borderRadius: '12px'
            }}>
                  <FileText size={32} opacity={0.5} />
                  <p style={{
                margin: 0,
                fontWeight: 600
              }}>No tienes un CV registrado</p>
                  <p style={{
                margin: 0,
                fontSize: '12px'
              }}>Sube tu CV en formato PDF para comenzar</p>
                  <ActionBtn icon={<Upload size={13} />} label="Subir CV" onClick={() => fileInputRef.current?.click()} />
                </div>}
              {tieneCV === true && <iframe ref={iframeRef} title="Vista previa CV" src={cvPreviewUrl || 'about:blank'} style={{
              width: '100%',
              height: '420px',
              border: 'none',
              borderRadius: '12px',
              background: '#f8f9fb'
            }} />}
            </div>
            <input ref={fileInputRef} type="file" accept="application/pdf" style={{
            display: 'none'
          }} onChange={handleFileChange} />
            {tieneCV === true && <div style={{
            padding: '18px',
            display: 'flex',
            justifyContent: 'center',
            gap: '10px',
            flexWrap: 'wrap'
          }}>
                <ActionBtn icon={<Eye size={13} />} label="Ver CV" onClick={abrirCv} />
                <ActionBtn icon={subiendo ? <Loader size={13} style={{
              animation: 'spin 1s linear infinite'
            }} /> : <Upload size={13} />} label={subiendo ? 'Subiendo...' : 'Actualizar CV'} disabled={subiendo} onClick={() => fileInputRef.current?.click()} />
                <AiGradientBtn icon={analizandoCV ? <Loader size={13} style={{
              animation: 'spin 1s linear infinite'
            }} /> : <Sparkles size={13} />} label={analizandoCV ? 'Analizando...' : 'Mejorar CV con IA'} disabled={analizandoCV || subiendo} onClick={analizarCvActual} />
              </div>}
          </Card>

          
          <Card>
            <SectionHead title="Mis certificaciones" sub={certificaciones ? `${certificaciones.length} registradas` : ''} action="Añadir" onAction={abrirNuevaCert} />
            {certificaciones === null && <div style={{
            height: '120px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
                <Loader size={20} color={t.accent} style={{
              animation: 'spin 1s linear infinite'
            }} />
              </div>}
            {certificaciones !== null && certificaciones.length === 0 && <div style={{
            padding: '40px 20px',
            textAlign: 'center',
            color: t.textMuted
          }}>
                <Award size={32} opacity={0.4} style={{
              margin: '0 auto 10px'
            }} />
                <p style={{
              margin: 0,
              fontWeight: 600
            }}>No tienes certificaciones aún</p>
                <p style={{
              margin: '6px 0 0',
              fontSize: '12px'
            }}>Añade tu primera certificación con el botón de arriba</p>
              </div>}
            {certificaciones !== null && certificaciones.length > 0 && <ul style={{
            margin: 0,
            padding: '10px 20px 16px',
            listStyle: 'none'
          }}>
                {certificaciones.map(c => <li key={c.id} style={{
              padding: '14px 0',
              borderBottom: `1px solid ${t.border}`
            }}>
                    <div className="cert-row">
                      <div>
                        <div style={{
                    display: 'flex',
                    gap: '8px',
                    alignItems: 'center'
                  }}>
                          <Award size={14} color={t.accent} />
                          <strong>{c.nombre}</strong>
                        </div>
                        <p style={{
                    margin: '4px 0 0',
                    fontSize: '13px',
                    color: t.textMuted
                  }}>{c.emisor}</p>
                        <small style={{
                    color: t.textMuted
                  }}>{c.fecha}</small>
                      </div>
                      <div className="cert-btns" style={{
                  display: 'flex',
                  flexDirection: 'row',
                  gap: '10px',
                  flexWrap: 'wrap',
                  justifyContent: 'flex-end',
                  alignItems: 'center'
                }}>
                        <ActionBtn icon={<Eye size={11} />} label="Ver" onClick={() => setPdfPreview({
                    sourceUrl: `${CERT_URL}?id=${c.id}&archivo=1`,
                    title: c.nombre || 'Certificado'
                  })} />
                        <ActionBtn icon={<Pencil size={11} />} label="Editar" onClick={() => abrirEditarCert(c)} />
                        <ActionBtn icon={<Trash2 size={11} />} label="Eliminar" onClick={() => eliminarCertificacion(c.id)} />
                      </div>
                    </div>
                  </li>)}
              </ul>}
          </Card>

        </div>

        {(analizandoCV || analisisCV) && <div style={{
        marginTop: '28px'
      }}>
            <Card style={{
          border: '1px solid rgba(37,99,235,.22)',
          boxShadow: '0 24px 70px rgba(37,99,235,.14), 0 10px 28px rgba(124,58,237,.10)',
          background: 'linear-gradient(#fff,#fff) padding-box, linear-gradient(135deg,#2563eb,#7c3aed,#0ea5e9) border-box'
        }}>
              <SectionHead title="Recomendaciones IA para mejorar tu CV" sub="Analisis basado en texto plano extraido del PDF, no en el diseno visual final" />
              <div style={{
            height: '5px',
            background: 'linear-gradient(90deg,#2563eb,#7c3aed,#0ea5e9)'
          }} />

              {analizandoCV && <div style={{
            padding: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            color: t.textSecondary,
            fontSize: '13px',
            fontWeight: 700,
            background: 'linear-gradient(180deg,#f8fbff 0%,#ffffff 100%)'
          }}>
                  <Loader size={16} color={t.accent} style={{
              animation: 'spin 1s linear infinite'
            }} />
                  Analizando estructura, logros y palabras clave...
                </div>}

              {!analizandoCV && analisisCV && <div style={{
            padding: '24px',
            display: 'grid',
            gap: '20px',
            background: 'linear-gradient(180deg,#f8fbff 0%,#ffffff 42%,#f8fafc 100%)'
          }}>
                  <div style={{
              padding: '14px 16px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg,#fff7ed,#fff1f2)',
              border: '1px solid #fed7aa',
              color: '#9a3412',
              fontSize: '13px',
              lineHeight: 1.55,
              fontWeight: 800,
              boxShadow: '0 12px 26px rgba(234,88,12,.08)'
            }}>
                    Estas recomendaciones fueron generadas con IA y pueden contener errores. Revisalas antes de modificar tu CV; el analisis usa texto extraido del PDF, no el formato visual final.
                  </div>

                  <div style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(120px, 180px) 1fr',
              gap: '18px',
              alignItems: 'stretch'
            }}>
                    <div style={{
                borderRadius: '18px',
                background: 'linear-gradient(135deg,#2563eb,#7c3aed,#0ea5e9)',
                color: '#fff',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                boxShadow: '0 22px 42px rgba(37,99,235,.28), inset 0 1px 0 rgba(255,255,255,.22)'
              }}>
                      <span style={{
                  fontSize: '12px',
                  fontWeight: 800,
                  opacity: .85
                }}>Compatibilidad ATS</span>
                      <strong style={{
                  fontSize: '46px',
                  lineHeight: 1,
                  marginTop: '8px'
                }}>{analisisCV.diagnostico_ats?.puntuacion ?? '-'}/10</strong>
                    </div>
                    <div style={{
                border: '1px solid #bfdbfe',
                borderRadius: '18px',
                padding: '18px',
                background: 'rgba(255,255,255,.86)',
                boxShadow: '0 14px 30px rgba(15,23,42,.06)'
              }}>
                      <h3 style={{
                  margin: '0 0 8px',
                  fontSize: '16px',
                  color: t.textPrimary
                }}>Diagnostico general</h3>
                      <p style={{
                  margin: 0,
                  color: t.textSecondary,
                  fontSize: '14px',
                  lineHeight: 1.65
                }}>
                        {analisisCV.diagnostico_ats?.comentario || analisisCV.resumen_chat}
                      </p>
                      {analisisCV.diagnostico_ats?.alerta_formato && <p style={{
                  margin: '12px 0 0',
                  color: '#92400e',
                  background: '#fffbeb',
                  border: '1px solid #fde68a',
                  borderRadius: '10px',
                  padding: '10px 12px',
                  fontSize: '12px',
                  lineHeight: 1.5
                }}>
                          {analisisCV.diagnostico_ats.alerta_formato}
                        </p>}
                    </div>
                  </div>

                  {[['Hard skills a reforzar', analisisCV.diagnostico_ats?.hard_skills_faltantes], ['Soft skills poco visibles', analisisCV.diagnostico_ats?.soft_skills_faltantes], ['Palabras clave sugeridas', analisisCV.diagnostico_ats?.palabras_clave_sugeridas]].map(([title, items]) => items?.length > 0 && <div key={title} style={{
              padding: '16px',
              borderRadius: '18px',
              background: '#fff',
              border: '1px solid #dbeafe',
              boxShadow: '0 10px 24px rgba(37,99,235,.06)'
            }}>
                        <h3 style={{
                margin: '0 0 10px',
                fontSize: '13px',
                color: t.textPrimary
              }}>{title}</h3>
                        <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px'
              }}>
                          {items.map(item => <span key={item} style={{
                  padding: '8px 11px',
                  borderRadius: '999px',
                  background: 'linear-gradient(135deg,#eef2ff,#ecfeff)',
                  border: '1px solid #c4b5fd',
                  color: '#4c1d95',
                  fontSize: '12px',
                  fontWeight: 800
                }}>
                              {item}
                            </span>)}
                        </div>
                      </div>)}

                  <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))',
              gap: '14px'
            }}>
                    <div style={{
                border: '1px solid #ddd6fe',
                borderRadius: '18px',
                padding: '18px',
                background: '#fff',
                boxShadow: '0 14px 30px rgba(124,58,237,.08)'
              }}>
                      <h3 style={{
                  margin: '0 0 8px',
                  fontSize: '14px',
                  color: t.textPrimary
                }}>Auditoria de impacto</h3>
                      <p style={{
                  margin: '0 0 12px',
                  color: t.textSecondary,
                  fontSize: '13px',
                  lineHeight: 1.6
                }}>{analisisCV.auditoria_impacto?.diagnostico}</p>
                      {analisisCV.auditoria_impacto?.bullets_reescritos_star?.map((item, index) => <div key={`${item.original}-${index}`} style={{
                  borderTop: `1px solid ${t.border}`,
                  paddingTop: '12px',
                  marginTop: '12px'
                }}>
                          <p style={{
                    margin: '0 0 6px',
                    fontSize: '12px',
                    color: t.textMuted
                  }}>Antes: {item.original}</p>
                          <p style={{
                    margin: 0,
                    fontSize: '13px',
                    color: t.textPrimary,
                    lineHeight: 1.55,
                    fontWeight: 700
                  }}>STAR: {item.reescrito}</p>
                        </div>)}
                    </div>

                    <div style={{
                border: '1px solid #bae6fd',
                borderRadius: '18px',
                padding: '18px',
                background: '#fff',
                boxShadow: '0 14px 30px rgba(14,165,233,.08)'
              }}>
                      <h3 style={{
                  margin: '0 0 8px',
                  fontSize: '14px',
                  color: t.textPrimary
                }}>Resumen profesional</h3>
                      <p style={{
                  margin: '0 0 12px',
                  color: t.textSecondary,
                  fontSize: '13px',
                  lineHeight: 1.6
                }}>{analisisCV.resumen_profesional?.evaluacion}</p>
                      {analisisCV.resumen_profesional?.version_sugerida && <div style={{
                  padding: '12px 14px',
                  borderRadius: '12px',
                  background: '#ecfeff',
                  border: '1px solid #a5f3fc',
                  color: '#155e75',
                  fontSize: '13px',
                  lineHeight: 1.6,
                  fontWeight: 700
                }}>
                          {analisisCV.resumen_profesional.version_sugerida}
                        </div>}
                    </div>
                  </div>

                  <div style={{
              border: '1px solid #dbeafe',
              borderRadius: '18px',
              padding: '18px',
              background: '#fff',
              boxShadow: '0 14px 30px rgba(37,99,235,.06)'
            }}>
                    <h3 style={{
                margin: '0 0 8px',
                fontSize: '14px',
                color: t.textPrimary
              }}>Contenido y escaneabilidad</h3>
                    <p style={{
                margin: '0 0 14px',
                color: t.textSecondary,
                fontSize: '13px',
                lineHeight: 1.6
              }}>{analisisCV.estructura_escaneabilidad?.comentario}</p>
                    <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))',
                gap: '12px'
              }}>
                      <div>
                        <strong style={{
                    display: 'block',
                    marginBottom: '8px',
                    color: '#047857',
                    fontSize: '13px'
                  }}>Hacer</strong>
                        <ul style={{
                    margin: 0,
                    paddingLeft: '18px',
                    color: t.textSecondary,
                    fontSize: '13px',
                    lineHeight: 1.7
                  }}>
                          {(analisisCV.estructura_escaneabilidad?.hacer ?? []).map(item => <li key={item}>{item}</li>)}
                        </ul>
                      </div>
                      <div>
                        <strong style={{
                    display: 'block',
                    marginBottom: '8px',
                    color: '#b91c1c',
                    fontSize: '13px'
                  }}>No hacer</strong>
                        <ul style={{
                    margin: 0,
                    paddingLeft: '18px',
                    color: t.textSecondary,
                    fontSize: '13px',
                    lineHeight: 1.7
                  }}>
                          {(analisisCV.estructura_escaneabilidad?.no_hacer ?? []).map(item => <li key={item}>{item}</li>)}
                        </ul>
                      </div>
                    </div>
                  </div>

                  {analisisCV.nota && <p style={{
              margin: 0,
              color: t.textMuted,
              fontSize: '12px',
              lineHeight: 1.5
            }}>
                      {analisisCV.nota}
                    </p>}
                </div>}
            </Card>
          </div>}
      </div>

      <button type="button" className="ij-float-ai" onClick={analizarCvActual} disabled={cvActionDisabled} aria-label="Mejorar CV con IA" style={{
      position: 'fixed',
      right: 96,
      bottom: 30,
      zIndex: 999998,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      minHeight: '48px',
      padding: '0 18px',
      borderRadius: '999px',
      border: '1px solid rgba(255,255,255,0.35)',
      background: analizandoCV ? '#7c3aed' : 'linear-gradient(135deg, #2563eb 0%, #7c3aed 58%, #0ea5e9 100%)',
      color: '#fff',
      fontSize: '13px',
      fontWeight: 900,
      cursor: cvActionDisabled ? 'not-allowed' : 'pointer',
      boxShadow: '0 14px 32px rgba(37,99,235,0.28), 0 0 18px rgba(124,58,237,0.22)'
    }}>
        <Sparkles size={16} />
        {analizandoCV ? 'Analizando...' : 'Mejorar CV con IA'}
      </button>

      
      {modalCert && <div onClick={() => {
      if (!guardandoCert) setModalCert(false);
    }} style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15,23,42,.55)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '24px',
      zIndex: 9999
    }}>
          <div onClick={e => e.stopPropagation()} style={{
        width: '100%',
        maxWidth: '620px',
        background: '#fff',
        borderRadius: '28px',
        overflow: 'hidden',
        boxShadow: '0 30px 80px rgba(15,23,42,.25)'
      }}>
            
            <div style={{
          background: 'linear-gradient(135deg,#1e40af,#2563eb,#0ea5e9)',
          padding: '28px',
          color: '#fff',
          position: 'relative'
        }}>
              <div style={{
            position: 'absolute',
            right: '-50px',
            top: '-50px',
            width: '180px',
            height: '180px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,.08)'
          }} />
              <div style={{
            position: 'relative',
            zIndex: 2,
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
                <div style={{
              width: '52px',
              height: '52px',
              borderRadius: '14px',
              background: 'rgba(255,255,255,.18)',
              display: 'grid',
              placeItems: 'center'
            }}>
                  <Award size={24} />
                </div>
                <div>
                  <h2 style={{
                margin: 0,
                fontSize: '24px',
                fontWeight: 800
              }}>
                    {editandoCert ? 'Editar certificación' : 'Nueva certificación'}
                  </h2>
                  <p style={{
                margin: '6px 0 0',
                opacity: .9
              }}>
                    {editandoCert ? 'Actualiza información o reemplaza el PDF' : 'Agrega una certificación a tu perfil'}
                  </p>
                </div>
              </div>
            </div>

            
            <div style={{
          padding: '26px',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px'
        }}>

              
              <div>
                <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '13px',
              fontWeight: 700,
              color: t.textPrimary
            }}>
                  Nombre del certificado
                </label>
                <input value={formCert.nombre} onChange={e => setFormCert({
              ...formCert,
              nombre: e.target.value
            })} placeholder="Ej. Certificación React Avanzado" style={{
              width: '100%',
              padding: '14px 16px',
              border: `1px solid ${t.border}`,
              borderRadius: '14px',
              outline: 'none',
              fontSize: '14px',
              background: '#f8fafc'
            }} />
              </div>

              
              <div>
                <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '13px',
              fontWeight: 700
            }}>
                  Institución
                </label>
                <input value={formCert.institucion} onChange={e => setFormCert({
              ...formCert,
              institucion: e.target.value
            })} placeholder="Ej. Coursera" style={{
              width: '100%',
              padding: '14px 16px',
              border: `1px solid ${t.border}`,
              borderRadius: '14px',
              background: '#f8fafc',
              outline: 'none'
            }} />
              </div>

              
              <div>
                <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '13px',
              fontWeight: 700
            }}>
                  Fecha de emisión
                </label>
                <div style={{
              position: 'relative'
            }}>
                  <input ref={dateInputRef} type="date" value={formCert.fecha} max={HOY} onClick={abrirCalendarioCertificacion} onChange={e => setFormCert({
                ...formCert,
                fecha: e.target.value
              })} style={{
                width: '100%',
                padding: '14px 48px 14px 16px',
                border: `1px solid ${t.border}`,
                borderRadius: '14px',
                background: '#f8fafc',
                outline: 'none',
                fontSize: '14px',
                cursor: 'pointer'
              }} />
                  <button type="button" onClick={abrirCalendarioCertificacion} aria-label="Abrir calendario" title="Abrir calendario" style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '32px',
                height: '32px',
                border: 'none',
                borderRadius: '10px',
                background: '#e0f2fe',
                color: t.accent,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}>
                    <Calendar size={16} />
                  </button>
                </div>
              </div>

              
              <div>
                <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '13px',
              fontWeight: 700
            }}>
                  PDF del certificado
                </label>
                <label style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              padding: '26px',
              border: `2px dashed ${t.accent}`,
              borderRadius: '18px',
              cursor: 'pointer',
              background: '#eff6ff'
            }}>
                  <Upload size={18} color={t.accent} />
                  <div>
                    <div style={{
                  fontWeight: 700
                }}>{formCert.pdf ? formCert.pdf.name : 'Seleccionar PDF'}</div>
                    <div style={{
                  fontSize: '12px',
                  color: t.textMuted
                }}>PDF máximo 5MB</div>
                  </div>
                  <input hidden type="file" accept="application/pdf" onChange={e => setFormCert({
                ...formCert,
                pdf: e.target.files?.[0]
              })} />
                </label>
                {editandoCert && <p style={{
              marginTop: '10px',
              fontSize: '12px',
              color: t.textMuted
            }}>
                    Si no seleccionas PDF se conservará el actual.
                  </p>}
              </div>

            </div>

            
            <div style={{
          padding: '22px',
          display: 'flex',
          justifyContent: 'end',
          gap: '12px',
          borderTop: `1px solid ${t.border}`,
          background: '#fafafa'
        }}>
              <button type="button" disabled={guardandoCert} onClick={() => setModalCert(false)} style={{
            height: '46px',
            padding: '0 18px',
            borderRadius: '14px',
            border: `1px solid ${t.border}`,
            background: '#fff',
            cursor: 'pointer',
            fontWeight: 700
          }}>
                Cancelar
              </button>
              <button type="button" disabled={guardandoCert} onClick={guardarCertificacion} style={{
            height: '46px',
            padding: '0 20px',
            border: 'none',
            borderRadius: '14px',
            background: 'linear-gradient(135deg,#1e40af,#2563eb)',
            color: '#fff',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            cursor: 'pointer'
          }}>
                {guardandoCert ? <><Loader size={14} style={{
                animation: 'spin 1s linear infinite'
              }} />Guardando...</> : <><Upload size={14} />{editandoCert ? 'Guardar cambios' : 'Crear certificación'}</>}
              </button>
            </div>

          </div>
        </div>}
      <PdfPreviewModal open={Boolean(pdfPreview)} sourceUrl={pdfPreview?.sourceUrl} title={pdfPreview?.title} onClose={() => setPdfPreview(null)} theme={t} />
    </PortalLayout>;
}
