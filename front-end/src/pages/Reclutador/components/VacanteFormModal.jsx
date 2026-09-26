import { Accessibility, ArrowRight, CalendarDays, FileText, Loader2, Sparkles, X } from 'lucide-react';
export const SALARIO_MINIMO_VACANTE = 1000;
export const SALARIO_MAXIMO_VACANTE = 1000000;
export const INITIAL_VACANTE_FORM = {
  titulo_puesto: '',
  descripcion_puesto: '',
  requisitos: '',
  modalidad: 'Presencial',
  salario_min: '',
  salario_max: '',
  fecha_publicacion: '',
  fecha_cierre: '',
  estado: 'activa',
  discapacidades: []
};
export function VacanteFormModal({
  editingVacante,
  formData,
  setFormData,
  discapacidades,
  loadingDiscapacidades,
  saving,
  onClose,
  onSubmit,
  iaLoading,
  iaSugerencias,
  onMejorarIA,
  onAplicarIA
}) {
  const toggleDiscapacidad = id => {
    const current = formData.discapacidades ?? [];
    const next = current.includes(id) ? current.filter(item => item !== id) : [...current, id];
    setFormData({
      ...formData,
      discapacidades: next
    });
  };
  return <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <VacanteModalStyles />
      <div className="bg-[#131926] border border-slate-800 w-full max-w-2xl rounded-xl overflow-hidden shadow-2xl text-slate-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#182032]">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FileText className="h-5 w-5 text-purple-500" />
            {editingVacante ? 'Editar Vacante' : 'Publicar Nueva Vacante'}
          </h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={onSubmit} noValidate className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          <CampoConIA campo="titulo_puesto" label="Titulo del puesto *" mejorarLabel="Mejorar titulo" tipo="input" value={formData.titulo_puesto} onChange={value => setFormData({
          ...formData,
          titulo_puesto: value
        })} required loading={iaLoading?.titulo_puesto} sugerencia={iaSugerencias?.titulo_puesto} onMejorar={() => onMejorarIA?.('titulo_puesto')} onAplicar={texto => onAplicarIA?.('titulo_puesto', texto)} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select label="Modalidad" value={formData.modalidad} onChange={value => setFormData({
            ...formData,
            modalidad: value
          })} options={['Presencial', 'Remoto', 'Hibrido']} />
            <Select label="Estado" value={formData.estado} onChange={value => setFormData({
            ...formData,
            estado: value
          })} options={['activa', 'pausada']} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Salario minimo *" type="number" min={SALARIO_MINIMO_VACANTE} max={SALARIO_MAXIMO_VACANTE} value={formData.salario_min} onChange={value => setFormData({
            ...formData,
            salario_min: value
          })} required />
            <Input label="Salario maximo *" type="number" min={SALARIO_MINIMO_VACANTE} max={SALARIO_MAXIMO_VACANTE} value={formData.salario_max} onChange={value => setFormData({
            ...formData,
            salario_max: value
          })} required />
          </div>

          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase text-slate-400">
              <CalendarDays className="h-4 w-4 text-purple-400" /> Fechas de publicacion
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Fecha de publicacion *" type="date" value={formData.fecha_publicacion} max={formData.fecha_cierre || undefined} onChange={value => setFormData({
              ...formData,
              fecha_publicacion: value
            })} required />
              <Input label="Fecha de cierre *" type="date" value={formData.fecha_cierre} min={formData.fecha_publicacion || undefined} onChange={value => setFormData({
              ...formData,
              fecha_cierre: value
            })} required />
            </div>
          </div>

          <DiscapacidadSelector discapacidades={discapacidades} selected={formData.discapacidades ?? []} loading={loadingDiscapacidades} onToggle={toggleDiscapacidad} />

          <CampoConIA campo="descripcion_puesto" label="Descripcion" mejorarLabel="Mejorar descripcion" tipo="textarea" value={formData.descripcion_puesto} onChange={value => setFormData({
          ...formData,
          descripcion_puesto: value
        })} loading={iaLoading?.descripcion_puesto} sugerencia={iaSugerencias?.descripcion_puesto} onMejorar={() => onMejorarIA?.('descripcion_puesto')} onAplicar={texto => onAplicarIA?.('descripcion_puesto', texto)} />

          <CampoConIA campo="requisitos" label="Requisitos" mejorarLabel="Mejorar requisitos" tipo="textarea" rows={2} value={formData.requisitos} onChange={value => setFormData({
          ...formData,
          requisitos: value
        })} loading={iaLoading?.requisitos} sugerencia={iaSugerencias?.requisitos} onMejorar={() => onMejorarIA?.('requisitos')} onAplicar={texto => onAplicarIA?.('requisitos', texto)} />

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button type="button" onClick={onClose} className="px-5 py-2 text-sm font-medium text-slate-400 hover:text-white">Cancelar</button>
            <button type="submit" disabled={saving} className="bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white font-medium px-6 py-2 rounded-lg">
              {saving ? 'Guardando...' : editingVacante ? 'Guardar Cambios' : 'Publicar Ahora'}
            </button>
          </div>
        </form>
      </div>
    </div>;
}
function VacanteModalStyles() {
  return <style>{`
      @keyframes iaFadeSlide {
        from { opacity: 0; transform: translateY(-4px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .ia-suggestion-panel { animation: iaFadeSlide 0.22s ease-out; }

      @keyframes iaShimmer {
        from { transform: translateX(-120%); }
        to { transform: translateX(220%); }
      }
      .ia-btn-shimmer::after {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.18) 50%, transparent 70%);
        transform: translateX(-120%);
      }
      .ia-btn:hover .ia-btn-shimmer::after {
        animation: iaShimmer 0.9s ease;
      }
    `}</style>;
}
function CampoConIA({
  campo,
  label,
  mejorarLabel,
  tipo,
  value,
  onChange,
  required = false,
  rows = 3,
  loading,
  sugerencia,
  onMejorar,
  onAplicar
}) {
  const iaEnabled = Boolean(onMejorar && onAplicar);
  const textoBoton = mejorarLabel || 'Mejorar con IA';
  return <div>
      
      <div className="flex items-center justify-between gap-3 mb-1.5">
        <label className="text-xs font-bold uppercase text-slate-400">{label}</label>

        {iaEnabled && <button type="button" onClick={onMejorar} disabled={loading} className="ia-btn group relative inline-flex items-center gap-1.5 overflow-hidden rounded-full border border-purple-500/30 bg-gradient-to-r from-purple-600/15 via-fuchsia-600/10 to-purple-600/15 px-3 py-1.5 text-xs font-semibold text-purple-300 transition-all duration-300 hover:border-purple-400/60 hover:text-purple-100 hover:shadow-[0_0_18px_-3px_rgba(192,132,252,0.55)] disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none shrink-0">
            <span className="ia-btn-shimmer pointer-events-none absolute inset-0 overflow-hidden" />
            {loading ? <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span className="relative">Mejorando...</span>
              </> : <>
                <Sparkles className="h-3.5 w-3.5 transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110" />
                <span className="relative">{textoBoton}</span>
              </>}
          </button>}
      </div>

      {tipo === 'textarea' ? <TextareaPlain value={value} onChange={onChange} rows={rows} /> : <InputPlain value={value} onChange={onChange} required={required} />}

      {iaEnabled && sugerencia && <div className="ia-suggestion-panel relative mt-2.5 rounded-xl border border-purple-800/40 bg-gradient-to-b from-purple-950/25 via-[#0f1320] to-[#0b0f19] p-3.5 space-y-2.5 shadow-[0_4px_24px_-8px_rgba(147,51,234,0.35)]">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-purple-400">
            <Sparkles className="h-3 w-3" />
            Sugerencias de la IA — {textoBoton.replace(/^Mejorar /i, '')}
          </div>

          {sugerencia.nota && <p className="text-xs text-purple-300/80 italic leading-relaxed">{sugerencia.nota}</p>}

          <div className="relative rounded-lg border border-purple-500/50 bg-[#0b0f19] p-3 pt-4">
            <span className="absolute -top-2.5 left-3 rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-600 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
              Recomendado
            </span>
            <p className="text-sm text-slate-100 whitespace-pre-wrap leading-relaxed">{sugerencia.texto_mejorado}</p>
            <button type="button" onClick={() => onAplicar(sugerencia.texto_mejorado)} className="mt-2.5 inline-flex items-center gap-1 rounded-full bg-purple-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-purple-500 hover:shadow-[0_0_12px_-2px_rgba(168,85,247,0.6)]">
              Usar esta version <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          {sugerencia.sugerencias?.map((alt, i) => <div key={`${campo}-${i}`} className="rounded-lg border border-slate-800 bg-[#0b0f19]/60 p-3 transition hover:border-slate-700">
              <p className="text-sm text-slate-400 whitespace-pre-wrap leading-relaxed">{alt}</p>
              <button type="button" onClick={() => onAplicar(alt)} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-slate-400 transition hover:text-slate-200">
                Usar esta version <ArrowRight className="h-3 w-3" />
              </button>
            </div>)}
        </div>}
    </div>;
}
function DiscapacidadSelector({
  discapacidades,
  selected,
  loading,
  onToggle
}) {
  return <fieldset className="border border-slate-800 rounded-lg p-4 bg-[#0b0f19]">
      <legend className="px-2 text-xs font-bold uppercase text-slate-400 flex items-center gap-1.5">
        <Accessibility className="h-4 w-4 text-purple-400" /> Discapacidad
      </legend>
      {loading ? <div className="flex items-center gap-2 text-sm text-slate-400 py-2"><Loader2 className="h-4 w-4 animate-spin" /> Cargando catalogo...</div> : discapacidades.length === 0 ? <p className="text-sm text-slate-500 py-2">No hay discapacidades registradas.</p> : <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
          {discapacidades.map(item => {
        const id = getDiscapacidadId(item);
        const checked = selected.includes(id);
        return <label key={id} className={`flex items-start gap-3 rounded-lg border px-3 py-2 cursor-pointer transition ${checked ? 'border-purple-500/70 bg-purple-500/10 text-white' : 'border-slate-800 bg-[#111827] text-slate-300 hover:border-slate-700'}`}>
                <input type="checkbox" checked={checked} onChange={() => onToggle(id)} className="mt-1 h-4 w-4 accent-purple-600" />
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{getDiscapacidadNombre(item)}</span>
                  {item.descripcion && <span className="block text-xs text-slate-500 mt-0.5 line-clamp-2">{item.descripcion}</span>}
                </span>
              </label>;
      })}
        </div>}
    </fieldset>;
}
export function DiscapacidadBadges({
  discapacidades = []
}) {
  if (!discapacidades.length) return <span className="text-slate-500 text-xs">Sin asignar</span>;
  return <div className="flex flex-wrap gap-1.5 max-w-xs">
      {discapacidades.map(item => <span key={getDiscapacidadId(item)} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-purple-950/60 text-purple-300 border border-purple-900/50">
          {getDiscapacidadNombre(item)}
        </span>)}
    </div>;
}
function InputPlain({
  value,
  onChange,
  type = 'text',
  required = false
}) {
  return <input required={required} type={type} value={value} onChange={e => onChange(e.target.value)} className="w-full bg-[#0b0f19] border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500" />;
}
function TextareaPlain({
  value,
  onChange,
  rows = 3
}) {
  return <textarea rows={rows} value={value} onChange={e => onChange(e.target.value)} className="w-full bg-[#0b0f19] border border-slate-800 rounded-lg p-4 text-sm text-white focus:outline-none focus:border-purple-500" />;
}
function Input({
  label,
  value,
  onChange,
  type = 'text',
  required = false,
  min,
  max
}) {
  return <label className="block text-xs font-bold uppercase text-slate-400 mb-1">{label}<input required={required} type={type} min={min} max={max} value={value} onChange={e => onChange(e.target.value)} className="mt-1 w-full bg-[#0b0f19] border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500" /></label>;
}
function Select({
  label,
  value,
  onChange,
  options
}) {
  return <label className="block text-xs font-bold uppercase text-slate-400 mb-1">{label}<select value={value} onChange={e => onChange(e.target.value)} className="mt-1 w-full bg-[#0b0f19] border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-purple-500">{options.map(option => <option key={option} value={option}>{option}</option>)}</select></label>;
}
export function getDiscapacidadId(item) {
  return Number(item?.id_tipo_discapacidad ?? item?.id_discapacidad ?? item?.id ?? item) || 0;
}
export function getDiscapacidadNombre(item) {
  return item?.nombre_discapacidad ?? item?.nombre ?? item?.tipo ?? String(item ?? '');
}
export function getVacanteDiscapacidadIds(vacante) {
  if (Array.isArray(vacante?.discapacidad_ids)) {
    return vacante.discapacidad_ids.map(Number).filter(Boolean);
  }
  if (Array.isArray(vacante?.discapacidades)) {
    return vacante.discapacidades.map(getDiscapacidadId).filter(Boolean);
  }
  return [];
}
export function toDateInputValue(value) {
  if (!value) return '';
  const normalized = String(value).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : '';
}
export function validateVacanteForm(formData) {
  if (!String(formData?.titulo_puesto ?? '').trim()) {
    return 'El titulo de la vacante es obligatorio.';
  }
  const salarioMin = Number(formData?.salario_min);
  const salarioMax = Number(formData?.salario_max);
  const fechaPublicacion = toDateInputValue(formData?.fecha_publicacion);
  const fechaCierre = toDateInputValue(formData?.fecha_cierre);
  const salarioInvalido = !Number.isFinite(salarioMin) || !Number.isFinite(salarioMax) || salarioMin < SALARIO_MINIMO_VACANTE || salarioMin > SALARIO_MAXIMO_VACANTE || salarioMax < SALARIO_MINIMO_VACANTE || salarioMax > SALARIO_MAXIMO_VACANTE;
  if (salarioInvalido) {
    return 'El salario debe estar entre $1,000 y $1,000,000 pesos.';
  }
  if (salarioMin > salarioMax) {
    return 'El salario maximo debe ser mayor o igual al salario minimo.';
  }
  if (!fechaPublicacion || !fechaCierre) {
    return 'La fecha de publicacion y la fecha de cierre son obligatorias.';
  }
  if (fechaPublicacion > fechaCierre) {
    return 'La fecha de cierre debe ser posterior a la fecha de publicacion.';
  }
  return null;
}
