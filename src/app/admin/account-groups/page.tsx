'use client';

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import api from '@/lib/api';
import { AccountGroup, AccountGroupType, ItemMaster } from '@/types';
import { Plus, Trash2, Pencil, X, AlertCircle, Loader2, Save, Sparkles } from 'lucide-react';

const GROUP_TYPES: { value: AccountGroupType; label: string }[] = [
  { value: 'ASSET', label: 'Asset' },
  { value: 'LIABILITIES', label: 'Liabilities' },
  { value: 'PL', label: 'P & L A/c' },
  { value: 'TRADING', label: 'Trading A/c' },
];

type StandardGroup = { code: string; name: string; groupType: AccountGroupType; printOrder: number };

const STANDARD_GROUPS: StandardGroup[] = [
  { code: 'BRA',   name: 'BRANCH',             groupType: 'ASSET',       printOrder: 10 },
  { code: 'CAP',   name: 'CAPITAL',            groupType: 'LIABILITIES', printOrder: 20 },
  { code: 'CASH',  name: 'CASH ACCOUNT',       groupType: 'ASSET',       printOrder: 30 },
  { code: 'COS',   name: 'COST OF SALES',      groupType: 'TRADING',     printOrder: 40 },
  { code: 'CA',    name: 'CURRENT ASSET',      groupType: 'ASSET',       printOrder: 50 },
  { code: 'CL',    name: 'CURRENT LIABILITY',  groupType: 'LIABILITIES', printOrder: 60 },
  { code: 'DEP',   name: 'DEPOSITS',           groupType: 'ASSET',       printOrder: 70 },
  { code: 'DEX',   name: 'DIRECT EXPENSES',    groupType: 'PL',          printOrder: 80 },
  { code: 'EMP',   name: 'EMPLOYEES',          groupType: 'ASSET',       printOrder: 90 },
  { code: 'EQU',   name: 'EQUITY',             groupType: 'LIABILITIES', printOrder: 100 },
  { code: 'FA',    name: 'FIXED ASSETS',       groupType: 'ASSET',       printOrder: 110 },
  { code: 'INC',   name: 'INCOME',             groupType: 'PL',          printOrder: 120 },
  { code: 'IEX',   name: 'INDIRECT EXPENSES',  groupType: 'PL',          printOrder: 130 },
  { code: 'IIN',   name: 'INDIRECT INCOMES',   groupType: 'PL',          printOrder: 140 },
  { code: 'ITADV', name: 'IT-ADV',             groupType: 'ASSET',       printOrder: 150 },
  { code: 'LADV',  name: 'LOANS & ADV.',       groupType: 'ASSET',       printOrder: 160 },
  { code: 'LAA',   name: 'LOANS AND ADVANCES', groupType: 'ASSET',       printOrder: 170 },
  { code: 'OPS',   name: 'OP. STOCK',          groupType: 'TRADING',     printOrder: 180 },
  { code: 'OTH',   name: 'OTHERS',             groupType: 'ASSET',       printOrder: 190 },
  { code: 'RNT',   name: 'RENT',               groupType: 'PL',          printOrder: 200 },
  { code: 'SADV',  name: 'SALARY ADVANCE',     groupType: 'ASSET',       printOrder: 210 },
  { code: 'SAL',   name: 'SALES',              groupType: 'TRADING',     printOrder: 220 },
  { code: 'STAX',  name: 'SALES TAX',          groupType: 'LIABILITIES', printOrder: 230 },
  { code: 'SHP',   name: 'SHIPPER',            groupType: 'ASSET',       printOrder: 240 },
  { code: 'STF',   name: 'STAFF',              groupType: 'ASSET',       printOrder: 250 },
  { code: 'SCR',   name: 'SUNDRY CREDITORS',   groupType: 'LIABILITIES', printOrder: 260 },
  { code: 'SDR',   name: 'SUNDRY DEBTORS',     groupType: 'ASSET',       printOrder: 270 },
  { code: 'TRD',   name: 'TRADING',            groupType: 'TRADING',     printOrder: 280 },
  { code: 'VATP',  name: 'VAT PAYABLE',        groupType: 'LIABILITIES', printOrder: 290 },
  { code: 'VATR',  name: 'VAT RECEIVABLE',     groupType: 'ASSET',       printOrder: 300 },
];

