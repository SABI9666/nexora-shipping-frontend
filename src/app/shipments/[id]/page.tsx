'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatusBadge } from '@/components/ui/StatusBadge';
import api from '@/lib/api';
import { formatDate, formatDateTime } from '@/lib/utils';
import { Shipment, ShipmentEvent } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import {
  ArrowLeft, MapPin, Package, Truck, Calendar, Trash2,
  RefreshCw, Loader2, AlertCircle, FileText, ExternalLink,
} from 'lucide-react';

export default function ShipmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [error, setError] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['shipment', id],
    queryFn: () => api.get(`/shipments/${id}`).then((r) => r.data),
    enabled: !!id,
  });

  const shipment: (Shipment & { events?: ShipmentEvent[]; documents?: { id: string; originalName: string; mimeType: string; size: number; type: string; url: string }[]; order?: { orderNumber: string; packageDescription?: string } | null }) | undefined = data?.data;

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/shipments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      router.push('/shipments');
    },
    onError: (err: { response?: { status?: number; data?: { message?: string } } }) => {
      const msg = err.response?.status === 403
        ? 'Only admins can delete shipments.'
        : err.response?.data?.message || 'Failed to delete shipment.';
      setError(msg);
    },
  });

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20 gap-2 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading shipment…
        </div>
      </DashboardLayout>
    );
  }

  if (isError || !shipment) {
    return (
      <DashboardLayout>
        <div className="max-w-md mx-auto bg-white border border-slate-200 rounded-xl p-8 text-center mt-12">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
          <p className="font-bold text-slate-800">Shipment not found</p>
          <p className="text-sm text-slate-500 mt-1">It may have been deleted, or you don&apos;t have access.</p>
          <Link href="/shipments" className="inline-flex items-center gap-1 mt-4 text-sm font-semibold text-brand-navy hover:underline">
            <ArrowLeft className="w-4 h-4" /> Back to shipments
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const events = shipment.events ?? [];
  const documents = shipment.documents ?? [];

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3 mb-6">
        <div>
          <Link href="/shipments" className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-brand-navy mb-1">
            <ArrowLeft className="w-3 h-3" /> Shipments
          </Link>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-slate-900 font-mono">{shipment.trackingNumber}</h1>
            <StatusBadge status={shipment.status} type="shipment" />
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Created {formatDate(shipment.createdAt)}
            {shipment.order ? <> · Linked to <span className="font-mono font-semibold text-brand-navy">{shipment.order.orderNumber}</span></> : null}
          </p>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (confirm(`Delete shipment ${shipment.trackingNumber}? This cannot be undone.`)) {
                  deleteMutation.mutate();
                }
              }}
              disabled={deleteMutation.isPending}
              className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-rose-700 border border-rose-200 rounded-xl hover:bg-rose-50 disabled:opacity-50"
            >
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Delete
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 text-rose-700 text-sm bg-rose-50 border border-rose-200 rounded-lg px-3 py-2.5 mb-4">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Summary */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Route</p>
            <div className="flex items-center gap-3 text-sm">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-600" />
                <span className="font-semibold text-slate-800">{shipment.origin}</span>
              </div>
              <span className="text-slate-300">→</span>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-rose-600" />
                <span className="font-semibold text-slate-800">{shipment.destination}</span>
              </div>
            </div>
            {shipment.currentLocation && (
              <div className="mt-3 inline-flex items-center gap-2 text-xs px-2.5 py-1 bg-brand-navy/5 border border-brand-navy/10 rounded-full">
                <Truck className="w-3 h-3 text-brand-navy" />
                Currently at <span className="font-semibold text-brand-navy">{shipment.currentLocation}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
            <Field label="Weight" value={`${shipment.weight} kg`} />
            <Field label="Carrier" value={shipment.carrier || '—'} />
            <Field label="Est. delivery" value={shipment.estimatedDelivery ? formatDate(shipment.estimatedDelivery) : '—'} icon={Calendar} />
            <Field label="Actual delivery" value={shipment.actualDelivery ? formatDate(shipment.actualDelivery) : '—'} icon={Calendar} />
          </div>

          {shipment.description && (
            <div className="pt-2 border-t border-slate-100">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Description</p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{shipment.description}</p>
            </div>
          )}

          {shipment.order && (
            <div className="pt-2 border-t border-slate-100">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Linked Order</p>
              <Link href={`/orders/${shipment.orderId}`} className="inline-flex items-center gap-2 text-sm font-semibold text-brand-navy hover:underline">
                <Package className="w-4 h-4" />
                {shipment.order.orderNumber}
                <ExternalLink className="w-3 h-3" />
              </Link>
              {shipment.order.packageDescription && (
                <p className="text-xs text-slate-500 mt-1">{shipment.order.packageDescription}</p>
              )}
            </div>
          )}
        </div>

        {/* Sender / created by */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Customer / Sender</p>
          {shipment.user ? (
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-brand-navy/10 text-brand-navy flex items-center justify-center font-bold text-sm">
                {(shipment.user.firstName?.[0] || '?')}{(shipment.user.lastName?.[0] || '')}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{shipment.user.firstName} {shipment.user.lastName}</p>
                <p className="text-xs text-slate-500 truncate">{shipment.user.email}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-400">—</p>
          )}
        </div>
      </div>

      {/* Documents */}
      {documents.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl mt-4 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Documents ({documents.length})
          </div>
          <div className="divide-y divide-slate-100">
            {documents.map((d) => (
              <div key={d.id} className="flex items-center gap-3 px-5 py-3">
                <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-800 truncate">{d.originalName}</p>
                  <p className="text-xs text-slate-400">{d.type} · {Math.round(d.size / 1024)} KB</p>
                </div>
                <a href={d.url} target="_blank" rel="noreferrer"
                   className="text-xs text-brand-navy hover:underline font-semibold flex items-center gap-1">
                  Open <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tracking timeline */}
      <div className="bg-white border border-slate-200 rounded-xl mt-4 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Tracking Timeline ({events.length})
          </p>
          <Link href="/shipments"
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-brand-navy">
            <RefreshCw className="w-3 h-3" /> Update from list
          </Link>
        </div>
        {events.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-400">
            No tracking events yet. Use the <span className="font-semibold">Update</span> action on the list to log progress.
          </div>
        ) : (
          <div className="px-5 py-4 space-y-3">
            {events.map((ev, idx) => (
              <div key={ev.id} className="flex gap-3">
                <div className="flex flex-col items-center pt-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-brand-navy" />
                  {idx !== events.length - 1 && <div className="flex-1 w-px bg-slate-200 mt-1" />}
                </div>
                <div className="flex-1 pb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <StatusBadge status={ev.status} type="shipment" />
                    <span className="text-xs text-slate-400">{formatDateTime(ev.timestamp)}</span>
                  </div>
                  <p className="text-sm text-slate-700 mt-1">{ev.description}</p>
                  <p className="text-xs text-slate-400 mt-0.5 inline-flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {ev.location}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function Field({ label, value, icon: Icon }: { label: string; value: string; icon?: React.ElementType }) {
  return (
    <div>
      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-slate-800 inline-flex items-center gap-1">
        {Icon && <Icon className="w-3.5 h-3.5 text-slate-400" />}
        {value}
      </p>
    </div>
  );
}
