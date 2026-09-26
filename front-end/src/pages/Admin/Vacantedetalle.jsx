import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, DollarSign, Monitor, Building2, User, Accessibility, XCircle, PauseCircle, RefreshCw } from 'lucide-react';
import { Badge, Button, ErrorBanner } from '../../components/Admin/UI';
import Table from '../../components/Admin/Table';
import { useVacanteAcciones, useVacanteDetalle } from '../../data/interface.js';
import { confirmAction, successAlert, errorAlert } from '../../components/Admin/alerts';
const VACANTE_BADGE = {
  activa: 'success',
  cerrada: 'default',
  eliminada: 'danger'
};
const POSTULACION_BADGE = {
  pendiente: 'warning',
  entrevista: 'info',
  aceptado: 'success',
  rechazada: 'danger',
  rechazado: 'danger'
};
function safeDate(value, options = {}) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('es-MX', options);
}
function formatMoney(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  if (Number.isNaN(number)) return null;
  return `$${number.toLocaleString('es-MX')}`;
}
function formatSalary(vacante) {
  const min = formatMoney(vacante?.salario_min);
  const max = formatMoney(vacante?.salario_max);
  if (min && max) return `${min} - ${max} MXN`;
  return `${min || max || '-'}${min || max ? ' MXN' : ''}`;
}
function getVacanteId(vacante) {
  return vacante?.id_vacante ?? vacante?.id;
}
function getTitulo(vacante) {
  return vacante?.titulo_puesto ?? vacante?.titulo ?? 'Sin titulo';
}
function getEmpresa(vacante) {
  return vacante?.empresa ?? vacante?.nombre_empresas ?? vacante?.nombre_empresa ?? '-';
}
function getReclutador(vacante) {
  const fullName = `${vacante?.nombres ?? ''} ${vacante?.apellidos ?? ''}`.trim();
  return vacante?.reclutador ?? vacante?.nombre_reclutador ?? (fullName || '-');
}
function estadoVacanteLabel(value) {
  if (value === 'eliminada') return 'suspendida';
  return value || '-';
}
function normalizeDiscapacidad(item) {
  if (typeof item === 'string') return item;
  return item?.nombre ?? item?.tipo_discapacidad ?? item?.nombre_discapacidad ?? '';
}
function postulanteName(row) {
  const fullName = `${row.nombres ?? ''} ${row.apellidos ?? ''}`.trim();
  return row.postulante ?? row.nombre_postulante ?? (fullName || row.correo || '-');
}
const postulacionesColumns = [{
  key: 'postulante',
  label: 'Postulante',
  render: (_, row) => postulanteName(row)
}, {
  key: 'estado',
  label: 'Estado',
  render: value => <Badge variant={POSTULACION_BADGE[value] ?? 'default'}>{value || '-'}</Badge>
}, {
  key: 'fecha_postulacion',
  label: 'Fecha',
  render: (value, row) => safeDate(value ?? row.fecha)
}];
export default function VacanteDetalle() {
  const {
    id
  } = useParams();
  const navigate = useNavigate();
  const [actionLoading, setActionLoading] = useState(null);
  const {
    data,
    loading,
    error,
    refetch
  } = useVacanteDetalle(id);
  const {
    cerrar,
    eliminar
  } = useVacanteAcciones();
  const payload = data?.data ?? data ?? {};
  const vacante = payload.vacante ?? payload;
  const postulaciones = payload.postulaciones ?? vacante?.postulaciones ?? [];
  const discapacidades = payload.discapacidades ?? vacante?.discapacidades ?? [];
  const discapacidadNames = discapacidades.map(normalizeDiscapacidad).filter(Boolean);
  const runAction = async ({
    name,
    request,
    successTitle,
    successText,
    afterSuccess
  }) => {
    setActionLoading(name);
    try {
      await request();
      if (afterSuccess) afterSuccess();else await refetch();
      successAlert(successTitle, successText);
    } catch {
      errorAlert('Error', 'No se pudo completar la accion. Intenta de nuevo.');
    } finally {
      setActionLoading(null);
    }
  };
  const handleCerrar = async () => {
    const titulo = getTitulo(vacante);
    const ok = await confirmAction({
      title: 'Cerrar vacante',
      html: `<span>La vacante <strong style="color:#fff">"${titulo}"</strong> dejara de recibir postulaciones.</span>`,
      confirmText: 'Cerrar vacante',
      confirmColor: '#475569',
      icon: 'warning'
    });
    if (!ok) return;
    runAction({
      name: 'cerrar',
      request: () => cerrar(getVacanteId(vacante)),
      successTitle: 'Vacante cerrada',
      successText: `"${titulo}" ya no recibe postulaciones.`
    });
  };
  const handleSuspender = async () => {
    const titulo = getTitulo(vacante);
    const ok = await confirmAction({
      title: 'Suspender vacante',
      html: `<span>La vacante <strong style="color:#fff">"${titulo}"</strong> se marcará como suspendida y dejará de mostrarse como activa.</span>`,
      confirmText: 'Suspender vacante',
      confirmColor: '#dc2626',
      icon: 'warning'
    });
    if (!ok) return;
    runAction({
      name: 'eliminar',
      request: () => eliminar(getVacanteId(vacante)),
      successTitle: 'Vacante suspendida',
      successText: 'La vacante ha sido suspendida.',
      afterSuccess: () => navigate('/admin/vacantes')
    });
  };
  if (loading) {
    return <div className="flex min-h-[320px] items-center justify-center">
        <div className="w-9 h-9 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>;
  }
  if (error || !getVacanteId(vacante)) {
    return <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/admin/vacantes')}>
          <ArrowLeft size={16} /> Volver
        </Button>
        <ErrorBanner message={error || 'No se encontro la vacante solicitada.'} />
      </div>;
  }
  return <div className="space-y-6">
      <button onClick={() => navigate('/admin/vacantes')} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors" aria-label="Volver a vacantes">
        <ArrowLeft size={16} /> Volver a Vacantes
      </button>

      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">{getTitulo(vacante)}</h1>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Badge variant={VACANTE_BADGE[vacante.estado] ?? 'default'}>{estadoVacanteLabel(vacante.estado)}</Badge>
            <Badge variant="info">{vacante.modalidad || '-'}</Badge>
            <span className="text-slate-500 text-xs">Publicada: {safeDate(vacante.fecha_publicacion)}</span>
            <span className="text-slate-500 text-xs">Cierre: {safeDate(vacante.fecha_cierre)}</span>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button variant="ghost" size="sm" onClick={refetch} disabled={loading}>
            <RefreshCw size={14} /> Actualizar
          </Button>

          {vacante.estado === 'activa' && <Button variant="secondary" size="sm" loading={actionLoading === 'cerrar'} onClick={handleCerrar}>
              <XCircle size={14} /> Cerrar
            </Button>}

          {vacante.estado !== 'eliminada' && <Button variant="danger" size="sm" loading={actionLoading === 'eliminar'} onClick={handleSuspender}>
              <PauseCircle size={14} /> Suspender vacante
            </Button>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5">
            <h2 className="text-white font-semibold mb-3">Descripcion</h2>
            <p className="text-slate-300 text-sm leading-relaxed">
              {vacante.descripcion_puesto || vacante.descripcion || 'Sin descripcion registrada.'}
            </p>
          </section>

          <section className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5">
            <h2 className="text-white font-semibold mb-3">Requisitos</h2>
            <pre className="text-slate-300 text-sm leading-relaxed font-sans whitespace-pre-wrap">
              {vacante.requisitos || 'Sin requisitos registrados.'}
            </pre>
          </section>

          <section className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5">
            <h2 className="text-white font-semibold mb-4">Postulaciones ({postulaciones.length})</h2>
            <Table columns={postulacionesColumns} data={postulaciones} emptyMessage="Esta vacante aun no tiene postulaciones." caption="Postulaciones recibidas" />
          </section>
        </div>

        <div className="space-y-6">
          <section className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5">
            <h2 className="text-white font-semibold mb-4">Detalles</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <DollarSign size={15} className="text-slate-400" />
                <div>
                  <p className="text-slate-400 text-xs">Salario</p>
                  <p className="text-white text-sm">{formatSalary(vacante)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Monitor size={15} className="text-slate-400" />
                <div>
                  <p className="text-slate-400 text-xs">Modalidad</p>
                  <p className="text-white text-sm">{vacante.modalidad || '-'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Building2 size={15} className="text-slate-400" />
                <div>
                  <p className="text-slate-400 text-xs">Empresa</p>
                  <p className="text-white text-sm">{getEmpresa(vacante)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <User size={15} className="text-slate-400" />
                <div>
                  <p className="text-slate-400 text-xs">Reclutador</p>
                  <p className="text-white text-sm">{getReclutador(vacante)}</p>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5">
            <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Accessibility size={16} className="text-violet-400" /> Compatibilidad
            </h2>

            {discapacidadNames.length === 0 ? <p className="text-slate-500 text-sm">No hay discapacidades asociadas a esta vacante.</p> : <ul className="space-y-2" role="list">
                {discapacidadNames.map(name => <li key={name} className="flex items-center gap-2 text-sm text-emerald-400">
                    <span className="w-2 h-2 rounded-full flex-shrink-0 bg-emerald-400" />
                    {name}
                  </li>)}
              </ul>}
          </section>
        </div>
      </div>
    </div>;
}
