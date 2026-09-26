import { NavLink, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, X, LogOut } from 'lucide-react';
import { resolveAssetUrl } from '../../data/interface.js';
export default function PortalSidebar({
  theme,
  navItems = [],
  user = {},
  collapsed,
  onToggle,
  mobileOpen,
  onMobileClose
}) {
  const navigate = useNavigate();
  const t = theme;
  const handleLogout = () => {
    onMobileClose?.();
    navigate('/');
  };
  return <>
      
      {mobileOpen && <div onClick={onMobileClose} aria-hidden="true" style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.5)',
      backdropFilter: 'blur(2px)',
      zIndex: 30
    }} className="lg:hidden" />}

      <aside role="navigation" aria-label="Menú principal" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      height: '100%',
      width: collapsed ? '68px' : '256px',
      zIndex: 40,
      display: 'flex',
      flexDirection: 'column',
      background: t.sidebar,
      borderRight: `1px solid ${t.sidebarBorder}`,
      transition: 'width 0.3s cubic-bezier(0.4,0,0.2,1)',
      overflowX: 'hidden'
    }} className={mobileOpen ? '' : '-translate-x-full lg:translate-x-0'}>
        
        <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between',
        height: '64px',
        padding: collapsed ? '0 12px' : '0 16px',
        borderBottom: `1px solid ${t.sidebarBorder}`,
        flexShrink: 0
      }}>
          
          <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          overflow: 'hidden'
        }}>
            <div style={{
            width: '36px',
            height: '36px',
            flexShrink: 0,
            borderRadius: '10px',
            background: t.gradient,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: t.gradientGlow,
            fontSize: '16px',
            color: '#fff',
            fontWeight: 700,
            letterSpacing: '-0.5px'
          }}>
              IJ
            </div>
            {!collapsed && <div style={{
            overflow: 'hidden'
          }}>
                <p style={{
              margin: 0,
              fontSize: '14px',
              fontWeight: 700,
              color: t.textPrimary,
              whiteSpace: 'nowrap'
            }}>
                  Inclusive <span style={{
                color: t.accent
              }}>Job IA</span>
                </p>
                <p style={{
              margin: 0,
              fontSize: '11px',
              color: t.textMuted,
              textTransform: 'uppercase',
              letterSpacing: '0.06em'
            }}>
                  {t.name}
                </p>
              </div>}
          </div>

          
          {!collapsed && <>
              <button onClick={onMobileClose} aria-label="Cerrar menú" style={btnStyle(t)} className="lg:hidden">
                <X size={16} />
              </button>
              <button onClick={onToggle} aria-label="Colapsar menú" style={btnStyle(t)} className="hidden lg:flex">
                <ChevronLeft size={16} />
              </button>
            </>}
        </div>

        
        <nav style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        padding: '12px 8px'
      }}>
          <ul style={{
          listStyle: 'none',
          margin: 0,
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: '2px'
        }}>
            {navItems.map(({
            to,
            label,
            icon: Icon
          }) => <li key={to}>
                <NavLink to={to} end={to.split('/').length <= 2} style={({
              isActive
            }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: collapsed ? '10px 0' : '9px 12px',
              justifyContent: collapsed ? 'center' : 'flex-start',
              borderRadius: '10px',
              textDecoration: 'none',
              fontSize: '13.5px',
              fontWeight: isActive ? 600 : 400,
              color: isActive ? t.navActiveText : t.textSecondary,
              background: isActive ? t.navActive : 'transparent',
              border: `1px solid ${isActive ? t.navActiveBorder : 'transparent'}`,
              transition: 'all 0.15s',
              position: 'relative'
            })} title={collapsed ? label : undefined} aria-label={label}>
                  {({
                isActive
              }) => <>
                      <Icon size={18} style={{
                  flexShrink: 0,
                  color: isActive ? t.accent : t.textSecondary
                }} />
                      {!collapsed && <span style={{
                  flex: 1,
                  truncate: 'true',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                          {label}
                        </span>}
                    </>}
                </NavLink>
              </li>)}
          </ul>
        </nav>

        
        <div style={{
        borderTop: `1px solid ${t.sidebarBorder}`,
        padding: collapsed ? '12px 8px' : '12px 12px',
        flexShrink: 0
      }}>
          {!collapsed ? <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
              <Avatar name={user.nombre || 'U'} src={user.avatar || user.foto_perfil} theme={t} size={34} />
              <div style={{
            flex: 1,
            overflow: 'hidden'
          }}>
                <p style={{
              margin: 0,
              fontSize: '13px',
              fontWeight: 600,
              color: t.textPrimary,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
                  {user.nombre || 'Usuario'}
                </p>
                <p style={{
              margin: 0,
              fontSize: '11px',
              color: t.textMuted,
              textTransform: 'capitalize'
            }}>
                  {user.rol || t.name}
                </p>
              </div>
              <button onClick={handleLogout} aria-label="Cerrar sesión" title="Cerrar sesión" style={{
            ...btnStyle(t),
            flexShrink: 0
          }}>
                <LogOut size={15} />
              </button>
            </div> : <div style={{
          display: 'flex',
          justifyContent: 'center',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px'
        }}>
              <Avatar name={user.nombre || 'U'} src={user.avatar || user.foto_perfil} theme={t} size={34} />
              <button onClick={handleLogout} aria-label="Cerrar sesión" title="Cerrar sesión" style={btnStyle(t)}>
                <LogOut size={15} />
              </button>
            </div>}
        </div>

        
        {collapsed && <button onClick={onToggle} aria-label="Expandir menú" style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '10px',
        margin: '8px',
        borderRadius: '8px',
        border: `1px solid ${t.border}`,
        background: 'transparent',
        cursor: 'pointer',
        color: t.textMuted,
        transition: 'all 0.15s'
      }}>
            <ChevronRight size={16} />
          </button>}
      </aside>
    </>;
}
function Avatar({
  name,
  src,
  theme: t,
  size = 34
}) {
  const initials = name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const avatarUrl = resolveAssetUrl(src);
  return <div style={{
    width: size,
    height: size,
    borderRadius: '50%',
    background: t.accentSoft,
    border: `2px solid ${t.accentBorder}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: size * 0.35,
    fontWeight: 700,
    color: t.accent,
    flexShrink: 0,
    overflow: 'hidden'
  }}>
      {avatarUrl ? <img src={avatarUrl} alt="" style={{
      width: '100%',
      height: '100%',
      objectFit: 'cover'
    }} onError={e => {
      e.currentTarget.style.display = 'none';
      e.currentTarget.nextSibling.style.display = 'block';
    }} /> : null}
      <span style={{
      display: avatarUrl ? 'none' : 'block'
    }}>{initials}</span>
    </div>;
}
function btnStyle(t) {
  return {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '6px',
    borderRadius: '8px',
    color: t.textMuted,
    display: 'flex',
    alignItems: 'center',
    transition: 'color 0.15s, background 0.15s'
  };
}
