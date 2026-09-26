import { Menu, ChevronRight } from 'lucide-react';
import { useLocation, Link } from 'react-router-dom';
const BREADCRUMB_MAP = {
  '/admin': 'Dashboard',
  '/admin/empresas': 'Empresas',
  '/admin/usuarios': 'Usuarios',
  '/admin/vacantes': 'Vacantes',
  '/admin/postulaciones': 'Postulaciones',
  '/admin/discapacidades': 'Discapacidades',
  '/admin/reportes': 'Reportes',
  '/admin/configuracion': 'Configuración'
};
function Breadcrumbs() {
  const {
    pathname
  } = useLocation();
  const segments = pathname.split('/').filter(Boolean);
  const crumbs = [{
    label: 'Admin',
    path: '/admin'
  }];
  for (let i = 1; i < segments.length; i++) {
    const full = '/' + segments.slice(0, i + 1).join('/');
    crumbs.push({
      label: BREADCRUMB_MAP[full] || segments[i],
      path: full
    });
  }
  return <nav aria-label="Ruta de navegación" className="flex items-center gap-1 text-sm">
      {crumbs.map((c, idx) => <span key={c.path} className="flex items-center gap-1">
          {idx > 0 && <ChevronRight size={13} className="text-slate-500" />}
          {idx === crumbs.length - 1 ? <span className="text-white font-medium">{c.label}</span> : <Link to={c.path} className="text-slate-400 hover:text-violet-400 transition-colors">{c.label}</Link>}
        </span>)}
    </nav>;
}
export default function Header({
  onMobileMenuOpen
}) {
  return <header className="sticky top-0 z-20 w-full h-16 flex-shrink-0
                       bg-slate-900/95 backdrop-blur-sm
                       border-b border-slate-700/50
                       flex items-center gap-4 px-4">

      
      <button onClick={onMobileMenuOpen} className="lg:hidden flex-shrink-0 text-slate-400 hover:text-white
                   p-1.5 rounded-lg hover:bg-slate-800 transition-colors" aria-label="Abrir menú de navegación">
        <Menu size={20} />
      </button>

      
      <div className="hidden sm:flex flex-1 min-w-0">
        <Breadcrumbs />
      </div>

      
      <div className="flex-1 sm:hidden" />

    </header>;
}