interface FormState {
  id?: string;
  code: string;
  name: string;
  groupType: AccountGroupType;
  printOrder: string;
}

const emptyForm = (): FormState => ({
  code: '',
  name: '',
  groupType: 'ASSET',
  printOrder: '0',
});

function EditorModal({
  initial,
  onClose,
  onSaved,
}: {
  initial: FormState;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<FormState>(initial);
  const [error, setError] = useState('');
  const isEdit = !!form.id;

  // Item Master list — for pre-fill dropdown
  const { data: items } = useQuery({
    queryKey: ['items-for-masters'],
    queryFn: () => api.get('/items?limit=500').then((r) => r.data.data as ItemMaster[]).catch(() => [] as ItemMaster[]),
  });

  const handleItemPrefill = (id: string) => {
    if (!id) return;
    const it = (items ?? []).find((x) => x.id === id);
    if (!it) return;
    setForm((f) => ({ ...f, code: it.code, name: it.name }));
  };

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        code: form.code,
        name: form.name,
        groupType: form.groupType,
        printOrder: parseInt(form.printOrder) || 0,
      };
      return isEdit
        ? api.patch(`/account-groups/${form.id}`, payload)
        : api.post('/account-groups', payload);
    },
    onSuccess: () => { onSaved(); onClose(); },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      setError(err.response?.data?.message || 'Failed to save.');
    },
  });

  const inputCls = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy/20 focus:border-brand-navy';
  const labelCls = 'block text-xs font-semibold text-slate-600 mb-1';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900">
            {isEdit ? 'Edit Account Group' : 'New Account Group'}
          </h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
            </div>
          )}

          {!isEdit && (items ?? []).length > 0 && (
            <div className="bg-brand-navy/5 border border-brand-navy/20 rounded-lg p-3">
              <label className="text-xs font-semibold text-brand-navy uppercase tracking-wider mb-1 block">
                Pre-fill from Item Master
              </label>
              <select defaultValue="" onChange={(e) => handleItemPrefill(e.target.value)} className={inputCls}>
                <option value="">— Select an item —</option>
                {(items ?? []).map((it) => (
                  <option key={it.id} value={it.id}>
                    {it.code} · {it.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500 mt-1">Copies code + name into the fields below.</p>
            </div>
          )}

          <div>
            <label className={labelCls}>Code *</label>
            <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })}
              placeholder="022" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Name *</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="SUNDRY DEBTORS" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Group *</label>
            <select value={form.groupType}
              onChange={(e) => setForm({ ...form, groupType: e.target.value as AccountGroupType })}
              className={inputCls}>
              {GROUP_TYPES.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Print Order</label>
            <input type="number" min="0" value={form.printOrder}
              onChange={(e) => setForm({ ...form, printOrder: e.target.value })}
              className={inputCls} />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
          <button onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50">
            Close (Esc)
          </button>
          <button onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !form.code || !form.name}
            className="px-5 py-2 text-sm font-semibold bg-brand-navy text-white rounded-xl hover:bg-brand-navy/90 disabled:opacity-50 flex items-center gap-2">
            {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save (F12)
          </button>
        </div>
      </div>
    </div>
  );
}

const GROUP_LABEL: Record<AccountGroupType, string> = {
  ASSET: 'Asset',
  LIABILITIES: 'Liabilities',
  PL: 'P & L A/c',
  TRADING: 'Trading A/c',
};

