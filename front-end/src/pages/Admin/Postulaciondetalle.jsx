import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Briefcase, Building2, FileText, Mail, Phone, RefreshCw, Save, User } from 'lucide-react';
import { Badge, Button, ErrorBanner, Select } from '../../components/Admin/UI';
import { usePostulacionAcciones, usePostulacionDetalle } from '../../hooks/Admin/useDomain.js';
import { ENDPOINTS } from '../../hooks/Admin/apiAdmin.js';
import { errorAlert, successAlert } from '../../components/Admin/alerts';
import PdfPreviewModal from '../../components/PdfPreviewModal';
const ESTADO_BADGE = {
  pendiente: 'warning',
  entrevista: 'info',
  aceptado: 'success',
  rechazada: 'danger',
  rechazado: 'danger'
};
const ESTADOS = [{
  value: 'pendiente',
  label: 'Pendiente'
}, {
  value: 'entrevista',
  label: 'Entrevista'
}, {
  value: 'aceptado',
  label: 'Aceptado'
}, {
  value: 'rechazado',
  label: 'Rechazado'
}];
function safeDate(value, options = {}) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('es-MX', options);
}
function postulanteName(data) {
  const fullName = `${data?.nombres ?? ''} ${data?.apellidos ?? ''}`.trim();
  return data?.postulante ?? data?.nombre_postulante ?? (fullName || '-');
}
function InfoField({
  icon: Icon,
  label,
  value,
  link,
  onClick
}) {
  const display = value || '-';
  return <div className="flex items-start gap-3 min-w-0">
      {Icon && <Icon size={15} className="text-slate-400 mt-0.5 flex-shrink-0" />}
      <div className="min-w-0">
        <p className="text-slate-400 text-xs">{label}</p>
        {onClick && value ? <button type="button" onClick={onClick} className="text-violet-400 hover:underline text-sm break-all bg-transparent border-0 p-0 cursor-pointer">
            {display}
          </button> : link && value ? <a href={link} target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:underline text-sm break-all">
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
      <p className="text-white text-sm leading-relaxed whitespace-pre-wrap">{value || '-'}</p>
    </div>;
}
function postulanteValue(postulante, keys) {
  return keys.map(key => postulante?.[key]).find(value => value !== null && value !== undefined && value !== '');
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
export default function PostulacionDetalle() {
  const {
    id
  } = useParams();
  const navigate = useNavigate();
  const {
    data,
    loading,
    error,
    refetch
  } = usePostulacionDetalle(id);
  const {
    actualizarEstado
  } = usePostulacionAcciones();
  const [estado, setEstado] = useState('');
  const [saving, setSaving] = useState(false);
  const [pdfPreview, setPdfPreview] = useState(null);
  const payload = data?.data ?? data ?? {};
  const postulacion = payload.postulacion;
  const postulante = payload.postulante;
  const vacante = payload.vacante;
  const discapacidades = payload.discapacidades ?? [];
  const certificaciones = payload.certificaciones ?? [];
  const selectedEstado = estado || postulacion?.estado || '';
  const cvUrl = postulacion?.id_usuario && Number(postulante?.tiene_cv ?? 0) ? ENDPOINTS.usuarios.cv(postulacion.id_usuario) : '';
  const openPdfPreview = (sourceUrl, title) => {
    if (!sourceUrl) return;
    setPdfPreview({
      sourceUrl,
      title
    });
  };
  const handleGuardarEstado = async () => {
    if (!selectedEstado || selectedEstado === postulacion.estado) return;
    setSaving(true);
    try {
      await actualizarEstado(postulacion.id_postulacion, selectedEstado);
      await refetch();
      setEstado('');
      successAlert('Estado actualizado', 'La postulación fue actualizada correctamente.');
    } catch {
      errorAlert('Error', 'No se pudo actualizar el estado de la postulación.');
    } finally {
      setSaving(false);
    }
  };
  if (loading) {
    return <div className="flex min-h-[320px] items-center justify-center">
        <div className="w-9 h-9 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>;
  }
  if (error || !postulacion) {
    return <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/admin/postulaciones')}>
          <ArrowLeft size={16} /> Volver
        </Button>
        <ErrorBanner message={error || 'No se encontró la postulación solicitada.'} />
      </div>;
  }
  return <div className="space-y-6">
      <button onClick={() => navigate('/admin/postulaciones')} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors">
        <ArrowLeft size={16} /> Volver a Postulaciones
      </button>

      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">{postulanteName(postulacion)}</h1>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Badge variant={ESTADO_BADGE[postulacion.estado] ?? 'default'}>{postulacion.estado}</Badge>
            <span className="text-slate-500 text-xs">Fecha: {safeDate(postulacion.fecha_postulacion)}</span>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button variant="ghost" size="sm" onClick={refetch}>
            <RefreshCw size={14} /> Actualizar
          </Button>
          <div className="flex items-center gap-2">
            <Select value={selectedEstado} onChange={setEstado} options={ESTADOS} className="w-44" />
            <Button variant="primary" size="sm" loading={saving} disabled={!selectedEstado || selectedEstado === postulacion.estado} onClick={handleGuardarEstado}>
              <Save size={14} /> Guardar
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5">
          <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
            <User size={16} className="text-violet-400" /> Postulante
          </h2>
          <div className="space-y-4">
            <InfoField icon={User} label="Nombre" value={postulanteName(postulacion)} />
            <InfoField icon={Mail} label="Correo" value={postulacion.correo} link={`mailto:${postulacion.correo}`} />
            <InfoField icon={Phone} label="Teléfono" value={postulacion.telefono} />
            <TextBlock label="Experiencia laboral" value={postulanteValue(postulante, ['experiencia_laboral', 'experiencia'])} />
            <TextBlock label="Habilidades" value={postulante?.habilidades} />
            <TextBlock label="Esfuerzo físico posible" value={postulanteValue(postulante, ['esfuerzo_fisico_maximo', 'esfuerzo_fisico_posible'])} />
            <InfoField icon={FileText} label="CV" value={cvUrl ? 'Ver CV' : '-'} onClick={cvUrl ? () => openPdfPreview(cvUrl, `CV - ${postulanteName(postulacion)}`) : undefined} />
          </div>
        </section>

        <section className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5">
          <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Briefcase size={16} className="text-violet-400" /> Vacante
          </h2>
          <div className="space-y-4">
            <InfoField icon={Briefcase} label="Vacante" value={postulacion.vacante ?? vacante?.titulo_puesto} />
            <InfoField icon={Building2} label="Empresa" value={postulacion.empresa ?? vacante?.empresa} />
            <InfoField label="Modalidad" value={vacante?.modalidad} />
            <TextBlock label="Descripción" value={vacante?.descripcion_puesto} />
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5">
          <h2 className="text-white font-semibold mb-4">Discapacidades</h2>
          {discapacidades.length === 0 ? <p className="text-slate-500 text-sm">No hay discapacidades registradas.</p> : <div className="flex flex-wrap gap-2">
              {discapacidades.map(item => <Badge key={item.id_discapacidad ?? item.nombre ?? item} variant="purple">
                  {item.nombre ?? item}
                </Badge>)}
            </div>}
        </section>

        <section className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5">
          <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
            <FileText size={16} className="text-violet-400" /> Certificaciones
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
