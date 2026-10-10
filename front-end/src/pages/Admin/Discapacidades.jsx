import { useState } from 'react';
import { Plus, Pencil, RefreshCw, Trash2, Accessibility } from 'lucide-react';
import { PageHeader, Button, ErrorBanner } from '../../components/Admin/UI';
import Table from '../../components/Admin/Table';
import Modal, { ModalFooter } from '../../components/Admin/Modal';
import { useDiscapacidadAcciones, useDiscapacidades } from '../../hooks/Admin/useDomain.js';
import { confirmDelete, successAlert, errorAlert } from '../../components/Admin/alerts';
const EMPTY_FORM = {
  nombre: '',
  descripcion: ''
};
function getDiscapacidadId(item) {
  return item.id_discapacidad ?? item.id;
}
function getNombre(item) {
  return item.nombre ?? item.nombre_discapacidad ?? item.tipo ?? '';
}
function getDescripcion(item) {
  return item.descripcion ?? item.descripcion_discapacidad ?? '';
}
export default function Discapacidades() {
  const {
    data,
    loading,
    error,
    refetch
  } = useDiscapacidades();
  const {
    crear,
    editar,
    eliminar
  } = useDiscapacidadAcciones();
  const payload = data?.data ?? data ?? {};
  const discapacidades = payload.discapacidades ?? (Array.isArray(payload) ? payload : []);
  const total = Number(payload.total ?? discapacidades.length);
  const [modal, setModal] = useState({
    open: false,
    type: null,
    item: null
  });
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const openCreate = () => {
    setForm(EMPTY_FORM);
    setFormError('');
    setModal({
      open: true,
      type: 'crear',
      item: null
    });
  };
  const openEdit = item => {
    setForm({
      nombre: getNombre(item),
      descripcion: getDescripcion(item)
    });
    setFormError('');
    setModal({
      open: true,
      type: 'editar',
      item
    });
  };
  const closeModal = () => {
    setModal({
      open: false,
      type: null,
      item: null
    });
    setFormError('');
  };
  const handleSave = async () => {
    const cleanForm = {
      nombre: form.nombre.trim(),
      descripcion: form.descripcion.trim()
    };
    if (!cleanForm.nombre) {
      setFormError('El nombre es obligatorio.');
      return;
    }
    if (!cleanForm.descripcion) {
      setFormError('La descripción es obligatoria.');
      return;
    }
    setSaving(true);
    try {
      if (modal.type === 'crear') {
        await crear(cleanForm);
        await refetch();
        await successAlert('¡Creada!', `"${cleanForm.nombre}" fue agregada al catálogo.`);
      } else {
        await editar(getDiscapacidadId(modal.item), cleanForm);
        await refetch();
        await successAlert('Actualizada', `"${cleanForm.nombre}" fue actualizada.`);
      }
      closeModal();
    } catch {
      await errorAlert('Error', 'No se pudo guardar el tipo de discapacidad.');
    } finally {
      setSaving(false);
    }
  };
  const handleDelete = async item => {
    const id = getDiscapacidadId(item);
    const nombre = getNombre(item);
    const ok = await confirmDelete(nombre);
    if (!ok) return;
    setDeletingId(id);
    try {
      await eliminar(id);
      await refetch();
      await successAlert('Eliminada', `"${nombre}" fue eliminada del catálogo.`);
    } catch {
      await errorAlert('Error', 'No se pudo eliminar. Puede estar relacionada con usuarios o vacantes.');
    } finally {
      setDeletingId(null);
    }
  };
  const columns = [{
    key: 'nombre',
    label: 'Nombre',
    render: (_, row) => <span className="text-white font-semibold">{getNombre(row) || '-'}</span>
  }, {
    key: 'descripcion',
    label: 'Descripción',
    render: (_, row) => getDescripcion(row) || '-'
  }, {
    key: 'acciones',
    label: 'Acciones',
    render: (_, row) => {
      const id = getDiscapacidadId(row);
      return <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => openEdit(row)} aria-label="Editar">
              <Pencil size={14} />
            </Button>
            <Button variant="danger" size="sm" loading={deletingId === id} onClick={() => handleDelete(row)} aria-label="Eliminar">
              <Trash2 size={14} />
            </Button>
          </div>;
    }
  }];
  return <div className="space-y-5 w-full">
      <PageHeader title="Catálogo de Discapacidades" description="Administra los tipos de discapacidad disponibles en la plataforma" action={<div className="flex items-center gap-3">
            <span className="text-slate-400 text-sm flex items-center gap-1">
              <Accessibility size={15} /> {total} tipos
            </span>
            <Button variant="ghost" size="sm" onClick={refetch} disabled={loading}>
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              {loading ? 'Cargando...' : 'Actualizar'}
            </Button>
            <Button variant="primary" size="sm" onClick={openCreate}>
              <Plus size={15} /> Nueva discapacidad
            </Button>
          </div>} />

      <ErrorBanner message={error} />

      <Table columns={columns} data={discapacidades} loading={loading} emptyMessage="No hay tipos registrados." caption="Catálogo de discapacidades" />

      <Modal open={modal.open && (modal.type === 'crear' || modal.type === 'editar')} onClose={closeModal} title={modal.type === 'crear' ? 'Nueva discapacidad' : 'Editar discapacidad'}>
        <ErrorBanner message={formError} />
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1.5" htmlFor="disc-nombre">
              Nombre <span className="text-red-400">*</span>
            </label>
            <input id="disc-nombre" type="text" value={form.nombre} onChange={event => setForm(current => ({
            ...current,
            nombre: event.target.value
          }))} placeholder="Ej: Visual, Auditiva..." className="w-full bg-slate-700 border border-slate-600 text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-violet-500 transition-colors placeholder-slate-500" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1.5" htmlFor="disc-desc">
              Descripción <span className="text-red-400">*</span>
            </label>
            <textarea id="disc-desc" value={form.descripcion} onChange={event => setForm(current => ({
            ...current,
            descripcion: event.target.value
          }))} placeholder="Describe brevemente este tipo de discapacidad..." rows={3} className="w-full bg-slate-700 border border-slate-600 text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-violet-500 transition-colors placeholder-slate-500 resize-none" />
          </div>
        </div>
        <ModalFooter>
          <Button variant="ghost" onClick={closeModal}>Cancelar</Button>
          <Button variant="primary" loading={saving} onClick={handleSave}>
            {modal.type === 'crear' ? 'Crear' : 'Guardar cambios'}
          </Button>
        </ModalFooter>
      </Modal>
    </div>;
}
