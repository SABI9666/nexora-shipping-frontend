'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, Loader2, CheckCircle, AlertCircle, Search } from 'lucide-react';
import api from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Voucher, VoucherType, Account, Salesperson, AccountGroupType } from '@/types';
import {
  VOUCHER_TYPE_LABEL, VOUCHER_PARTY_FILTER, VOUCHER_CONTRA_FILTER,
  PAYMENT_METHOD_LABEL, VoucherPaymentMethod,
} from './constants';

interface Props {
  type: VoucherType;
  onClose: () => void;
  onSuccess: (voucher: Voucher) => void;
}

interface OpenBill {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  currency: string;
  jobNo: string | null;
  refNo: string | null;
  status: string;
  billAmount: number;
  paidAmount: number;
  balance: number;
}

interface AllocationRow {
  invoiceId: string;
  jobNo: string;
  refNo: string;
  invoiceNumber: string;
  invoiceDate: string;
  billAmount: number;
  allocatedAmount: number;
  selected: boolean;
  isCustom: boolean;
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

export function SupplierPaymentVoucherModal({ type, onClose, onSuccess }: Props) {
  // Form state
  const [voucherDate, setVoucherDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState<VoucherPaymentMethod>('CHEQUE');
  const [accountId, setAccountId] = useState('');
  const [contraAccountId, setContraAccountId] = useState('');
  const [collectedRepId, setCollectedRepId] = useState('');
  const [chequeNumber, setChequeNumber] = useState('');
  const [chequeDate, setChequeDate] = useState('');
  const [presentOn, setPresentOn] = useState('');
  const [clearedOn, setClearedOn] = useState('');
  const [accountPayee, setAccountPayee] = useState(true);
  const [printCheque, setPrintCheque] = useState(false);
  const [againstType, setAgainstType] = useState('Bill');
  const [issuedTo, setIssuedTo] = useState('');
  const [narration, setNarration] = useState('');
  const [currency, setCurrency] = useState('AED');
  const [allocations, setAllocations] = useState<AllocationRow[]>([]);
  const [partyAccountSearch, setPartyAccountSearch] = useState('');
  const [contraSearch, setContraSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data fetching
  const { data: accountList } = useQuery({
    queryKey: ['vouchers-accounts'],
    queryFn: () => api.get('/accounts?limit=1000').then((r) => r.data).catch(() => ({ data: [] })),
  });
  const accounts: Account[] = accountList?.data ?? [];

  const { data: salespersonList } = useQuery({
    queryKey: ['vouchers-salespersons'],
    queryFn: () => api.get('/salespersons?limit=500&active=true').then((r) => r.data).catch(() => ({ data: [] })),
  });
  const salespersons: Salesperson[] = salespersonList?.data ?? [];

  const { data: openBillsData, isFetching: billsLoading } = useQuery({
    queryKey: ['voucher-open-bills', accountId],
    enabled: !!accountId,
    queryFn: () => api.get(`/vouchers/open-bills?accountId=${accountId}`).then((r) => r.data),
  });
  const openBills: OpenBill[] = openBillsData?.data ?? [];

  // When party changes, rebuild the allocation table from open bills
  useEffect(() => {
    if (!accountId) {
      setAllocations([]);
      return;
    }
    setAllocations(openBills.map((b) => ({
      invoiceId: b.id,
      jobNo: b.jobNo || '',
      refNo: b.refNo || '',
      invoiceNumber: b.invoiceNumber,
      invoiceDate: b.invoiceDate?.slice(0, 10) || '',
      billAmount: b.balance,
      allocatedAmount: 0,
      selected: false,
      isCustom: false,
    })));
    // Default currency from first bill
    if (openBills.length > 0 && openBills[0].currency) setCurrency(openBills[0].currency);
  }, [accountId, openBills]);

  // Auto-fill issuedTo when party changes
  useEffect(() => {
    if (!accountId) return;
    const a = accounts.find((x) => x.id === accountId);
    if (a && !issuedTo) setIssuedTo(a.name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId]);

  const selectedAccount = accounts.find((a) => a.id === accountId) || null;
  const selectedContra = accounts.find((a) => a.id === contraAccountId) || null;
  const selectedRep = salespersons.find((s) => s.id === collectedRepId) || null;

  // Filter dropdown options
  const partyFilter = VOUCHER_PARTY_FILTER[type];
  const contraFilter = VOUCHER_CONTRA_FILTER[type];
  const partyOptions = filterAccounts(accounts, partyFilter, partyAccountSearch).slice(0, 30);
  const contraOptions = filterAccounts(accounts, contraFilter, contraSearch).slice(0, 30);

  // Totals
  const totalAllocated = useMemo(
    () => allocations.filter((r) => r.selected).reduce((s, r) => s + (r.allocatedAmount || 0), 0),
    [allocations],
  );

  const toggleAllocation = (idx: number) => {
    setAllocations((rows) => rows.map((r, i) => {
      if (i !== idx) return r;
      const next = { ...r, selected: !r.selected };
      // When selected, default the received amount to the full balance
      if (next.selected && next.allocatedAmount === 0) next.allocatedAmount = next.billAmount;
      if (!next.selected) next.allocatedAmount = 0;
      return next;
    }));
  };

  const setAllocAmount = (idx: number, value: number) => {
    setAllocations((rows) => rows.map((r, i) => i === idx
      ? { ...r, allocatedAmount: value, selected: value !== 0 || r.selected }
      : r));
  };

  const addCustomRow = () => {
    setAllocations((rows) => [
      ...rows,
      {
        invoiceId: '',
        jobNo: '',
        refNo: 'Adv.',
        invoiceNumber: '',
        invoiceDate: voucherDate,
        billAmount: 0,
        allocatedAmount: 0,
        selected: true,
        isCustom: true,
      },
    ]);
  };

  const updateCustomRow = (idx: number, patch: Partial<AllocationRow>) => {
    setAllocations((rows) => rows.map((r, i) => i === idx ? { ...r, ...patch } : r));
  };

  const removeRow = (idx: number) => {
    setAllocations((rows) => rows.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!accountId) { setError('Select a party / supplier.'); return; }
    const selectedRows = allocations.filter((r) => r.selected && (r.allocatedAmount !== 0 || r.billAmount !== 0));
    const amount = selectedRows.reduce((s, r) => s + (r.allocatedAmount || 0), 0);
    if (amount <= 0) { setError('Allocate at least one bill (received amount must be positive).'); return; }

    setSubmitting(true);
    try {
      const payload = {
        type,
        direction: type === 'RECEIPT' || type === 'CREDIT_NOTE' || type === 'CASH' || type === 'BANK' ? 'CREDIT' : 'DEBIT',
        voucherDate,
        amount,
        currency,
        referenceType: 'NONE',
        accountId,
        contraAccountId: contraAccountId || undefined,
        collectedRepId: collectedRepId || undefined,
        paymentMethod,
        chequeNumber: chequeNumber || undefined,
        chequeDate: chequeDate ? new Date(`${chequeDate}T00:00:00.000Z`).toISOString() : undefined,
        presentOn: presentOn ? new Date(`${presentOn}T00:00:00.000Z`).toISOString() : undefined,
        clearedOn: clearedOn ? new Date(`${clearedOn}T00:00:00.000Z`).toISOString() : undefined,
        accountPayee,
        printCheque,
        againstType: againstType || undefined,
        issuedTo: issuedTo || undefined,
        narration: narration || undefined,
        allocations: selectedRows.map((r) => ({
          invoiceId: r.invoiceId || undefined,
          jobNo: r.jobNo || undefined,
          refNo: r.refNo || undefined,
          invoiceNumber: r.invoiceNumber || undefined,
          invoiceDate: r.invoiceDate ? new Date(`${r.invoiceDate}T00:00:00.000Z`).toISOString() : undefined,
          billAmount: r.billAmount,
          allocatedAmount: r.allocatedAmount,
        })),
      };

      const res = await api.post('/vouchers', payload);
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
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[94vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">{VOUCHER_TYPE_LABEL[type]}</h2>
            <p className="text-xs text-slate-400 mt-0.5">Select a supplier, then tick the bills you&apos;re paying.</p>
          </div>
          <button type="button" onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          {/* Row 1: Date / By / A/c */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className={labelCls}>Date</label>
              <input type="date" value={voucherDate} onChange={(e) => setVoucherDate(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>By</label>
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as VoucherPaymentMethod)} className={inputCls}>
                {(Object.keys(PAYMENT_METHOD_LABEL) as VoucherPaymentMethod[]).map((m) => (
                  <option key={m} value={m}>{PAYMENT_METHOD_LABEL[m]}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>A/c (Bank / Cash)</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input value={contraSearch} onChange={(e) => setContraSearch(e.target.value)}
                  placeholder={selectedContra ? `${selectedContra.code} · ${selectedContra.name}` : 'Search bank / cash account…'}
                  className={`${inputCls} pl-8`} />
              </div>
              {contraSearch && (
                <div className="mt-1 max-h-32 overflow-y-auto border border-slate-200 rounded-lg bg-white shadow-sm">
                  {contraOptions.length === 0 ? (
                    <div className="p-2 text-xs text-slate-400">No accounts match.</div>
                  ) : contraOptions.map((a) => (
                    <button type="button" key={a.id}
                      onClick={() => { setContraAccountId(a.id); setContraSearch(''); }}
                      className="w-full text-left px-3 py-1.5 text-sm hover:bg-brand-navy/5">
                      <span className="font-semibold text-brand-navy">{a.code}</span>
                      <span className="text-slate-700"> · {a.name}</span>
                      {a.accountGroup && <span className="text-xs text-slate-400"> · {a.accountGroup.name}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Row 2: Party / Collected Rep */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className={labelCls}>Party Code <span className="text-rose-500">*</span></label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input value={partyAccountSearch} onChange={(e) => setPartyAccountSearch(e.target.value)}
                  placeholder={selectedAccount ? `${selectedAccount.code} · ${selectedAccount.name}` : 'Search supplier / customer…'}
                  className={`${inputCls} pl-8`} />
              </div>
              {partyAccountSearch && (
                <div className="mt-1 max-h-40 overflow-y-auto border border-slate-200 rounded-lg bg-white shadow-sm">
                  {partyOptions.length === 0 ? (
                    <div className="p-2 text-xs text-slate-400">No accounts match.</div>
                  ) : partyOptions.map((a) => (
                    <button type="button" key={a.id}
                      onClick={() => { setAccountId(a.id); setPartyAccountSearch(''); }}
                      className="w-full text-left px-3 py-1.5 text-sm hover:bg-brand-navy/5">
                      <span className="font-semibold text-brand-navy">{a.code}</span>
                      <span className="text-slate-700"> · {a.name}</span>
                      {a.mobile1 && <span className="text-xs text-slate-400"> · {a.mobile1}</span>}
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
            <div>
              <label className={labelCls}>Collected Rep</label>
              <select value={collectedRepId} onChange={(e) => setCollectedRepId(e.target.value)} className={inputCls}>
                <option value="">— None —</option>
                {salespersons.map((s) => (
                  <option key={s.id} value={s.id}>{s.code} · {s.name}</option>
                ))}
              </select>
              {selectedRep && (
                <p className="text-[11px] text-slate-500 mt-1">{selectedRep.phone || selectedRep.email || ''}</p>
              )}
            </div>
          </div>

          {/* Cheque details */}
          {paymentMethod === 'CHEQUE' && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className={labelCls}>Cheque No.</label>
                  <input value={chequeNumber} onChange={(e) => setChequeNumber(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Cheque Date</label>
                  <input type="date" value={chequeDate} onChange={(e) => setChequeDate(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Present On</label>
                  <input type="date" value={presentOn} onChange={(e) => setPresentOn(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Cleared On</label>
                  <input type="date" value={clearedOn} onChange={(e) => setClearedOn(e.target.value)} className={inputCls} />
                </div>
              </div>
              <div className="flex items-center gap-4 mt-3 text-sm">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={accountPayee} onChange={(e) => setAccountPayee(e.target.checked)} />
                  <span className="text-slate-700">A/c Payee Only</span>
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={printCheque} onChange={(e) => setPrintCheque(e.target.checked)} />
                  <span className="text-slate-700">Print Cheque</span>
                </label>
              </div>
            </div>
          )}

          {/* Issued To + Against + Narration */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className={labelCls}>Issued To</label>
              <input value={issuedTo} onChange={(e) => setIssuedTo(e.target.value)}
                placeholder={selectedAccount?.name || 'Beneficiary name on cheque / payment'}
                className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Against</label>
              <select value={againstType} onChange={(e) => setAgainstType(e.target.value)} className={inputCls}>
                <option value="Bill">Bill</option>
                <option value="Advance">Advance</option>
                <option value="Journal">Journal</option>
                <option value="On Account">On Account</option>
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls}>Narration</label>
            <textarea value={narration} onChange={(e) => setNarration(e.target.value)} rows={2}
              placeholder="e.g. GIVEN TO GSM" className={`${inputCls} resize-none`} />
          </div>

          {/* Bills allocation table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Bill Allocation {accountId ? `· ${allocations.length} open ` : ''}
                {billsLoading && <Loader2 className="w-3 h-3 animate-spin inline-block ml-1" />}
              </p>
              {accountId && (
                <button type="button" onClick={addCustomRow}
                  className="text-xs font-semibold text-brand-navy hover:underline">+ Add advance / line</button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-2 py-2 w-8"></th>
                    <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-500 uppercase">Job No</th>
                    <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-500 uppercase">Ref</th>
                    <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-500 uppercase">Inv. No.</th>
                    <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-500 uppercase">Date</th>
                    <th className="px-3 py-2 text-right text-[11px] font-semibold text-slate-500 uppercase">Amount</th>
                    <th className="px-3 py-2 text-right text-[11px] font-semibold text-slate-500 uppercase">Recd. Amt.</th>
                    <th className="px-3 py-2 text-right text-[11px] font-semibold text-slate-500 uppercase">Bal. Amt.</th>
                    <th className="px-2 py-2 w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allocations.length === 0 && (
                    <tr><td colSpan={9} className="px-3 py-8 text-center text-xs text-slate-400">
                      {accountId ? 'No open bills for this party.' : 'Select a party to load open bills.'}
                    </td></tr>
                  )}
                  {allocations.map((row, idx) => {
                    const balance = row.billAmount - row.allocatedAmount;
                    return (
                      <tr key={`${row.invoiceId || 'custom'}-${idx}`}
                        className={row.selected ? 'bg-emerald-50/40' : 'hover:bg-slate-50'}>
                        <td className="px-2 py-1.5 text-center">
                          <input type="checkbox" checked={row.selected} onChange={() => toggleAllocation(idx)} />
                        </td>
                        <td className="px-3 py-1.5 text-xs font-mono">
                          {row.isCustom
                            ? <input value={row.jobNo} onChange={(e) => updateCustomRow(idx, { jobNo: e.target.value })}
                                placeholder="—" className="w-24 px-1 py-0.5 border border-slate-200 rounded text-xs" />
                            : row.jobNo || '—'}
                        </td>
                        <td className="px-3 py-1.5 text-xs text-slate-500">
                          {row.isCustom
                            ? <input value={row.refNo} onChange={(e) => updateCustomRow(idx, { refNo: e.target.value })}
                                className="w-16 px-1 py-0.5 border border-slate-200 rounded text-xs" />
                            : row.refNo || '—'}
                        </td>
                        <td className="px-3 py-1.5 text-xs font-mono text-brand-navy">
                          {row.isCustom
                            ? <input value={row.invoiceNumber} onChange={(e) => updateCustomRow(idx, { invoiceNumber: e.target.value })}
                                placeholder="Adv." className="w-24 px-1 py-0.5 border border-slate-200 rounded text-xs" />
                            : row.invoiceNumber}
                        </td>
                        <td className="px-3 py-1.5 text-xs text-slate-500">
                          {row.invoiceDate ? formatDate(row.invoiceDate) : '—'}
                        </td>
                        <td className="px-3 py-1.5 text-right">
                          {row.isCustom
                            ? <input type="number" step="0.01" value={row.billAmount || ''}
                                onChange={(e) => updateCustomRow(idx, { billAmount: parseFloat(e.target.value) || 0 })}
                                className="w-24 px-1 py-0.5 border border-slate-200 rounded text-xs text-right" />
                            : <span className={row.billAmount < 0 ? 'text-rose-600' : 'text-slate-700'}>
                                {row.billAmount.toFixed(2)}
                              </span>}
                        </td>
                        <td className="px-3 py-1.5 text-right">
                          <input type="number" step="0.01" value={row.allocatedAmount || ''}
                            onChange={(e) => setAllocAmount(idx, parseFloat(e.target.value) || 0)}
                            placeholder="0.00"
                            className="w-24 px-1 py-0.5 border border-slate-200 rounded text-xs text-right font-semibold" />
                        </td>
                        <td className={`px-3 py-1.5 text-right text-xs font-semibold ${balance === 0 ? 'text-emerald-700' : balance < 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                          {balance.toFixed(2)}
                        </td>
                        <td className="px-2 py-1.5 text-center">
                          {row.isCustom && (
                            <button type="button" onClick={() => removeRow(idx)}
                              className="text-slate-300 hover:text-rose-600 text-xs">×</button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {allocations.length > 0 && (
                  <tfoot className="bg-brand-navy/5 border-t-2 border-brand-navy">
                    <tr>
                      <td colSpan={6} className="px-3 py-2 text-right text-xs font-bold text-brand-navy uppercase">Total Paid</td>
                      <td className="px-3 py-2 text-right text-sm font-bold text-brand-navy">
                        {currency} {totalAllocated.toFixed(2)}
                      </td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-rose-700 text-sm bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            Voucher number auto-generated on save
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl">
              Cancel
            </button>
            <button type="submit" disabled={submitting || !accountId || totalAllocated <= 0}
              className="flex items-center gap-2 px-5 py-2 bg-brand-navy text-white rounded-xl text-sm font-semibold hover:bg-brand-navy/90 disabled:opacity-50">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Save Voucher
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
