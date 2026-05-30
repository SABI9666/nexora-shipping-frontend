'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import api from '@/lib/api';
import { downloadDocx } from '@/lib/downloadDocx';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { Invoice, InvoiceStatus } from '@/types';
import {
  Plus, FileText, Trash2, Eye, Pencil, X, Search, Receipt, Download, Loader2, FileType, CheckCircle2,
} from 'lucide-react';
import { CreateInvoiceModal } from './CreateInvoiceModal';

// Extension of the shared Invoice type to surface the computed balance
// the backend now returns alongside each invoice.
type InvoiceWithBalance = Invoice & {
  paid?: number;
  outstanding?: number;
  paidPercent?: number;
  adjustments?: number;
};

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; bg: string; color: string }> = {
  DRAFT:     { label: 'Draft',     bg: 'bg-slate-100',  color: 'text-slate-600' },
  SENT:      { label: 'Sent',      bg: 'bg-blue-50',    color: 'text-blue-600'  },
  PAID:      { label: 'Paid',      bg: 'bg-green-50',   color: 'text-green-700' },
  OVERDUE:   { label: 'Overdue',   bg: 'bg-red-50',     color: 'text-red-600'   },
  CANCELLED: { label: 'Cancelled', bg: 'bg-slate-100',  color: 'text-slate-400' },
};

// Compact balance cell used in the list table. Shows Total above a thin
// paid-progress bar and the Outstanding amount underneath, colour-coded.
function BalanceCell({ inv }: { inv: InvoiceWithBalance }) {
  const total = inv.total ?? 0;
  const paid = Math.max(0, Math.min(total, inv.paid ?? 0));
  const outstanding = inv.outstanding ?? Math.max(0, total - paid);
  const paidPercent = inv.paidPercent ?? (total > 0 ? Math.round((paid / total) * 100) : 0);
  const isPaid = outstanding <= 0.005 || inv.status === 'PAID';
  const isOverdue = !isPaid && !!inv.dueDate && new Date(inv.dueDate) < new Date();

  const barFill = isPaid ? 'bg-emerald-500'
    : paidPercent > 0 ? 'bg-brand-navy'
    : isOverdue ? 'bg-rose-400'
    : 'bg-slate-300';

  return (
    <div className="text-right">
      <div className="text-sm font-bold text-slate-900 tabular-nums">
        {formatCurrency(total, inv.currency)}
      </div>
      <div className="mt-1 h-1 w-full rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full ${barFill} transition-all`} style={{ width: `${paidPercent}%` }} />
      </div>
      <div className="mt-1 text-[11px] tabular-nums flex items-center justify-end gap-1">
        {isPaid ? (
          <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
            <CheckCircle2 className="w-3 h-3" /> Paid
          </span>
        ) : (
          <>
            <span className={`font-semibold ${isOverdue ? 'text-rose-700' : 'text-brand-navy'}`}>
              {formatCurrency(outstanding, inv.currency)}
            </span>
            <span className="text-slate-400">outstanding</span>
          </>
        )}
      </div>
    </div>
  );
}

