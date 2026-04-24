'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '@/lib/api';
import { Account, AccountGroup, CustomerGroup, ItemMaster, Salesperson } from '@/types';
import { Plus, X, AlertCircle, Loader2, Save } from 'lucide-react';

export interface AccountForm {
  id?: string;
  code: string;
  name: string;
  arabicName: string;
  accountGroupId: string;
  destination: string;
  address: string;
  road: string;
  place: string;
  route: string;
  subRoute: string;
  phone1: string;
  mobile1: string;
  mobile2: string;
  email: string;
  financeEmail: string;
  contactPerson: string;
  acContactPerson: string;
  acMobileNo: string;
  rep: string;
  rep2: string;
  repId: string;
  rep2Id: string;
  opBalance: string;
  opBalanceType: 'Credit' | 'Debit';
  narration: string;
  paymentTerms: string;
  trn: string;
  creditDays: string;
  creditInvoices: string;
  creditLimit: string;
  customerGroupId: string;
  deliveryAddress: string;
  subAccounts: { code: string; name: string }[];
}

export const emptyAccountForm = (): AccountForm => ({
  code: '', name: '', arabicName: '',
  accountGroupId: '',
  destination: '', address: '', road: '', place: '', route: '', subRoute: '',
  phone1: '', mobile1: '', mobile2: '',
  email: '', financeEmail: '',
  contactPerson: '', acContactPerson: '', acMobileNo: '',
  rep: '', rep2: '',
  repId: '', rep2Id: '',
  opBalance: '0', opBalanceType: 'Credit',
  narration: '', paymentTerms: '',
  trn: '',
  creditDays: '0', creditInvoices: '0', creditLimit: '0',
  customerGroupId: '',
  deliveryAddress: '',
  subAccounts: [],
});

export function accountToForm(a: Account): AccountForm {
  return {
    id: a.id,
    code: a.code,
    name: a.name,
    arabicName: a.arabicName ?? '',
    accountGroupId: a.accountGroupId,
    destination: a.destination ?? '',
    address: a.address ?? '',
    road: a.road ?? '',
    place: a.place ?? '',
    route: a.route ?? '',
    subRoute: a.subRoute ?? '',
    phone1: a.phone1 ?? '',
    mobile1: a.mobile1 ?? '',
    mobile2: a.mobile2 ?? '',
    email: a.email ?? '',
    financeEmail: a.financeEmail ?? '',
    contactPerson: a.contactPerson ?? '',
    acContactPerson: a.acContactPerson ?? '',
    acMobileNo: a.acMobileNo ?? '',
    rep: a.rep ?? '',
    rep2: a.rep2 ?? '',
    repId: a.repId ?? '',
    rep2Id: a.rep2Id ?? '',
    opBalance: String(a.opBalance),
    opBalanceType: a.opBalanceType,
    narration: a.narration ?? '',
    paymentTerms: a.paymentTerms ?? '',
    trn: a.trn ?? '',
    creditDays: String(a.creditDays),
    creditInvoices: String(a.creditInvoices),
    creditLimit: String(a.creditLimit),
    customerGroupId: a.customerGroupId ?? '',
    deliveryAddress: a.deliveryAddress ?? '',
    subAccounts: (a.subAccounts ?? []).map((s) => ({ code: s.code, name: s.name })),
  };
}

