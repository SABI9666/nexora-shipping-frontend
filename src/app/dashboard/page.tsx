'use client';

import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import { formatCurrency, formatRelativeTime, SHIPMENT_STATUS_CONFIG, ORDER_STATUS_CONFIG } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Package, Truck, DollarSign, CheckCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Order, Shipment } from '@/types';

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

  const { data: recentOrders } = useQuery({
    queryKey: ['recent-orders'],
    queryFn: () => api.get('/orders?limit=5').then((r) => r.data.data as Order[]),
  });

  const { data: recentShipments } = useQuery({
    queryKey: ['recent-shipments'],
    queryFn: () => api.get('/shipments?limit=5').then((r) => r.data.data as Shipment[]),
  });

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

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">
          Good morning, {user?.firstName}
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">Here&apos;s what&apos;s happening with your shipments today.</p>
      </div>

      {/* Stat cards */}
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
