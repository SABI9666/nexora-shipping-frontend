'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import {
  Receipt, Package, BookOpen, AlertCircle, FileSpreadsheet, FileText, ChevronRight,
} from 'lucide-react';

interface DashboardSnapshot {
  invoices: { total: number; monthCount: number; monthAmount: number; open: number };
  orders:   { total: number; monthCount: number; monthValue: number };
  vouchers: { total: number; monthCount: number; monthAmount: number };
}

const REPORTS = [
  {
    key: 'sales-summary',
    title: 'Sales Summary',
    desc: 'Invoices issued, paid, outstanding, broken down by status, month and customer.',
    icon: Receipt,
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  {
    key: 'orders-summary',
    title: 'Orders Summary',
    desc: 'Orders by status and salesperson, CBM and weight totals, destinations.',
    icon: Package,
    color: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  {
    key: 'voucher-register',
    title: 'Voucher Register',
    desc: 'All vouchers in a period — cash, bank, journal, receipts, payments, notes.',
    icon: BookOpen,
    color: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  {
    key: 'outstanding-receivables',
    title: 'Outstanding Receivables',
    desc: 'Open invoices with voucher-adjusted outstanding and days overdue.',
    icon: AlertCircle,
    color: 'bg-rose-50 text-rose-700 border-rose-200',
  },
  {
    key: 'account-statement',
    title: 'Account Statement',
    desc: 'Customer / supplier ledger — chronological Dr/Cr movement with running balance.',
    icon: FileSpreadsheet,
    color: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  {
    key: 'customer-statement',
    title: 'Customer Statement (SOA)',
    desc: 'Per-customer outstanding statement with aging days and cumulative balance — print and send.',
    icon: FileText,
    color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
];

export default function ReportsPage() {
  const { data } = useQuery({
    queryKey: ['reports-dashboard'],
    queryFn: () => api.get('/reports/dashboard').then((r) => r.data),
  });
  const snap: DashboardSnapshot | undefined = data?.data;

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
        <p className="text-sm text-slate-500">Drill into invoices, orders, vouchers and per-account ledgers — with CSV export.</p>
      </div>

      {/* This month tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Invoices this month</p>
            <Receipt className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{formatCurrency(snap?.invoices.monthAmount ?? 0)}</p>
          <p className="text-xs text-slate-500 mt-1">
            {snap?.invoices.monthCount ?? 0} invoices  ·  {snap?.invoices.open ?? 0} open
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Orders this month</p>
            <Package className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{formatCurrency(snap?.orders.monthValue ?? 0)}</p>
          <p className="text-xs text-slate-500 mt-1">
            {snap?.orders.monthCount ?? 0} orders  ·  {snap?.orders.total ?? 0} total
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Vouchers this month</p>
            <BookOpen className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{formatCurrency(snap?.vouchers.monthAmount ?? 0)}</p>
          <p className="text-xs text-slate-500 mt-1">
            {snap?.vouchers.monthCount ?? 0} vouchers  ·  {snap?.vouchers.total ?? 0} total
          </p>
        </div>
      </div>

      {/* Report cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {REPORTS.map((r) => {
          const Icon = r.icon;
          return (
            <Link
              key={r.key}
              href={`/reports/${r.key}`}
              className="group bg-white border border-slate-200 rounded-xl p-5 hover:border-brand-navy/40 hover:shadow-md transition-all"
            >
              <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl border ${r.color} mb-3`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex items-center gap-1 mb-1">
                <h3 className="text-base font-bold text-slate-900">{r.title}</h3>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-brand-navy group-hover:translate-x-0.5 transition-all" />
              </div>
              <p className="text-sm text-slate-500">{r.desc}</p>
            </Link>
          );
        })}
      </div>
    </DashboardLayout>
  );
}
