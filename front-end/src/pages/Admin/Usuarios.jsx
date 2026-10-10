import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, PauseCircle, PlayCircle, RefreshCw, Users } from 'lucide-react';
import { PageHeader, Badge, Button, SearchBar, FilterTabs, ErrorBanner } from '../../components/Admin/UI';
import Table from '../../components/Admin/Table';
import Pagination from '../../components/Admin/Pagination';
import { useSearch, usePagination } from '../../hooks/Admin/useApi.js';
import { useUsuarioAcciones, useUsuarios } from '../../hooks/Admin/useDomain.js';
import { confirmSuspend, confirmAction, successAlert, errorAlert } from '../../components/Admin/alerts';
const ROL_BADGE = {
  administrador: 'purple',
  reclutador: 'info',
  postulante: 'default'
};
const ESTADO_BADGE = {
  activo: 'success',
  suspendido: 'danger',
  inactivo: 'default'
};
const FILTROS_ROL = [{
  value: 'todos',
  label: 'Todos'
}, {
  value: 'administrador',
  label: 'Admins'
}, {
  value: 'reclutador',
  label: 'Reclutadores'
}, {
  value: 'postulante',
  label: 'Postulantes'
}];
const FILTROS_ESTADO = [{
  value: 'todos',
  label: 'Todos'
}, {
  value: 'activo',
  label: 'Activos'
}, {
  value: 'suspendido',
  label: 'Suspendidos'
}, {
  value: 'inactivo',
  label: 'Inactivos'
}];
const LIMITE = 15;
function nombreCompleto(row) {
  return `${row.nombres ?? ''} ${row.apellidos ?? ''}`.trim() || 'Sin nombre';
}
function safeDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('es-MX');
}
export default function Usuarios() {
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
  const [rolFiltro, setRolFiltro] = useState('todos');
  const [estadoFiltro, setEstadoFiltro] = useState('todos');
  const [actionLoading, setActionLoading] = useState(null);
  const buildParams = useCallback(() => {
    const params = new URLSearchParams();
    if (rolFiltro !== 'todos') params.set('rol', rolFiltro);
    if (estadoFiltro !== 'todos') params.set('estado', estadoFiltro);
    if (debouncedQuery) params.set('buscar', debouncedQuery);
    params.set('pagina', String(page));
    params.set('limite', String(LIMITE));
    return `&${params.toString()}`;
  }, [rolFiltro, estadoFiltro, debouncedQuery, page]);
  const {
    data,
    loading,
    error,
    refetch
  } = useUsuarios(buildParams());
  const {
    suspender,
    reactivar
  } = useUsuarioAcciones();
  const usuarios = data?.data?.usuarios ?? [];
  const total = data?.data?.total ?? 0;
  const handleSuspender = async row => {
    const nombre = nombreCompleto(row);
    const ok = await confirmSuspend(nombre);
    if (!ok) return;
    setActionLoading(row.id_usuario);
    try {
      await suspender(row.id_usuario);
      await refetch();
      successAlert('Suspendido', `${nombre} ha sido suspendido.`);
    } catch {
      errorAlert('Error', 'No se pudo suspender al usuario.');
    } finally {
      setActionLoading(null);
    }
  };
  const handleReactivar = async row => {
    const nombre = nombreCompleto(row);
    const ok = await confirmAction({
      title: '¿Reactivar usuario?',
      html: `<span>Se restaurará el acceso de <strong style="color:#fff">${nombre}</strong>.</span>`,
      confirmText: 'Reactivar',
      confirmColor: '#16a34a',
      icon: 'question'
    });
    if (!ok) return;
    setActionLoading(row.id_usuario);
    try {
      await reactivar(row.id_usuario);
      await refetch();
      successAlert('¡Reactivado!', `${nombre} puede acceder nuevamente.`);
    } catch {
      errorAlert('Error', 'No se pudo reactivar al usuario.');
    } finally {
      setActionLoading(null);
    }
  };
  const columns = [{
    key: 'nombre_completo',
    label: 'Nombre completo',
    render: (_, row) => <span className="text-white font-medium">{nombreCompleto(row)}</span>
  }, {
    key: 'correo',
    label: 'Correo'
  }, {
    key: 'rol',
    label: 'Rol',
    render: value => <Badge variant={ROL_BADGE[value] ?? 'default'}>{value ?? '-'}</Badge>
  }, {
    key: 'estado',
    label: 'Estado',
    render: value => <Badge variant={ESTADO_BADGE[value] ?? 'default'}>{value ?? '-'}</Badge>
  }, {
    key: 'fecha_registro',
    label: 'Registro',
    render: value => safeDate(value)
  }, {
    key: 'acciones',
    label: 'Acciones',
    render: (_, row) => {
      const isLoading = actionLoading === row.id_usuario;
      const isActive = row.estado === 'activo';
      return <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/usuarios/${row.id_usuario}`)} aria-label="Ver perfil">
              <Eye size={14} />
            </Button>

            {isActive ? <Button variant="danger" size="sm" loading={isLoading} onClick={() => handleSuspender(row)} aria-label="Suspender">
                <PauseCircle size={14} />
              </Button> : <Button variant="success" size="sm" loading={isLoading} onClick={() => handleReactivar(row)} aria-label="Reactivar">
                <PlayCircle size={14} />
              </Button>}
          </div>;
    }
  }];
  return <div className="space-y-5 w-full">
      <PageHeader title="Gestión de Usuarios" description="Administra los usuarios registrados en la plataforma" action={<div className="flex items-center gap-3">
            <span className="text-slate-400 text-sm flex items-center gap-1">
              <Users size={15} /> {total} usuarios
            </span>
            <Button variant="ghost" size="sm" onClick={refetch} disabled={loading}>
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              {loading ? 'Cargando...' : 'Actualizar'}
            </Button>
          </div>} />

      <ErrorBanner message={error} />

      <div className="flex flex-col gap-3">
        <SearchBar value={query} onChange={value => {
        setQuery(value);
        reset();
      }} placeholder="Buscar por nombre o correo..." className="sm:w-80" />

        <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
          <FilterTabs options={FILTROS_ROL} value={rolFiltro} onChange={value => {
          setRolFiltro(value);
          reset();
        }} />
          <FilterTabs options={FILTROS_ESTADO} value={estadoFiltro} onChange={value => {
          setEstadoFiltro(value);
          reset();
        }} />
        </div>
      </div>

      <Table columns={columns} data={usuarios} loading={loading} emptyMessage="No se encontraron usuarios con los filtros aplicados." caption="Usuarios registrados" />

      <Pagination total={total} page={page} limit={LIMITE} onPageChange={goToPage} />
    </div>;
}
