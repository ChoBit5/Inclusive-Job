import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, Eye, PauseCircle, RefreshCw, XCircle } from 'lucide-react';
import { PageHeader, Badge, Button, SearchBar, FilterTabs, Select, ErrorBanner } from '../../components/Admin/UI';
import Table from '../../components/Admin/Table';
import Pagination from '../../components/Admin/Pagination';
import { useSearch, usePagination } from '../../data/interface.js';
import { useVacanteAcciones, useVacantes } from '../../data/interface.js';
import { confirmAction, successAlert, errorAlert } from '../../components/Admin/alerts';
const ESTADO_BADGE = {
  activa: 'success',
  cerrada: 'default',
  eliminada: 'danger'
};
const FILTROS = [{
  value: 'todas',
  label: 'Todas'
}, {
  value: 'activa',
  label: 'Activas'
}, {
  value: 'cerrada',
  label: 'Cerradas'
}, {
  value: 'eliminada',
  label: 'Suspendidas'
}];
const MODALIDADES = [{
  value: 'todas',
  label: 'Todas las modalidades'
}, {
  value: 'Remoto',
  label: 'Remoto'
}, {
  value: 'Hibrido',
  label: 'Hibrido'
}, {
  value: 'Presencial',
  label: 'Presencial'
}];
const LIMITE = 15;
function safeDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('es-MX');
}
function formatMoney(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  if (Number.isNaN(number)) return null;
  return `$${number.toLocaleString('es-MX')}`;
}
function formatSalary(row) {
  const min = formatMoney(row.salario_min);
  const max = formatMoney(row.salario_max);
  if (min && max) return `${min} - ${max}`;
  return min || max || '-';
}
function getVacanteId(row) {
  return row.id_vacante ?? row.id;
}
function getTitulo(row) {
  return row.titulo_puesto ?? row.titulo ?? 'Sin titulo';
}
function getEmpresa(row) {
  return row.empresa ?? row.nombre_empresas ?? row.nombre_empresa ?? '-';
}
function estadoVacanteLabel(value) {
  if (value === 'eliminada') return 'suspendida';
  return value || '-';
}
export default function Vacantes() {
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
  const [modalidad, setModalidad] = useState('todas');
  const [actionLoading, setActionLoading] = useState(null);
  const buildParams = useCallback(() => {
    const params = new URLSearchParams();
    if (filtro !== 'todas') params.set('estado', filtro);
    if (modalidad !== 'todas') params.set('modalidad', modalidad);
    if (debouncedQuery) params.set('buscar', debouncedQuery);
    params.set('pagina', String(page));
    params.set('limite', String(LIMITE));
    return `&${params.toString()}`;
  }, [filtro, modalidad, debouncedQuery, page]);
  const {
    data,
    loading,
    error,
    refetch
  } = useVacantes(buildParams());
  const {
    cerrar,
    eliminar
  } = useVacanteAcciones();
  const payload = data?.data ?? data ?? {};
  const vacantes = payload.vacantes ?? (Array.isArray(payload) ? payload : []);
  const total = Number(payload.total ?? vacantes.length);
  const handleCerrar = async row => {
    const id = getVacanteId(row);
    const titulo = getTitulo(row);
    const ok = await confirmAction({
      title: 'Cerrar vacante',
      html: `<span>La vacante <strong style="color:#fff">"${titulo}"</strong> dejara de recibir postulaciones.</span>`,
      confirmText: 'Cerrar vacante',
      confirmColor: '#475569',
      icon: 'warning'
    });
    if (!ok) return;
    setActionLoading(id);
    try {
      await cerrar(id);
      await refetch();
      successAlert('Vacante cerrada', `"${titulo}" ya no recibe postulaciones.`);
    } catch {
      errorAlert('Error', 'No se pudo cerrar la vacante.');
    } finally {
      setActionLoading(null);
    }
  };
  const handleSuspender = async row => {
    const id = getVacanteId(row);
    const titulo = getTitulo(row);
    const ok = await confirmAction({
      title: 'Suspender vacante',
      html: `<span>La vacante <strong style="color:#fff">"${titulo}"</strong> se marcará como suspendida y dejará de mostrarse como activa.</span>`,
      confirmText: 'Suspender vacante',
      confirmColor: '#dc2626',
      icon: 'warning'
    });
    if (!ok) return;
    setActionLoading(id);
    try {
      await eliminar(id);
      await refetch();
      successAlert('Vacante suspendida', 'La vacante ha sido suspendida.');
    } catch {
      errorAlert('Error', 'No se pudo suspender la vacante.');
    } finally {
      setActionLoading(null);
    }
  };
  const columns = [{
    key: 'titulo_puesto',
    label: 'Titulo',
    sortable: true,
    render: (_, row) => <span className="font-medium text-white">{getTitulo(row)}</span>
  }, {
    key: 'empresa',
    label: 'Empresa',
    render: (_, row) => getEmpresa(row)
  }, {
    key: 'modalidad',
    label: 'Modalidad',
    render: value => <Badge variant="info">{value || '-'}</Badge>
  }, {
    key: 'salario',
    label: 'Salario',
    render: (_, row) => formatSalary(row)
  }, {
    key: 'estado',
    label: 'Estado',
    render: value => <Badge variant={ESTADO_BADGE[value] ?? 'default'}>{estadoVacanteLabel(value)}</Badge>
  }, {
    key: 'fecha_publicacion',
    label: 'Publicacion',
    render: value => safeDate(value)
  }, {
    key: 'acciones',
    label: 'Acciones',
    render: (_, row) => {
      const id = getVacanteId(row);
      const isLoading = actionLoading === id;
      return <div className="flex flex-wrap items-center gap-2 min-w-[230px]">
            <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/vacantes/${id}`)} aria-label="Ver detalle" title="Ver detalle" className="whitespace-nowrap">
              <Eye size={14} />
              Ver
            </Button>

            {row.estado === 'activa' && <Button variant="secondary" size="sm" loading={isLoading} onClick={() => handleCerrar(row)} aria-label="Cerrar vacante" title="Cerrar vacante" className="whitespace-nowrap">
                <XCircle size={14} />
                Cerrar
              </Button>}

            {row.estado !== 'eliminada' && <Button variant="danger" size="sm" loading={isLoading} onClick={() => handleSuspender(row)} aria-label="Suspender vacante" title="Suspender vacante" className="whitespace-nowrap">
                <PauseCircle size={14} />
                Suspender
              </Button>}
          </div>;
    }
  }];
  return <div className="space-y-5 w-full">
      <PageHeader title="Gestion de Vacantes" description="Visualiza y administra todas las vacantes publicadas" action={<div className="flex items-center gap-3">
            <span className="text-slate-400 text-sm flex items-center gap-1">
              <Briefcase size={15} /> {total} vacantes
            </span>
            <Button variant="ghost" size="sm" onClick={refetch} disabled={loading}>
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              {loading ? 'Cargando...' : 'Actualizar'}
            </Button>
          </div>} />

      <ErrorBanner message={error} />

      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <SearchBar value={query} onChange={value => {
        setQuery(value);
        reset();
      }} placeholder="Buscar por titulo o empresa..." className="sm:w-80" />
        <FilterTabs options={FILTROS} value={filtro} onChange={value => {
        setFiltro(value);
        reset();
      }} />
        <Select value={modalidad} onChange={value => {
        setModalidad(value);
        reset();
      }} options={MODALIDADES} className="sm:w-52" />
      </div>

      <Table columns={columns} data={vacantes} loading={loading} emptyMessage="No se encontraron vacantes con los filtros aplicados." caption="Vacantes registradas" />

      <Pagination total={total} page={page} limit={LIMITE} onPageChange={goToPage} />
    </div>;
}
