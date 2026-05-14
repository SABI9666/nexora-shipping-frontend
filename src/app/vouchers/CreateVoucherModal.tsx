'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, Upload, Loader2, FileText, ArrowUpRight, ArrowDownRight, Building2, Wallet } from 'lucide-react';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import {
  Voucher, VoucherType, VoucherDirection, VoucherReferenceType,
  Invoice, Order, VoucherReferenceValue, Account, AccountGroupType,
} from '@/types';
import {
  VOUCHER_TYPE_LABEL, VOUCHER_PARTY_LABEL,
  VOUCHER_PARTY_FILTER, VOUCHER_CONTRA_FILTER, VOUCHER_SHOWS_CONTRA,
} from './constants';

const DEFAULT_DIRECTION: Record<VoucherType, VoucherDirection> = {
  CASH: 'CREDIT',
  PURCHASE: 'DEBIT',
  PAYMENT: 'DEBIT',
  BANK: 'CREDIT',
  JOURNAL: 'DEBIT',
  RECEIPT: 'CREDIT',
  SUPPLIER_PAYMENT: 'DEBIT',
  CREDIT_NOTE: 'CREDIT',
  DEBIT_NOTE: 'DEBIT',
};

interface Props {
  onClose: () => void;
  onSuccess: (voucher: Voucher) => void;
}

function filterAccounts(accounts: Account[], groupTypes: AccountGroupType[] | null, search: string): Account[] {
  const q = search.trim().toLowerCase();
  return accounts.filter((a) => {
    if (groupTypes && a.accountGroup && !groupTypes.includes(a.accountGroup.groupType)) return false;
    if (!q) return true;
    return (
      a.code.toLowerCase().includes(q) ||
      a.name.toLowerCase().includes(q) ||
      (a.mobile1 || '').toLowerCase().includes(q) ||
      (a.trn || '').toLowerCase().includes(q)
    );
  });
}

