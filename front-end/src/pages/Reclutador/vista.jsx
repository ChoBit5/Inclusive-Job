import PortalLayout from '../../components/Portal/Portallayout';
import { reclutadorTheme } from '../../components/Portal/portalTheme';
import { reclutadorNav } from '../../components/Portal/Navitems';
import { Plus, Search } from 'lucide-react';
const t = reclutadorTheme;
export default function Vista() {
  const user = {
    nombre: 'Carlos Ramírez',
    rol: 'Reclutador'
  };
  return <PortalLayout theme={t} navItems={reclutadorNav} user={user} pageTitle="Nombre de mi vista" notifications={0} headerActions={<button style={{
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    background: t.gradient,
    border: 'none',
    borderRadius: '10px',
    padding: '8px 16px',
    color: '#fff',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: `0 4px 14px ${t.accentGlow}`
  }}>
          <Plus size={14} /> Acción principal
        </button>}>
      

      <div style={{
      maxWidth: '1400px',
      margin: '0 auto',
      display: 'flex',
      flexDirection: 'column',
      gap: '20px'
    }}>

        
        <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
          <div>
            <h1 style={{
            margin: 0,
            fontSize: '20px',
            fontWeight: 800,
            color: t.textPrimary,
            letterSpacing: '-0.4px'
          }}>
              Título de la sección
            </h1>
            <p style={{
            margin: '4px 0 0',
            fontSize: '13px',
            color: t.textSecondary
          }}>
              Descripción breve de esta vista.
            </p>
          </div>
        </div>

        
        
        <div style={{
        background: t.bgSurface,
        border: `1px solid ${t.border}`,
        borderRadius: '16px',
        padding: '20px',
        color: t.textPrimary
      }}>
          <h2 style={{
          margin: '0 0 8px',
          fontSize: '15px',
          fontWeight: 700,
          color: t.textPrimary
        }}>
            Mi card de ejemplo
          </h2>
          <p style={{
          margin: 0,
          fontSize: '13px',
          color: t.textSecondary
        }}>
            Contenido de la card. Usa <code>t.textSecondary</code> para textos secundarios.
          </p>
        </div>

        
        <div style={{
        display: 'flex',
        gap: '10px',
        flexWrap: 'wrap'
      }}>

          
          <button style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: t.gradient,
          border: 'none',
          borderRadius: '10px',
          padding: '9px 18px',
          color: '#fff',
          fontSize: '13px',
          fontWeight: 600,
          cursor: 'pointer'
        }}>
            <Plus size={14} /> Botón primario
          </button>

          
          <button style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: t.accentSoft,
          border: `1px solid ${t.accentBorder}`,
          borderRadius: '10px',
          padding: '9px 18px',
          color: t.accent,
          fontSize: '13px',
          fontWeight: 600,
          cursor: 'pointer'
        }}>
            <Search size={14} /> Botón secundario
          </button>

          
          <button style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: 'transparent',
          border: `1px solid ${t.border}`,
          borderRadius: '10px',
          padding: '9px 18px',
          color: t.textSecondary,
          fontSize: '13px',
          fontWeight: 500,
          cursor: 'pointer'
        }}>
            Botón ghost
          </button>
        </div>

        
        <div style={{
        display: 'flex',
        gap: '8px',
        flexWrap: 'wrap'
      }}>
          
          <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '3px 10px',
          borderRadius: '999px',
          fontSize: '11px',
          fontWeight: 600,
          background: t.accentSoft,
          color: t.accent,
          border: `1px solid ${t.accentBorder}`
        }}>
            Activo
          </span>
          
          <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '3px 10px',
          borderRadius: '999px',
          fontSize: '11px',
          fontWeight: 600,
          background: 'rgba(16,185,129,0.1)',
          color: '#059669',
          border: '1px solid rgba(16,185,129,0.25)'
        }}>
            Aprobado
          </span>
          
          <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '3px 10px',
          borderRadius: '999px',
          fontSize: '11px',
          fontWeight: 600,
          background: 'rgba(245,158,11,0.1)',
          color: '#d97706',
          border: '1px solid rgba(245,158,11,0.25)'
        }}>
            Pendiente
          </span>
          
          <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '3px 10px',
          borderRadius: '999px',
          fontSize: '11px',
          fontWeight: 600,
          background: 'rgba(239,68,68,0.1)',
          color: '#dc2626',
          border: '1px solid rgba(239,68,68,0.25)'
        }}>
            Rechazado
          </span>
        </div>

        
        <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        maxWidth: '400px'
      }}>
          <label style={{
          fontSize: '13px',
          fontWeight: 500,
          color: t.textSecondary
        }}>
            Etiqueta del campo
          </label>
          <input type="text" placeholder="Escribe aquí..." style={{
          height: '40px',
          padding: '0 12px',
          background: t.bgElevated,
          border: `1px solid ${t.border}`,
          borderRadius: '10px',
          color: t.textPrimary,
          fontSize: '13.5px',
          outline: 'none'
        }} />
        </div>

        
        

      </div>
    </PortalLayout>;
}
