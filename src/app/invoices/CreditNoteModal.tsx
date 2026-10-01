'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileMinus, FileType, Loader2, Trash2, X } from 'lucide-react';
import api from '@/lib/api';
import { downloadDocx } from '@/lib/downloadDocx';
import { formatCurrency, formatDate } from '@/lib/utils';

// ============================================================================
// Credit Note — reduce the amount due on an invoice (e.g. after a customer
// dispute). Each credit note is a Tax Credit Note: it reverses taxable value
// and Output VAT, reduces the invoice balance, and flows into the customer
// statement, receivables, Job Profit, VAT ledger and P&L.
// ============================================================================

interface CreditNoteRow {
  id: string;
  creditNoteNumber: string;
  date: string;
  currency: string;
  netAmount: number;
  vatPercent: number;
  vatAmount: number;
  amount: number;
  reason: string | null;
  remarks: string | null;
}

interface CreditNoteSummary {
  invoice: {
    id: string;
    invoiceNumber: string;
    invoiceDate: string;
    billToName: string;
    currency: string;
    subtotal: number;
    taxAmount: number;
    total: number;
    status: string;
    vatPercent: number;
  };
  balance: {
    invoiceTotal: number;
    creditNotes: number;
    netInvoiceTotal: number;
    received: number;
    adjustments: number;
    outstanding: number;
  };
  reasons: string[];
  creditNotes: CreditNoteRow[];
}

const r2 = (n: number) => Math.round(n * 100) / 100;
const today = () => new Date().toISOString().slice(0, 10);

