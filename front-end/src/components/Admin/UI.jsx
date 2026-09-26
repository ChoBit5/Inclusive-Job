import { Search, Loader2 } from 'lucide-react';
const BADGE_VARIANTS = {
  success: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  danger: 'bg-red-500/15 text-red-400 border-red-500/30',
  warning: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  info: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  purple: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
  default: 'bg-slate-500/15 text-slate-400 border-slate-500/30'
};
export function Badge({
  variant = 'default',
  children
}) {
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${BADGE_VARIANTS[variant]}`}>
      {children}
    </span>;
}
const BTN_VARIANTS = {
  primary: 'bg-violet-600 hover:bg-violet-700 text-white border-violet-600',
  secondary: 'bg-slate-700 hover:bg-slate-600 text-white border-slate-600',
  danger: 'bg-red-600/20 hover:bg-red-600/30 text-red-400 border-red-500/40',
  success: 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border-emerald-500/40',
  ghost: 'bg-transparent hover:bg-slate-700 text-slate-400 hover:text-white border-transparent'
};
export function Button({
  variant = 'primary',
  size = 'md',
  loading,
  disabled,
  children,
  className = '',
  ...props
}) {
  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base'
  };
  return <button disabled={disabled || loading} className={`
        inline-flex items-center justify-center gap-2 font-medium rounded-lg border
        transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed
        ${BTN_VARIANTS[variant]} ${sizes[size]} ${className}
      `} {...props}>
      {loading && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
      {children}
    </button>;
}
export function StatCard({
  label,
  value,
  icon: Icon,
  color = 'violet',
  trend,
  loading
}) {
  const colors = {
    violet: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    red: 'bg-red-500/10 text-red-400 border-red-500/20',
    cyan: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
  };
  return <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5 hover:border-slate-600/50 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2 rounded-xl border ${colors[color]}`}>
          <Icon size={20} aria-hidden="true" />
        </div>
        {trend && <span className={`text-xs font-medium px-2 py-1 rounded-full ${trend > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
            {trend > 0 ? '+' : ''}{trend}%
          </span>}
      </div>
      {loading ? <div className="animate-pulse space-y-2">
          <div className="h-7 w-16 bg-slate-700 rounded" />
          <div className="h-4 w-24 bg-slate-700 rounded" />
        </div> : <>
          <p className="text-2xl font-bold text-white tabular-nums">{value ?? '—'}</p>
          <p className="text-slate-400 text-sm mt-0.5">{label}</p>
        </>}
    </div>;
}
export function SearchBar({
  value,
  onChange,
  placeholder = 'Buscar...',
  className = ''
}) {
  return <div className={`relative ${className}`}>
      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" aria-hidden="true" />
      <input type="search" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-sm rounded-lg pl-9 pr-3 py-2 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 transition-colors" aria-label={placeholder} />
    </div>;
}
export function FilterTabs({
  options,
  value,
  onChange
}) {
  return <div className="flex flex-wrap gap-1 bg-slate-800/60 p-1 rounded-lg border border-slate-700/50" role="group" aria-label="Filtros">
      {options.map(opt => <button key={opt.value} onClick={() => onChange(opt.value)} aria-pressed={value === opt.value} className={`
            px-3 py-1.5 text-sm rounded-md font-medium transition-all
            ${value === opt.value ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-700'}
          `}>
          {opt.label}
          {opt.count !== undefined && <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${value === opt.value ? 'bg-white/20' : 'bg-slate-700'}`}>
              {opt.count}
            </span>}
        </button>)}
    </div>;
}
export function PageHeader({
  title,
  description,
  action
}) {
  return <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 className="text-xl font-bold text-white">{title}</h1>
        {description && <p className="text-slate-400 text-sm mt-1">{description}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>;
}
export function EmptyState({
  icon: Icon,
  title,
  description,
  action
}) {
  return <div className="flex flex-col items-center justify-center py-16 text-center">
      {Icon && <div className="w-14 h-14 rounded-2xl bg-slate-700/50 flex items-center justify-center mb-4">
          <Icon size={24} className="text-slate-500" />
        </div>}
      <h3 className="text-white font-medium mb-1">{title}</h3>
      {description && <p className="text-slate-400 text-sm max-w-xs">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>;
}
export function ErrorBanner({
  message
}) {
  if (!message) return null;
  return <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3 mb-4" role="alert">
      {message}
    </div>;
}
export function Select({
  value,
  onChange,
  options,
  label,
  className = ''
}) {
  return <div className={className}>
      {label && <label className="block text-xs text-slate-400 mb-1">{label}</label>}
      <select value={value} onChange={e => onChange(e.target.value)} className="bg-slate-800 border border-slate-700 text-slate-300 text-sm rounded-lg px-3 py-2 outline-none focus:border-violet-500 transition-colors w-full" aria-label={label}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>;
}
