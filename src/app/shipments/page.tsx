'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatusBadge } from '@/components/ui/StatusBadge';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Shipment, ShipmentStatus } from '@/types';
import { Truck, Search, ChevronLeft, ChevronRight, MapPin } from 'lucide-react';

const STATUS_FILTERS: { label: string; value: string }[] = [
  { label: 'All', value: '' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'In Transit', value: 'IN_TRANSIT' },
  { label: 'Out for Delivery', value: 'OUT_FOR_DELIVERY' },
  { label: 'Delivered', value: 'DELIVERED' },
  { label: 'Failed', value: 'FAILED' },
];

export default function ShipmentsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['shipments', page, search, status],
    queryFn: () =>
      api.get(`/shipments?page=${page}&limit=10&search=${encodeURIComponent(search)}&status=${status}`).then((r) => r.data),
  });

  const shipments: Shipment[] = data?.data ?? [];
  const meta = data?.meta;

  return (
    <DashboardLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Shipments</h1>
          <p className="page-subtitle">{meta?.total ?? 0} total shipments</p>
        </div>
        <Link href="/track" className="btn-outline flex items-center gap-2">
          <MapPin className="w-4 h-4" /> Track Package
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-6 p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by tracking number, location..."
            className="form-input pl-9 w-full"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => { setStatus(f.value); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                status === f.value
                  ? 'bg-brand-navy text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-brand-navy border-t-transparent rounded-full animate-spin" />
          </div>
        ) : shipments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Truck className="w-12 h-12 mb-3 opacity-50" />
            <p className="font-medium">No shipments found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tracking #</th>
                  <th>Route</th>
                  <th>Current Location</th>
                  <th>Weight</th>
                  <th>Status</th>
                  <th>Est. Delivery</th>
                  <th>Created</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {shipments.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <span className="font-mono text-sm font-semibold text-brand-navy">{s.trackingNumber}</span>
                    </td>
                    <td>
                      <div className="text-sm">
                        <span>{s.origin}</span>
                        <span className="text-slate-400 mx-1">→</span>
                        <span>{s.destination}</span>
                      </div>
                    </td>
                    <td className="text-sm text-slate-600">{s.currentLocation || '—'}</td>
                    <td className="text-sm">{s.weight} kg</td>
                    <td><StatusBadge status={s.status} type="shipment" /></td>
                    <td className="text-sm text-slate-600">{s.estimatedDelivery ? formatDate(s.estimatedDelivery) : '—'}</td>
                    <td className="text-sm text-slate-500">{formatDate(s.createdAt)}</td>
                    <td>
                      <Link href={`/shipments/${s.id}`} className="text-brand-navy text-xs hover:underline">View</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <p className="text-sm text-slate-500">
              Showing {(page - 1) * 10 + 1}–{Math.min(page * 10, meta.total)} of {meta.total}
            </p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => p - 1)} disabled={page === 1} className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-slate-700 font-medium">{page} / {meta.totalPages}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={page === meta.totalPages} className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
