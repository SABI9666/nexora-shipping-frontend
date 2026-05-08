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
  Plus, FileText, Trash2, Eye, X, Search, Receipt, Download, Loader2, FileType,
} from 'lucide-react';
import { CreateInvoiceModal } from './CreateInvoiceModal';

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; bg: string; color: string }> = {
  DRAFT:     { label: 'Draft',     bg: 'bg-slate-100',  color: 'text-slate-600' },
  SENT:      { label: 'Sent',      bg: 'bg-blue-50',    color: 'text-blue-600'  },
  PAID:      { label: 'Paid',      bg: 'bg-green-50',   color: 'text-green-700' },
  OVERDUE:   { label: 'Overdue',   bg: 'bg-red-50',     color: 'text-red-600'   },
  CANCELLED: { label: 'Cancelled', bg: 'bg-slate-100',  color: 'text-slate-400' },
};

function InvoiceDetailModal({ invoice, onClose }: { invoice: Invoice; onClose: () => void }) {
  const cfg = STATUS_CONFIG[invoice.status];
  const [downloadingWord, setDownloadingWord] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

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
              <div className="flex justify-between text-slate-600"><span>Subtotal</span><span>{formatCurrency(invoice.subtotal, invoice.currency)}</span></div>
              {invoice.taxRate > 0 && (
                <div className="flex justify-between text-slate-600"><span>Tax ({invoice.taxRate}%)</span><span>{formatCurrency(invoice.taxAmount, invoice.currency)}</span></div>
              )}
              {invoice.shippingCost > 0 && (
                <div className="flex justify-between text-slate-600"><span>Shipping</span><span>{formatCurrency(invoice.shippingCost, invoice.currency)}</span></div>
              )}
              <div className="flex justify-between font-bold text-slate-900 border-t border-slate-200 pt-2 mt-2">
                <span>Total ({invoice.currency})</span>
                <span className="text-brand-navy text-base">{formatCurrency(invoice.total, invoice.currency)}</span>
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
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);
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

  const invoices: Invoice[] = data?.data ?? [];

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
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Total</th>
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
                      <td className="px-4 py-3.5 text-right font-bold text-slate-900">
                        {formatCurrency(inv.total, inv.currency)}
                        <span className="text-xs font-normal text-slate-400 ml-1">{inv.currency}</span>
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

      {invoices.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-500">
          <span>{invoices.length} invoice{invoices.length !== 1 ? 's' : ''}</span>
          <span>·</span>
          <span>Total outstanding: <span className="font-semibold text-slate-800">
            {formatCurrency(invoices.filter((i) => i.status !== 'PAID' && i.status !== 'CANCELLED').reduce((s, i) => s + i.total, 0))}
          </span></span>
          <span>·</span>
          <span>Paid: <span className="font-semibold text-green-700">
            {formatCurrency(invoices.filter((i) => i.status === 'PAID').reduce((s, i) => s + i.total, 0))}
          </span></span>
        </div>
      )}

      {showCreate && (
        <CreateInvoiceModal
          onClose={() => setShowCreate(false)}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ['invoices'] })}
        />
      )}
      {viewInvoice && (
        <InvoiceDetailModal invoice={viewInvoice} onClose={() => setViewInvoice(null)} />
      )}
    </DashboardLayout>
  );
}
