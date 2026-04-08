'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatusBadge } from '@/components/ui/StatusBadge';
import api from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Order } from '@/types';
import { Plus, Search, Package, ChevronLeft, ChevronRight } from 'lucide-react';
import { NewOrderModal } from '@/components/orders/NewOrderModal';

export default function OrdersPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showNewOrder, setShowNewOrder] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['orders', page, search],
    queryFn: () =>
      api.get(`/orders?page=${page}&limit=10&search=${encodeURIComponent(search)}`).then((r) => r.data),
  });

  const orders: Order[] = data?.data ?? [];
  const meta = data?.meta;

  return (
    <DashboardLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Orders</h1>
          <p className="page-subtitle">{meta?.total ?? 0} total orders</p>
        </div>
        <button onClick={() => setShowNewOrder(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Order
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-6 p-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by order number, city..."
            className="form-input pl-9"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-brand-navy border-t-transparent rounded-full animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Package className="w-12 h-12 mb-3 opacity-50" />
            <p className="font-medium">No orders found</p>
            <p className="text-sm mt-1">Create your first order to get started</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Route</th>
                  <th>Package</th>
                  <th>Weight</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="cursor-pointer">
                    <td>
                      <span className="font-mono text-sm font-medium text-brand-navy">{order.orderNumber}</span>
                    </td>
                    <td>
                      <div className="text-sm">
                        <span className="font-medium">{order.pickupCity}</span>
                        <span className="text-slate-400 mx-1">→</span>
                        <span className="font-medium">{order.deliveryCity}</span>
                      </div>
                      <div className="text-xs text-slate-400">{order.pickupCountry} → {order.deliveryCountry}</div>
                    </td>
                    <td className="max-w-[160px]">
                      <p className="text-sm truncate">{order.packageDescription}</p>
                    </td>
                    <td className="text-sm">{order.weight} kg</td>
                    <td className="text-sm font-medium">{order.price ? formatCurrency(order.price) : '—'}</td>
                    <td><StatusBadge status={order.status} type="order" /></td>
                    <td className="text-sm text-slate-500">{formatDate(order.createdAt)}</td>
                    <td>
                      <Link href={`/orders/${order.id}`} className="text-brand-navy text-xs hover:underline">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <p className="text-sm text-slate-500">
              Showing {(page - 1) * 10 + 1}–{Math.min(page * 10, meta.total)} of {meta.total}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => p - 1)}
                disabled={page === 1}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-slate-700 font-medium">{page} / {meta.totalPages}</span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page === meta.totalPages}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {showNewOrder && (
        <NewOrderModal
          onClose={() => setShowNewOrder(false)}
          onSuccess={() => {
            setShowNewOrder(false);
            queryClient.invalidateQueries({ queryKey: ['orders'] });
          }}
        />
      )}
    </DashboardLayout>
  );
}
