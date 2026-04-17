'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatusBadge } from '@/components/ui/StatusBadge';
import api from '@/lib/api';
import { formatDate, SHIPMENT_STATUS_CONFIG } from '@/lib/utils';
import { Shipment, ShipmentStatus } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { Truck, Search, ChevronLeft, ChevronRight, MapPin, RefreshCw, X, CheckCircle, AlertCircle } from 'lucide-react';

const STATUS_FILTERS: { label: string; value: string }[] = [
  { label: 'All', value: '' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Picked Up', value: 'PICKED_UP' },
  { label: 'In Transit', value: 'IN_TRANSIT' },
  { label: 'Out for Delivery', value: 'OUT_FOR_DELIVERY' },
  { label: 'Delivered', value: 'DELIVERED' },
  { label: 'Failed', value: 'FAILED' },
];

const UPDATABLE_STATUSES: { value: ShipmentStatus; label: string }[] = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'PICKED_UP', label: 'Picked Up' },
  { value: 'IN_TRANSIT', label: 'In Transit' },
  { value: 'OUT_FOR_DELIVERY', label: 'Out for Delivery' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'RETURNED', label: 'Returned' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

interface UpdateStatusForm {
  status: ShipmentStatus;
  location: string;
  description: string;
}

interface UpdateStatusModalProps {
  shipment: Shipment;
  onClose: () => void;
  onSuccess: () => void;
}

function UpdateStatusModal({ shipment, onClose, onSuccess }: UpdateStatusModalProps) {
  const [form, setForm] = useState<UpdateStatusForm>({
    status: shipment.status,
    location: shipment.currentLocation || '',
    description: '',
  });
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: (data: UpdateStatusForm) =>
      api.patch(`/shipments/${shipment.id}/status`, data),
    onSuccess: () => {
      onSuccess();
      onClose();
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      setError(err.response?.data?.message || 'Failed to update status. Please try again.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.location.trim()) { setError('Location is required.'); return; }
    if (!form.description.trim()) { setError('Description is required.'); return; }
    setError('');
    mutation.mutate(form);
  };

  const cfg = SHIPMENT_STATUS_CONFIG[form.status];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Update Shipment Status</h2>
            <p className="text-xs text-slate-500 font-mono mt-0.5">{shipment.trackingNumber}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Route info */}
          <div className="bg-slate-50 rounded-xl p-3 text-sm text-slate-600 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-brand-red flex-shrink-0" />
            <span>{shipment.origin}</span>
            <span className="text-slate-400 mx-1">→</span>
            <span>{shipment.destination}</span>
          </div>

          {/* Status select */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">New Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm(f => ({ ...f, status: e.target.value as ShipmentStatus }))}
              className="form-input w-full"
            >
              {UPDATABLE_STATUSES.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            {cfg && (
              <div className={`mt-2 inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.color}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                {cfg.label}
              </div>
            )}
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Current Location</label>
            <input
              type="text"
              value={form.location}
              onChange={(e) => setForm(f => ({ ...f, location: e.target.value }))}
              placeholder="e.g. Los Angeles, US"
              className="form-input w-full"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Update Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="e.g. Package arrived at sorting facility and is being processed"
              rows={3}
              className="form-input w-full resize-none"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex-1 px-4 py-2.5 rounded-xl bg-brand-navy text-white text-sm font-semibold hover:bg-brand-navy/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {mutation.isPending ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              {mutation.isPending ? 'Updating…' : 'Update Status'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ShipmentsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);

  const canUpdateStatus = user?.role === 'ADMIN' || user?.role === 'DRIVER';

  const { data, isLoading } = useQuery({
    queryKey: ['shipments', page, search, status],
    queryFn: () =>
      api.get(`/shipments?page=${page}&limit=10&search=${encodeURIComponent(search)}&status=${status}`).then((r) => r.data),
  });

  const shipments: Shipment[] = data?.data ?? [];
  const meta = data?.meta;

  const handleUpdateSuccess = (shipmentId: string) => {
    queryClient.invalidateQueries({ queryKey: ['shipments'] });
    setSuccessId(shipmentId);
    setTimeout(() => setSuccessId(null), 3000);
  };

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
                  <tr key={s.id} className={successId === s.id ? 'bg-green-50' : ''}>
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
                      <div className="flex items-center gap-2">
                        <Link href={`/shipments/${s.id}`} className="text-brand-navy text-xs hover:underline font-medium">
                          View
                        </Link>
                        {canUpdateStatus && (
                          <button
                            onClick={() => setSelectedShipment(s)}
                            className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-brand-navy border border-slate-200 hover:border-brand-navy/30 rounded-lg px-2 py-1 transition-all"
                          >
                            <RefreshCw className="w-3 h-3" />
                            Update
                          </button>
                        )}
                      </div>
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

      {/* Status Update Modal */}
      {selectedShipment && (
        <UpdateStatusModal
          shipment={selectedShipment}
          onClose={() => setSelectedShipment(null)}
          onSuccess={() => handleUpdateSuccess(selectedShipment.id)}
        />
      )}
    </DashboardLayout>
  );
}
