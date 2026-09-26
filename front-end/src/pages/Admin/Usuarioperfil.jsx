import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, FileText, Globe, Award, Accessibility, Building2, Briefcase, PauseCircle, PlayCircle, RefreshCw, User } from 'lucide-react';
import { Badge, Button, ErrorBanner } from '../../components/Admin/UI';
import { useUsuarioAcciones, useUsuarioDetalle } from '../../data/interface.js';
import { ENDPOINTS } from '../../data/interface.js';
import { resolveAssetUrl } from '../../data/interface.js';
import { confirmSuspend, confirmAction, successAlert, errorAlert } from '../../components/Admin/alerts';
import PdfPreviewModal from '../../components/PdfPreviewModal';
const ESTADO_BADGE = {
  activo: 'success',
  suspendido: 'danger',
  inactivo: 'default'
};
const ROL_BADGE = {
  administrador: 'purple',
  reclutador: 'info',
  postulante: 'default'
};
const EMPRESA_ESTADO_MAP = {
  0: {
    label: 'Pendiente',
    variant: 'warning'
  },
  1: {
    label: 'Aprobada',
    variant: 'success'
  },
  2: {
    label: 'Rechazada',
    variant: 'danger'
  },
  3: {
    label: 'Suspendida',
    variant: 'default'
  }
};
function nombreCompleto(user) {
  return `${user?.nombres ?? ''} ${user?.apellidos ?? ''}`.trim() || 'Sin nombre';
}
function initials(user) {
  const first = user?.nombres?.charAt(0) ?? 'U';
  const last = user?.apellidos?.charAt(0) ?? '';
  return `${first}${last}`.toUpperCase();
}
function safeDate(value, options = {}) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('es-MX', options);
}
function withProtocol(url) {
  if (!url) return '';
  return String(url).trim();
}
function getCertificacionId(cert) {
  return cert.id_certificaciones ?? cert.id_certificacion ?? cert.id;
}
function getCertificacionInstitucion(cert) {
  return cert.institucion_dada ?? cert.institucion ?? '-';
}
function getCertificacionFecha(cert) {
  return cert.fecha_emitido ?? cert.fecha_emision;
}
function getCertificacionPdf(cert) {
  const id = getCertificacionId(cert);
  return id && Number(cert.tiene_pdf ?? 0) ? ENDPOINTS.usuarios.certificacionPdf(id) : '';
}
function parseSkills(value) {
  if (Array.isArray(value)) {
    return value.map(item => String(item).trim()).filter(Boolean);
  }
  if (typeof value !== 'string') return [];
  const trimmed = value.trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed.map(item => String(item).trim()).filter(Boolean);
    }
    if (typeof parsed === 'string') {
      return parsed.trim() ? [parsed.trim()] : [];
    }
  } catch {
    return trimmed.split(/[,;\n]/).map(item => item.trim()).filter(Boolean);
  }
  return trimmed.split(/[,;\n]/).map(item => item.trim()).filter(Boolean);
}
function parseDisabilityDescription(value) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) return {
    description: '',
    percentage: ''
  };
  const onlyPercentage = text.match(/^(\d+(?:\.\d+)?)%\s*$/);
  if (onlyPercentage) return {
    description: '',
    percentage: `${onlyPercentage[1]}%`
  };
  const match = text.match(/^(.*?)(?:\s*(?:\||-)\s*)(\d+(?:\.\d+)?)%\s*$/);
  if (!match) return {
    description: text,
    percentage: ''
  };
  return {
    description: match[1].trim(),
    percentage: `${match[2]}%`
  };
}
function formatPhysicalEffort(value) {
  if (value === null || value === undefined || value === '') return '-';
  const numeric = Number(value);
  if (!Number.isNaN(numeric)) return numeric === 1 ? 'Sí' : 'No';
  return String(value);
}
function getEmpresaEstado(value) {
  const numeric = Number(value ?? 0);
  return EMPRESA_ESTADO_MAP[numeric] ?? EMPRESA_ESTADO_MAP[0];
}
function InfoField({
  label,
  value,
  icon: Icon,
  link
}) {
  const display = value || '-';
  return <div className="flex items-start gap-3 min-w-0">
      {Icon && <Icon size={15} className="text-slate-400 mt-0.5 flex-shrink-0" />}
      <div className="min-w-0">
        <p className="text-slate-400 text-xs">{label}</p>
        {link && value ? <a href={link} target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:underline text-sm break-all">
            {display}
          </a> : <p className="text-white text-sm break-words">{display}</p>}
      </div>
    </div>;
}
function TextBlock({
  label,
  value
}) {
  return <div>
      <p className="text-slate-400 text-xs mb-1">{label}</p>
      <p className="text-white text-sm leading-relaxed">{value || '-'}</p>
    </div>;
}
export default function UsuarioPerfil() {
  const {
    id
  } = useParams();
  const navigate = useNavigate();
  const {
    data,
    loading,
    error,
    refetch
  } = useUsuarioDetalle(id);
  const {
    suspender,
    reactivar
  } = useUsuarioAcciones();
  const [actionLoading, setActionLoading] = useState(null);
  const [pdfPreview, setPdfPreview] = useState(null);
  const detalle = data?.data ?? {};
  const usuario = detalle.usuario;
  const postulante = detalle.postulante;
  const reclutador = detalle.reclutador;
  const discapacidades = detalle.discapacidades ?? [];
  const certificaciones = detalle.certificaciones ?? [];
  const postulaciones = detalle.postulaciones ?? [];
  const vacantes = detalle.vacantes ?? [];
  const isPostulante = usuario?.rol === 'postulante';
  const isReclutador = usuario?.rol === 'reclutador';
  const postulanteSkills = parseSkills(postulante?.habilidades);
  const disabilityDescription = parseDisabilityDescription(postulante?.descripcion_discapacidad);
  const empresaEstado = getEmpresaEstado(reclutador?.empresa_validada ?? reclutador?.estado_validacion);
  const profileImageUrl = resolveAssetUrl(usuario?.foto_perfil || usuario?.avatar || usuario?.imagen);
  const cvUrl = usuario?.id_usuario && Number(postulante?.tiene_cv ?? 0) ? ENDPOINTS.usuarios.cv(usuario.id_usuario) : '';
  const openPdfPreview = (sourceUrl, title) => {
    if (!sourceUrl) return;
    setPdfPreview({
      sourceUrl,
      title
    });
  };
  const runAction = async ({
    type,
    request,
    title,
    text
  }) => {
    setActionLoading(type);
    try {
      await request();
      await refetch();
      successAlert(title, text);
    } catch {
      errorAlert('Error', 'No se pudo completar la acción.');
    } finally {
      setActionLoading(null);
    }
  };
  const handleSuspender = async () => {
    const name = nombreCompleto(usuario);
    const ok = await confirmSuspend(name);
    if (!ok) return;
    runAction({
      type: 'suspender',
      request: () => suspender(usuario.id_usuario),
      title: 'Suspendido',
      text: `${name} ha sido suspendido.`
    });
  };
  const handleReactivar = async () => {
    const name = nombreCompleto(usuario);
    const ok = await confirmAction({
      title: '¿Reactivar usuario?',
      html: `<span>Se restaurará el acceso de <strong style="color:#fff">${name}</strong>.</span>`,
      confirmText: 'Reactivar',
      confirmColor: '#16a34a',
      icon: 'question'
    });
    if (!ok) return;
    runAction({
      type: 'reactivar',
      request: () => reactivar(usuario.id_usuario),
      title: '¡Reactivado!',
      text: `${name} puede acceder nuevamente.`
    });
  };
  if (loading) {
    return <div className="flex min-h-[320px] items-center justify-center">
        <div className="w-9 h-9 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>;
  }
  if (error || !usuario) {
    return <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/admin/usuarios')}>
          <ArrowLeft size={16} /> Volver
        </Button>
        <ErrorBanner message={error || 'No se encontró el usuario solicitado.'} />
      </div>;
  }
  return <div className="space-y-6">
      <button onClick={() => navigate('/admin/usuarios')} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors">
        <ArrowLeft size={16} /> Volver a Usuarios
      </button>

      <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-violet-500/20 border-2 border-violet-500/40 flex items-center justify-center text-violet-300 text-2xl font-bold flex-shrink-0 overflow-hidden">
          {profileImageUrl ? <img src={profileImageUrl} alt={nombreCompleto(usuario)} className="w-full h-full object-cover" onError={e => {
          e.currentTarget.style.display = 'none';
          e.currentTarget.nextSibling.style.display = 'block';
        }} /> : null}
          <span style={{
          display: profileImageUrl ? 'none' : 'block'
        }}>
            {initials(usuario)}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-white truncate">{nombreCompleto(usuario)}</h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <Badge variant={ROL_BADGE[usuario.rol] ?? 'default'}>{usuario.rol}</Badge>
            <Badge variant={ESTADO_BADGE[usuario.estado] ?? 'default'}>{usuario.estado}</Badge>
            <span className="text-slate-500 text-xs">Desde {safeDate(usuario.fecha_registro)}</span>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button variant="ghost" size="sm" onClick={refetch}>
            <RefreshCw size={14} /> Actualizar
          </Button>
          {usuario.estado === 'activo' ? <Button variant="danger" size="sm" loading={actionLoading === 'suspender'} onClick={handleSuspender}>
              <PauseCircle size={14} /> Suspender
            </Button> : <Button variant="success" size="sm" loading={actionLoading === 'reactivar'} onClick={handleReactivar}>
              <PlayCircle size={14} /> Reactivar
            </Button>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5">
          <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
            <User size={16} className="text-violet-400" /> Información personal
          </h2>
          <div className="space-y-4">
            <InfoField label="Correo electrónico" value={usuario.correo} icon={Mail} link={`mailto:${usuario.correo}`} />
            <InfoField label="Teléfono" value={usuario.telefono} icon={Phone} />
            <InfoField label="Fecha de registro" value={safeDate(usuario.fecha_registro, {
            dateStyle: 'long'
          })} />
          </div>
        </section>

        {isReclutador && <section className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5">
            <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Building2 size={16} className="text-violet-400" /> Reclutador
            </h2>
            <div className="space-y-4">
              <InfoField label="Puesto" value={reclutador?.puesto} />
              {reclutador?.sector && reclutador.sector !== 'No especificado' && <InfoField label="Sector" value={reclutador.sector} />}
              <InfoField label="Empresa" value={reclutador?.empresa ?? reclutador?.nombre_empresas} icon={Building2} />
              <InfoField label="Correo empresa" value={reclutador?.correo_empresa} icon={Mail} />
              <div>
                <p className="text-slate-400 text-xs mb-1">Estado de validación</p>
                <Badge variant={empresaEstado.variant}>{empresaEstado.label}</Badge>
              </div>
            </div>
          </section>}

        {isPostulante && <section className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5">
            <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Accessibility size={16} className="text-violet-400" /> Discapacidades
            </h2>
            {discapacidades.length === 0 ? <p className="text-slate-500 text-sm">No hay discapacidades registradas.</p> : <div className="flex flex-wrap gap-2">
                {discapacidades.map(item => <Badge key={item.id_discapacidad ?? item.nombre ?? item} variant="purple">
                    {item.nombre ?? item}
                  </Badge>)}
              </div>}
          </section>}
      </div>

      {isPostulante && <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5">
            <h2 className="text-white font-semibold mb-4">Perfil profesional</h2>
            <div className="space-y-4">
              <TextBlock label="Descripción de discapacidad" value={disabilityDescription.description} />
              {disabilityDescription.percentage && <InfoField label="Porcentaje de discapacidad" value={disabilityDescription.percentage} />}
              <TextBlock label="Experiencia laboral" value={postulante?.experiencia} />
              <div>
                <p className="text-slate-400 text-xs mb-1">Habilidades</p>
                {postulanteSkills.length === 0 ? <p className="text-white text-sm">-</p> : <div className="flex flex-wrap gap-2">
                    {postulanteSkills.map(skill => <Badge key={skill} variant="purple">{skill}</Badge>)}
                  </div>}
              </div>
              <div>
                <p className="text-slate-400 text-xs mb-1">Puede realizar esfuerzo físico</p>
                <Badge variant="info">{formatPhysicalEffort(postulante?.esfuerzo_fisico_posible)}</Badge>
              </div>
              <div className="flex gap-3 flex-wrap">
                {cvUrl && <Button variant="secondary" size="sm" onClick={() => openPdfPreview(cvUrl, `CV - ${nombreCompleto(usuario)}`)}>
                    <FileText size={13} /> Ver CV
                  </Button>}
                {postulante?.portafolio_url && <a href={withProtocol(postulante.portafolio_url)} target="_blank" rel="noopener noreferrer">
                    <Button variant="ghost" size="sm"><Globe size={13} /> Portafolio</Button>
                  </a>}
              </div>
            </div>
          </section>

          <section className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5">
            <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Award size={16} className="text-violet-400" /> Certificaciones
            </h2>
            {certificaciones.length === 0 ? <p className="text-slate-500 text-sm">No hay certificaciones registradas.</p> : <ul className="space-y-3">
                {certificaciones.map(cert => <li key={getCertificacionId(cert)} className="bg-slate-700/30 rounded-xl p-3">
                    <p className="text-white text-sm font-medium">{cert.nombre_certificacion ?? cert.nombre}</p>
                    <p className="text-slate-400 text-xs">{getCertificacionInstitucion(cert)}</p>
                    <p className="text-slate-500 text-xs mt-1">{safeDate(getCertificacionFecha(cert))}</p>
                    {getCertificacionPdf(cert) && <button type="button" onClick={() => openPdfPreview(getCertificacionPdf(cert), cert.nombre_certificacion ?? cert.nombre ?? 'Certificado')} className="inline-flex mt-2 text-xs text-violet-400 hover:underline bg-transparent border-0 p-0 cursor-pointer">
                        Ver certificado
                      </button>}
                  </li>)}
              </ul>}
          </section>
        </div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {isPostulante && <section className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5">
            <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Briefcase size={16} className="text-violet-400" /> Postulaciones recientes
            </h2>
            {postulaciones.length === 0 ? <p className="text-slate-500 text-sm">No hay postulaciones recientes.</p> : <ul className="space-y-2">
                {postulaciones.map(p => <li key={p.id_postulacion} className="bg-slate-700/30 rounded-xl px-3 py-2.5">
                    <p className="text-white text-sm font-medium">{p.titulo_puesto}</p>
                    <p className="text-slate-400 text-xs">{p.empresa || '-'} · {safeDate(p.fecha_postulacion)}</p>
                    <Badge variant="info">{p.estado}</Badge>
                  </li>)}
              </ul>}
          </section>}

        {isReclutador && <section className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5">
            <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Briefcase size={16} className="text-violet-400" /> Vacantes recientes
            </h2>
            {vacantes.length === 0 ? <p className="text-slate-500 text-sm">No hay vacantes recientes.</p> : <ul className="space-y-2">
                {vacantes.map(v => <li key={v.id_vacante} className="bg-slate-700/30 rounded-xl px-3 py-2.5">
                    <p className="text-white text-sm font-medium">{v.titulo_puesto}</p>
                    <p className="text-slate-400 text-xs">{v.modalidad || '-'} · {safeDate(v.fecha_publicacion)}</p>
                    <Badge variant={v.estado === 'activa' ? 'success' : 'default'}>{v.estado}</Badge>
                  </li>)}
              </ul>}
          </section>}
      </div>

      <PdfPreviewModal open={Boolean(pdfPreview)} sourceUrl={pdfPreview?.sourceUrl} title={pdfPreview?.title} onClose={() => setPdfPreview(null)} theme={{
      bgSurface: '#111827',
      bgElevated: '#1e293b',
      border: 'rgba(148,163,184,0.22)',
      textPrimary: '#fff',
      textMuted: '#94a3b8',
      accent: '#8b5cf6'
    }} />
    </div>;
}
