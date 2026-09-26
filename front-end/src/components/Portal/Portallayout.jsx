import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import PortalSidebar from './Portalsidebar';
import PortalHeader from './Portalheader';
const EMPTY_USER = {};
export default function PortalLayout({
  theme,
  navItems = [],
  user = EMPTY_USER,
  children,
  pageTitle,
  headerActions
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const t = theme;
  const currentUser = user;
  return <div style={{
    minHeight: '100svh',
    width: '100%',
    background: t.bg,
    color: t.textPrimary,
    fontFamily: "'Plus Jakarta Sans', 'DM Sans', system-ui, sans-serif"
  }}>
      <style>{`
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${t.border}; border-radius: 2px; }
        input[type=search]::-webkit-search-cancel-button { display: none; }
        ::placeholder { color: ${t.textMuted}; }
      `}</style>

      
      <PortalSidebar theme={t} navItems={navItems} user={currentUser} collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />

      
      <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100svh',
      marginLeft: 0,
      paddingLeft: 0,
      transition: 'padding-left 0.3s cubic-bezier(0.4,0,0.2,1)'
    }} className={collapsed ? 'lg:!pl-[68px]' : 'lg:!pl-[256px]'}>
        <PortalHeader theme={t} onMobileMenuOpen={() => setMobileOpen(true)} title={pageTitle} actions={headerActions} />

        <main id="main-content" role="main" aria-label="Contenido principal" style={{
        flex: 1,
        padding: '24px 20px',
        width: '100%',
        overflowX: 'hidden'
      }}>
          {children ?? <Outlet />}
        </main>
      </div>
    </div>;
}
