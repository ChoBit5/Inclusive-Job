import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Bell, CheckCircle2, Eye, Flag, RefreshCw, X } from 'lucide-react';
import PortalLayout from '../../components/Portal/Portallayout';
import { reclutadorTheme as t } from '../../components/Portal/portalTheme';
import { reclutadorNav } from '../../components/Portal/Navitems';
import { Button, ErrorBanner, PageHeader, SearchBar } from '../../components/Admin/UI';
import Table from '../../components/Admin/Table';
import Pagination from '../../components/Admin/Pagination';
import BubleChat from "../Reclutador/ChatBot.jsx";
import { useAvisosReportesReclutador, useReportesReclutador } from '../../data/interface.js';
import { errorAlert, successAlert } from '../../components/Admin/alerts';
const LIMITE = 15;
export default function ReportesMios() {
  const navigate = useNavigate();
  const {
    data,
    loading,
    error,
    refetch
  } = useReportesReclutador();
  const {
    marcarAvisoAtendido
  } = useAvisosReportesReclutador();
  const [reportes, setReportes] = useState([]);
  const [avisos, setAvisos] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [page, setPage] = useState(1);
  const [modalReporte, setModalReporte] = useState(null);
  const [avisoLoading, setAvisoLoading] = useState(null);
  useEffect(() => {
    const payload = data?.data ?? data;
    if (!payload) return;
    if (Array.isArray(payload)) {
      setReportes(payload);
      setAvisos([]);
      return;
    }
    setReportes(Array.isArray(payload.reportes) ? payload.reportes : []);
    setAvisos(Array.isArray(payload.avisos) ? payload.avisos : []);
  }, [data]);
  const reportesFiltrados = useMemo(() => {
    const texto = busqueda.toLowerCase();
    return reportes.filter(reporte => [reporte.vacante, reporte.usuario_nombre, reporte.correo, reporte.motivo, reporte.fecha_reporte].join(' ').toLowerCase().includes(texto));
  }, [busqueda, reportes]);
  const total = reportesFiltrados.length;
  const datosPagina = reportesFiltrados.slice((page - 1) * LIMITE, page * LIMITE);
  const handleMarcarAvisoAtendido = async idAviso => {
    setAvisoLoading(idAviso);
    try {
      await marcarAvisoAtendido(idAviso);
      setAvisos(prev => prev.filter(aviso => aviso.id !== idAviso));
      await successAlert('Aviso atendido', 'La alerta fue marcada como atendida.', t);
      await refetch();
    } catch (err) {
      await errorAlert('No se pudo actualizar', err.message || 'Intenta de nuevo.', t);
    } finally {
      setAvisoLoading(null);
    }
  };
  const columns = [{
    key: 'vacante',
    label: 'Vacante',
    render: (_, row) => <span className="text-white font-medium">{row.vacante}</span>
  }, {
    key: 'usuario',
    label: 'Usuario reportante',
    render: (_, row) => <div className="min-w-0">
          <p className="text-sm text-slate-300 truncate">{row.usuario_nombre}</p>
          <p className="text-xs text-slate-500 truncate">{row.correo}</p>
        </div>
  }, {
    key: 'motivo',
    label: 'Motivo',
    render: (_, row) => <span className="text-sm text-slate-300 line-clamp-2 max-w-xs">{row.motivo}</span>
  }, {
    key: 'fecha_vacante',
    label: 'Fecha publicacion',
    render: (_, row) => safeDate(row.fecha_publicacion)
  }, {
    key: 'fecha_reporte',
    label: 'Fecha reporte',
    render: (_, row) => safeDate(row.fecha_reporte)
  }, {
    key: 'acciones',
    label: 'Acciones',
    render: (_, row) => <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/reclutador/vacantes/${row.id_vacante}`)}>
            <Eye size={14} />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setModalReporte(row)}>
            <Flag size={14} />
          </Button>
        </div>
  }];
  return <PortalLayout theme={t} navItems={reclutadorNav}>
      <div className="space-y-5 w-full">
        <PageHeader title="Reportes de Vacantes" description="Consulta los reportes pendientes sobre tus vacantes. Cuando administracion resuelva un reporte, recibiras el aviso en el asistente." action={<div className="flex items-center gap-3">
              <span className="text-slate-400 text-sm flex items-center gap-1">
                <Flag size={15} />
                {total} reportes
              </span>
              <Button variant="ghost" size="sm" onClick={() => refetch()}>
                <RefreshCw size={14} />
                Actualizar
              </Button>
            </div>} />
        <ErrorBanner message={error} />
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          Estos son reportes aun pendientes de revision. Si el administrador descarta un reporte o suspende una vacante reportada, el reporte desaparecera de esta lista y te llegara una notificacion en el chat bot o aqui mismo.
        </div>

        <AvisosReportes avisos={avisos} loading={loading} avisoLoading={avisoLoading} onMarcarAtendido={handleMarcarAvisoAtendido} />

        <SearchBar value={busqueda} onChange={value => {
        setBusqueda(value);
        setPage(1);
      }} placeholder="Buscar por vacante, usuario o motivo..." className="sm:w-96" />
        <Table columns={columns} data={datosPagina} loading={loading} emptyMessage={busqueda ? 'No se encontraron coincidencias' : 'No hay reportes disponibles'} />
        <Pagination total={total} page={page} limit={LIMITE} onPageChange={setPage} />
      </div>

      {modalReporte && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4" onClick={() => setModalReporte(null)}>
          <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-6 w-full max-w-md space-y-4 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-white font-semibold flex items-center gap-2">
                <Flag size={15} className="text-violet-400" />
                Detalle del reporte
              </h2>
              <button type="button" onClick={() => setModalReporte(null)} className="text-slate-400 hover:text-white transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <DetailBlock label="Vacante">{modalReporte.vacante}</DetailBlock>
              <DetailBlock label="Motivo">{modalReporte.motivo}</DetailBlock>
              <DetailBlock label="Reportado por">
                <span>{modalReporte.usuario_nombre}</span>
                <span className="text-slate-500 text-xs block mt-1">{modalReporte.correo}</span>
              </DetailBlock>
              <DetailBlock label="Fecha del reporte">{safeDate(modalReporte.fecha_reporte)}</DetailBlock>
            </div>
          </div>
        </div>}
      <BubleChat />
    </PortalLayout>;
}
function AvisosReportes({
  avisos = [],
  loading = false,
  avisoLoading = null,
  onMarcarAtendido = () => {}
}) {
  const recientes = avisos.slice(0, 5);
  return <section className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-4 shadow-lg shadow-black/10">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-white font-semibold flex items-center gap-2">
            <Bell size={16} className="text-violet-300" />
            Avisos de administracion sobre tus reportes
          </h2>
          <p className="text-slate-400 text-sm">
            Aqui aparecen las decisiones del administrador cuando un reporte se descarta o genera una sancion formal.
          </p>
        </div>
        <span className="text-xs text-slate-500">{avisos.length} avisos</span>
      </div>

      {loading ? <div className="mt-4 rounded-xl border border-slate-700/50 bg-slate-800/50 p-4 text-sm text-slate-400">
          Cargando avisos...
        </div> : recientes.length === 0 ? <div className="mt-4 rounded-xl border border-slate-700/50 bg-slate-800/50 p-4 text-sm text-slate-400">
          Todavia no tienes avisos de administracion sobre reportes resueltos.
        </div> : <div className="mt-4 grid gap-3">
          {recientes.map(aviso => {
        const esSancion = aviso.accion === 'vacante_eliminada' || aviso.accion === 'vacante_suspendida' || aviso.resultado === 'reporte_vacante_eliminada_admin';
        const Icon = esSancion ? AlertTriangle : CheckCircle2;
        return <article key={aviso.id} className={`rounded-xl border p-4 ${esSancion ? 'border-rose-500/30 bg-rose-500/10' : 'border-emerald-500/30 bg-emerald-500/10'}`}>
                <div className="flex items-start gap-3">
                  <Icon size={18} className={esSancion ? 'text-rose-300 mt-0.5' : 'text-emerald-300 mt-0.5'} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <h3 className="text-white text-sm font-semibold truncate">
                        {aviso.vacante || 'Vacante'}
                      </h3>
                      <span className="text-xs text-slate-400">{safeDate(aviso.fecha)}</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-300">{aviso.texto}</p>

                    {aviso.motivo && <p className="mt-2 text-xs text-slate-400">
                        <span className="text-slate-300">Motivo del reporte:</span> {aviso.motivo}
                      </p>}

                    {aviso.comentario_admin && <div className="mt-3 rounded-lg border border-white/10 bg-black/20 p-3">
                        <p className="text-xs uppercase tracking-wide text-slate-400">Explicacion del administrador</p>
                        <p className="mt-1 text-sm text-slate-200">{aviso.comentario_admin}</p>
                      </div>}

                    <div className="mt-3 flex justify-end">
                      <Button variant="ghost" size="sm" loading={avisoLoading === aviso.id} onClick={() => onMarcarAtendido(aviso.id)}>
                        Marcar como atendida
                      </Button>
                    </div>
                  </div>
                </div>
              </article>;
      })}
        </div>}
    </section>;
}
function DetailBlock({
  label,
  children
}) {
  return <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
      <p className="text-slate-400 text-xs mb-1">{label}</p>
      <p className="text-slate-300 text-sm">{children}</p>
    </div>;
}
function safeDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}
