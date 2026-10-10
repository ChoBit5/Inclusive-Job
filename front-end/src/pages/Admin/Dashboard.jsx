import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Briefcase, Building2, FileText, AlertTriangle, CheckCircle, XCircle, UserCheck, UserCog, TrendingUp, RefreshCw } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Swal from 'sweetalert2';
import { StatCard, Badge, Button, PageHeader } from '../../components/Admin/UI';
import Table from '../../components/Admin/Table';
import { useDashboardStats, useEmpresaAcciones } from '../../hooks/Admin/useDomain.js';
function useCountUp(end, duration = 1400) {
  const [count, setCount] = useState(0);
  const frameRef = useRef(null);
  useEffect(() => {
    if (end === null || end === undefined) return;
    cancelAnimationFrame(frameRef.current);
    const startTime = performance.now();
    const step = now => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      setCount(Math.floor(eased * end));
      if (progress < 1) frameRef.current = requestAnimationFrame(step);
    };
    frameRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameRef.current);
  }, [end, duration]);
  return count;
}
function AnimatedStatCard({
  label,
  rawValue,
  icon,
  color,
  trend,
  loading
}) {
  const animated = useCountUp(rawValue ?? 0);
  const display = (rawValue ?? 0) >= 1000 ? animated.toLocaleString('es-MX') : animated;
  return <StatCard label={label} value={loading ? '—' : display} icon={icon} color={color} trend={trend} loading={loading} />;
}
function CustomTooltip({
  active,
  payload,
  label
}) {
  if (!active || !payload?.length) return null;
  return <div className="bg-slate-800 border border-slate-600/50 rounded-xl p-3 shadow-xl">
      <p className="text-slate-300 text-xs font-semibold mb-2">{label}</p>
      {payload.map(entry => <div key={entry.dataKey} className="flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{
        background: entry.color
      }} />
          <span className="text-slate-400 capitalize">{entry.name}:</span>
          <span className="text-white font-medium">{entry.value}</span>
        </div>)}
    </div>;
}
const VACANTES_COLS = [{
  key: 'titulo_puesto',
  label: 'Título',
  render: v => <span className="font-medium text-white">{v}</span>
}, {
  key: 'empresa',
  label: 'Empresa'
}, {
  key: 'modalidad',
  label: 'Modalidad',
  render: v => <Badge variant="info">{v ?? '—'}</Badge>
}, {
  key: 'estado',
  label: 'Estado',
  render: v => <Badge variant={v === 'activa' ? 'success' : 'default'}>{v}</Badge>
}, {
  key: 'fecha_publicacion',
  label: 'Fecha',
  render: v => new Date(v).toLocaleDateString('es-MX')
}];
const buildKpis = (s, loading) => [{
  label: 'Total usuarios',
  rawValue: s?.total_usuarios,
  icon: Users,
  color: 'violet',
  trend: null,
  loading
}, {
  label: 'Postulantes',
  rawValue: s?.total_postulantes,
  icon: UserCheck,
  color: 'blue',
  loading
}, {
  label: 'Reclutadores',
  rawValue: s?.total_reclutadores,
  icon: UserCog,
  color: 'cyan',
  loading
}, {
  label: 'Empresas',
  rawValue: s?.total_empresas,
  icon: Building2,
  color: 'emerald',
  loading
}, {
  label: 'Empresas pendientes',
  rawValue: s?.empresas_pendientes,
  icon: AlertTriangle,
  color: 'amber',
  loading
}, {
  label: 'Vacantes activas',
  rawValue: s?.vacantes_activas,
  icon: Briefcase,
  color: 'emerald',
  loading
}, {
  label: 'Vacantes cerradas',
  rawValue: s?.vacantes_cerradas,
  icon: XCircle,
  color: 'red',
  loading
}, {
  label: 'Postulaciones',
  rawValue: s?.postulaciones_realizadas,
  icon: FileText,
  color: 'violet',
  loading
}, {
  label: 'Reportes',
  rawValue: s?.reportes_recibidos,
  icon: AlertTriangle,
  color: 'amber',
  loading
}];
export default function Dashboard() {
  const navigate = useNavigate();
  const {
    stats,
    actividadMensual,
    ultimasVacantes,
    empresasPendientes: empresasPendientesAPI,
    loading,
    error,
    refetch
  } = useDashboardStats();
  const [removedIds, setRemovedIds] = useState(new Set());
  const empresasPendientes = useMemo(() => (empresasPendientesAPI ?? []).filter(e => !removedIds.has(e.id_empresas)), [empresasPendientesAPI, removedIds]);
  const {
    aprobar,
    loading: accionLoading
  } = useEmpresaAcciones();
  const handleAprobar = async empresa => {
    const result = await Swal.fire({
      title: '¿Aprobar empresa?',
      html: `<span style="color:#94a3b8">Se aprobará a <strong style="color:#fff">${empresa.nombre_empresas}</strong> y podrá publicar vacantes.</span>`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, aprobar',
      cancelButtonText: 'Cancelar',
      background: '#1e293b',
      color: '#f8fafc',
      confirmButtonColor: '#16a34a',
      cancelButtonColor: '#475569',
      customClass: {
        popup: 'swal-rounded'
      }
    });
    if (!result.isConfirmed) return;
    try {
      await aprobar(empresa.id_empresas);
      setRemovedIds(prev => new Set([...prev, empresa.id_empresas]));
      await refetch();
      Swal.fire({
        title: '¡Aprobada!',
        text: `${empresa.nombre_empresas} ha sido aprobada.`,
        icon: 'success',
        background: '#1e293b',
        color: '#f8fafc',
        confirmButtonColor: '#7c3aed',
        timer: 2000,
        showConfirmButton: false
      });
    } catch {
      Swal.fire({
        title: 'Error',
        text: 'No se pudo aprobar la empresa. Intenta de nuevo.',
        icon: 'error',
        background: '#1e293b',
        color: '#f8fafc',
        confirmButtonColor: '#7c3aed'
      });
    }
  };
  return <div className="space-y-6 w-full">
      <PageHeader title="Dashboard" description="Resumen general de la plataforma Inclusive Job IA" action={<Button variant="ghost" size="sm" onClick={refetch} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Cargando...' : 'Actualizar'}
          </Button>} />

      
      {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3 flex items-center gap-3" role="alert">
          <AlertTriangle size={16} className="flex-shrink-0" />
          {error}
        </div>}

      
      <section aria-labelledby="kpi-heading">
        <h2 id="kpi-heading" className="sr-only">Indicadores clave</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
          {buildKpis(stats, loading).map(kpi => <AnimatedStatCard key={kpi.label} {...kpi} />)}
        </div>
      </section>

      
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">

        
        <section aria-labelledby="chart-heading" className="xl:col-span-2 bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
            <h2 id="chart-heading" className="text-white font-semibold flex items-center gap-2">
              <TrendingUp size={18} className="text-violet-400" />
              Vacantes por mes
            </h2>
            <span className="flex items-center gap-1.5 text-xs text-slate-400">
              <span className="w-2.5 h-2.5 rounded-full bg-violet-500 inline-block" />
              Vacantes publicadas
            </span>
          </div>

          {loading ? <div className="h-[220px] flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            </div> : actividadMensual.length === 0 ? <div className="h-[220px] flex items-center justify-center text-slate-500 text-sm">
              Sin datos de actividad aún.
            </div> : <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={actividadMensual} margin={{
            top: 5,
            right: 5,
            left: -20,
            bottom: 0
          }}>
                <defs>
                  <linearGradient id="colorVacantes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="mes" tick={{
              fill: '#94a3b8',
              fontSize: 11
            }} axisLine={false} tickLine={false} />
                <YAxis tick={{
              fill: '#94a3b8',
              fontSize: 11
            }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{
              stroke: '#475569',
              strokeWidth: 1
            }} />
                <Area type="monotone" dataKey="vacantes" name="Vacantes" stroke="#7c3aed" strokeWidth={2} fill="url(#colorVacantes)" dot={{
              fill: '#7c3aed',
              strokeWidth: 0,
              r: 3
            }} activeDot={{
              r: 5,
              fill: '#7c3aed'
            }} />
              </AreaChart>
            </ResponsiveContainer>}
        </section>

        
        <section aria-labelledby="pending-heading" className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4 sm:p-5">
          <h2 id="pending-heading" className="text-white font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-400" />
            Empresas pendientes
            {!loading && <span className="ml-auto text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full">
                {empresasPendientes.length}
              </span>}
          </h2>

          {loading ? <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="bg-slate-700/40 rounded-xl p-3 animate-pulse">
                  <div className="h-3 bg-slate-600 rounded w-3/4 mb-2" />
                  <div className="h-2 bg-slate-600 rounded w-1/2" />
                </div>)}
            </div> : empresasPendientes.length === 0 ? <div className="flex flex-col items-center justify-center py-8 text-center">
              <CheckCircle size={32} className="text-emerald-400 mb-2" />
              <p className="text-emerald-400 text-sm font-medium">¡Todo al día!</p>
              <p className="text-slate-500 text-xs mt-1">No hay empresas pendientes</p>
            </div> : <ul className="space-y-3">
              {empresasPendientes.map(emp => <li key={emp.id_empresas} className="bg-slate-700/40 border border-slate-600/30 rounded-xl p-3 hover:border-slate-500/50 transition-colors">
                  <p className="text-white text-sm font-semibold truncate">{emp.nombre_empresas}</p>
                  <p className="text-slate-400 text-xs truncate mt-0.5">{emp.correo_empresa}</p>
                  <p className="text-slate-500 text-xs mt-1">
                    {new Date(emp.fecha_registro).toLocaleDateString('es-MX')}
                  </p>
                  <div className="flex gap-2 mt-3">
                    <Button variant="success" size="sm" loading={accionLoading} onClick={() => handleAprobar(emp)} className="flex-1">
                      <CheckCircle size={13} /> Aprobar
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/empresas/${emp.id_empresas}`)}>
                      Ver
                    </Button>
                  </div>
                </li>)}
            </ul>}
        </section>
      </div>

      
      <section aria-labelledby="vacantes-heading" className="w-full">
        <div className="flex items-center justify-between mb-3">
          <h2 id="vacantes-heading" className="text-white font-semibold">Últimas vacantes</h2>
          <Button variant="ghost" size="sm" onClick={() => navigate('/admin/vacantes')}>
            Ver todas →
          </Button>
        </div>
        <Table columns={VACANTES_COLS} data={ultimasVacantes} loading={loading} emptyMessage="No hay vacantes publicadas aún." caption="Últimas vacantes publicadas" />
      </section>
    </div>;
}
