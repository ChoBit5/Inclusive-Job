import { useEffect, useRef, useState } from 'react';
import { Loader, X } from 'lucide-react';
export default function PdfPreviewModal({
  open,
  sourceUrl,
  title = 'Documento PDF',
  onClose,
  theme = {}
}) {
  const [viewerUrl, setViewerUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const createdUrlRef = useRef('');
  useEffect(() => {
    if (!open || !sourceUrl) return undefined;
    let active = true;
    async function loadPdf() {
      setLoading(true);
      setError('');
      setViewerUrl('');
      if (/^(blob:|data:)/i.test(sourceUrl)) {
        setViewerUrl(sourceUrl);
        setLoading(false);
        return;
      }
      try {
        throw new Error('El documento se muestra solo cuando se selecciona un archivo local.');
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'No se pudo mostrar el PDF.');
      } finally {
        if (active) setLoading(false);
      }
    }
    loadPdf();
    return () => {
      active = false;
      if (createdUrlRef.current) {
        URL.revokeObjectURL(createdUrlRef.current);
        createdUrlRef.current = '';
      }
    };
  }, [open, sourceUrl]);
  if (!open) return null;
  const accent = theme.accent || '#8b5cf6';
  const surface = theme.bgSurface || theme.bgElevated || '#111827';
  const border = theme.border || 'rgba(255,255,255,0.12)';
  const text = theme.textPrimary || '#fff';
  const muted = theme.textMuted || '#94a3b8';
  return <div className="ij-pdf-modal-overlay" role="dialog" aria-modal="true" aria-label={title} style={{
    position: 'fixed',
    inset: 0,
    zIndex: 1000000,
    background: 'rgba(2,6,23,0.72)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    boxSizing: 'border-box'
  }} onClick={onClose}>
      <style>{`
        .ij-pdf-modal-card {
          width: min(1100px, 96vw);
          height: min(820px, 92vh);
        }

        @supports (height: 100svh) {
          .ij-pdf-modal-card {
            height: min(820px, 92svh);
          }
        }

        @media (max-width: 640px) {
          .ij-pdf-modal-overlay {
            padding: 8px !important;
            align-items: stretch !important;
          }

          .ij-pdf-modal-card {
            width: 100% !important;
            height: calc(100vh - 16px) !important;
            max-height: calc(100vh - 16px) !important;
            border-radius: 14px !important;
          }

          @supports (height: 100svh) {
            .ij-pdf-modal-card {
              height: calc(100svh - 16px) !important;
              max-height: calc(100svh - 16px) !important;
            }
          }

          .ij-pdf-modal-header {
            min-height: 54px !important;
            padding: 8px 10px !important;
            gap: 8px !important;
          }

          .ij-pdf-modal-title {
            font-size: 13px !important;
          }

          .ij-pdf-modal-subtitle {
            font-size: 10.5px !important;
          }

          .ij-pdf-modal-close {
            width: 34px !important;
            height: 34px !important;
            border-radius: 9px !important;
          }

          .ij-pdf-modal-viewer {
            min-height: 0 !important;
          }
        }

        @media (max-width: 380px) {
          .ij-pdf-modal-subtitle {
            display: none !important;
          }
        }
      `}</style>
      <div className="ij-pdf-modal-card" style={{
      background: surface,
      border: `1px solid ${border}`,
      borderRadius: 18,
      overflow: 'hidden',
      boxShadow: '0 24px 80px rgba(0,0,0,0.35)',
      display: 'flex',
      flexDirection: 'column'
    }} onClick={e => e.stopPropagation()}>
        <div className="ij-pdf-modal-header" style={{
        minHeight: 58,
        padding: '0 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        borderBottom: `1px solid ${border}`
      }}>
          <div style={{
          minWidth: 0
        }}>
            <p className="ij-pdf-modal-title" style={{
            margin: 0,
            color: text,
            fontWeight: 800,
            fontSize: 15,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
              {title}
            </p>
            <p className="ij-pdf-modal-subtitle" style={{
            margin: '3px 0 0',
            color: muted,
            fontSize: 12
          }}>
              Vista segura dentro de InclusiveJob
            </p>
          </div>

          {viewerUrl && /^(blob:|data:)/i.test(viewerUrl) && <a href={viewerUrl} target="_blank" rel="noopener noreferrer" style={{
          marginLeft: 'auto',
          color: accent,
          border: `1px solid ${border}`,
          borderRadius: 9,
          padding: '8px 10px',
          textDecoration: 'none',
          fontSize: 12,
          fontWeight: 800,
          whiteSpace: 'nowrap',
          flexShrink: 0
        }}>
              Abrir
            </a>}

          <button className="ij-pdf-modal-close" type="button" onClick={onClose} aria-label="Cerrar visor PDF" style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          border: `1px solid ${border}`,
          background: 'transparent',
          color: text,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
            <X size={18} />
          </button>
        </div>

        <div className="ij-pdf-modal-viewer" style={{
        flex: 1,
        minHeight: 0,
        background: '#0f172a',
        position: 'relative'
      }}>
          {loading && <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          color: '#e2e8f0'
        }}>
              <Loader size={18} style={{
            animation: 'spin 1s linear infinite',
            color: accent
          }} />
              Cargando PDF...
            </div>}

          {!loading && error && <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          textAlign: 'center',
          color: '#fecaca'
        }}>
              {error}
            </div>}

          {!loading && viewerUrl && <iframe title={title} src={viewerUrl} style={{
          width: '100%',
          height: '100%',
          border: 0,
          background: '#fff'
        }} />}
        </div>
      </div>
    </div>;
}
