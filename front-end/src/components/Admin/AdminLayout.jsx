import { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useSesion } from '../../hooks/Sesion/useSesion.js';

const ADMIN_ROLES = ['administrador'];

export default function AdminLayout() {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user: adminUser, loading: checkingSession, allowed } = useSesion({
    allowedRoles: ADMIN_ROLES,
    required: true,
  });

  useEffect(() => {
    if (!checkingSession && !allowed) {
      navigate('/login-admin', { replace: true });
    }
  }, [allowed, checkingSession, navigate]);

  if (checkingSession || !allowed) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-300">
        Validando sesion...
      </div>
    );
  }
  return <div className="min-h-screen bg-slate-950 flex">

      
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} user={adminUser} />

      
      <div className={`
          flex flex-col flex-1 w-0 min-h-screen
          transition-[margin] duration-300 ease-in-out
          ml-0
          ${collapsed ? 'lg:ml-16' : 'lg:ml-64'}
        `}>
        
        <Header onMobileMenuOpen={() => setMobileOpen(true)} sidebarCollapsed={collapsed} user={adminUser} />

        
        <main id="main-content" className="flex-1 p-4 sm:p-6 w-full overflow-x-hidden" role="main" aria-label="Contenido principal">
          <Outlet />
        </main>
      </div>
    </div>;
}