export default function AccountGroupsPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<FormState | null>(null);
  const [picker, setPicker] = useState('');
  const [bulkError, setBulkError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['account-groups'],
    queryFn: () => api.get('/account-groups').then((r) => r.data.data as AccountGroup[]),
  });

  const groups = data ?? [];

  const missingStandard = useMemo(() => {
    const haveCode = new Set(groups.map((g) => g.code.toUpperCase()));
    const haveName = new Set(groups.map((g) => g.name.trim().toUpperCase()));
    return STANDARD_GROUPS.filter(
      (s) => !haveCode.has(s.code.toUpperCase()) && !haveName.has(s.name.toUpperCase()),
    );
  }, [groups]);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/account-groups/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['account-groups'] }),
  });

  const quickAddMutation = useMutation({
    mutationFn: (g: StandardGroup) => api.post('/account-groups', g),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['account-groups'] });
      setPicker('');
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      setBulkError(err.response?.data?.message || 'Failed to add group.');
    },
  });

  const bulkAddMutation = useMutation({
    mutationFn: async (toAdd: StandardGroup[]) => {
      for (const g of toAdd) {
        try {
          await api.post('/account-groups', g);
        } catch {
          // skip duplicates / errors and continue
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['account-groups'] });
      setBulkError('');
    },
    onError: () => setBulkError('Some groups failed to add. Refresh and retry.'),
  });

  const onSaved = () => queryClient.invalidateQueries({ queryKey: ['account-groups'] });

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Account Group Master</h1>
          <p className="page-subtitle">Categories like Sundry Debtors, Bank, Capital, etc.</p>
        </div>
        <button
          onClick={() => setEditing(emptyForm())}
          className="flex items-center gap-2 px-4 py-2 bg-brand-navy text-white rounded-xl text-sm font-semibold hover:bg-brand-navy/90"
        >
          <Plus className="w-4 h-4" /> New Group
        </button>
      </div>

      {missingStandard.length > 0 && (
        <div className="bg-brand-navy/5 border border-brand-navy/20 rounded-xl p-4 mb-5">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-brand-navy" />
            <p className="text-xs font-semibold text-brand-navy uppercase tracking-wider">
              Quick Add Standard Groups
            </p>
            <span className="text-xs text-slate-500">
              ({missingStandard.length} of {STANDARD_GROUPS.length} not yet added)
            </span>
          </div>
          <p className="text-xs text-slate-500 mb-3">
            Pre-defined groups (BRANCH, CAPITAL, SUNDRY DEBTORS, VAT PAYABLE…). Anything you add here
            instantly appears in the Acc Group dropdown on Account Master.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={picker}
              onChange={(e) => setPicker(e.target.value)}
              className="flex-1 min-w-[240px] border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy/20 bg-white"
            >
              <option value="">— Select a standard group to add —</option>
              {missingStandard.map((g) => (
                <option key={g.code} value={g.code}>
                  {g.name} · {GROUP_LABEL[g.groupType]}
                </option>
              ))}
            </select>
            <button
              onClick={() => {
                const g = STANDARD_GROUPS.find((x) => x.code === picker);
                if (g) quickAddMutation.mutate(g);
              }}
              disabled={!picker || quickAddMutation.isPending}
              className="px-4 py-2 text-sm font-semibold bg-brand-navy text-white rounded-lg hover:bg-brand-navy/90 disabled:opacity-50 flex items-center gap-2"
            >
              {quickAddMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Add
            </button>
            <button
              onClick={() => bulkAddMutation.mutate(missingStandard)}
              disabled={bulkAddMutation.isPending || missingStandard.length === 0}
              className="px-4 py-2 text-sm font-semibold border border-brand-navy text-brand-navy rounded-lg hover:bg-brand-navy/10 disabled:opacity-50 flex items-center gap-2"
              title={`Adds all ${missingStandard.length} missing standard groups`}
            >
              {bulkAddMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Add all missing ({missingStandard.length})
            </button>
          </div>
          {bulkError && (
            <div className="mt-2 flex items-center gap-2 text-xs text-red-700">
              <AlertCircle className="w-3.5 h-3.5" /> {bulkError}
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-brand-navy animate-spin" />
          </div>
        ) : groups.length === 0 ? (
          <div className="py-16 text-center text-slate-400">No account groups yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Code</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Account Group</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Group</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Print Order</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {groups.map((g) => (
                <tr key={g.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono font-semibold text-brand-navy">{g.code}</td>
                  <td className="px-4 py-3 font-semibold text-slate-800">{g.name}</td>
                  <td className="px-4 py-3 text-slate-600">{GROUP_LABEL[g.groupType]}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{g.printOrder}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => setEditing({
                          id: g.id, code: g.code, name: g.name,
                          groupType: g.groupType, printOrder: String(g.printOrder),
                        })}
                        className="p-1.5 text-slate-400 hover:text-brand-navy hover:bg-slate-100 rounded-lg"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => { if (confirm(`Delete ${g.name}?`)) deleteMutation.mutate(g.id); }}
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
        )}
      </div>

      {editing && (
        <EditorModal initial={editing} onClose={() => setEditing(null)} onSaved={onSaved} />
      )}
    </DashboardLayout>
  );
}
