import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
export default function Table({
  columns = [],
  data = [],
  loading = false,
  emptyMessage = 'No se encontraron registros.',
  onSort,
  sortKey,
  sortDir,
  caption
}) {
  const handleSort = key => {
    if (!onSort) return;
    const newDir = sortKey === key && sortDir === 'asc' ? 'desc' : 'asc';
    onSort(key, newDir);
  };
  return <div className="overflow-x-auto rounded-xl border border-slate-700/50 bg-slate-800/50">
      <table className="w-full text-sm" role="grid">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr className="border-b border-slate-700/50">
            {columns.map(col => <th key={col.key} scope="col" className={`
                  px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider
                  ${col.sortable ? 'cursor-pointer select-none hover:text-white' : ''}
                  ${col.className || ''}
                `} onClick={col.sortable ? () => handleSort(col.key) : undefined} aria-sort={col.sortable && sortKey === col.key ? sortDir === 'asc' ? 'ascending' : 'descending' : undefined}>
                <span className="flex items-center gap-1">
                  {col.label}
                  {col.sortable && <span className="text-slate-600" aria-hidden="true">
                      {sortKey === col.key ? sortDir === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} /> : <ChevronsUpDown size={14} />}
                    </span>}
                </span>
              </th>)}
          </tr>
        </thead>
        <tbody>
          {loading ? Array.from({
          length: 5
        }).map((_, i) => <tr key={i} className="border-b border-slate-700/30 animate-pulse">
                {columns.map(col => <td key={col.key} className="px-4 py-3">
                    <div className="h-4 bg-slate-700 rounded w-3/4" />
                  </td>)}
              </tr>) : data.length === 0 ? <tr>
              <td colSpan={columns.length} className="px-4 py-12 text-center text-slate-500">
                {emptyMessage}
              </td>
            </tr> : data.map((row, rowIdx) => <tr key={row.id || rowIdx} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors">
                {columns.map(col => <td key={col.key} className={`px-4 py-3 text-slate-300 ${col.className || ''}`}>
                    {col.render ? col.render(row[col.key], row) : row[col.key] ?? '—'}
                  </td>)}
              </tr>)}
        </tbody>
      </table>
    </div>;
}
