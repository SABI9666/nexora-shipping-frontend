'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import api from '@/lib/api';
import { downloadDocx } from '@/lib/downloadDocx';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Voucher, VoucherType, VoucherDirection } from '@/types';
import {
  Plus, BookOpen, Trash2, Search, Paperclip, ArrowUpRight, ArrowDownRight,
  Printer, Loader2, ChevronDown, Pencil,
} from 'lucide-react';
import { CreateVoucherModal } from './CreateVoucherModal';
import { SupplierPaymentVoucherModal } from './SupplierPaymentVoucherModal';
import { VOUCHER_TYPE_LABEL, VOUCHER_TYPE_COLOR, VOUCHER_USES_PAYMENT_FORM } from './constants';

export default function VouchersPage() {
  const queryClient = useQueryClient();
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const [activeType, setActiveType] = useState<VoucherType | null>(null);
  const [editingVoucher, setEditingVoucher] = useState<Voucher | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<VoucherType | ''>('');
  const [printingId, setPrintingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['vouchers', typeFilter, search],
    queryFn: () => {
      const params = new URLSearchParams({ limit: '100' });
      if (typeFilter) params.set('type', typeFilter);
      if (search) params.set('search', search);
      return api.get(`/vouchers?${params}`).then((r) => r.data);
    },
  });

  const vouchers: Voucher[] = data?.data ?? [];

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/vouchers/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vouchers'] }),
  });

  const handlePrint = async (v: Voucher) => {
    setPrintingId(v.id);
    try {
      await downloadDocx(`/vouchers/${v.id}/download/pdf`, `${v.voucherNumber}.pdf`);
    } catch {
      alert('Failed to download voucher PDF.');
    } finally {
      setPrintingId(null);
    }
  };

  const directionBadge = (dir: VoucherDirection) =>
    dir === 'CREDIT' ? (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
        <ArrowDownRight className="w-3 h-3" /> Credit
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700">
        <ArrowUpRight className="w-3 h-3" /> Debit
      </span>
    );

  const openCreate = (t: VoucherType) => {
    setEditingVoucher(null);
    setActiveType(t);
    setShowTypeMenu(false);
  };

  const closeModal = () => { setActiveType(null); setEditingVoucher(null); };
  const onModalSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['vouchers'] });
    closeModal();
  };

  // The type that drives which modal/flow to show — the edited voucher's
  // type when editing, otherwise the type chosen from the New menu.
  const modalType: VoucherType | null = editingVoucher ? editingVoucher.type : activeType;
  const modalOpen = modalType !== null;

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Vouchers</h1>
          <p className="text-sm text-slate-500">Cash, bank, journal, receipts, payments, credit / debit notes — each ledger-ready and printable.</p>
        </div>
        <div className="relative">
          <button onClick={() => setShowTypeMenu((v) => !v)}
            className="flex items-center gap-2 px-4 py-2 bg-brand-navy text-white rounded-xl text-sm font-semibold hover:bg-brand-navy/90 transition-colors">
            <Plus className="w-4 h-4" /> New Voucher <ChevronDown className="w-3.5 h-3.5" />
          </button>
          {showTypeMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowTypeMenu(false)} />
              <div className="absolute right-0 mt-1 w-64 bg-white border border-slate-200 rounded-xl shadow-lg z-20 py-1 max-h-96 overflow-y-auto">
                {(Object.keys(VOUCHER_TYPE_LABEL) as VoucherType[]).map((t) => (
                  <button key={t} onClick={() => openCreate(t)}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-slate-50">
                    <span className="text-slate-700">{VOUCHER_TYPE_LABEL[t]}</span>
                    {VOUCHER_USES_PAYMENT_FORM[t] && (
                      <span className="text-[10px] font-semibold text-brand-navy bg-brand-navy/10 px-1.5 py-0.5 rounded-full">
                        Bill alloc
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search voucher number, party, narration, cheque…"
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-navy/20 focus:border-brand-navy" />
        </div>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as VoucherType | '')}
          className="px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-navy/20 bg-white">
          <option value="">All Types</option>
          {(Object.keys(VOUCHER_TYPE_LABEL) as VoucherType[]).map((t) => (
            <option key={t} value={t}>{VOUCHER_TYPE_LABEL[t]}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-brand-navy" />
          </div>
        ) : vouchers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <BookOpen className="w-12 h-12 mb-3 opacity-40" />
            <p className="font-medium text-slate-500">No vouchers yet</p>
            <p className="text-xs mt-1">Click <span className="font-semibold">New Voucher</span> to create one</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Voucher #</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Reference</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Party</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Direction</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vouchers.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3.5 font-mono font-semibold text-brand-navy">{v.voucherNumber}</td>
                    <td className="px-4 py-3.5">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${VOUCHER_TYPE_COLOR[v.type]}`}>
                        {VOUCHER_TYPE_LABEL[v.type]}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-500 hidden sm:table-cell">{formatDate(v.voucherDate)}</td>
                    <td className="px-4 py-3.5 hidden md:table-cell">
                      {v.chequeNumber ? (
                        <span className="text-xs font-mono bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">
                          CHQ · {v.chequeNumber}
                        </span>
                      ) : v.invoice ? (
                        <span className="text-xs font-mono bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                          INV · {v.invoice.invoiceNumber}
                        </span>
                      ) : v.order ? (
                        <span className="text-xs font-mono bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">
                          ORD · {v.order.orderNumber}
                        </span>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 hidden lg:table-cell">
                      {v.account ? (
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-800 truncate max-w-[200px]">{v.account.code} · {v.account.name}</div>
                          {v.account.accountGroup?.name && (
                            <div className="text-[11px] text-slate-400 truncate max-w-[200px]">{v.account.accountGroup.name}</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-700">{v.partyName || v.issuedTo || v.invoice?.billToName || '—'}</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right font-bold text-slate-900">
                      {formatCurrency(v.amount, v.currency)}
                    </td>
                    <td className="px-4 py-3.5 text-center">{directionBadge(v.direction)}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => { setActiveType(null); setEditingVoucher(v); }}
                          className="p-1.5 text-slate-400 hover:text-brand-navy hover:bg-slate-100 rounded-lg transition-colors"
                          title="Edit voucher">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => handlePrint(v)} disabled={printingId === v.id}
                          className="p-1.5 text-slate-400 hover:text-brand-navy hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
                          title="Print / Share PDF">
                          {printingId === v.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                        </button>
                        {v.fileUrl && (
                          <a href={v.fileUrl} target="_blank" rel="noreferrer"
                            className="p-1.5 text-slate-400 hover:text-brand-navy hover:bg-slate-100 rounded-lg transition-colors"
                            title={v.fileName || 'Attachment'}>
                            <Paperclip className="w-4 h-4" />
                          </a>
                        )}
                        <button onClick={() => { if (confirm(`Delete voucher ${v.voucherNumber}?`)) deleteMutation.mutate(v.id); }}
                          disabled={deleteMutation.isPending}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Delete">
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

      {modalOpen && (
        VOUCHER_USES_PAYMENT_FORM[modalType]
          ? <SupplierPaymentVoucherModal type={modalType} voucher={editingVoucher}
              onClose={closeModal} onSuccess={onModalSuccess} />
          : <CreateVoucherModal voucher={editingVoucher}
              onClose={closeModal} onSuccess={onModalSuccess} />
      )}
    </DashboardLayout>
  );
}
