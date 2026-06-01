'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, Loader2, CheckCircle, AlertCircle, Search, Briefcase, FileText } from 'lucide-react';
import api from '@/lib/api';
import { Voucher, Account, Order } from '@/types';

// "Purchase Voucher" — records a new supplier bill against a Job.
// Mirrors the legacy desktop screen: pick a Job, pick a Supplier, type the
// Sup Inv No / Inv Date / Amount / Narration, save. One Job can have many
// purchase vouchers (different suppliers / narrations).
//
// The bill-allocation flow lives on the "Supplier Payment" voucher type;
// this modal deliberately skips it.

interface Props {
  voucher?: Voucher | null;
  onClose: () => void;
  onSuccess: (voucher: Voucher) => void;
}

interface OrderPick {
  id: string;
  orderNumber: string;
  pickupCity?: string;
  deliveryCity?: string;
}

function searchAccounts(accounts: Account[], q: string, limit = 30): Account[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return [];
  return accounts.filter((a) =>
    a.code.toLowerCase().includes(needle) ||
    a.name.toLowerCase().includes(needle) ||
    (a.mobile1 || '').toLowerCase().includes(needle) ||
    (a.trn || '').toLowerCase().includes(needle),
  ).slice(0, limit);
}

export function PurchaseVoucherModal({ voucher, onClose, onSuccess }: Props) {
  const isEdit = !!voucher;
  const firstAlloc = voucher?.allocations?.[0];

  const [voucherDate, setVoucherDate] = useState(() =>
    voucher?.voucherDate ? voucher.voucherDate.slice(0, 10) : new Date().toISOString().slice(0, 10));
  const [orderId, setOrderId] = useState(voucher?.orderId || '');
  const [accountId, setAccountId] = useState(voucher?.accountId || '');
  const [supInvNo, setSupInvNo] = useState(firstAlloc?.invoiceNumber || firstAlloc?.refNo || '');
  const [supInvDate, setSupInvDate] = useState(
    firstAlloc?.invoiceDate ? firstAlloc.invoiceDate.slice(0, 10) : '',
  );
  const [currency, setCurrency] = useState(voucher?.currency || 'AED');
  const [exRate, setExRate] = useState(1);
  const [amount, setAmount] = useState<number | ''>(voucher?.amount ?? '');
  const [narration, setNarration] = useState(voucher?.narration || '');

  const [partySearch, setPartySearch] = useState('');
  const [orderSearch, setOrderSearch] = useState('');
  const [orderSearchOpen, setOrderSearchOpen] = useState(false);
  const [selectedOrderInfo, setSelectedOrderInfo] = useState<OrderPick | null>(
    voucher?.order ? { id: voucher.order.id, orderNumber: voucher.order.orderNumber } : null,
  );

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: accountList } = useQuery({
    queryKey: ['purchase-voucher-accounts'],
    queryFn: () => api.get('/accounts?limit=1000').then((r) => r.data).catch(() => ({ data: [] })),
  });
  const accounts: Account[] = accountList?.data ?? [];

  const { data: orderSearchData } = useQuery({
    queryKey: ['purchase-voucher-order-search', orderSearch],
    enabled: orderSearch.trim().length >= 2,
    queryFn: () => api.get(`/orders?limit=15&search=${encodeURIComponent(orderSearch.trim())}`)
      .then((r) => r.data).catch(() => ({ data: [] })),
  });
  const orderResults: Order[] = orderSearchData?.data ?? [];

  const selectedAccount = accounts.find((a) => a.id === accountId) || null;
  const partyOptions = useMemo(() => searchAccounts(accounts, partySearch), [accounts, partySearch]);

  const pickOrder = (o: Order) => {
    setOrderId(o.id);
    setSelectedOrderInfo({
      id: o.id, orderNumber: o.orderNumber,
      pickupCity: o.pickupCity, deliveryCity: o.deliveryCity,
    });
    setOrderSearch('');
    setOrderSearchOpen(false);
  };
  const clearOrder = () => {
    setOrderId('');
    setSelectedOrderInfo(null);
  };

  const computedAmount = (Number(amount) || 0) * (exRate || 1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!orderId) { setError('Select a Job.'); return; }
    if (!accountId) { setError('Select a supplier.'); return; }
    const amt = Number(amount) || 0;
    if (amt <= 0) { setError('Enter a positive amount.'); return; }

    setSubmitting(true);
    try {
      const baseAmount = amt * (exRate || 1);
      const payload = {
        type: 'PURCHASE',
        direction: 'DEBIT',
        voucherDate,
        amount: baseAmount,
        currency,
        referenceType: 'ORDER',
        orderId,
        accountId,
        narration: narration || undefined,
        // Single virtual allocation row carries the supplier-invoice ref so
        // the Job statement / SOA can show "what this voucher was for".
        allocations: [{
          refNo: supInvNo || undefined,
          invoiceNumber: supInvNo || undefined,
          invoiceDate: supInvDate ? new Date(`${supInvDate}T00:00:00.000Z`).toISOString() : undefined,
          billAmount: baseAmount,
          allocatedAmount: baseAmount,
        }],
      };

      const res = isEdit
        ? await api.put(`/vouchers/${voucher!.id}`, payload)
        : await api.post('/vouchers', payload);
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

  const inputCls = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy/20 focus:border-brand-navy';
  const labelCls = 'block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <form onSubmit={handleSubmit}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[94vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {isEdit ? 'Edit Purchase Voucher' : 'Purchase Voucher'}
              {isEdit && voucher?.voucherNumber ? (
                <span className="ml-2 text-sm font-mono text-slate-400">{voucher.voucherNumber}</span>
              ) : null}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Record a supplier bill against a Job. One Job can have many vouchers (different suppliers / narrations).
            </p>
          </div>
          <button type="button" onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="relative">
              <label className={labelCls}>Job No <span className="text-rose-500">*</span></label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input value={orderSearch}
                  onChange={(e) => { setOrderSearch(e.target.value); setOrderSearchOpen(true); }}
                  onFocus={() => setOrderSearchOpen(true)}
                  placeholder={selectedOrderInfo ? selectedOrderInfo.orderNumber : 'Type job / order number to search…'}
                  className={`${inputCls} pl-8`} />
                {orderSearchOpen && orderSearch.trim().length >= 2 && (
                  <div className="absolute z-30 mt-1 w-full max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg">
                    {orderResults.length === 0 ? (
                      <div className="p-2 text-xs text-slate-400">No matching jobs.</div>
                    ) : orderResults.map((o) => (
                      <button key={o.id} type="button" onClick={() => pickOrder(o)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-brand-navy/5 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-mono font-semibold text-brand-navy truncate">{o.orderNumber}</div>
                          <div className="text-xs text-slate-500 truncate">
                            {o.pickupCity || '—'} → {o.deliveryCity || '—'}
                          </div>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400 flex-shrink-0">{o.status}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {selectedOrderInfo && (
                <div className="mt-2 px-3 py-2 bg-brand-navy/5 border border-brand-navy/10 rounded-lg flex items-center justify-between text-sm">
                  <div className="min-w-0">
                    <div className="font-mono font-semibold text-brand-navy truncate">JOB {selectedOrderInfo.orderNumber}</div>
                    {(selectedOrderInfo.pickupCity || selectedOrderInfo.deliveryCity) && (
                      <div className="text-xs text-slate-500 truncate">
                        {selectedOrderInfo.pickupCity || '—'} → {selectedOrderInfo.deliveryCity || '—'}
                      </div>
                    )}
                  </div>
                  <button type="button" onClick={clearOrder}
                    className="text-xs text-slate-400 hover:text-rose-600">Clear</button>
                </div>
              )}
            </div>

            <div>
              <label className={labelCls}>A/c Date</label>
              <input type="date" value={voucherDate} onChange={(e) => setVoucherDate(e.target.value)} className={inputCls} />
            </div>
          </div>

          <div>
            <label className={labelCls}>Supplier <span className="text-rose-500">*</span></label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input value={partySearch} onChange={(e) => setPartySearch(e.target.value)}
                placeholder={selectedAccount ? `${selectedAccount.code} · ${selectedAccount.name}` : 'Search supplier from master…'}
                className={`${inputCls} pl-8`} />
            </div>
            {partySearch && (
              <div className="mt-1 max-h-44 overflow-y-auto border border-slate-200 rounded-lg bg-white shadow-sm">
                {partyOptions.length === 0 ? (
                  <div className="p-2 text-xs text-slate-400">No accounts match.</div>
                ) : partyOptions.map((a) => (
                  <button type="button" key={a.id}
                    onClick={() => { setAccountId(a.id); setPartySearch(''); }}
                    className="w-full text-left px-3 py-1.5 text-sm hover:bg-brand-navy/5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="min-w-0">
                        <span className="font-semibold text-brand-navy">{a.code}</span>
                        <span className="text-slate-700"> · {a.name}</span>
                        {a.mobile1 && <span className="text-xs text-slate-400"> · {a.mobile1}</span>}
                      </span>
                      {a.accountGroup && (
                        <span className="text-[10px] font-mono text-slate-400 flex-shrink-0">{a.accountGroup.name}</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
            {selectedAccount && (
              <div className="mt-2 px-3 py-2 bg-brand-navy/5 border border-brand-navy/10 rounded-lg flex items-center justify-between text-sm">
                <div className="min-w-0">
                  <div className="font-semibold text-brand-navy truncate">{selectedAccount.code} · {selectedAccount.name}</div>
                  <div className="text-xs text-slate-500 truncate">
                    {selectedAccount.accountGroup?.name}
                    {selectedAccount.mobile1 ? `  ·  ${selectedAccount.mobile1}` : ''}
                    {selectedAccount.trn ? `  ·  TRN ${selectedAccount.trn}` : ''}
                  </div>
                </div>
                <button type="button" onClick={() => setAccountId('')}
                  className="text-xs text-slate-400 hover:text-rose-600">Clear</button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Sup Inv No</label>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input value={supInvNo} onChange={(e) => setSupInvNo(e.target.value)}
                  placeholder="e.g. INV/03621/26-GSM"
                  className={`${inputCls} pl-8`} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Inv Date</label>
              <input type="date" value={supInvDate} onChange={(e) => setSupInvDate(e.target.value)} className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Inv Amount <span className="text-rose-500">*</span></label>
              <input type="number" step="0.01" value={amount}
                onChange={(e) => setAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                placeholder="0.00" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Currency</label>
              <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={inputCls}>
                <option value="AED">AED</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="SAR">SAR</option>
                <option value="INR">INR</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Ex-Rate</label>
              <input type="number" step="0.0001" value={exRate}
                onChange={(e) => setExRate(parseFloat(e.target.value) || 1)}
                className={inputCls} />
            </div>
          </div>

          <div className="bg-brand-navy/5 border border-brand-navy/10 rounded-lg px-3 py-2.5 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">Amount (base)</span>
            <span className="text-base font-bold text-brand-navy">
              {currency} {computedAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          <div>
            <label className={labelCls}>Narration</label>
            <textarea value={narration} onChange={(e) => setNarration(e.target.value)} rows={2}
              placeholder="e.g. FREIGHT CHARGES against JOB DXLTR26-00117"
              className={`${inputCls} resize-none`} />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-rose-700 text-sm bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            {isEdit ? 'Editing — changes reflect in Job statement on save' : 'Voucher number auto-generated on save'}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl">
              Close (Esc)
            </button>
            <button type="submit"
              disabled={submitting || !orderId || !accountId || !(Number(amount) > 0)}
              className="flex items-center gap-2 px-5 py-2 bg-brand-navy text-white rounded-xl text-sm font-semibold hover:bg-brand-navy/90 disabled:opacity-50">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              {isEdit ? 'Update' : 'Save (F12)'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
