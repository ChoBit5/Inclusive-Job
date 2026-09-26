import { Menu, Search } from 'lucide-react';
export default function PortalHeader({
  theme,
  onMobileMenuOpen,
  title,
  actions
}) {
  const t = theme;
  return <header style={{
    position: 'sticky',
    top: 0,
    zIndex: 20,
    width: '100%',
    height: '64px',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '0 20px',
    background: t.headerBg,
    borderBottom: `1px solid ${t.headerBorder}`,
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    boxSizing: 'border-box'
  }}>
      <button onClick={onMobileMenuOpen} aria-label="Abrir menu" style={{
      display: 'none',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '7px',
      borderRadius: '8px',
      border: `1px solid ${t.border}`,
      background: 'transparent',
      cursor: 'pointer',
      color: t.textSecondary,
      flexShrink: 0
    }} className="lg:!hidden !flex">
        <Menu size={18} />
      </button>

      {title && <div className="hidden sm:flex" style={{
      flex: 1,
      minWidth: 0
    }}>
          <h1 style={{
        margin: 0,
        fontSize: '15px',
        fontWeight: 600,
        color: t.textPrimary,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }}>
            {title}
          </h1>
        </div>}

      <div style={{
      flex: 1
    }} className={title ? 'sm:hidden' : ''} />

      {actions && <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      flexShrink: 0
    }}>
          {actions}
        </div>}

      <div className="hidden md:flex" style={{
      display: 'none',
      alignItems: 'center',
      gap: '8px',
      padding: '0 12px',
      height: '36px',
      borderRadius: '10px',
      border: `1px solid ${t.border}`,
      background: t.bgElevated,
      flexShrink: 0
    }}>
        <Search size={14} style={{
        color: t.textMuted,
        flexShrink: 0
      }} />
        <input type="search" placeholder="Buscar..." aria-label="Buscar" style={{
        background: 'transparent',
        border: 'none',
        outline: 'none',
        fontSize: '13px',
        color: t.textPrimary,
        width: '160px'
      }} />
      </div>
    </header>;
}
