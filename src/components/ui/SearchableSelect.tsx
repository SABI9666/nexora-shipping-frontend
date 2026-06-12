'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, ChevronDown } from 'lucide-react';

export interface SearchableOption {
  id: string;
  /** Main display text, e.g. "NECU-003 · ORYX CV SOLUTION LLC FZ". */
  label: string;
  /** Dimmed hint shown right-aligned in the list (group, phone, status…). */
  sublabel?: string | null;
  /** Extra text matched by the search filter (e.g. phone, TRN). */
  search?: string | null;
}

interface Props {
  value: string;
  options: SearchableOption[];
  placeholder: string;
  onChange: (id: string) => void;
  /** Text of the optional "none" entry pinned to the top, e.g. "— Select order —". Omit to hide. */
  clearLabel?: string;
  /** Shown when options is empty (e.g. "No accounts yet — add one in Account Master."). */
  emptyHint?: string;
  className?: string;
  disabled?: boolean;
}

// Searchable replacement for native <select> on master-data lists
// (accounts, orders, invoices, items, salespersons). Click to open,
// type to filter on label + sublabel + search text, click outside to
// dismiss. Short bounded enums (status, currency…) should stay native.
export function SearchableSelect({
  value, options, placeholder, onChange,
  clearLabel, emptyHint = 'No entries.', className = '', disabled = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) =>
      o.label.toLowerCase().includes(q) ||
      (o.sublabel || '').toLowerCase().includes(q) ||
      (o.search || '').toLowerCase().includes(q),
    );
  }, [options, query]);

  const selected = options.find((o) => o.id === value) || null;

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button type="button" disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-left flex items-center justify-between gap-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-navy/20 focus:border-brand-navy disabled:bg-slate-50 disabled:text-slate-400">
        <span className="truncate">
          {selected
            ? <span className="text-slate-800">{selected.label}</span>
            : <span className="text-slate-400">{placeholder}</span>}
        </span>
        <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
      </button>
      {open && (
        <div className="absolute z-40 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg">
          <div className="relative p-2 border-b border-slate-100">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input ref={inputRef} value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type to search…"
              className="w-full pl-7 pr-2 py-1.5 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-brand-navy/20 focus:border-brand-navy" />
          </div>
          <div className="max-h-64 overflow-y-auto">
            {clearLabel !== undefined && (
              <button type="button"
                onClick={() => { onChange(''); setOpen(false); }}
                className="w-full text-left px-3 py-2 text-xs text-slate-500 italic hover:bg-slate-50 border-b border-slate-100">
                {clearLabel}
              </button>
            )}
            {options.length === 0 ? (
              <div className="p-3 text-xs text-slate-400">{emptyHint}</div>
            ) : filtered.length === 0 ? (
              <div className="p-3 text-xs text-slate-400">No matches.</div>
            ) : (
              filtered.map((o) => (
                <button key={o.id} type="button"
                  onClick={() => { onChange(o.id); setOpen(false); }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-brand-navy/5 ${o.id === value ? 'bg-brand-navy/10' : ''}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate text-slate-800">{o.label}</span>
                    {o.sublabel ? (
                      <span className="text-[11px] text-slate-400 flex-shrink-0">{o.sublabel}</span>
                    ) : null}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
