'use client';

import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import { formatCurrency, formatRelativeTime } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/StatusBadge';
import {
  Package, Truck, DollarSign, CheckCircle, ArrowRight, ArrowUpRight,
  Receipt, BookOpen, Wallet, TrendingUp, TrendingDown, FileSpreadsheet, Percent,
} from 'lucide-react';
import Link from 'next/link';
import { Order, Shipment } from '@/types';

interface DashboardSnapshot {
  invoices: { total: number; monthCount: number; monthAmount: number; open: number };
  orders: { total: number; monthCount: number; monthValue: number };
  vouchers: { total: number; monthCount: number; monthAmount: number };
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function DashboardPage() {
  const { user } = useAuth();

  const { data: orderStats } = useQuery({
    queryKey: ['order-stats'],
    queryFn: () => api.get('/orders/stats').then((r) => r.data.data),
  });

  const { data: shipmentStats } = useQuery({
    queryKey: ['shipment-stats'],
    queryFn: () => api.get('/shipments/stats').then((r) => r.data.data),
  });

  const { data: snapshot } = useQuery<DashboardSnapshot>({
    queryKey: ['reports-dashboard'],
    queryFn: () => api.get('/reports/dashboard').then((r) => r.data.data),
  });

  const { data: receivables } = useQuery({
    queryKey: ['dash-receivables'],
    queryFn: () => api.get('/reports/outstanding-receivables').then((r) => r.data.data).catch(() => null),
  });

  const { data: payables } = useQuery({
    queryKey: ['dash-payables'],
    queryFn: () => api.get('/reports/outstanding-payables').then((r) => r.data.data).catch(() => null),
  });

  const { data: recentOrders } = useQuery({
    queryKey: ['recent-orders'],
    queryFn: () => api.get('/orders?limit=5').then((r) => r.data.data as Order[]),
  });

  const { data: recentShipments } = useQuery({
    queryKey: ['recent-shipments'],
    queryFn: () => api.get('/shipments?limit=5').then((r) => r.data.data as Shipment[]),
  });

  const receivable = receivables?.totals?.outstandingAed ?? 0;
  const payable = payables?.totals?.totalOutstanding ?? 0;
  const netPosition = receivable - payable;

  const statCards = [
    {
      label: 'Total Orders',
      value: orderStats?.total ?? '—',
      icon: Package,
      color: 'bg-blue-500',
      subtext: `${orderStats?.byStatus?.COMPLETED ?? 0} completed`,
    },
    {
      label: 'Active Shipments',
      value: (shipmentStats?.byStatus?.IN_TRANSIT ?? 0) + (shipmentStats?.byStatus?.OUT_FOR_DELIVERY ?? 0),
      icon: Truck,
      color: 'bg-indigo-500',
      subtext: `${shipmentStats?.deliveredLast30Days ?? 0} delivered this month`,
    },
    {
      label: 'Total Revenue',
      value: formatCurrency(orderStats?.totalRevenue ?? 0),
      icon: DollarSign,
      color: 'bg-green-500',
      subtext: 'From completed orders',
    },
    {
      label: 'Delivered',
      value: shipmentStats?.byStatus?.DELIVERED ?? '—',
      icon: CheckCircle,
      color: 'bg-brand-red',
      subtext: 'All time deliveries',
    },
  ];

  // Report quick-links surfaced under the financial overview.
  const reportLinks = [
    { href: '/reports/sales-summary', label: 'Sales Summary', icon: Receipt },
    { href: '/reports/outstanding-receivables', label: 'Receivables', icon: TrendingUp },
    { href: '/reports/outstanding-payables', label: 'Payables', icon: TrendingDown },
    { href: '/reports/account-statement', label: 'Account Statement', icon: FileSpreadsheet },
    { href: '/reports/vat-ledger', label: 'VAT Ledger', icon: Percent },
    { href: '/reports/voucher-register', label: 'Voucher Register', icon: BookOpen },
  ];

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">
          {greeting()}, {user?.firstName}
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">Here&apos;s your business at a glance today.</p>
      </div>

      {/* ── Financial Overview (report dashboard) ─────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl mb-8 bg-gradient-to-br from-brand-navy via-[#12213c] to-[#0a1628] shadow-lg">
        <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-white/5" />
        <div className="absolute right-24 -bottom-20 w-56 h-56 rounded-full bg-white/5" />
        <div className="relative p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-[11px] font-semibold text-white/50 uppercase tracking-widest">This Month</p>
              <h2 className="text-lg font-bold text-white">Financial Overview</h2>
            </div>
            <Link href="/reports"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-semibold transition-colors backdrop-blur-sm">
              Full reports <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <FinTile
              label="Invoiced"
              icon={Receipt}
              value={formatCurrency(snapshot?.invoices.monthAmount ?? 0)}
              sub={`${snapshot?.invoices.monthCount ?? 0} invoices · ${snapshot?.invoices.open ?? 0} open`}
              accent="emerald"
            />
            <FinTile
              label="Order Value"
              icon={Package}
              value={formatCurrency(snapshot?.orders.monthValue ?? 0)}
              sub={`${snapshot?.orders.monthCount ?? 0} new orders`}
              accent="sky"
            />
            <FinTile
              label="Vouchers"
              icon={BookOpen}
              value={formatCurrency(snapshot?.vouchers.monthAmount ?? 0)}
              sub={`${snapshot?.vouchers.monthCount ?? 0} vouchers posted`}
              accent="amber"
            />
            <FinTile
              label="Net Position"
              icon={Wallet}
              value={formatCurrency(Math.abs(netPosition))}
              sub={netPosition >= 0 ? 'Net receivable' : 'Net payable'}
              accent={netPosition >= 0 ? 'emerald' : 'rose'}
            />
          </div>

          {/* Outstanding split + report quick links */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <OutstandingTile
                label="Receivable"
                hint="Customers owe you"
                value={formatCurrency(receivable)}
                positive
                href="/reports/outstanding-receivables"
              />
              <OutstandingTile
                label="Payable"
                hint="You owe suppliers"
                value={formatCurrency(payable)}
                href="/reports/outstanding-payables"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {reportLinks.map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 text-white/80 hover:text-white text-xs font-medium transition-colors">
                  <Icon className="w-3.5 h-3.5" /> {label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Operations stat cards ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {statCards.map(({ label, value, icon: Icon, color, subtext }) => (
          <div key={label} className="stat-card">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm text-slate-500 font-medium">{label}</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{value}</p>
              </div>
              <div className={`w-11 h-11 ${color} rounded-xl flex items-center justify-center`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
            </div>
            <p className="text-xs text-slate-400">{subtext}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Recent Orders</h2>
            <Link href="/orders" className="text-xs text-brand-navy hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {recentOrders?.length === 0 && (
              <p className="text-center py-8 text-slate-400 text-sm">No orders yet</p>
            )}
            {recentOrders?.map((order) => (
              <Link key={order.id} href={`/orders/${order.id}`} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors">
                <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Package className="w-4 h-4 text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{order.orderNumber}</p>
                  <p className="text-xs text-slate-500 truncate">{order.deliveryCity}, {order.deliveryCountry}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <StatusBadge status={order.status} type="order" />
                  <p className="text-xs text-slate-400 mt-1">{formatRelativeTime(order.createdAt)}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Shipments */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Recent Shipments</h2>
            <Link href="/shipments" className="text-xs text-brand-navy hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {recentShipments?.length === 0 && (
              <p className="text-center py-8 text-slate-400 text-sm">No shipments yet</p>
            )}
            {recentShipments?.map((shipment) => (
              <Link key={shipment.id} href={`/shipments/${shipment.id}`} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors">
                <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Truck className="w-4 h-4 text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 font-mono truncate">{shipment.trackingNumber}</p>
                  <p className="text-xs text-slate-500 truncate">{shipment.origin} → {shipment.destination}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <StatusBadge status={shipment.status} type="shipment" />
                  <p className="text-xs text-slate-400 mt-1">{formatRelativeTime(shipment.createdAt)}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

const ACCENT: Record<string, string> = {
  emerald: 'text-emerald-300 bg-emerald-400/15',
  sky: 'text-sky-300 bg-sky-400/15',
  amber: 'text-amber-300 bg-amber-400/15',
  rose: 'text-rose-300 bg-rose-400/15',
};

function FinTile({ label, value, sub, icon: Icon, accent }: {
  label: string; value: string; sub: string; icon: typeof Receipt; accent: keyof typeof ACCENT | string;
}) {
  return (
    <div className="rounded-xl bg-white/[0.07] border border-white/10 p-4 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-2.5">
        <p className="text-[11px] font-semibold text-white/60 uppercase tracking-wider">{label}</p>
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${ACCENT[accent] || ACCENT.sky}`}>
          <Icon className="w-3.5 h-3.5" />
        </div>
      </div>
      <p className="text-xl font-bold text-white tabular-nums leading-tight">{value}</p>
      <p className="text-[11px] text-white/50 mt-1">{sub}</p>
    </div>
  );
}

function OutstandingTile({ label, hint, value, positive, href }: {
  label: string; hint: string; value: string; positive?: boolean; href: string;
}) {
  return (
    <Link href={href}
      className="group rounded-xl bg-white/[0.07] border border-white/10 p-4 backdrop-blur-sm hover:bg-white/[0.12] transition-colors">
      <div className="flex items-center gap-2 mb-1.5">
        <span className={`w-1.5 h-1.5 rounded-full ${positive ? 'bg-emerald-400' : 'bg-rose-400'}`} />
        <p className="text-[11px] font-semibold text-white/60 uppercase tracking-wider">{label}</p>
        <ArrowUpRight className="w-3 h-3 text-white/30 group-hover:text-white/70 ml-auto transition-colors" />
      </div>
      <p className={`text-lg font-bold tabular-nums ${positive ? 'text-emerald-300' : 'text-rose-300'}`}>{value}</p>
      <p className="text-[11px] text-white/45 mt-0.5">{hint}</p>
    </Link>
  );
}
