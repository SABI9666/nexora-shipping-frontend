'use client';

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import api from '@/lib/api';
import { ChargeItem } from '@/types';
import { Plus, Trash2, Pencil, X, AlertCircle, Loader2, Save, Search, Sparkles } from 'lucide-react';

interface FormState {
  id?: string;
  code: string;
  name: string;
  description: string;
  defaultRate: string;
}

const emptyForm = (): FormState => ({ code: '', name: '', description: '', defaultRate: '' });

const STANDARD_CHARGE_ITEMS: { code: string; name: string }[] = [
  { code: '001', name: 'FREIGHT CHARGES' },
  { code: '002', name: 'DOOR TO DOOR CHARGES' },
  { code: '003', name: 'DOCUMENTATION CHARGES' },
  { code: '004', name: 'SERVICE CHARGES' },
  { code: '005', name: 'TRANSPORTATION CHARGES' },
  { code: '006', name: 'LICENSE USAGE CHARGES' },
  { code: '007', name: 'BILL OF ENTRY CHARGES' },
  { code: '008', name: 'TERMINAL HANDLING CHARGES' },
  { code: '009', name: 'TLUC' },
  { code: '010', name: 'DPC' },
  { code: '011', name: 'CUSTOMS DUTY' },
  { code: '012', name: 'SHIPMENT VAT' },
  { code: '013', name: 'DELIVERY ORDER CHARGES' },
  { code: '014', name: 'WAREHOUSE HANDLING CHARGES' },
  { code: '015', name: 'EDAS ATTESTATION' },
  { code: '016', name: 'MISSING DOCUMENTS CHARGES' },
  { code: '017', name: 'GATE PASS' },
  { code: '018', name: 'CLAIM SUBMISSION' },
  { code: '019', name: 'STORAGE CHARGES' },
  { code: '020', name: 'PACKING CHARGES' },
  { code: '021', name: 'AIR FREIGHT CHARGES' },
  { code: '022', name: 'COMMISSION' },
  { code: '023', name: 'INDIVIDUAL PASS' },
  { code: '024', name: 'AE CODE REGISTRATION/RENEWAL' },
  { code: '025', name: 'FINAL STAMP' },
  { code: '026', name: 'INSPECTION CHARGES' },
  { code: '027', name: 'LOADING AND UNLOADING' },
  { code: '028', name: 'LABOUR CHARGES' },
  { code: '029', name: 'FREIGHT CHARGE' },
  { code: '030', name: 'SURRENDER BL FEE' },
  { code: '031', name: 'AMENDMENT CHARGES BL' },
  { code: '032', name: 'EJARI' },
  { code: '033', name: 'CERTIFICATE OF ORIGIN' },
  { code: '034', name: 'EXIT PAPER' },
  { code: '035', name: 'CLEARANCE CHARGES' },
  { code: '036', name: 'TOKEN AND VGM' },
  { code: '037', name: 'BORDER CLEARANCE-BATHAH' },
  { code: '038', name: 'BORDER CLEARANCE-SILA' },
  { code: '039', name: 'EX-WORK' },
  { code: '040', name: 'INSURANCE' },
  { code: '041', name: 'LOCAL CHARGES' },
  { code: '042', name: 'BILL OF LADING' },
  { code: '043', name: 'DETENTION CHARGES' },
  { code: '044', name: 'CROSS STUFFING CHARGES' },
  { code: '045', name: 'BONDED CLEARANCE' },
  { code: '046', name: 'BONDED CLEARANCE CHARGES' },
  { code: '047', name: 'ATLP IMPORT REQUEST FEE' },
  { code: '048', name: 'ZAD CHARGES' },
  { code: '049', name: 'VAT PAYMENT SERVICE CHARGES' },
  { code: '050', name: 'DESTINATION CHARGES' },
  { code: '051', name: 'DDO CHARGES' },
  { code: '052', name: 'CONTAINER REPAIR' },
  { code: '053', name: 'CUSTOM CHARGES' },
  { code: '054', name: 'PCFC CHARGES' },
  { code: '055', name: 'TOLL' },
  { code: '056', name: 'EXIT/ENTRY' },
  { code: '057', name: 'CUSTOMS DEPOSIT' },
  { code: '058', name: 'CONTAINER WASHING CHARGES' },
  { code: '059', name: 'SWITCH BL CHARGES' },
  { code: '060', name: 'PORT STORAGE CHARGES' },
  { code: '061', name: 'DO EXTENSION CHARGES' },
  { code: '062', name: 'AMENDMENT CHARGE' },
  { code: '063', name: 'B/L EXCHANGE FEE' },
  { code: '064', name: 'TOKEN CANCELLATION CHARGE' },
  { code: '065', name: 'FORKLIFT CHARGES' },
  { code: '066', name: 'CONTAINER PASSING CHARGE' },
  { code: '067', name: 'WAITING CHARGE' },
  { code: '068', name: 'WAITING CHARGE (HDMU2460650)' },
  { code: '069', name: 'WAITING CHARGE (CNID1153467)' },
  { code: '070', name: 'WAITING CHARGE (UESU2446176)' },
];