function AccountPicker({
  label, icon, accounts, groupTypes, value, onChange, placeholder,
}: {
  label: string;
  icon: React.ReactNode;
  accounts: Account[];
  groupTypes: AccountGroupType[] | null;
  value: string;
  onChange: (id: string) => void;
  placeholder: string;
}) {
  const [search, setSearch] = useState('');
  const [showAll, setShowAll] = useState(false);
  const filtered = filterAccounts(accounts, showAll ? null : groupTypes, search).slice(0, 50);
  const selected = accounts.find((a) => a.id === value) || null;

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
          {icon}
          {label}
        </label>
        {groupTypes && (
          <button
            type="button"
            onClick={() => setShowAll((s) => !s)}
            className="text-[11px] text-slate-400 hover:text-brand-navy"
          >
            {showAll ? 'Filter by group' : 'Show all accounts'}
          </button>
        )}
      </div>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={`Search ${placeholder}…`}
        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-navy/20 mb-1.5"
      />
      {selected && (
        <div className="flex items-center justify-between gap-2 mb-1.5 px-3 py-2 bg-brand-navy/5 border border-brand-navy/10 rounded-xl text-sm">
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-brand-navy truncate">{selected.code} · {selected.name}</div>
            <div className="text-xs text-slate-500 truncate">
              {selected.accountGroup?.name || '—'}
              {selected.mobile1 ? `  ·  ${selected.mobile1}` : ''}
              {selected.trn ? `  ·  TRN ${selected.trn}` : ''}
            </div>
          </div>
          <button type="button" onClick={() => onChange('')} className="text-slate-400 hover:text-rose-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      <div className="max-h-44 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
        {filtered.length === 0 ? (
          <div className="p-3 text-xs text-slate-400">
            {accounts.length === 0
              ? 'No accounts yet — add one in Account Master.'
              : 'No matching accounts. Try “Show all accounts”.'}
          </div>
        ) : (
          filtered.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => { onChange(a.id); setSearch(''); }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-brand-navy/5 ${
                a.id === value ? 'bg-brand-navy/10' : ''
              }`}
            >
              <div className="font-semibold text-slate-800 truncate">{a.code} · {a.name}</div>
              <div className="text-xs text-slate-400 truncate">
                {a.accountGroup?.name || '—'}
                {a.mobile1 ? `  ·  ${a.mobile1}` : ''}
                {a.trn ? `  ·  TRN ${a.trn}` : ''}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

export function CreateVoucherModal({ onClose, onSuccess }: Props) {
  const [type, setType] = useState<VoucherType>('RECEIPT');
  const [direction, setDirection] = useState<VoucherDirection>(DEFAULT_DIRECTION['RECEIPT']);
  const [voucherDate, setVoucherDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [referenceType, setReferenceType] = useState<VoucherReferenceType>('NONE');
  const [invoiceId, setInvoiceId] = useState('');
  const [orderId, setOrderId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [contraAccountId, setContraAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('AED');
  const [partyName, setPartyName] = useState('');
  const [narration, setNarration] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDirection(DEFAULT_DIRECTION[type]);
  }, [type]);

  const { data: accountList } = useQuery({
    queryKey: ['vouchers-accounts'],
    queryFn: () =>
      api.get('/accounts?limit=1000').then((r) => r.data).catch(() => ({ data: [] })),
  });
  const accounts: Account[] = accountList?.data ?? [];

  const { data: invoiceList } = useQuery({
    queryKey: ['vouchers-invoice-options'],
    enabled: referenceType === 'INVOICE',
    queryFn: () => api.get('/invoices?limit=200').then((r) => r.data),
  });

  const { data: orderList } = useQuery({
    queryKey: ['vouchers-order-options'],
    enabled: referenceType === 'ORDER',
    queryFn: () => api.get('/orders?limit=200').then((r) => r.data),
  });

  const invoices: Invoice[] = invoiceList?.data ?? [];
  const orders: Order[] = orderList?.data ?? [];

  const { data: referenceData, isFetching: refLoading } = useQuery({
    queryKey: ['voucher-reference', referenceType, invoiceId, orderId],
    enabled:
      (referenceType === 'INVOICE' && !!invoiceId) ||
      (referenceType === 'ORDER' && !!orderId),
    queryFn: () => {
      const id = referenceType === 'INVOICE' ? invoiceId : orderId;
      return api
        .get(`/vouchers/reference?type=${referenceType}&id=${id}`)
        .then((r) => r.data);
    },
  });

  const ref: VoucherReferenceValue | undefined = referenceData?.data;

  useEffect(() => {
    if (ref) {
      setCurrency(ref.currency || 'AED');
      if (!partyName && ref.reference.party) setPartyName(ref.reference.party);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref?.reference.id]);

  const projected = useMemo(() => {
    if (!ref) return null;
    const amt = parseFloat(amount) || 0;
    if (!amt) return ref.outstanding;
    return direction === 'CREDIT' ? ref.outstanding - amt : ref.outstanding + amt;
  }, [ref, amount, direction]);

  const partyLabel = VOUCHER_PARTY_LABEL[type];
  const partyFilter = VOUCHER_PARTY_FILTER[type];
  const contraFilter = VOUCHER_CONTRA_FILTER[type];
  const showsContra = VOUCHER_SHOWS_CONTRA[type];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      setError('Enter a valid amount greater than zero.');
      return;
    }
    if (referenceType === 'INVOICE' && !invoiceId) {
      setError('Select an invoice.');
      return;
    }
    if (referenceType === 'ORDER' && !orderId) {
      setError('Select an order.');
      return;
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('type', type);
      fd.append('direction', direction);
      fd.append('voucherDate', voucherDate);
      fd.append('amount', String(amt));
      fd.append('currency', currency);
      fd.append('referenceType', referenceType);
      if (referenceType === 'INVOICE') fd.append('invoiceId', invoiceId);
      if (referenceType === 'ORDER') fd.append('orderId', orderId);
      if (accountId) fd.append('accountId', accountId);
      if (contraAccountId) fd.append('contraAccountId', contraAccountId);
      if (partyName) fd.append('partyName', partyName);
      if (narration) fd.append('narration', narration);
      if (file) fd.append('file', file);

      const res = await api.post('/vouchers', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onSuccess(res.data.data);
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } }; message?: string }).response?.data?.message ||
        (err as { message?: string }).message ||
        'Failed to save voucher';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <form
        onSubmit={handleSubmit}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">New Voucher</h2>
            <p className="text-xs text-slate-400 mt-0.5">Pick the voucher type — the party picker filters to suppliers or customers automatically.</p>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Voucher Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as VoucherType)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-navy/20"
              >
                {(Object.keys(VOUCHER_TYPE_LABEL) as VoucherType[]).map((t) => (
                  <option key={t} value={t}>{VOUCHER_TYPE_LABEL[t]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Direction</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDirection('CREDIT')}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold border ${
                    direction === 'CREDIT'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                      : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <ArrowDownRight className="w-4 h-4" /> Credit (deduct)
                </button>
                <button
                  type="button"
                  onClick={() => setDirection('DEBIT')}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold border ${
                    direction === 'DEBIT'
                      ? 'bg-rose-50 border-rose-300 text-rose-700'
                      : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <ArrowUpRight className="w-4 h-4" /> Debit (add)
                </button>
              </div>
            </div>
          </div>

          {/* Party account picker (auto-filtered by voucher type) */}
          <AccountPicker
            label={partyLabel}
            icon={<Building2 className="w-3.5 h-3.5" />}
            accounts={accounts}
            groupTypes={partyFilter}
            value={accountId}
            onChange={setAccountId}
            placeholder={partyLabel.toLowerCase()}
          />

          {/* Contra account (cash/bank) — hidden for credit/debit notes */}
          {showsContra && (
            <AccountPicker
              label="Contra account (cash / bank)"
              icon={<Wallet className="w-3.5 h-3.5" />}
              accounts={accounts}
              groupTypes={contraFilter}
              value={contraAccountId}
              onChange={setContraAccountId}
              placeholder="cash or bank"
            />
          )}

          {/* Reference */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Linked to</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {(['NONE', 'INVOICE', 'ORDER'] as VoucherReferenceType[]).map((rt) => (
                <button
                  key={rt}
                  type="button"
                  onClick={() => { setReferenceType(rt); setInvoiceId(''); setOrderId(''); }}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
                    referenceType === rt
                      ? 'bg-brand-navy text-white border-brand-navy'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {rt === 'NONE' ? 'No reference' : rt === 'INVOICE' ? 'Invoice' : 'Order'}
                </button>
              ))}
            </div>

            {referenceType === 'INVOICE' && (
              <select
                value={invoiceId}
                onChange={(e) => setInvoiceId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-navy/20"
              >
                <option value="">Select an invoice…</option>
                {invoices.map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.invoiceNumber} · {inv.billToName} · {formatCurrency(inv.total, inv.currency)}
                  </option>
                ))}
              </select>
            )}

            {referenceType === 'ORDER' && (
              <select
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-navy/20"
              >
                <option value="">Select an order…</option>
                {orders.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.orderNumber} · {o.deliveryCity || '—'} · {formatCurrency(o.price || 0)}
                  </option>
                ))}
              </select>
            )}
          </div>

          {ref && (
            <div className="bg-brand-navy/5 border border-brand-navy/10 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {ref.reference.type === 'INVOICE' ? 'Invoice' : 'Order'} {ref.reference.number}
                </p>
                <span className="text-[11px] font-semibold text-slate-500">{ref.reference.status}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div>
                  <p className="text-[11px] text-slate-400">Base value</p>
                  <p className="font-semibold text-slate-800">{formatCurrency(ref.baseValue, ref.currency)}</p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-400">Credits</p>
                  <p className="font-semibold text-emerald-700">- {formatCurrency(ref.creditTotal, ref.currency)}</p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-400">Debits</p>
                  <p className="font-semibold text-rose-700">+ {formatCurrency(ref.debitTotal, ref.currency)}</p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-400">Outstanding</p>
                  <p className="font-bold text-brand-navy">{formatCurrency(ref.outstanding, ref.currency)}</p>
                </div>
              </div>
              {projected !== null && projected !== ref.outstanding && (
                <div className="mt-3 pt-3 border-t border-brand-navy/10 flex items-center justify-between text-sm">
                  <span className="text-slate-500">After this voucher</span>
                  <span className="font-bold text-brand-navy">{formatCurrency(projected, ref.currency)}</span>
                </div>
              )}
            </div>
          )}
          {refLoading && (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Loader2 className="w-3 h-3 animate-spin" /> Loading reference value…
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Amount</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-navy/20"
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-navy/20"
              >
                {['AED', 'USD', 'EUR', 'GBP', 'SAR', 'INR'].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Voucher Date</label>
              <input
                type="date"
                value={voucherDate}
                onChange={(e) => setVoucherDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-navy/20"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Party label (override)</label>
              <input
                value={partyName}
                onChange={(e) => setPartyName(e.target.value)}
                placeholder="Only if no Account is selected"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-navy/20"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Narration</label>
            <textarea
              value={narration}
              onChange={(e) => setNarration(e.target.value)}
              rows={2}
              placeholder="Optional notes…"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-navy/20"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Voucher Attachment</label>
            <label className="flex items-center gap-3 px-3 py-3 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50">
              <Upload className="w-5 h-5 text-slate-400" />
              <div className="flex-1 min-w-0">
                {file ? (
                  <div className="flex items-center gap-2 text-sm text-slate-700">
                    <FileText className="w-4 h-4 text-slate-400" />
                    <span className="truncate">{file.name}</span>
                    <span className="text-xs text-slate-400">({Math.round(file.size / 1024)} KB)</span>
                  </div>
                ) : (
                  <span className="text-sm text-slate-500">Click to upload PDF or image of the voucher</span>
                )}
              </div>
              <input
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/webp"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="hidden"
              />
            </label>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
              {error}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 px-4 py-2 bg-brand-navy text-white rounded-xl text-sm font-semibold hover:bg-brand-navy/90 disabled:opacity-50"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Save Voucher
          </button>
        </div>
      </form>
    </div>
  );
}