export function AccountMasterForm({
  initial,
  onClose,
  onSaved,
}: {
  initial: AccountForm;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<AccountForm>(initial);
  const [error, setError] = useState('');
  const isEdit = !!form.id;

  const { data: groups } = useQuery({
    queryKey: ['account-groups'],
    queryFn: () => api.get('/account-groups').then((r) => r.data.data as AccountGroup[]),
  });
  const { data: custGroups } = useQuery({
    queryKey: ['customer-groups'],
    queryFn: () => api.get('/customer-groups').then((r) => r.data.data as CustomerGroup[]),
  });
  const { data: items } = useQuery({
    queryKey: ['items-for-masters'],
    queryFn: () => api.get('/items?limit=500').then((r) => r.data.data as ItemMaster[]).catch(() => [] as ItemMaster[]),
  });
  const { data: salespersons } = useQuery({
    queryKey: ['salespersons-for-account'],
    queryFn: () =>
      api
        .get('/salespersons?limit=500&active=true')
        .then((r) => r.data.data as Salesperson[])
        .catch(() => [] as Salesperson[]),
  });

  useEffect(() => {
    if (!form.accountGroupId && groups && groups.length > 0) {
      const debtors = groups.find((g) => /SUNDRY DEBTORS/i.test(g.name)) ?? groups[0];
      setForm((f) => ({ ...f, accountGroupId: debtors.id }));
    }
  }, [groups, form.accountGroupId]);

  const handleItemPrefill = (id: string) => {
    if (!id) return;
    const it = (items ?? []).find((x) => x.id === id);
    if (!it) return;
    setForm((f) => ({
      ...f,
      code: it.code,
      name: it.name,
      mobile1: it.phone ?? f.mobile1,
    }));
  };

  const handleRepSelect = (id: string) => {
    if (!id) {
      setForm((f) => ({ ...f, repId: '', rep: '' }));
      return;
    }
    const sp = (salespersons ?? []).find((x) => x.id === id);
    setForm((f) => ({ ...f, repId: id, rep: sp ? sp.name : f.rep }));
  };

  const handleRep2Select = (id: string) => {
    if (!id) {
      setForm((f) => ({ ...f, rep2Id: '', rep2: '' }));
      return;
    }
    const sp = (salespersons ?? []).find((x) => x.id === id);
    setForm((f) => ({ ...f, rep2Id: id, rep2: sp ? sp.name : f.rep2 }));
  };

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        code: form.code,
        name: form.name,
        arabicName: form.arabicName || undefined,
        accountGroupId: form.accountGroupId,
        destination: form.destination || undefined,
        address: form.address || undefined,
        road: form.road || undefined,
        place: form.place || undefined,
        route: form.route || undefined,
        subRoute: form.subRoute || undefined,
        phone1: form.phone1 || undefined,
        mobile1: form.mobile1 || undefined,
        mobile2: form.mobile2 || undefined,
        email: form.email || undefined,
        financeEmail: form.financeEmail || undefined,
        contactPerson: form.contactPerson || undefined,
        acContactPerson: form.acContactPerson || undefined,
        acMobileNo: form.acMobileNo || undefined,
        rep: form.rep || undefined,
        rep2: form.rep2 || undefined,
        repId: form.repId || undefined,
        rep2Id: form.rep2Id || undefined,
        opBalance: parseFloat(form.opBalance) || 0,
        opBalanceType: form.opBalanceType,
        narration: form.narration || undefined,
        paymentTerms: form.paymentTerms || undefined,
        trn: form.trn || undefined,
        creditDays: parseInt(form.creditDays) || 0,
        creditInvoices: parseInt(form.creditInvoices) || 0,
        creditLimit: parseFloat(form.creditLimit) || 0,
        customerGroupId: form.customerGroupId || undefined,
        deliveryAddress: form.deliveryAddress || undefined,
        subAccounts: form.subAccounts.filter((s) => s.code && s.name),
      };
      return isEdit
        ? api.patch(`/accounts/${form.id}`, payload)
        : api.post('/accounts', payload);
    },
    onSuccess: () => { onSaved(); onClose(); },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      setError(err.response?.data?.message || 'Failed to save.');
    },
  });

  const set = (k: keyof AccountForm, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const setSub = (i: number, k: 'code' | 'name', v: string) =>
    setForm((f) => {
      const subs = [...f.subAccounts];
      subs[i] = { ...subs[i], [k]: v };
      return { ...f, subAccounts: subs };
    });
  const addSub = () => setForm((f) => ({ ...f, subAccounts: [...f.subAccounts, { code: '', name: '' }] }));
  const rmSub = (i: number) => setForm((f) => ({ ...f, subAccounts: f.subAccounts.filter((_, j) => j !== i) }));

  const inputCls = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy/20 focus:border-brand-navy';
  const labelCls = 'block text-xs font-semibold text-slate-600 mb-1';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900">
            {isEdit ? `Edit Account — ${form.code}` : 'New Account Master'}
          </h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
            </div>
          )}

          {/* Pre-fill from Item Master */}
          {!isEdit && (items ?? []).length > 0 && (
            <div className="bg-brand-navy/5 border border-brand-navy/20 rounded-xl p-4">
              <label className="text-xs font-semibold text-brand-navy uppercase tracking-wider mb-2 block">
                Pre-fill from Item Master
              </label>
              <select defaultValue="" onChange={(e) => handleItemPrefill(e.target.value)} className={inputCls}>
                <option value="">— Select an item —</option>
                {(items ?? []).map((it) => (
                  <option key={it.id} value={it.id}>
                    {it.code} · {it.name}{it.phone ? ` · ${it.phone}` : ''}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500 mt-1">Copies code, name, and phone (into Mobile 1) into the fields below.</p>
            </div>
          )}

          {/* Code / Name / Arabic */}
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-2">
              <label className={labelCls}>Code *</label>
              <input value={form.code} onChange={(e) => set('code', e.target.value)} className={inputCls} />
            </div>
            <div className="col-span-5">
              <label className={labelCls}>Name *</label>
              <input value={form.name} onChange={(e) => set('name', e.target.value)} className={inputCls} />
            </div>
            <div className="col-span-5">
              <label className={labelCls}>Arabic Name</label>
              <input value={form.arabicName} onChange={(e) => set('arabicName', e.target.value)}
                dir="rtl" className={inputCls} />
            </div>
          </div>

          {/* Account Group */}
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-6">
              <label className={labelCls}>Acc Group *</label>
              <select value={form.accountGroupId}
                onChange={(e) => set('accountGroupId', e.target.value)} className={inputCls}>
                <option value="">— Select —</option>
                {(groups ?? []).map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
            <div className="col-span-3">
              <label className={labelCls}>Destination</label>
              <input value={form.destination} onChange={(e) => set('destination', e.target.value)} className={inputCls} />
            </div>
            <div className="col-span-3">
              <label className={labelCls}>TRN</label>
              <input value={form.trn} onChange={(e) => set('trn', e.target.value)} className={inputCls} />
            </div>
          </div>

          {/* Address block */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Address</p>
              <div className="space-y-2">
                <div>
                  <label className={labelCls}>Address</label>
                  <input value={form.address} onChange={(e) => set('address', e.target.value)} className={inputCls} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={labelCls}>Road</label>
                    <input value={form.road} onChange={(e) => set('road', e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Place</label>
                    <input value={form.place} onChange={(e) => set('place', e.target.value)} className={inputCls} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={labelCls}>Route</label>
                    <input value={form.route} onChange={(e) => set('route', e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Sub-Route</label>
                    <input value={form.subRoute} onChange={(e) => set('subRoute', e.target.value)} className={inputCls} />
                  </div>
                </div>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Delivery Address</p>
              <textarea rows={8} value={form.deliveryAddress}
                onChange={(e) => set('deliveryAddress', e.target.value)}
                className={`${inputCls} resize-none`} />
            </div>
          </div>

          {/* Contact */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Contact</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>Phone 1</label>
                <input value={form.phone1} onChange={(e) => set('phone1', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Mobile 1 *</label>
                <input value={form.mobile1} onChange={(e) => set('mobile1', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Mobile 2</label>
                <input value={form.mobile2} onChange={(e) => set('mobile2', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Email *</label>
                <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Finance Email</label>
                <input type="email" value={form.financeEmail} onChange={(e) => set('financeEmail', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Contact Person</label>
                <input value={form.contactPerson} onChange={(e) => set('contactPerson', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>A/c Contact Person</label>
                <input value={form.acContactPerson} onChange={(e) => set('acContactPerson', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>A/c Mobile No</label>
                <input value={form.acMobileNo} onChange={(e) => set('acMobileNo', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Customer Group</label>
                <select value={form.customerGroupId}
                  onChange={(e) => set('customerGroupId', e.target.value)} className={inputCls}>
                  <option value="">— None —</option>
                  {(custGroups ?? []).map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Salesperson (REP) */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Salesperson (REP)</p>
              <a
                href="/admin/salesperson-master"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-brand-navy hover:text-brand-navy/70 font-semibold"
              >
                Manage Salespersons →
              </a>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>REP (Primary)</label>
                <select
                  value={form.repId}
                  onChange={(e) => handleRepSelect(e.target.value)}
                  className={inputCls}
                >
                  <option value="">— Select a salesperson —</option>
                  {(salespersons ?? []).map((sp) => (
                    <option key={sp.id} value={sp.id}>
                      {sp.code} · {sp.name}{sp.phone ? ` · ${sp.phone}` : ''}
                    </option>
                  ))}
                </select>
                <input
                  value={form.rep}
                  onChange={(e) => set('rep', e.target.value)}
                  placeholder="Or type rep name manually"
                  className={`${inputCls} mt-2`}
                />
              </div>
              <div>
                <label className={labelCls}>REP 2 (Secondary)</label>
                <select
                  value={form.rep2Id}
                  onChange={(e) => handleRep2Select(e.target.value)}
                  className={inputCls}
                >
                  <option value="">— Select a salesperson —</option>
                  {(salespersons ?? []).map((sp) => (
                    <option key={sp.id} value={sp.id}>
                      {sp.code} · {sp.name}{sp.phone ? ` · ${sp.phone}` : ''}
                    </option>
                  ))}
                </select>
                <input
                  value={form.rep2}
                  onChange={(e) => set('rep2', e.target.value)}
                  placeholder="Or type rep name manually"
                  className={`${inputCls} mt-2`}
                />
              </div>
            </div>
            {(salespersons ?? []).length === 0 && (
              <p className="text-xs text-slate-400 mt-2">
                No salespersons defined yet. Add them in the Salesperson Master first.
              </p>
            )}
          </div>

          {/* Financial */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Financial</p>
            <div className="grid grid-cols-4 gap-3">
              <div>
                <label className={labelCls}>Op Balance</label>
                <input type="number" step="0.01" value={form.opBalance}
                  onChange={(e) => set('opBalance', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Type</label>
                <select value={form.opBalanceType}
                  onChange={(e) => setForm({ ...form, opBalanceType: e.target.value as 'Credit' | 'Debit' })}
                  className={inputCls}>
                  <option value="Credit">Credit</option>
                  <option value="Debit">Debit</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Payment Terms</label>
                <input value={form.paymentTerms} onChange={(e) => set('paymentTerms', e.target.value)} className={inputCls} />
              </div>
              <div />
              <div>
                <label className={labelCls}>Credit Days</label>
                <input type="number" min="0" value={form.creditDays}
                  onChange={(e) => set('creditDays', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Credit Invoices</label>
                <input type="number" min="0" value={form.creditInvoices}
                  onChange={(e) => set('creditInvoices', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Credit Limit</label>
                <input type="number" step="0.01" value={form.creditLimit}
                  onChange={(e) => set('creditLimit', e.target.value)} className={inputCls} />
              </div>
            </div>
          </div>

          {/* Narration */}
          <div>
            <label className={labelCls}>Narration</label>
            <textarea rows={2} value={form.narration}
              onChange={(e) => set('narration', e.target.value)}
              className={`${inputCls} resize-none`} />
          </div>

          {/* Sub Accounts */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Sub Accounts / Contact Details</p>
              <button type="button" onClick={addSub}
                className="flex items-center gap-1.5 text-xs text-brand-navy hover:text-brand-navy/70 font-semibold">
                <Plus className="w-3.5 h-3.5" /> Add row
              </button>
            </div>
            {form.subAccounts.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No sub-accounts yet.</p>
            ) : (
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500 w-32">Code</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500">Sub Account</th>
                      <th className="w-10" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {form.subAccounts.map((s, i) => (
                      <tr key={i}>
                        <td className="px-2 py-1">
                          <input value={s.code} onChange={(e) => setSub(i, 'code', e.target.value)}
                            className="w-full border border-slate-200 rounded px-2 py-1 text-sm" />
                        </td>
                        <td className="px-2 py-1">
                          <input value={s.name} onChange={(e) => setSub(i, 'name', e.target.value)}
                            className="w-full border border-slate-200 rounded px-2 py-1 text-sm" />
                        </td>
                        <td className="px-2 py-1 text-right">
                          <button type="button" onClick={() => rmSub(i)}
                            className="p-1 text-slate-300 hover:text-red-500 rounded">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            {isEdit ? 'Updating existing account' : 'Creating new account'}
          </span>
          <div className="flex gap-3">
            <button onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50">
              Close (Esc)
            </button>
            <button onClick={() => mutation.mutate()}
              disabled={mutation.isPending || !form.code || !form.name || !form.accountGroupId}
              className="px-5 py-2 text-sm font-semibold bg-brand-navy text-white rounded-xl hover:bg-brand-navy/90 disabled:opacity-50 flex items-center gap-2">
              {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save (F12)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
