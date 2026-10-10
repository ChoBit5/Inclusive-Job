import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Building2, Users, Briefcase, FileText, Accessibility, Flag, ChevronLeft, ChevronRight, LogOut, X } from 'lucide-react';
import { resolveAssetUrl } from '../../hooks/Sesion/apiSesion.js';
const NAV_ITEMS = [{
  to: '/admin',
  label: 'Dashboard',
  icon: LayoutDashboard,
  exact: true
}, {
  to: '/admin/empresas',
  label: 'Empresas',
  icon: Building2
}, {
  to: '/admin/usuarios',
  label: 'Usuarios',
  icon: Users
}, {
  to: '/admin/vacantes',
  label: 'Vacantes',
  icon: Briefcase
}, {
  to: '/admin/postulaciones',
  label: 'Postulaciones',
  icon: FileText
}, {
  to: '/admin/discapacidades',
  label: 'Discapacidades',
  icon: Accessibility
}, {
  to: '/admin/reportes',
  label: 'Reportes',
  icon: Flag
}];
function UserAvatar({
  user
}) {
  const name = user?.nombre || user?.nombres || 'Administrador';
  const avatarUrl = resolveAssetUrl(user?.avatar || user?.foto_perfil);
  const initials = name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  return <div className="w-8 h-8 rounded-full bg-violet-500/20 border border-violet-500/40 flex items-center justify-center flex-shrink-0 overflow-hidden">
      {avatarUrl ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" onError={e => {
      e.currentTarget.style.display = 'none';
      e.currentTarget.nextSibling.style.display = 'block';
    }} /> : null}
      <span className="text-violet-300 text-xs font-bold" style={{
      display: avatarUrl ? 'none' : 'block'
    }}>
        {initials || 'A'}
      </span>
    </div>;
}
export default function Sidebar({
  collapsed,
  onToggle,
  mobileOpen,
  onMobileClose,
  user
}) {
  const navigate = useNavigate();
  const handleLogout = () => {
    onMobileClose?.();
    navigate('/');
  };
  return <>
      
      {mobileOpen && <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={onMobileClose} aria-hidden="true" />}

      <aside role="navigation" aria-label="Menú principal" className={`
          fixed top-0 left-0 h-full z-40 flex flex-col
          bg-slate-900 border-r border-slate-700/50
          transition-all duration-300 ease-in-out
          ${collapsed ? 'w-16' : 'w-64'}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
        
        <div className={`flex items-center h-16 px-4 border-b border-slate-700/50 ${collapsed ? 'justify-center' : 'justify-between'}`}>
          {!collapsed && <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center flex-shrink-0">
                <Accessibility size={16} className="text-white" />
              </div>
              <span className="font-bold text-white text-sm leading-tight whitespace-nowrap">
                Inclusive<span className="text-violet-400"> Job IA</span>
              </span>
            </div>}
          {collapsed && <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center">
              <Accessibility size={16} className="text-white" />
            </div>}
          
          <button onClick={onMobileClose} className="lg:hidden text-slate-400 hover:text-white p-1 rounded" aria-label="Cerrar menú">
            <X size={18} />
          </button>
          
          {!collapsed && <button onClick={onToggle} className="hidden lg:flex text-slate-400 hover:text-white p-1 rounded transition-colors" aria-label="Colapsar menú">
              <ChevronLeft size={18} />
            </button>}
        </div>

        
        <nav className="flex-1 py-4 overflow-y-auto overflow-x-hidden">
          <ul className="space-y-1 px-2" role="list">
            {NAV_ITEMS.map(({
            to,
            label,
            icon: Icon,
            exact
          }) => <li key={to}>
                <NavLink to={to} end={exact} className={({
              isActive
            }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group
                    ${isActive ? 'bg-violet-600/20 text-violet-300 border border-violet-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-800'}
                    ${collapsed ? 'justify-center' : ''}`} title={collapsed ? label : undefined} aria-label={label}>
                  <Icon size={18} className="flex-shrink-0" />
                  {!collapsed && <span className="truncate">{label}</span>}
                </NavLink>
              </li>)}
          </ul>
        </nav>

        
        {collapsed && <div className="p-2 border-t border-slate-700/50">
            <button onClick={onToggle} className="w-full flex justify-center text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors" aria-label="Expandir menú">
              <ChevronRight size={18} />
            </button>
          </div>}

        
        <div className="p-3 border-t border-slate-700/50">
          {collapsed ? <div className="flex flex-col items-center gap-2">
              <UserAvatar user={user} />
              <button onClick={handleLogout} className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors" aria-label="Cerrar sesion" title="Salir">
                <LogOut size={17} />
              </button>
            </div> : <div className="flex items-center gap-3">
              <UserAvatar user={user} />
              <div className="min-w-0 flex-1 overflow-hidden">
                <p className="text-white text-xs font-semibold truncate">{user?.nombre || user?.nombres || 'Administrador'}</p>
                <p className="text-slate-500 text-xs truncate">{user?.rol || 'Panel de control'}</p>
              </div>
              <button onClick={handleLogout} className="w-9 h-9 flex items-center justify-center flex-shrink-0 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors" aria-label="Cerrar sesion" title="Salir">
                <LogOut size={17} />
              </button>
            </div>}
        </div>
      </aside>
    </>;
}
