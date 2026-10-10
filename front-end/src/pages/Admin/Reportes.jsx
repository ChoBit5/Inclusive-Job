import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Flag, PauseCircle, RefreshCw, X } from 'lucide-react';
import { PageHeader, Badge, Button, SearchBar, ErrorBanner } from '../../components/Admin/UI';
import Table from '../../components/Admin/Table';
import Pagination from '../../components/Admin/Pagination';
import { useSearch, usePagination } from '../../hooks/Admin/useApi.js';
import { useReporteAcciones, useReportes } from '../../hooks/Admin/useDomain.js';
import { confirmAction, confirmTextareaAction, successAlert, errorAlert } from '../../components/Admin/alerts';
const LIMITE = 15;
const ESTADO_BADGE = {
  activa: 'success',
  cerrada: 'default',
  eliminada: 'danger'
};
function safeDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('es-MX');
}
function getReporteId(row) {
  return row.id_reporte ?? row.id;
}
function getVacanteId(row) {
  return row.id_vacante;
}
function getVacante(row) {
  return row.vacante ?? row.titulo_puesto ?? 'Sin titulo';
}
function getEmpresa(row) {
  return row.empresa ?? row.nombre_empresas ?? '-';
}
function getUsuario(row) {
  return row.usuario ?? row.correo ?? '-';
}
function estadoVacanteLabel(value) {
  if (value === 'eliminada') return 'suspendida';
  return value || '-';
}
export default function Reportes() {
  const navigate = useNavigate();
  const {
    query,
    setQuery,
    debouncedQuery
  } = useSearch(400);
  const {
    page,
    goToPage,
    reset
  } = usePagination(1, LIMITE);
  const [actionLoading, setActionLoading] = useState(null);
  const buildParams = useCallback(() => {
    const params = new URLSearchParams();
    if (debouncedQuery) params.set('buscar', debouncedQuery);
    params.set('pagina', String(page));
    params.set('limite', String(LIMITE));
    return `&${params.toString()}`;
  }, [debouncedQuery, page]);
  const {
    data,
    loading,
    error,
    refetch
  } = useReportes(buildParams());
  const {
    ignorar,
    eliminarVacante
  } = useReporteAcciones();
  const payload = data?.data ?? data ?? {};
  const reportes = payload.reportes ?? (Array.isArray(payload) ? payload : []);
  const total = Number(payload.total ?? reportes.length);
  const handleIgnorar = async row => {
    const id = getReporteId(row);
    const vacante = getVacante(row);
    const ok = await confirmAction({
      title: 'Ignorar reporte',
      html: `<span>El reporte sobre <strong style="color:#fff">"${vacante}"</strong> sera descartado. La vacante conservara su estado actual.</span>`,
      confirmText: 'Ignorar',
      confirmColor: '#475569',
      icon: 'info'
    });
    if (!ok) return;
    setActionLoading(id);
    try {
      await ignorar(id);
      await refetch();
      successAlert('Reporte ignorado', 'El reporte fue descartado.');
    } catch {
      errorAlert('Error', 'No se pudo ignorar el reporte.');
    } finally {
      setActionLoading(null);
    }
  };
  const handleSuspenderVacante = async row => {
    const id = getReporteId(row);
    const vacante = getVacante(row);
    const explicacion = await confirmTextareaAction({
      title: 'Suspender vacante reportada',
      html: `<span>La vacante <strong style="color:#fff">"${vacante}"</strong> se marcará como suspendida y se cerrarán sus reportes asociados. Esta explicación se enviará al reclutador como aviso formal.</span>`,
      inputLabel: 'Explicacion para el reclutador',
      inputPlaceholder: 'Ejemplo: La vacante incumple las politicas porque...',
      confirmText: 'Suspender vacante',
      confirmColor: '#dc2626',
      icon: 'warning'
    });
    if (explicacion === null) return;
    setActionLoading(id);
    try {
      await eliminarVacante(id, {
        explicacion
      });
      await refetch();
      successAlert('Vacante suspendida', `"${vacante}" fue suspendida y se avisó al reclutador.`);
    } catch {
      errorAlert('Error', 'No se pudo suspender la vacante.');
    } finally {
      setActionLoading(null);
    }
  };
  const columns = [{
    key: 'vacante',
    label: 'Vacante',
    render: (_, row) => <span className="text-white font-medium">{getVacante(row)}</span>
  }, {
    key: 'empresa',
    label: 'Empresa',
    render: (_, row) => getEmpresa(row)
  }, {
    key: 'usuario',
    label: 'Usuario reportante',
    render: (_, row) => <div className="min-w-0">
          <p className="text-sm text-slate-300 truncate">{row.usuario_nombre || '-'}</p>
          <p className="text-xs text-slate-500 truncate">{getUsuario(row)}</p>
        </div>
  }, {
    key: 'motivo',
    label: 'Motivo',
    render: value => <span className="text-sm text-slate-300 line-clamp-2 max-w-xs" title={value}>
          {value || '-'}
        </span>
  }, {
    key: 'estado_vacante',
    label: 'Estado vacante',
    render: value => <Badge variant={ESTADO_BADGE[value] ?? 'default'}>{estadoVacanteLabel(value)}</Badge>
  }, {
    key: 'fecha_reporte',
    label: 'Fecha',
    render: value => safeDate(value)
  }, {
    key: 'acciones',
    label: 'Acciones',
    render: (_, row) => {
      const id = getReporteId(row);
      const isLoading = actionLoading === id;
      const vacanteSuspendida = row.estado_vacante === 'eliminada';
      return <div className="flex flex-wrap items-center gap-2 min-w-[260px]">
            <Button variant="ghost" size="sm" title="Ver vacante" onClick={() => navigate(`/admin/vacantes/${getVacanteId(row)}`)} aria-label="Ver vacante" className="whitespace-nowrap">
              <Eye size={14} />
              Ver vacante
            </Button>
            <Button variant="ghost" size="sm" title={vacanteSuspendida ? 'Cerrar reporte pendiente' : 'Ignorar reporte'} loading={isLoading} onClick={() => handleIgnorar(row)} aria-label={vacanteSuspendida ? 'Cerrar reporte pendiente' : 'Ignorar reporte'} className="whitespace-nowrap">
              <X size={14} />
              {vacanteSuspendida ? 'Cerrar reporte' : 'Descartar reporte'}
            </Button>
            {!vacanteSuspendida && <Button variant="danger" size="sm" title="Suspender vacante" loading={isLoading} onClick={() => handleSuspenderVacante(row)} aria-label="Suspender vacante" className="whitespace-nowrap">
                <PauseCircle size={14} />
                Suspender vacante
              </Button>}
          </div>;
    }
  }];
  return <div className="space-y-5 w-full">
      <PageHeader title="Reportes de Vacantes" description="Modera las vacantes reportadas por usuarios de la plataforma" action={<div className="flex items-center gap-3">
            <span className="text-slate-400 text-sm flex items-center gap-1">
              <Flag size={15} /> {total} reportes
            </span>
            <Button variant="ghost" size="sm" onClick={refetch} disabled={loading}>
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              {loading ? 'Cargando...' : 'Actualizar'}
            </Button>
          </div>} />

      <ErrorBanner message={error} />

      <div className="flex flex-col sm:flex-row gap-3">
        <SearchBar value={query} onChange={value => {
        setQuery(value);
        reset();
      }} placeholder="Buscar por vacante, empresa, usuario o motivo..." className="sm:w-96" />
      </div>

      <Table columns={columns} data={reportes} loading={loading} emptyMessage="No hay reportes de vacantes para mostrar." caption="Reportes de vacantes" />

      <Pagination total={total} page={page} limit={LIMITE} onPageChange={goToPage} />
    </div>;
}
