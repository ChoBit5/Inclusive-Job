import { useEffect, useMemo, useState } from 'react';
import { Edit, Loader2, MapPin, Plus, RefreshCw, Search, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react';
import PortalLayout from '../../components/Portal/Portallayout';
import { reclutadorTheme as t } from '../../components/Portal/portalTheme';
import { reclutadorNav } from '../../components/Portal/Navitems';
import { confirmDelete, errorAlert, successAlert } from '../../components/Admin/alerts';
import { useDiscapacidadesReclutador, useEmpresaReclutador, useGuardarVacanteReclutador, useMejorarRedaccionReclutador, useVacantesReclutador } from '../../hooks/Reclutador/useDomain.js';
import BubleChat from '../Reclutador/ChatBot.jsx';
import { DiscapacidadBadges, INITIAL_VACANTE_FORM, VacanteFormModal, getVacanteDiscapacidadIds, toDateInputValue, validateVacanteForm } from './components/VacanteFormModal';
export default function VacantesReclutador() {
  const {
    data,
    loading,
    error,
    refetch
  } = useVacantesReclutador();
  const {
    data: discapacidadesData,
    loading: loadingDiscapacidades,
    error: errorDiscapacidades
  } = useDiscapacidadesReclutador();
  const {
    data: empresaData
  } = useEmpresaReclutador();
  const {
    guardarVacante,
    editarVacante,
    actualizarEstadoVacante,
    eliminarVacante,
    loading: saving
  } = useGuardarVacanteReclutador();
  const {
    mejorarTexto
  } = useMejorarRedaccionReclutador();
  const [vacantes, setVacantes] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('Todas');
  const [filtroModalidad, setFiltroModalidad] = useState('Todas las modalidades');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVacante, setEditingVacante] = useState(null);
  const [formData, setFormData] = useState(INITIAL_VACANTE_FORM);
  const [iaLoading, setIaLoading] = useState({});
  const [iaSugerencias, setIaSugerencias] = useState({});
  useEffect(() => {
    if (data?.data) setVacantes(data.data);
  }, [data]);
  const catalogoDiscapacidades = useMemo(() => {
    const payload = discapacidadesData?.data;
    if (Array.isArray(payload)) return payload;
    return payload?.discapacidades ?? [];
  }, [discapacidadesData]);
  const empresa = empresaData?.data ?? {};
  const empresaCargada = Boolean(empresaData);
  const empresaEstado = Number(empresa.estado_validacion ?? empresa.empresa_validada ?? 0);
  const empresaAprobada = empresaEstado === 1;
  const empresaRechazada = empresaEstado === 2 || empresa.empresa_rechazada === true || empresa.requiere_reenvio === true;
  const handleOpenModal = async (vacante = null) => {
    if (!vacante && !empresaCargada) {
      await errorAlert('Validando empresa', 'Espera un momento mientras verificamos el estado de tu empresa.', t);
      return;
    }
    if (!vacante && !empresaAprobada) {
      await errorAlert(empresaRechazada ? 'Empresa rechazada' : 'Empresa pendiente', empresaRechazada ? 'Tu empresa fue rechazada. Corrige y reenvia los datos corporativos para una nueva validacion.' : 'No puedes publicar vacantes hasta que tu empresa sea aprobada por el administrador.', t);
      return;
    }
    setEditingVacante(vacante);
    setFormData(vacante ? {
      titulo_puesto: vacante.titulo_puesto || '',
      descripcion_puesto: vacante.descripcion_puesto || '',
      requisitos: vacante.requisitos || '',
      modalidad: vacante.modalidad || 'Presencial',
      salario_min: vacante.salario_min || '',
      salario_max: vacante.salario_max || '',
      fecha_publicacion: toDateInputValue(vacante.fecha_publicacion),
      fecha_cierre: toDateInputValue(vacante.fecha_cierre),
      estado: vacante.estado || 'activa',
      discapacidades: getVacanteDiscapacidadIds(vacante)
    } : INITIAL_VACANTE_FORM);
    setIaSugerencias({});
    setIsModalOpen(true);
  };
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingVacante(null);
    setFormData(INITIAL_VACANTE_FORM);
    setIaSugerencias({});
  };
  const handleGuardarVacante = async e => {
    e.preventDefault();
    const validationMessage = validateVacanteForm(formData);
    if (validationMessage) {
      await errorAlert('Datos invalidos', validationMessage, t);
      return;
    }
    const payload = editingVacante ? {
      ...formData,
      id_vacante: editingVacante.id_vacante
    } : formData;
    try {
      const result = editingVacante ? await editarVacante(payload) : await guardarVacante(payload);
      if (!result?.success) throw new Error(result?.message || 'No se pudo guardar la vacante.');
      handleCloseModal();
      await refetch();
      await successAlert(editingVacante ? 'Vacante actualizada' : 'Vacante publicada', editingVacante ? 'Los cambios se guardaron correctamente.' : 'La vacante se guardo correctamente.', t);
    } catch (err) {
      await errorAlert('Error al guardar', err.message || 'No se pudo conectar con el servidor.', t);
    }
  };
  const toggleEstado = async (id_vacante, estadoActual) => {
    const nuevoEstado = estadoActual === 'activa' ? 'pausada' : 'activa';
    setVacantes(prev => prev.map(v => v.id_vacante === id_vacante ? {
      ...v,
      estado: nuevoEstado
    } : v));
    try {
      await actualizarEstadoVacante({
        id_vacante,
        estado: nuevoEstado
      });
      await successAlert('Estado actualizado', `La vacante ahora esta ${nuevoEstado}.`, t);
    } catch (err) {
      setVacantes(prev => prev.map(v => v.id_vacante === id_vacante ? {
        ...v,
        estado: estadoActual
      } : v));
      await errorAlert('Error al actualizar', err.message || 'No se pudo actualizar el estado.', t);
    }
  };
  const handleEliminar = async id_vacante => {
    const vacante = vacantes.find(v => v.id_vacante === id_vacante);
    const ok = await confirmDelete(vacante?.titulo_puesto ? `la vacante "${vacante.titulo_puesto}"` : 'esta vacante', t);
    if (!ok) return;
    try {
      await eliminarVacante(id_vacante);
      setVacantes(prev => prev.filter(v => v.id_vacante !== id_vacante));
      await successAlert('Vacante eliminada', 'La vacante fue eliminada correctamente.', t);
    } catch (err) {
      await errorAlert('Error al eliminar', err.message || 'No se pudo eliminar la vacante.', t);
    }
  };
  const handleMejorarIA = async campo => {
    setIaLoading(prev => ({
      ...prev,
      [campo]: true
    }));
    setIaSugerencias(prev => ({
      ...prev,
      [campo]: null
    }));
    try {
      const data = await mejorarTexto({
        campo,
        texto: formData[campo] || '',
        contexto: {
          titulo_puesto: formData.titulo_puesto,
          descripcion_puesto: formData.descripcion_puesto,
          requisitos: formData.requisitos,
          modalidad: formData.modalidad
        }
      });
      setIaSugerencias(prev => ({
        ...prev,
        [campo]: data
      }));
    } catch (err) {
      await errorAlert('No se pudo mejorar el texto', err.message || 'Intenta de nuevo en unos segundos.', t);
    } finally {
      setIaLoading(prev => ({
        ...prev,
        [campo]: false
      }));
    }
  };
  const handleAplicarIA = (campo, texto) => {
    setFormData(prev => ({
      ...prev,
      [campo]: texto
    }));
    setIaSugerencias(prev => ({
      ...prev,
      [campo]: null
    }));
  };
  const vacantesFiltradas = useMemo(() => {
    return vacantes.filter(vacante => {
      const titulo = String(vacante.titulo_puesto || '').toLowerCase();
      const cumpleBusqueda = titulo.includes(busqueda.toLowerCase());
      const cumpleEstado = filtroEstado === 'Todas' || filtroEstado === 'Activas' && vacante.estado === 'activa' || filtroEstado === 'Pausadas' && vacante.estado === 'pausada';
      const cumpleModalidad = filtroModalidad === 'Todas las modalidades' || vacante.modalidad === filtroModalidad;
      return cumpleBusqueda && cumpleEstado && cumpleModalidad;
    });
  }, [busqueda, filtroEstado, filtroModalidad, vacantes]);
  if (loading && vacantes.length === 0) {
    return <PortalLayout theme={t} navItems={reclutadorNav} pageTitle="Vacantes">
        <div className="min-h-[320px] flex flex-col items-center justify-center">
          <Loader2 className="h-10 w-10 text-purple-500 animate-spin" />
          <p className="text-slate-400 mt-4">Sincronizando vacantes...</p>
        </div>
      </PortalLayout>;
  }
  return <PortalLayout theme={t} navItems={reclutadorNav} pageTitle="Vacantes">
      <div className="p-1 font-sans text-slate-200">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Gestion de Vacantes</h1>
            <p className="text-slate-400 text-sm mt-0.5">Visualiza y administra tus vacantes publicadas</p>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <button onClick={() => handleOpenModal()} disabled={!empresaCargada || !empresaAprobada} title={!empresaCargada ? 'Validando empresa...' : !empresaAprobada ? empresaRechazada ? 'Tu empresa fue rechazada; reenvia sus datos para revision' : 'Tu empresa debe estar aprobada para publicar vacantes' : 'Publicar vacante'} className={`inline-flex items-center gap-2 text-white font-medium px-4 py-2 rounded-lg transition ${empresaCargada && empresaAprobada ? 'bg-purple-600 hover:bg-purple-700' : 'bg-slate-700 cursor-not-allowed opacity-70'}`}>
              <Plus className="h-4 w-4" /> Publicar vacante
            </button>
            <button onClick={refetch} className="flex items-center gap-1.5 text-slate-400 hover:text-white transition">
              <RefreshCw className="h-4 w-4" /> Actualizar
            </button>
          </div>
        </div>

        {error && <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>}
        {empresaCargada && !empresaAprobada && <div className={`mb-4 rounded-lg px-4 py-3 text-sm ${empresaRechazada ? 'border border-red-500/30 bg-red-500/10 text-red-100' : 'border border-amber-500/30 bg-amber-500/10 text-amber-100'}`}>
            {empresaRechazada ? 'Tu empresa fue rechazada. Corrige y reenvia sus datos desde Mi Empresa para poder publicar vacantes.' : 'Tu empresa aún no está aprobada. Puedes revisar tus vacantes existentes, pero no publicar nuevas hasta que el administrador la valide.'}
          </div>}
        {errorDiscapacidades && <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">No se pudo cargar el catalogo de discapacidades: {errorDiscapacidades}</div>}

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 max-w-3xl">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar por titulo..." className="w-full bg-[#131926] border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-purple-500" />
            </div>
            <select value={filtroModalidad} onChange={e => setFiltroModalidad(e.target.value)} className="bg-[#131926] border border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-300 focus:outline-none focus:border-purple-500">
              <option>Todas las modalidades</option>
              <option>Presencial</option>
              <option>Remoto</option>
              <option>Hibrido</option>
            </select>
          </div>
          <div className="bg-[#131926] p-1 rounded-lg border border-slate-800/60 flex items-center">
            {['Todas', 'Activas', 'Pausadas'].map(tab => <button key={tab} onClick={() => setFiltroEstado(tab)} className={`px-4 py-1.5 rounded-md text-xs font-medium transition ${filtroEstado === tab ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
                {tab}
              </button>)}
          </div>
        </div>

        <div className="bg-[#131926] rounded-xl shadow-xl border border-slate-800/80 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#182032] border-b border-slate-800 text-slate-400 font-bold text-xs uppercase">
                  {['Titulo', 'Modalidad', 'Discapacidad', 'Salario', 'Estado', 'Publicacion', 'Cierre', 'Acciones'].map(h => <th key={h} className="px-6 py-4">{h}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-sm">
                {vacantesFiltradas.map(vacante => <tr key={vacante.id_vacante} className="hover:bg-[#172033]/40 transition">
                    <td className="px-6 py-4 font-semibold text-white">{vacante.titulo_puesto}</td>
                    <td className="px-6 py-4"><span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs bg-blue-950/60 text-blue-400"><MapPin className="h-3.5 w-3.5" />{vacante.modalidad}</span></td>
                    <td className="px-6 py-4"><DiscapacidadBadges discapacidades={vacante.discapacidades} /></td>
                    <td className="px-6 py-4 text-slate-300">{formatPrecio(vacante.salario_min)} - {formatPrecio(vacante.salario_max)}</td>
                    <td className="px-6 py-4"><Estado estado={vacante.estado} /></td>
                    <td className="px-6 py-4 text-slate-400">{safeDate(vacante.fecha_publicacion)}</td>
                    <td className="px-6 py-4 text-slate-400">{safeDate(vacante.fecha_cierre)}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {vacante.estado !== 'eliminada' && <>
                            <button onClick={() => toggleEstado(vacante.id_vacante, vacante.estado)} className="text-slate-500 hover:text-purple-400 p-1.5">
                              {vacante.estado === 'activa' ? <ToggleRight className="h-6 w-6 text-purple-500" /> : <ToggleLeft className="h-6 w-6" />}
                            </button>
                            <button onClick={() => handleOpenModal(vacante)} className="text-slate-500 hover:text-amber-400 p-1.5" title="Editar"><Edit className="h-4 w-4" /></button>
                            <button onClick={() => handleEliminar(vacante.id_vacante)} className="text-slate-500 hover:text-red-400 p-1.5" title="Eliminar"><Trash2 className="h-4 w-4" /></button>
                          </>}
                      </div>
                    </td>
                  </tr>)}
              </tbody>
            </table>
          </div>
          {vacantesFiltradas.length === 0 && <div className="text-center py-12 text-slate-500 font-medium">No se encontraron registros.</div>}
        </div>

        {isModalOpen && <VacanteFormModal editingVacante={editingVacante} formData={formData} setFormData={setFormData} discapacidades={catalogoDiscapacidades} loadingDiscapacidades={loadingDiscapacidades} saving={saving} onClose={handleCloseModal} onSubmit={handleGuardarVacante} iaLoading={iaLoading} iaSugerencias={iaSugerencias} onMejorarIA={handleMejorarIA} onAplicarIA={handleAplicarIA} />}
      </div>
      <BubleChat />
    </PortalLayout>;
}
function Estado({
  estado
}) {
  const active = estado === 'activa';
  const suspended = estado === 'eliminada';
  const label = suspended ? 'suspendida' : estado;
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase border ${active ? 'bg-emerald-950/50 text-emerald-400 border-emerald-900/50' : suspended ? 'bg-red-950/50 text-red-300 border-red-900/50' : 'bg-amber-950/50 text-amber-400 border-amber-900/50'}`}>
      {label}
    </span>;
}
function formatPrecio(num) {
  if (!num) return '$0';
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0
  }).format(num);
}
function safeDate(value) {
  if (!value) return 'S/F';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'S/F' : date.toLocaleDateString('es-MX');
}
