import { ChevronLeft, ChevronRight } from 'lucide-react';
export default function Pagination({
  total = 0,
  page = 1,
  limit = 10,
  onPageChange
}) {
  const totalPages = Math.ceil(total / limit);
  if (totalPages <= 1) return null;
  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);
  const pages = [];
  const delta = 2;
  for (let i = Math.max(1, page - delta); i <= Math.min(totalPages, page + delta); i++) {
    pages.push(i);
  }
  return <nav className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4" aria-label="Paginación">
      <p className="text-sm text-slate-400">
        Mostrando <span className="text-white font-medium">{start}–{end}</span> de{' '}
        <span className="text-white font-medium">{total}</span> registros
      </p>

      <div className="flex items-center gap-1">
        <button onClick={() => onPageChange(page - 1)} disabled={page === 1} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors" aria-label="Página anterior">
          <ChevronLeft size={16} />
        </button>

        {pages[0] > 1 && <>
            <PageBtn n={1} current={page} onClick={onPageChange} />
            {pages[0] > 2 && <span className="text-slate-500 px-1">…</span>}
          </>}

        {pages.map(n => <PageBtn key={n} n={n} current={page} onClick={onPageChange} />)}

        {pages[pages.length - 1] < totalPages && <>
            {pages[pages.length - 1] < totalPages - 1 && <span className="text-slate-500 px-1">…</span>}
            <PageBtn n={totalPages} current={page} onClick={onPageChange} />
          </>}

        <button onClick={() => onPageChange(page + 1)} disabled={page === totalPages} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors" aria-label="Página siguiente">
          <ChevronRight size={16} />
        </button>
      </div>
    </nav>;
}
function PageBtn({
  n,
  current,
  onClick
}) {
  const isActive = n === current;
  return <button onClick={() => onClick(n)} aria-current={isActive ? 'page' : undefined} className={`
        w-8 h-8 rounded-lg text-sm font-medium transition-colors
        ${isActive ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'}
      `}>
      {n}
    </button>;
}