export function CreditNoteModal({ invoiceId, onClose }: { invoiceId: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery<CreditNoteSummary>({
    queryKey: ['invoice-credit-notes', invoiceId],
    queryFn: () => api.get(`/invoices/${invoiceId}/credit-notes`).then((r) => r.data.data),
  });

  const [date, setDate] = useState(today());
  const [reason, setReason] = useState('');
  const [remarks, setRemarks] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [includesVat, setIncludesVat] = useState(true);
  const [vatStr, setVatStr] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const cur = data?.invoice.currency || 'AED';
  const vatPercent = vatStr !== null ? Number(vatStr) || 0 : data?.invoice.vatPercent ?? 0;
  const amount = Number(amountStr) || 0;

  // Live preview — mirrors the backend split exactly.
  const preview = useMemo(() => {
    if (includesVat) {
      const net = r2(amount / (1 + vatPercent / 100));
      return { net, vat: r2(amount - net), gross: r2(amount) };
    }
    const net = r2(amount);
    const vat = r2(net * vatPercent / 100);
    return { net, vat, gross: r2(net + vat) };
  }, [amount, vatPercent, includesVat]);

  const outstanding = data?.balance.outstanding ?? 0;
  const exceeds = preview.gross > outstanding + 0.005;
  const cancelled = data?.invoice.status === 'CANCELLED';

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['invoice-credit-notes', invoiceId] });
    queryClient.invalidateQueries({ queryKey: ['invoices'] });
  };

  const createMutation = useMutation({
    mutationFn: () => api.post(`/invoices/${invoiceId}/credit-notes`, {
      date, reason, remarks, amount, amountIncludesVat: includesVat, vatPercent,
    }),
    onSuccess: () => {
      setAmountStr(''); setRemarks(''); setReason(''); setError('');
      invalidate();
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      setError(e.response?.data?.message || 'Failed to issue credit note'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/vouchers/${id}`),
    onSuccess: invalidate,
    onError: () => setError('Failed to delete credit note'),
  });

  const submit = () => {
    setError('');
    if (!reason) return setError('Select a reason for the credit note');
    if (amount <= 0) return setError('Enter the amount to credit');
    if (exceeds) return setError(`Credit cannot exceed the outstanding balance of ${formatCurrency(outstanding, cur)}`);
    createMutation.mutate();
  };

  const downloadPdf = async (cn: CreditNoteRow) => {
    setDownloadingId(cn.id);
    try {
      await downloadDocx(`/invoices/${invoiceId}/credit-notes/${cn.id}/pdf`, `CreditNote_${cn.creditNoteNumber}.pdf`);
    } catch {
      setError('Failed to download credit note PDF');
    } finally {
      setDownloadingId(null);
    }
  };

  const inputCls = 'w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-navy/20 focus:border-brand-navy';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center">
              <FileMinus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Credit Note</h2>
              <p className="text-xs text-slate-500">
                {data ? <>Against <span className="font-mono font-semibold">{data.invoice.invoiceNumber}</span> · {data.invoice.billToName}</> : 'Loading…'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        {isLoading || !data ? (
          <div className="flex-1 flex items-center justify-center py-16 text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : (
          <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
            {/* Invoice position */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Tile label="Invoice total" value={formatCurrency(data.balance.invoiceTotal, cur)} />
              <Tile label="Credited" value={formatCurrency(data.balance.creditNotes, cur)} tone="rose" />
              <Tile label="Received" value={formatCurrency(data.balance.received, cur)} tone="emerald" />
              <Tile label="Outstanding" value={formatCurrency(outstanding, cur)} tone="navy" />
            </div>

            {/* New credit note */}
            {cancelled ? (
              <p className="text-sm text-slate-500 bg-slate-50 rounded-xl p-4">This invoice is cancelled — credit notes cannot be issued.</p>
            ) : outstanding <= 0.005 ? (
              <p className="text-sm text-slate-500 bg-slate-50 rounded-xl p-4">Nothing outstanding on this invoice — no further credit can be issued.</p>
            ) : (
              <div className="border border-slate-200 rounded-xl p-4 space-y-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Issue new credit note</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-xs font-medium text-slate-600">Reason *</span>
                    <select value={reason} onChange={(e) => setReason(e.target.value)} className={`${inputCls} mt-1`}>
                      <option value="">Select reason…</option>
                      {data.reasons.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium text-slate-600">Credit note date</span>
                    <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={`${inputCls} mt-1`} />
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium text-slate-600">Amount to reduce ({cur}) *</span>
                    <input
                      type="number" min="0" step="0.01" inputMode="decimal" placeholder="0.00"
                      value={amountStr} onChange={(e) => setAmountStr(e.target.value)}
                      className={`${inputCls} mt-1 tabular-nums ${exceeds ? 'border-rose-400' : ''}`}
                    />
                    <span className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                      <input type="checkbox" checked={includesVat} onChange={(e) => setIncludesVat(e.target.checked)} />
                      Amount includes VAT
                    </span>
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium text-slate-600">VAT %</span>
                    <input
                      type="number" min="0" max="100" step="0.01"
                      value={vatStr ?? String(data.invoice.vatPercent)}
                      onChange={(e) => setVatStr(e.target.value)}
                      className={`${inputCls} mt-1 tabular-nums`}
                    />
                    <span className="mt-1 block text-xs text-slate-400">Defaults to the invoice&apos;s VAT rate</span>
                  </label>
                </div>
                <label className="block">
                  <span className="text-xs font-medium text-slate-600">Remarks</span>
                  <textarea
                    rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)}
                    placeholder="e.g. Customer disputed detention charges; agreed per email dated …"
                    className={`${inputCls} mt-1 resize-none`}
                  />
                </label>

                <div className="bg-slate-50 rounded-lg p-3 text-sm space-y-1">
                  <Line label="Taxable value credited" value={formatCurrency(preview.net, cur)} />
                  <Line label={`Output VAT reversed (${vatPercent}%)`} value={formatCurrency(preview.vat, cur)} />
                  <Line label="Total credit" value={formatCurrency(preview.gross, cur)} strong />
                  <Line
                    label="Outstanding after credit"
                    value={formatCurrency(Math.max(0, r2(outstanding - preview.gross)), cur)}
                    tone={exceeds ? 'text-rose-700' : 'text-brand-navy'}
                  />
                </div>

                {error && <p className="text-sm text-rose-700 bg-rose-50 rounded-lg px-3 py-2">{error}</p>}

                <div className="flex justify-end">
                  <button
                    onClick={submit}
                    disabled={createMutation.isPending}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-rose-700 rounded-xl hover:bg-rose-800 disabled:opacity-50"
                  >
                    {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileMinus className="w-4 h-4" />}
                    Issue credit note
                  </button>
                </div>
              </div>
            )}

            {/* Existing credit notes */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Credit notes issued ({data.creditNotes.length})
              </p>
              {data.creditNotes.length === 0 ? (
                <p className="text-sm text-slate-400 border border-dashed border-slate-200 rounded-xl p-4 text-center">No credit notes on this invoice yet.</p>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr className="text-xs text-slate-500">
                        <th className="text-left px-3 py-2 font-semibold">CN #</th>
                        <th className="text-left px-3 py-2 font-semibold">Date</th>
                        <th className="text-left px-3 py-2 font-semibold">Reason</th>
                        <th className="text-right px-3 py-2 font-semibold">VAT</th>
                        <th className="text-right px-3 py-2 font-semibold">Total</th>
                        <th className="px-3 py-2" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.creditNotes.map((cn) => (
                        <tr key={cn.id}>
                          <td className="px-3 py-2 font-mono text-brand-navy whitespace-nowrap">{cn.creditNoteNumber}</td>
                          <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{formatDate(cn.date)}</td>
                          <td className="px-3 py-2 text-slate-700 max-w-[200px]">
                            <span className="block truncate" title={cn.reason || ''}>{cn.reason || '—'}</span>
                            {cn.remarks && <span className="block text-xs text-slate-400 truncate" title={cn.remarks}>{cn.remarks}</span>}
                          </td>
                          <td className="px-3 py-2 text-right text-slate-600 tabular-nums">{formatCurrency(cn.vatAmount, cn.currency)}</td>
                          <td className="px-3 py-2 text-right font-semibold text-rose-700 tabular-nums">{formatCurrency(cn.amount, cn.currency)}</td>
                          <td className="px-3 py-2">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => downloadPdf(cn)}
                                disabled={downloadingId === cn.id}
                                className="p-1.5 text-slate-400 hover:text-brand-navy hover:bg-slate-100 rounded-lg disabled:opacity-50"
                                title="Download Tax Credit Note PDF"
                              >
                                {downloadingId === cn.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileType className="w-4 h-4" />}
                              </button>
                              <button
                                onClick={() => { if (confirm(`Delete credit note ${cn.creditNoteNumber}? The invoice balance will be restored.`)) deleteMutation.mutate(cn.id); }}
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
          </div>
        )}
      </div>
    </div>
  );
}

function Tile({ label, value, tone }: { label: string; value: string; tone?: 'rose' | 'emerald' | 'navy' }) {
  const color = tone === 'rose' ? 'text-rose-700' : tone === 'emerald' ? 'text-emerald-700' : tone === 'navy' ? 'text-brand-navy' : 'text-slate-900';
  return (
    <div className="bg-slate-50 rounded-xl p-3">
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
      <p className={`text-sm font-bold tabular-nums mt-0.5 ${color}`}>{value}</p>
    </div>
  );
}

function Line({ label, value, strong, tone }: { label: string; value: string; strong?: boolean; tone?: string }) {
  return (
    <div className={`flex justify-between ${strong ? 'font-bold text-slate-900 border-t border-slate-200 pt-1 mt-1' : 'text-slate-600'} ${tone || ''}`}>
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