function nextItemCode(existing: ChargeItem[]): string {
  const nums = existing
    .map((it) => /^(\d+)$/.exec(it.code)?.[1])
    .filter((s): s is string => !!s)
    .map((s) => parseInt(s, 10));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return String(next).padStart(3, '0');
}

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

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        code: form.code,
        name: form.name,
        description: form.description || undefined,
        defaultRate: form.defaultRate ? parseFloat(form.defaultRate) : undefined,
      };
      return isEdit ? api.patch(`/charge-items/${form.id}`, payload) : api.post('/charge-items', payload);
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
            {isEdit ? 'Edit Item' : 'New Item'}
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
          <div>
            <label className={labelCls}>Code *</label>
            <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })}
              placeholder="001" className={inputCls} />
            {!isEdit && (
              <p className="text-xs text-slate-400 mt-1">Auto-suggested — edit if needed.</p>
            )}
          </div>
          <div>
            <label className={labelCls}>Name *</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="FREIGHT CHARGES" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Default Rate</label>
            <input type="number" step="0.01" min="0" value={form.defaultRate}
              onChange={(e) => setForm({ ...form, defaultRate: e.target.value })}
              placeholder="Optional" className={inputCls} />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
          <button onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50">
            Cancel
          </button>
          <button onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !form.code || !form.name}
            className="px-5 py-2 text-sm font-semibold bg-brand-navy text-white rounded-xl hover:bg-brand-navy/90 disabled:opacity-50 flex items-center gap-2">
            {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ChargeItemMasterPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<FormState | null>(null);
  const [search, setSearch] = useState('');
  const [picker, setPicker] = useState('');
  const [bulkError, setBulkError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['charge-items', search],
    queryFn: () => {
      const params = new URLSearchParams({ limit: '500' });
      if (search) params.set('search', search);
      return api.get(`/charge-items?${params}`).then((r) => r.data.data as ChargeItem[]);
    },
  });

  const { data: allForCode } = useQuery({
    queryKey: ['charge-items-all'],
    queryFn: () => api.get('/charge-items?limit=1000').then((r) => r.data.data as ChargeItem[]),
  });

  const items = data ?? [];

  const missingStandard = useMemo(() => {
    const haveCode = new Set((allForCode ?? []).map((i) => i.code));
    const haveName = new Set((allForCode ?? []).map((i) => i.name.trim().toUpperCase()));
    return STANDARD_CHARGE_ITEMS.filter((s) => !haveCode.has(s.code) && !haveName.has(s.name.toUpperCase()));
  }, [allForCode]);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/charge-items/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['charge-items'] });
      queryClient.invalidateQueries({ queryKey: ['charge-items-all'] });
    },
  });

  const quickAddMutation = useMutation({
    mutationFn: (i: { code: string; name: string }) => api.post('/charge-items', i),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['charge-items'] });
      queryClient.invalidateQueries({ queryKey: ['charge-items-all'] });
      setPicker('');
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      setBulkError(err.response?.data?.message || 'Failed to add.');
    },
  });

  const bulkAddMutation = useMutation({
    mutationFn: async (toAdd: { code: string; name: string }[]) => {
      for (const i of toAdd) {
        try { await api.post('/charge-items', i); } catch { /* skip */ }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['charge-items'] });
      queryClient.invalidateQueries({ queryKey: ['charge-items-all'] });
      setBulkError('');
    },
    onError: () => setBulkError('Some items failed to add. Refresh and retry.'),
  });

  const onSaved = () => {
    queryClient.invalidateQueries({ queryKey: ['charge-items'] });
    queryClient.invalidateQueries({ queryKey: ['charge-items-all'] });
  };

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Item Master</h1>
          <p className="page-subtitle">Standard line items used in invoices &amp; quotations</p>
        </div>
        <button
          onClick={() => setEditing({ ...emptyForm(), code: nextItemCode(allForCode ?? items) })}
          className="flex items-center gap-2 px-4 py-2 bg-brand-navy text-white rounded-xl text-sm font-semibold hover:bg-brand-navy/90"
        >
          <Plus className="w-4 h-4" /> New Item
        </button>
      </div>

      {missingStandard.length > 0 && (
        <div className="bg-brand-navy/5 border border-brand-navy/20 rounded-xl p-4 mb-5">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-brand-navy" />
            <p className="text-xs font-semibold text-brand-navy uppercase tracking-wider">
              Quick Add Standard Items
            </p>
            <span className="text-xs text-slate-500">
              ({missingStandard.length} of {STANDARD_CHARGE_ITEMS.length} not yet added)
            </span>
          </div>
          <p className="text-xs text-slate-500 mb-3">
            Pre-defined charges (FREIGHT, GATE PASS, INSURANCE, …). Anything you add here appears as
            autocomplete in invoice and quotation line items.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={picker}
              onChange={(e) => setPicker(e.target.value)}
              className="flex-1 min-w-[240px] border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy/20 bg-white"
            >
              <option value="">— Select a standard item to add —</option>
              {missingStandard.map((g) => (
                <option key={g.code} value={g.code}>
                  {g.code} · {g.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => {
                const i = STANDARD_CHARGE_ITEMS.find((x) => x.code === picker);
                if (i) quickAddMutation.mutate(i);
              }}
              disabled={!picker || quickAddMutation.isPending}
              className="px-4 py-2 text-sm font-semibold bg-brand-navy text-white rounded-lg hover:bg-brand-navy/90 disabled:opacity-50 flex items-center gap-2"
            >
              {quickAddMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Add
            </button>
            <button
              onClick={() => bulkAddMutation.mutate(missingStandard)}
              disabled={bulkAddMutation.isPending}
              className="px-4 py-2 text-sm font-semibold border border-brand-navy text-brand-navy rounded-lg hover:bg-brand-navy/10 disabled:opacity-50 flex items-center gap-2"
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

      <div className="flex mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search code, name…"
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-navy/20"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-brand-navy animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center text-slate-400">No items yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Code</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Default Rate</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((it) => (
                <tr key={it.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono font-semibold text-brand-navy">{it.code}</td>
                  <td className="px-4 py-3 font-semibold text-slate-800">{it.name}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{it.defaultRate ? it.defaultRate.toFixed(2) : '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => setEditing({
                          id: it.id, code: it.code, name: it.name,
                          description: it.description ?? '',
                          defaultRate: it.defaultRate != null ? String(it.defaultRate) : '',
                        })}
                        className="p-1.5 text-slate-400 hover:text-brand-navy hover:bg-slate-100 rounded-lg"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => { if (confirm(`Delete ${it.name}?`)) deleteMutation.mutate(it.id); }}
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
