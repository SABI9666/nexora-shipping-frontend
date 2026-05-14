'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import api from '@/lib/api';
import { BankAccount } from '@/types';
import { Plus, Trash2, Pencil, X, AlertCircle, Loader2, Save, Star } from 'lucide-react';

interface FormState {
  id?: string;
  label: string;
  bankName: string;
  bankAddress: string;
  accountName: string;
  accountNumber: string;
  iban: string;
  swiftCode: string;
  currency: string;
  companyTrn: string;
  isDefault: boolean;
}

const empty = (): FormState => ({
  label: '', bankName: '', bankAddress: '', accountName: '',
  accountNumber: '', iban: '', swiftCode: '', currency: 'AED',
  companyTrn: '', isDefault: false,
});

function EditorModal({
  initial, onClose, onSaved,
}: { initial: FormState; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<FormState>(initial);
  const [error, setError] = useState('');
  const isEdit = !!form.id;

  const mutation = useMutation({
    mutationFn: () => {
      const payload = { ...form, bankAddress: form.bankAddress || undefined,
        iban: form.iban || undefined, swiftCode: form.swiftCode || undefined,
        currency: form.currency || undefined,
        companyTrn: form.companyTrn || undefined };
      return isEdit ? api.patch(`/bank-accounts/${form.id}`, payload)
                    : api.post('/bank-accounts', payload);
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
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900">
            {isEdit ? 'Edit Bank Account' : 'New Bank Account'}
          </h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-3">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
            </div>
          )}
          <div>
            <label className={labelCls}>Label * <span className="text-slate-400 font-normal">(shown in dropdown)</span></label>
            <input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })}
              placeholder="ADCB AED — Nexora Shipping LLC" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Bank Name *</label>
              <input value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                placeholder="Abu Dhabi Commercial Bank PJSC" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Bank Address</label>
              <input value={form.bankAddress} onChange={(e) => setForm({ ...form, bankAddress: e.target.value })}
                placeholder="AL RIGGAH ROAD" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Account Name *</label>
              <input value={form.accountName} onChange={(e) => setForm({ ...form, accountName: e.target.value })}
                placeholder="NEXORA SHIPPING LLC" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Account Number *</label>
              <input value={form.accountNumber} onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
                placeholder="14505966920001" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>IBAN</label>
              <input value={form.iban} onChange={(e) => setForm({ ...form, iban: e.target.value })}
                placeholder="AE060030014505966920001" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Swift Code</label>
              <input value={form.swiftCode} onChange={(e) => setForm({ ...form, swiftCode: e.target.value })}
                placeholder="ADCBAEAA" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Currency</label>
              <input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })}
                placeholder="AED" maxLength={3} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Company TRN</label>
              <input value={form.companyTrn} onChange={(e) => setForm({ ...form, companyTrn: e.target.value })}
                placeholder="105413106300003" className={inputCls} />
            </div>
            <div className="col-span-2 flex items-end">
              <label className="flex items-center gap-2 text-sm text-slate-700 select-none">
                <input type="checkbox" checked={form.isDefault}
                  onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} />
                Set as default
              </label>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
          <button onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50">
            Cancel
          </button>
          <button onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !form.label || !form.bankName || !form.accountName || !form.accountNumber}
            className="px-5 py-2 text-sm font-semibold bg-brand-navy text-white rounded-xl hover:bg-brand-navy/90 disabled:opacity-50 flex items-center gap-2">
            {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BankAccountsPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<FormState | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['bank-accounts'],
    queryFn: () => api.get('/bank-accounts').then((r) => r.data.data as BankAccount[]),
  });

  const accounts = data ?? [];

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/bank-accounts/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bank-accounts'] }),
  });

  const onSaved = () => queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Bank Accounts</h1>
          <p className="page-subtitle">Used as the Bank Details block on every invoice</p>
        </div>
        <button onClick={() => setEditing(empty())}
          className="flex items-center gap-2 px-4 py-2 bg-brand-navy text-white rounded-xl text-sm font-semibold hover:bg-brand-navy/90">
          <Plus className="w-4 h-4" /> New Bank Account
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-brand-navy animate-spin" />
          </div>
        ) : accounts.length === 0 ? (
          <div className="py-16 text-center text-slate-400">No bank accounts yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Label</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Bank</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Account No.</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">IBAN</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Default</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {accounts.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-brand-navy">{b.label}</td>
                  <td className="px-4 py-3 text-slate-700">{b.bankName}</td>
                  <td className="px-4 py-3 text-slate-600 font-mono text-xs">{b.accountNumber}</td>
                  <td className="px-4 py-3 text-slate-600 font-mono text-xs">{b.iban ?? '—'}</td>
                  <td className="px-4 py-3 text-center">
                    {b.isDefault && <Star className="w-4 h-4 text-amber-500 inline" fill="currentColor" />}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => setEditing({
                          id: b.id, label: b.label, bankName: b.bankName,
                          bankAddress: b.bankAddress ?? '', accountName: b.accountName,
                          accountNumber: b.accountNumber, iban: b.iban ?? '',
                          swiftCode: b.swiftCode ?? '', currency: b.currency ?? '',
                          companyTrn: b.companyTrn ?? '', isDefault: b.isDefault,
                        })}
                        className="p-1.5 text-slate-400 hover:text-brand-navy hover:bg-slate-100 rounded-lg"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => { if (confirm(`Delete ${b.label}?`)) deleteMutation.mutate(b.id); }}
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