function InvoiceDetailModal({ invoice, onClose }: { invoice: InvoiceWithBalance; onClose: () => void }) {
  const cfg = STATUS_CONFIG[invoice.status];
  const [downloadingWord, setDownloadingWord] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const total = invoice.total ?? 0;
  const paid = Math.max(0, Math.min(total, invoice.paid ?? 0));
  const outstanding = invoice.outstanding ?? Math.max(0, total - paid);
  const paidPercent = invoice.paidPercent ?? (total > 0 ? Math.round((paid / total) * 100) : 0);
  const isFullyPaid = outstanding <= 0.005;
  const isOverdue = !isFullyPaid && !!invoice.dueDate && new Date(invoice.dueDate) < new Date();

  const handleDownloadWord = async () => {
    setDownloadingWord(true);
    try {
      await downloadDocx(
        `/invoices/${invoice.id}/download/word`,
        `${invoice.invoiceNumber}.docx`,
      );
    } catch {
      alert('Failed to download Word document.');
    } finally {
      setDownloadingWord(false);
    }
  };

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      await downloadDocx(
        `/invoices/${invoice.id}/download/pdf`,
        `${invoice.invoiceNumber}.pdf`,
      );
    } catch {
      alert('Failed to download PDF.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-base font-bold text-slate-900 font-mono">{invoice.invoiceNumber}</h2>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">Created {formatDate(invoice.invoiceDate)}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleDownloadPdf} disabled={downloadingPdf}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold text-white bg-brand-navy rounded-xl hover:bg-brand-navy/90 disabled:opacity-50">
              {downloadingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileType className="w-4 h-4" />}
              PDF
            </button>
            <button onClick={handleDownloadWord} disabled={downloadingWord}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold text-brand-navy border border-brand-navy/30 rounded-xl hover:bg-brand-navy/5 disabled:opacity-50">
              {downloadingWord ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Word
            </button>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          {/* Payment Summary — the headline number across three tiles + a paid % bar. */}
          <div className={`rounded-xl border p-4 ${isFullyPaid ? 'border-emerald-200 bg-emerald-50/40' : isOverdue ? 'border-rose-200 bg-rose-50/40' : 'border-brand-navy/15 bg-brand-navy/5'}`}>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Invoice Total</p>
                <p className="text-lg font-bold text-slate-900 tabular-nums">{formatCurrency(total, invoice.currency)}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Received</p>
                <p className="text-lg font-bold text-emerald-700 tabular-nums">{formatCurrency(paid, invoice.currency)}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Outstanding</p>
                <p className={`text-lg font-bold tabular-nums ${isFullyPaid ? 'text-emerald-700' : isOverdue ? 'text-rose-700' : 'text-brand-navy'}`}>
                  {formatCurrency(outstanding, invoice.currency)}
                </p>
              </div>
            </div>
            <div className="h-1.5 w-full rounded-full bg-white/70 overflow-hidden">
              <div className={`h-full ${isFullyPaid ? 'bg-emerald-500' : isOverdue ? 'bg-rose-400' : 'bg-brand-navy'} transition-all`} style={{ width: `${paidPercent}%` }} />
            </div>
            <div className="mt-1.5 text-[11px] text-slate-500 flex items-center justify-between">
              <span>{paidPercent}% paid</span>
              {isFullyPaid ? (
                <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                  <CheckCircle2 className="w-3 h-3" /> Fully paid
                </span>
              ) : isOverdue ? (
                <span className="text-rose-700 font-semibold">Overdue</span>
              ) : invoice.dueDate ? (
                <span>Due {formatDate(invoice.dueDate)}</span>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">From</p>
              <p className="font-semibold text-slate-800 text-sm">{invoice.shipFromName}</p>
              <p className="text-sm text-slate-600">{invoice.shipFromAddress}</p>
              <p className="text-sm text-slate-600">{invoice.shipFromCity}, {invoice.shipFromCountry}</p>
            </div>
            <div className="bg-brand-navy/5 rounded-xl p-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Bill To</p>
              <p className="font-semibold text-slate-800 text-sm">{invoice.billToName}</p>
              <p className="text-sm text-slate-600">{invoice.billToAddress}</p>
              <p className="text-sm text-slate-600">{invoice.billToCity}, {invoice.billToCountry}</p>
              {invoice.billToEmail && <p className="text-xs text-slate-400 mt-1">{invoice.billToEmail}</p>}
              {invoice.billToPhone && <p className="text-xs text-slate-400">{invoice.billToPhone}</p>}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-400 mb-0.5">Invoice Date</p>
              <p className="font-semibold text-slate-800">{formatDate(invoice.invoiceDate)}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-400 mb-0.5">Due Date</p>
              <p className="font-semibold text-slate-800">{invoice.dueDate ? formatDate(invoice.dueDate) : '—'}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-400 mb-0.5">Payment Terms</p>
              <p className="font-semibold text-slate-800">{invoice.paymentTerms || '—'}</p>
            </div>
          </div>

          {invoice.orderRef && (
            <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded-lg">
              <Receipt className="w-4 h-4" />
              Linked to order <span className="font-mono font-semibold">{invoice.orderRef.orderNumber}</span>
            </div>
          )}

          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Line Items</p>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500">Description</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500">Qty</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500">Unit Price</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoice.items.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-800">{item.description}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{item.quantity}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(item.unitPrice, invoice.currency)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-800">{formatCurrency(item.amount, invoice.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end">
            <div className="w-64 space-y-1.5 text-sm">
              <div className="flex justify-between text-slate-600"><span>Subtotal</span><span className="tabular-nums">{formatCurrency(invoice.subtotal, invoice.currency)}</span></div>
              {invoice.taxRate > 0 && (
                <div className="flex justify-between text-slate-600"><span>Tax ({invoice.taxRate}%)</span><span className="tabular-nums">{formatCurrency(invoice.taxAmount, invoice.currency)}</span></div>
              )}
              {invoice.shippingCost > 0 && (
                <div className="flex justify-between text-slate-600"><span>Shipping</span><span className="tabular-nums">{formatCurrency(invoice.shippingCost, invoice.currency)}</span></div>
              )}
              <div className="flex justify-between font-bold text-slate-900 border-t border-slate-200 pt-2 mt-2">
                <span>Total ({invoice.currency})</span>
                <span className="text-brand-navy text-base tabular-nums">{formatCurrency(invoice.total, invoice.currency)}</span>
              </div>
              <div className="flex justify-between text-emerald-700 text-xs">
                <span>Received</span>
                <span className="tabular-nums">{formatCurrency(paid, invoice.currency)}</span>
              </div>
              <div className={`flex justify-between font-semibold text-sm ${isFullyPaid ? 'text-emerald-700' : isOverdue ? 'text-rose-700' : 'text-brand-navy'}`}>
                <span>Balance Due</span>
                <span className="tabular-nums">{formatCurrency(outstanding, invoice.currency)}</span>
              </div>
            </div>
          </div>

          {invoice.notes && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-xs font-semibold text-amber-700 mb-1">Notes</p>
              <p className="text-sm text-amber-800 whitespace-pre-wrap">{invoice.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function InvoicesPage() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [viewInvoice, setViewInvoice] = useState<InvoiceWithBalance | null>(null);
  const [editInvoice, setEditInvoice] = useState<Invoice | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | ''>('');

  const { data, isLoading } = useQuery({
    queryKey: ['invoices', statusFilter, search],
    queryFn: () => {
      const params = new URLSearchParams({ limit: '50' });
      if (statusFilter) params.set('status', statusFilter);
      if (search) params.set('search', search);
      return api.get(`/invoices?${params}`).then((r) => r.data);
    },
  });

  const invoices: InvoiceWithBalance[] = data?.data ?? [];

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/invoices/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['invoices'] }),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: InvoiceStatus }) =>
      api.patch(`/invoices/${id}`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['invoices'] }),
  });

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Invoices</h1>
          <p className="page-subtitle">Create and manage shipping invoices</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-navy text-white rounded-xl text-sm font-semibold hover:bg-brand-navy/90 transition-colors"
        >
          <Plus className="w-4 h-4" /> New Invoice
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search invoice number, client name…"
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-navy/20 focus:border-brand-navy"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as InvoiceStatus | '')}
          className="px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-navy/20 bg-white"
        >
          <option value="">All Statuses</option>
          {(Object.keys(STATUS_CONFIG) as InvoiceStatus[]).map((s) => (
            <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-brand-navy border-t-transparent rounded-full animate-spin" />
          </div>
        ) : invoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <FileText className="w-12 h-12 mb-3 opacity-40" />
            <p className="font-medium text-slate-500">No invoices yet</p>
            <p className="text-xs mt-1">Click <span className="font-semibold">New Invoice</span> to create one</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Invoice #</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Client</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Order</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Due</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Balance</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map((inv) => {
                  const cfg = STATUS_CONFIG[inv.status];
                  return (
                    <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3.5 font-mono font-semibold text-brand-navy">{inv.invoiceNumber}</td>
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-slate-800 truncate max-w-[140px]">{inv.billToName}</p>
                        {inv.billToEmail && <p className="text-xs text-slate-400 truncate">{inv.billToEmail}</p>}
                      </td>
                      <td className="px-4 py-3.5 hidden md:table-cell">
                        {inv.orderRef ? (
                          <span className="text-xs font-mono bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                            {inv.orderRef.orderNumber}
                          </span>
                        ) : <span className="text-slate-300 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3.5 text-slate-500 hidden sm:table-cell">{formatDate(inv.invoiceDate)}</td>
                      <td className="px-4 py-3.5 hidden lg:table-cell">
                        {inv.dueDate ? (
                          <span className={new Date(inv.dueDate) < new Date() && inv.status !== 'PAID' ? 'text-red-500 font-semibold' : 'text-slate-500'}>
                            {formatDate(inv.dueDate)}
                          </span>
                        ) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3.5 min-w-[160px]">
                        <BalanceCell inv={inv} />
                      </td>
                      <td className="px-4 py-3.5">
                        {isAdmin ? (
                          <select
                            value={inv.status}
                            onChange={(e) => updateStatusMutation.mutate({ id: inv.id, status: e.target.value as InvoiceStatus })}
                            className={`text-xs font-semibold px-2 py-1 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-brand-navy/30 ${cfg.bg} ${cfg.color}`}
                          >
                            {(Object.keys(STATUS_CONFIG) as InvoiceStatus[]).map((s) => (
                              <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                            ))}
                          </select>
                        ) : (
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => setViewInvoice(inv)}
                            className="p-1.5 text-slate-400 hover:text-brand-navy hover:bg-slate-100 rounded-lg transition-colors"
                            title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditInvoice(inv)}
                            className="p-1.5 text-slate-400 hover:text-brand-navy hover:bg-slate-100 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => { if (confirm(`Delete invoice ${inv.invoiceNumber}?`)) deleteMutation.mutate(inv.id); }}
                            disabled={deleteMutation.isPending}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {invoices.length > 0 && (() => {
        const sumByCurrency = (predicate: (i: InvoiceWithBalance) => boolean, valueGetter: (i: InvoiceWithBalance) => number) =>
          Object.entries(
            invoices.filter(predicate).reduce<Record<string, number>>((acc, i) => {
              const cur = i.currency || 'USD';
              acc[cur] = (acc[cur] ?? 0) + valueGetter(i);
              return acc;
            }, {})
          ).sort(([a], [b]) => a.localeCompare(b));
        // Outstanding = sum of computed outstanding (falls back to total for
        // invoices that pre-date the new balance fields).
        const outstanding = sumByCurrency(
          (i) => i.status !== 'PAID' && i.status !== 'CANCELLED',
          (i) => i.outstanding ?? i.total,
        );
        const paid = sumByCurrency(
          (i) => i.status !== 'CANCELLED',
          (i) => i.paid ?? (i.status === 'PAID' ? i.total : 0),
        );
        const renderTotals = (entries: [string, number][], emptyClass: string) =>
          entries.length === 0
            ? <span className={emptyClass}>—</span>
            : entries.map(([cur, amount], idx) => (
                <span key={cur}>
                  {idx > 0 && <span className="text-slate-300 mx-1.5">·</span>}
                  <span className="font-semibold tabular-nums">{formatCurrency(amount, cur)}</span>
                </span>
              ));
        return (
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500">
            <span>{invoices.length} invoice{invoices.length !== 1 ? 's' : ''}</span>
            <span className="text-slate-300">·</span>
            <span className="flex items-center gap-1.5">
              Outstanding:
              <span className="text-brand-navy">{renderTotals(outstanding, 'text-slate-400')}</span>
            </span>
            <span className="text-slate-300">·</span>
            <span className="flex items-center gap-1.5">
              Received:
              <span className="text-emerald-700">{renderTotals(paid, 'text-slate-400')}</span>
            </span>
          </div>
        );
      })()}

      {showCreate && (
        <CreateInvoiceModal
          onClose={() => setShowCreate(false)}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ['invoices'] })}
        />
      )}
      {viewInvoice && (
        <InvoiceDetailModal invoice={viewInvoice} onClose={() => setViewInvoice(null)} />
      )}
      {editInvoice && (
        <CreateInvoiceModal
          editing={editInvoice}
          onClose={() => setEditInvoice(null)}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ['invoices'] })}
        />
      )}
    </DashboardLayout>
  );
}
