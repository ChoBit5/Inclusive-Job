import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
export default function Modal({
  open,
  onClose,
  title,
  size = 'md',
  children
}) {
  const dialogRef = useRef(null);
  useEffect(() => {
    if (open) {
      dialogRef.current?.focus();
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);
  useEffect(() => {
    const handler = e => {
      if (e.key === 'Escape') onClose();
    };
    if (open) window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);
  if (!open) return null;
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl'
  };
  return <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />

      
      <div ref={dialogRef} tabIndex={-1} className={`
          relative w-full ${sizeClasses[size]}
          bg-slate-800 border border-slate-700/50 rounded-2xl
          shadow-2xl shadow-black/50
          outline-none
          animate-in fade-in slide-in-from-bottom-4 duration-200
        `}>
        
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50">
          <h2 id="modal-title" className="text-white font-semibold text-lg">
            {title}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700 transition-colors" aria-label="Cerrar modal">
            <X size={18} />
          </button>
        </div>

        
        <div className="px-6 py-4">
          {children}
        </div>
      </div>
    </div>;
}
export function ModalFooter({
  children
}) {
  return <div className="flex justify-end gap-3 pt-4 border-t border-slate-700/50 mt-4">
      {children}
    </div>;
}
