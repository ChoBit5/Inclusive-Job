import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, FileText, RefreshCw } from 'lucide-react';
import { PageHeader, Badge, Button, SearchBar, FilterTabs, ErrorBanner } from '../../components/Admin/UI';
import Table from '../../components/Admin/Table';
import Pagination from '../../components/Admin/Pagination';
import { useSearch, usePagination } from '../../data/interface.js';
import { usePostulaciones } from '../../data/interface.js';
const ESTADO_BADGE = {
  pendiente: 'warning',
  entrevista: 'info',
  aceptado: 'success',
  rechazada: 'danger',
  rechazado: 'danger'
};
const FILTROS = [{
  value: 'todas',
  label: 'Todas'
}, {
  value: 'pendiente',
  label: 'Pendientes'
}, {
  value: 'entrevista',
  label: 'En entrevista'
}, {
  value: 'aceptado',
  label: 'Aceptadas'
}, {
  value: 'rechazado',
  label: 'Rechazadas'
}];
const LIMITE = 15;
function safeDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('es-MX');
}
function postulanteName(row) {
  const fullName = `${row.nombres ?? ''} ${row.apellidos ?? ''}`.trim();
  return row.postulante ?? row.nombre_postulante ?? (fullName || row.correo || '-');
}
function getPostulacionId(row) {
  return row.id_postulacion ?? row.id;
}
export default function Postulaciones() {
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
  const [filtro, setFiltro] = useState('todas');
  const buildParams = useCallback(() => {
    const params = new URLSearchParams();
    if (filtro !== 'todas') params.set('estado', filtro);
    if (debouncedQuery) params.set('buscar', debouncedQuery);
    params.set('pagina', String(page));
    params.set('limite', String(LIMITE));
    return `&${params.toString()}`;
  }, [filtro, debouncedQuery, page]);
  const {
    data,
    loading,
    error,
    refetch
  } = usePostulaciones(buildParams());
  const payload = data?.data ?? data ?? {};
  const postulaciones = payload.postulaciones ?? (Array.isArray(payload) ? payload : []);
  const total = Number(payload.total ?? postulaciones.length);
  const columns = [{
    key: 'postulante',
    label: 'Postulante',
    render: (_, row) => <span className="text-white font-medium">{postulanteName(row)}</span>
  }, {
    key: 'vacante',
    label: 'Vacante',
    render: (value, row) => value ?? row.titulo_puesto ?? '-'
  }, {
    key: 'empresa',
    label: 'Empresa',
    render: (value, row) => value ?? row.nombre_empresas ?? '-'
  }, {
    key: 'estado',
    label: 'Estado',
    render: value => <Badge variant={ESTADO_BADGE[value] ?? 'default'}>{value ?? '-'}</Badge>
  }, {
    key: 'fecha_postulacion',
    label: 'Fecha',
    render: value => safeDate(value)
  }, {
    key: 'acciones',
    label: 'Acciones',
    render: (_, row) => <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/postulaciones/${getPostulacionId(row)}`)} aria-label="Ver detalle">
          <Eye size={14} />
        </Button>
  }];
  return <div className="space-y-5">
      <PageHeader title="Gestión de Postulaciones" description="Visualiza todas las postulaciones del sistema" action={<div className="flex items-center gap-3">
            <span className="text-slate-400 text-sm flex items-center gap-1">
              <FileText size={15} /> {total} postulaciones
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
      }} placeholder="Buscar postulante, vacante o empresa..." className="sm:w-80" />
        <FilterTabs options={FILTROS} value={filtro} onChange={value => {
        setFiltro(value);
        reset();
      }} />
      </div>

      <Table columns={columns} data={postulaciones} loading={loading} emptyMessage="No se encontraron postulaciones con los filtros aplicados." caption="Postulaciones del sistema" />

      <Pagination total={total} page={page} limit={LIMITE} onPageChange={goToPage} />
    </div>;
}
