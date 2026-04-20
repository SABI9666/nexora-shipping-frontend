'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import api from '@/lib/api';
import { Account } from '@/types';
import { Plus, Trash2, Pencil, Search, Loader2 } from 'lucide-react';
import {
  AccountMasterForm,
  emptyAccountForm,
  accountToForm,
  AccountForm,
} from './AccountMasterForm';

export default function AccountMasterPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<AccountForm | null>(null);
  const [search, setSearch] = useState('');
  const [lookupCode, setLookupCode] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['accounts', search],
    queryFn: () => {
      const params = new URLSearchParams({ limit: '100' });
      if (search) params.set('search', search);
      return api.get(`/accounts?${params}`).then((r) => r.data.data as Account[]);
    },
  });

  const accounts = data ?? [];

  // Auto-populate: when user enters a code, fetch full record and open editor
  const [autoLoading, setAutoLoading] = useState(false);
  useEffect(() => {
    if (!lookupCode || lookupCode.length < 2) return;
    const handle = setTimeout(async () => {
      setAutoLoading(true);
      try {
        const res = await api.get(`/accounts/by-code/${encodeURIComponent(lookupCode)}`);
        setEditing(accountToForm(res.data.data as Account));
        setLookupCode('');
      } catch {
        // not found — ignore
      } finally {
        setAutoLoading(false);
      }
    }, 500);
    return () => clearTimeout(handle);
  }, [lookupCode]);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/accounts/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['accounts'] }),
  });

  const onSaved = () => queryClient.invalidateQueries({ queryKey: ['accounts'] });

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Account Master</h1>
          <p className="page-subtitle">Full customer record — address, contacts, financial terms</p>
        </div>
        <button
          onClick={() => setEditing(emptyAccountForm())}
          className="flex items-center gap-2 px-4 py-2 bg-brand-navy text-white rounded-xl text-sm font-semibold hover:bg-brand-navy/90"
        >
          <Plus className="w-4 h-4" /> New Account
        </button>
      </div>

      {/* Auto-populate by code */}
      <div className="bg-brand-navy/5 border border-brand-navy/20 rounded-xl p-4 mb-5">
        <p className="text-xs font-semibold text-brand-navy uppercase tracking-wider mb-2">
          Load by Code (auto-populate)
        </p>
        <div className="flex items-center gap-2">
          <input
            value={lookupCode}
            onChange={(e) => setLookupCode(e.target.value)}
            placeholder="Type a code (e.g. 001) — record will open automatically"
            className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy/20"
          />
          {autoLoading && <Loader2 className="w-4 h-4 text-brand-navy animate-spin" />}
        </div>
      </div>

      <div className="flex mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search code, name, phone, mobile…"
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-navy/20"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-brand-navy animate-spin" />
          </div>
        ) : accounts.length === 0 ? (
          <div className="py-16 text-center text-slate-400">No accounts yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Code</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Group</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Mobile</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">TRN</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Credit Limit</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {accounts.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono font-semibold text-brand-navy">{a.code}</td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-800">{a.name}</p>
                      {a.email && <p className="text-xs text-slate-400 truncate">{a.email}</p>}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-slate-600">{a.accountGroup?.name ?? '—'}</td>
                    <td className="px-4 py-3 hidden sm:table-cell text-slate-600">{a.mobile1 ?? '—'}</td>
                    <td className="px-4 py-3 hidden lg:table-cell text-slate-600 font-mono text-xs">{a.trn ?? '—'}</td>
                    <td className="px-4 py-3 hidden lg:table-cell text-right text-slate-800">
                      {a.creditLimit ? a.creditLimit.toFixed(2) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => setEditing(accountToForm(a))}
                          className="p-1.5 text-slate-400 hover:text-brand-navy hover:bg-slate-100 rounded-lg"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => { if (confirm(`Delete ${a.name}?`)) deleteMutation.mutate(a.id); }}
                          disabled={deleteMutation.isPending}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && (
        <AccountMasterForm initial={editing} onClose={() => setEditing(null)} onSaved={onSaved} />
      )}
    </DashboardLayout>
  );
}
