'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import api from '@/lib/api';
import { downloadDocx } from '@/lib/downloadDocx';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { Quotation, QuotationStatus } from '@/types';
import {
  Plus, FileSignature, Trash2, Eye, X, Search, Receipt, Download, Loader2, FileType,
} from 'lucide-react';
import { CreateQuotationModal } from './CreateQuotationModal';

const STATUS_CONFIG: Record<QuotationStatus, { label: string; bg: string; color: string }> = {
  DRAFT:     { label: 'Draft',     bg: 'bg-slate-100', color: 'text-slate-600' },
  SENT:      { label: 'Sent',      bg: 'bg-blue-50',   color: 'text-blue-600'  },
  ACCEPTED:  { label: 'Accepted',  bg: 'bg-green-50',  color: 'text-green-700' },
  REJECTED:  { label: 'Rejected',  bg: 'bg-red-50',    color: 'text-red-600'   },
  EXPIRED:   { label: 'Expired',   bg: 'bg-amber-50',  color: 'text-amber-700' },
  CANCELLED: { label: 'Cancelled', bg: 'bg-slate-100', color: 'text-slate-400' },
};

function QuotationDetailModal({ quotation, onClose }: { quotation: Quotation; onClose: () => void }) {
  const cfg = STATUS_CONFIG[quotation.status];
  const [downloadingWord, setDownloadingWord] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const handleDownloadWord = async () => {
    setDownloadingWord(true);
    try {
      await downloadDocx(
        `/quotations/${quotation.id}/download/word`,
        `${quotation.quotationNumber}.docx`,
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
        `/quotations/${quotation.id}/download/pdf`,
        `${quotation.quotationNumber}.pdf`,
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
              <h2 className="text-base font-bold text-slate-900 font-mono">{quotation.quotationNumber}</h2>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">Created {formatDate(quotation.quotationDate)}</p>
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
              <p className="font-semibold text-slate-800 text-sm">{quotation.shipFromName}</p>
              <p className="text-sm text-slate-600">{quotation.shipFromAddress}</p>
              <p className="text-sm text-slate-600">{quotation.shipFromCity}, {quotation.shipFromCountry}</p>
            </div>
            <div className="bg-brand-navy/5 rounded-xl p-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Quote To</p>
              <p className="font-semibold text-slate-800 text-sm">{quotation.billToName}</p>
              <p className="text-sm text-slate-600">{quotation.billToAddress}</p>
              <p className="text-sm text-slate-600">{quotation.billToCity}, {quotation.billToCountry}</p>
              {quotation.billToEmail && <p className="text-xs text-slate-400 mt-1">{quotation.billToEmail}</p>}
              {quotation.billToPhone && <p className="text-xs text-slate-400">{quotation.billToPhone}</p>}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-400 mb-0.5">Quotation Date</p>
              <p className="font-semibold text-slate-800">{formatDate(quotation.quotationDate)}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-400 mb-0.5">Valid Until</p>
              <p className="font-semibold text-slate-800">{quotation.validUntil ? formatDate(quotation.validUntil) : '—'}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-400 mb-0.5">Currency</p>
              <p className="font-semibold text-slate-800">{quotation.currency}</p>
            </div>
          </div>

          {quotation.orderRef && (
            <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded-lg">
              <Receipt className="w-4 h-4" />
              Linked to order <span className="font-mono font-semibold">{quotation.orderRef.orderNumber}</span>
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
                  {quotation.items.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-800">{item.description}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{item.quantity}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(item.unitPrice, quotation.currency)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-800">{formatCurrency(item.amount, quotation.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end">
            <div className="w-64 space-y-1.5 text-sm">
              <div className="flex justify-between text-slate-600"><span>Subtotal</span><span>{formatCurrency(quotation.subtotal, quotation.currency)}</span></div>
              {quotation.taxRate > 0 && (
                <div className="flex justify-between text-slate-600"><span>Tax ({quotation.taxRate}%)</span><span>{formatCurrency(quotation.taxAmount, quotation.currency)}</span></div>
              )}
              {quotation.shippingCost > 0 && (
                <div className="flex justify-between text-slate-600"><span>Shipping</span><span>{formatCurrency(quotation.shippingCost, quotation.currency)}</span></div>
              )}
              <div className="flex justify-between font-bold text-slate-900 border-t border-slate-200 pt-2 mt-2">
                <span>Total ({quotation.currency})</span>
                <span className="text-brand-navy text-base">{formatCurrency(quotation.total, quotation.currency)}</span>
              </div>
            </div>
          </div>

          {quotation.terms && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <p className="text-xs font-semibold text-slate-500 mb-1">Terms &amp; Conditions</p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{quotation.terms}</p>
            </div>
          )}

          {quotation.notes && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-xs font-semibold text-amber-700 mb-1">Notes</p>
              <p className="text-sm text-amber-800 whitespace-pre-wrap">{quotation.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function QuotationsPage() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [viewQuotation, setViewQuotation] = useState<Quotation | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<QuotationStatus | ''>('');

  const { data, isLoading } = useQuery({
    queryKey: ['quotations', statusFilter, search],
    queryFn: () => {
      const params = new URLSearchParams({ limit: '50' });
      if (statusFilter) params.set('status', statusFilter);
      if (search) params.set('search', search);
      return api.get(`/quotations?${params}`).then((r) => r.data);
    },
  });

  const quotations: Quotation[] = data?.data ?? [];

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/quotations/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['quotations'] }),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: QuotationStatus }) =>
      api.patch(`/quotations/${id}`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['quotations'] }),
  });

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Quotations</h1>
          <p className="page-subtitle">Create and manage shipping quotations</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-navy text-white rounded-xl text-sm font-semibold hover:bg-brand-navy/90 transition-colors"
        >
          <Plus className="w-4 h-4" /> New Quotation
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search quotation number, client name…"
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-navy/20 focus:border-brand-navy"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as QuotationStatus | '')}
          className="px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-navy/20 bg-white"
        >
          <option value="">All Statuses</option>
          {(Object.keys(STATUS_CONFIG) as QuotationStatus[]).map((s) => (
            <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-brand-navy border-t-transparent rounded-full animate-spin" />
          </div>
        ) : quotations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <FileSignature className="w-12 h-12 mb-3 opacity-40" />
            <p className="font-medium text-slate-500">No quotations yet</p>
            <p className="text-xs mt-1">Click <span className="font-semibold">New Quotation</span> to create one</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Quote #</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Client</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Order</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Valid Until</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Total</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {quotations.map((q) => {
                  const cfg = STATUS_CONFIG[q.status];
                  return (
                    <tr key={q.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3.5 font-mono font-semibold text-brand-navy">{q.quotationNumber}</td>
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-slate-800 truncate max-w-[140px]">{q.billToName}</p>
                        {q.billToEmail && <p className="text-xs text-slate-400 truncate">{q.billToEmail}</p>}
                      </td>
                      <td className="px-4 py-3.5 hidden md:table-cell">
                        {q.orderRef ? (
                          <span className="text-xs font-mono bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                            {q.orderRef.orderNumber}
                          </span>
                        ) : <span className="text-slate-300 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3.5 text-slate-500 hidden sm:table-cell">{formatDate(q.quotationDate)}</td>
                      <td className="px-4 py-3.5 hidden lg:table-cell">
                        {q.validUntil ? (
                          <span className={new Date(q.validUntil) < new Date() && q.status === 'SENT' ? 'text-red-500 font-semibold' : 'text-slate-500'}>
                            {formatDate(q.validUntil)}
                          </span>
                        ) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold text-slate-900">
                        {formatCurrency(q.total, q.currency)}
                        <span className="text-xs font-normal text-slate-400 ml-1">{q.currency}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        {isAdmin ? (
                          <select
                            value={q.status}
                            onChange={(e) => updateStatusMutation.mutate({ id: q.id, status: e.target.value as QuotationStatus })}
                            className={`text-xs font-semibold px-2 py-1 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-brand-navy/30 ${cfg.bg} ${cfg.color}`}
                          >
                            {(Object.keys(STATUS_CONFIG) as QuotationStatus[]).map((s) => (
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
                            onClick={() => setViewQuotation(q)}
                            className="p-1.5 text-slate-400 hover:text-brand-navy hover:bg-slate-100 rounded-lg transition-colors"
                            title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => { if (confirm(`Delete quotation ${q.quotationNumber}?`)) deleteMutation.mutate(q.id); }}
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

      {quotations.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-500">
          <span>{quotations.length} quotation{quotations.length !== 1 ? 's' : ''}</span>
          <span>·</span>
          <span>Accepted total: <span className="font-semibold text-green-700">
            {formatCurrency(quotations.filter((q) => q.status === 'ACCEPTED').reduce((s, q) => s + q.total, 0))}
          </span></span>
          <span>·</span>
          <span>Pending (sent): <span className="font-semibold text-slate-800">
            {formatCurrency(quotations.filter((q) => q.status === 'SENT').reduce((s, q) => s + q.total, 0))}
          </span></span>
        </div>
      )}

      {showCreate && (
        <CreateQuotationModal
          onClose={() => setShowCreate(false)}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ['quotations'] })}
        />
      )}
      {viewQuotation && (
        <QuotationDetailModal quotation={viewQuotation} onClose={() => setViewQuotation(null)} />
      )}
    </DashboardLayout>
  );
}
