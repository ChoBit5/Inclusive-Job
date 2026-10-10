import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, CheckCircle, Eye, FileText, PauseCircle, PlayCircle, RefreshCw, XCircle } from 'lucide-react';
import { Badge, Button, ErrorBanner, FilterTabs, PageHeader, SearchBar } from '../../components/Admin/UI';
import Table from '../../components/Admin/Table';
import Pagination from '../../components/Admin/Pagination';
import Modal, { ModalFooter } from '../../components/Admin/Modal';
import { usePagination, useSearch } from '../../hooks/Admin/useApi.js';
import { useEmpresaAcciones, useEmpresas } from '../../hooks/Admin/useDomain.js';
import { confirmAction, confirmApprove, confirmSuspend, errorAlert, successAlert } from '../../components/Admin/alerts';
const ESTADO_MAP = {
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
const FILTROS = [{
  value: 'todas',
  label: 'Todas'
}, {
  value: '0',
  label: 'Pendientes'
}, {
  value: '1',
  label: 'Aprobadas'
}, {
  value: '2',
  label: 'Rechazadas'
}, {
  value: '3',
  label: 'Suspendidas'
}];
const LIMITE = 15;
function getEstado(value) {
  return ESTADO_MAP[Number(value)] ?? ESTADO_MAP[0];
}
function getRfc(row) {
  return row.rfc || row.rfc_empresa || '—';
}
export default function Empresas() {
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
  const [accionId, setAccionId] = useState(null);
  const [rejectLoading, setRejectLoading] = useState(false);
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [rejectModal, setRejectModal] = useState({
    open: false,
    empresa: null
  });
  const buildParams = useCallback(() => {
    const params = new URLSearchParams();
    if (filtro !== 'todas') params.set('estado', filtro);
    if (debouncedQuery) params.set('buscar', debouncedQuery);
    params.set('pagina', String(page));
    params.set('limite', String(LIMITE));
    return `&${params.toString()}`;
  }, [debouncedQuery, filtro, page]);
  const {
    data,
    loading,
    error,
    refetch
  } = useEmpresas(buildParams());
  const {
    aprobar,
    rechazar,
    suspender,
    reactivar
  } = useEmpresaAcciones();
  const empresas = data?.data?.empresas ?? [];
  const total = data?.data?.total ?? 0;
  const handleAprobar = async row => {
    const ok = await confirmApprove(row.nombre_empresas);
    if (!ok) return;
    setAccionId(row.id_empresas);
    try {
      await aprobar(row.id_empresas);
      await refetch();
      successAlert('Aprobada', `${row.nombre_empresas} ya puede operar en la plataforma.`);
    } catch {
      errorAlert('Error', 'No se pudo aprobar la empresa. Intenta de nuevo.');
    } finally {
      setAccionId(null);
    }
  };
  const openRejectModal = row => {
    setMotivoRechazo('');
    setRejectModal({
      open: true,
      empresa: row
    });
  };
  const handleRechazar = async () => {
    if (!motivoRechazo.trim() || !rejectModal.empresa) return;
    setRejectLoading(true);
    try {
      await rechazar(rejectModal.empresa.id_empresas, motivoRechazo);
      await refetch();
      successAlert('Rechazada', `${rejectModal.empresa.nombre_empresas} ha sido rechazada.`);
      setRejectModal({
        open: false,
        empresa: null
      });
    } catch {
      errorAlert('Error', 'No se pudo rechazar la empresa.');
    } finally {
      setRejectLoading(false);
    }
  };
  const handleSuspender = async row => {
    const ok = await confirmSuspend(row.nombre_empresas);
    if (!ok) return;
    setAccionId(row.id_empresas);
    try {
      await suspender(row.id_empresas);
      await refetch();
      successAlert('Suspendida', `${row.nombre_empresas} ha sido suspendida.`);
    } catch {
      errorAlert('Error', 'No se pudo suspender la empresa.');
    } finally {
      setAccionId(null);
    }
  };
  const handleReactivar = async row => {
    const ok = await confirmAction({
      title: '¿Reactivar empresa?',
      html: `<span>Se restaurará el acceso de <strong style="color:#fff">${row.nombre_empresas}</strong>.</span>`,
      confirmText: 'Reactivar',
      confirmColor: '#16a34a',
      icon: 'question'
    });
    if (!ok) return;
    setAccionId(row.id_empresas);
    try {
      await reactivar(row.id_empresas);
      await refetch();
      successAlert('Reactivada', `${row.nombre_empresas} puede operar nuevamente.`);
    } catch {
      errorAlert('Error', 'No se pudo reactivar la empresa.');
    } finally {
      setAccionId(null);
    }
  };
  const columns = [{
    key: 'nombre_empresas',
    label: 'Empresa',
    sortable: true,
    render: value => <span className="font-semibold text-white">{value || '—'}</span>
  }, {
    key: 'rfc',
    label: 'RFC',
    render: (_, row) => <span className="inline-flex items-center gap-1 text-slate-300 font-mono text-xs">
          <FileText size={13} className="text-slate-500" />
          {getRfc(row)}
        </span>
  }, {
    key: 'total_reclutadores',
    label: 'Reclutadores',
    render: value => <span className="text-slate-300">{Number(value ?? 0)}</span>
  }, {
    key: 'estado_validacion',
    label: 'Estado',
    render: value => {
      const estado = getEstado(value);
      return <Badge variant={estado.variant}>{estado.label}</Badge>;
    }
  }, {
    key: 'acciones',
    label: 'Acciones',
    render: (_, row) => {
      const estado = Number(row.estado_validacion);
      const isLoading = accionId === row.id_empresas;
      return <div className="flex flex-wrap items-center gap-2 min-w-[270px]">
            <Button variant="ghost" size="sm" title="Ver detalle" aria-label="Ver detalle" className="whitespace-nowrap" onClick={() => navigate(`/admin/empresas/${row.id_empresas}`)}>
              <Eye size={14} />
              Ver
            </Button>

            {estado === 0 && <Button variant="success" size="sm" title="Aprobar empresa" aria-label="Aprobar empresa" className="whitespace-nowrap" loading={isLoading} onClick={() => handleAprobar(row)}>
                <CheckCircle size={14} />
                Aprobar
              </Button>}

            {(estado === 0 || estado === 1) && <Button variant="danger" size="sm" title="Rechazar empresa" aria-label="Rechazar empresa" className="whitespace-nowrap" loading={isLoading} onClick={() => openRejectModal(row)}>
                <XCircle size={14} />
                Rechazar
              </Button>}

            {estado === 1 && <Button variant="secondary" size="sm" title="Suspender empresa" aria-label="Suspender empresa" className="whitespace-nowrap" loading={isLoading} onClick={() => handleSuspender(row)}>
                <PauseCircle size={14} />
                Suspender
              </Button>}

            {(estado === 2 || estado === 3) && <Button variant="success" size="sm" title="Reactivar empresa" aria-label="Reactivar empresa" className="whitespace-nowrap" loading={isLoading} onClick={() => handleReactivar(row)}>
                <PlayCircle size={14} />
                Reactivar
              </Button>}
          </div>;
    }
  }];
  return <div className="space-y-5 w-full">
      <PageHeader title="Gestión de Empresas" description="Administra y valida las empresas registradas en la plataforma" action={<div className="flex items-center gap-3">
            <span className="text-slate-400 text-sm flex items-center gap-1">
              <Building2 size={15} />
              {total} empresas
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
      }} placeholder="Buscar por nombre, RFC, correo o dirección..." className="sm:w-96" />
        <FilterTabs options={FILTROS} value={filtro} onChange={value => {
        setFiltro(value);
        reset();
      }} />
      </div>

      <Table columns={columns} data={empresas} loading={loading} emptyMessage="No se encontraron empresas con los filtros aplicados." caption="Lista de empresas" />

      <Pagination total={total} page={page} limit={LIMITE} onPageChange={goToPage} />

      <Modal open={rejectModal.open} onClose={() => setRejectModal({
      open: false,
      empresa: null
    })} title="Rechazar empresa" size="sm">
        <p className="text-slate-300 text-sm mb-4">
          Estás rechazando a{' '}
          <strong className="text-white">{rejectModal.empresa?.nombre_empresas}</strong>.
          Ingresa el motivo:
        </p>

        <textarea value={motivoRechazo} onChange={event => setMotivoRechazo(event.target.value)} rows={3} placeholder="Ej: La información proporcionada es incompleta o inválida..." className="w-full bg-slate-700 border border-slate-600 text-white text-sm
                     rounded-lg px-3 py-2 outline-none focus:border-violet-500
                     transition-colors placeholder-slate-500 resize-none" />

        <ModalFooter>
          <Button variant="ghost" onClick={() => setRejectModal({
          open: false,
          empresa: null
        })}>
            Cancelar
          </Button>
          <Button variant="danger" loading={rejectLoading} disabled={!motivoRechazo.trim()} onClick={handleRechazar}>
            <XCircle size={14} />
            Confirmar rechazo
          </Button>
        </ModalFooter>
      </Modal>
    </div>;
}
