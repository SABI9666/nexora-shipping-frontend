'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatusBadge } from '@/components/ui/StatusBadge';
import api from '@/lib/api';
import { formatCurrency, formatDate, formatDateTime, formatFileSize, SHIPMENT_STATUS_CONFIG } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { Order, Shipment, Document, OrderStatus, Salesperson } from '@/types';

type OrderDetail = Omit<Order, 'shipment' | 'documents'> & {
  shipment?: Shipment;
  documents: Document[];
};
import {
  ArrowLeft, Package, MapPin, Truck, FileText, Download,
  Edit2, Trash2, CheckCircle, AlertCircle, X, Loader2,
  Calendar, Weight, DollarSign, Hash, User, UserCog, Phone, Mail,
} from 'lucide-react';

const DOC_TYPE_LABELS: Record<string, string> = {
  invoice: 'Invoice',
  bill_of_lading: 'Bill of Lading',
  customs: 'Customs Declaration',
  proof_of_delivery: 'Proof of Delivery',
  other: 'Other',
};

const MIME_ICONS: Record<string, string> = {
  'application/pdf': '📄',
  'image/jpeg': '🖼️',
  'image/png': '🖼️',
  'application/msword': '📝',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '📝',
  'application/vnd.ms-excel': '📊',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '📊',
};

const ORDER_STATUSES: OrderStatus[] = ['DRAFT', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'COMPLETED', 'CANCELLED'];

interface EditOrderModalProps {
  order: Order;
  onClose: () => void;
  onSuccess: () => void;
}

function EditOrderModal({ order, onClose, onSuccess }: EditOrderModalProps) {
  const [form, setForm] = useState({
    status: order.status,
    packageDescription: order.packageDescription,
    weight: String(order.weight),
    declaredValue: String(order.declaredValue ?? ''),
    specialInstructions: order.specialInstructions ?? '',
    repId: order.repId ?? '',
  });
  const [error, setError] = useState('');

  const { data: salespersons } = useQuery({
    queryKey: ['salespersons-for-order-edit'],
    queryFn: () =>
      api
        .get('/salespersons?limit=500&active=true')
        .then((r) => r.data.data as Salesperson[])
        .catch(() => [] as Salesperson[]),
  });

  const selectedRep = (salespersons ?? []).find((s) => s.id === form.repId) || null;

  const mutation = useMutation({
    mutationFn: () => api.patch(`/orders/${order.id}`, {
      status: form.status,
      packageDescription: form.packageDescription,
      weight: parseFloat(form.weight),
      declaredValue: form.declaredValue ? parseFloat(form.declaredValue) : undefined,
      specialInstructions: form.specialInstructions || undefined,
      // empty string clears the rep on the backend
      repId: form.repId,
    }),
    onSuccess: () => { onSuccess(); onClose(); },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      setError(err.response?.data?.message || 'Failed to update order.');
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">Edit Order</h2>
            <p className="text-xs text-slate-500 font-mono">{order.orderNumber}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
            </div>
          )}

          <div>
            <label className="form-label">Status</label>
            <select value={form.status} onChange={(e) => setForm(f => ({ ...f, status: e.target.value as OrderStatus }))} className="form-input w-full">
              {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Sales Rep — admins can add or change after the order is created */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="form-label !mb-0 flex items-center gap-1.5">
                <UserCog className="w-3.5 h-3.5 text-amber-700" />
                Sales Rep
              </label>
              <a
                href="/admin/salesperson-master"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-amber-700 hover:underline font-semibold"
              >
                Manage Reps
              </a>
            </div>
            <select
              value={form.repId}
              onChange={(e) => setForm(f => ({ ...f, repId: e.target.value }))}
              className="form-input w-full"
            >
              <option value="">— No sales rep —</option>
              {(salespersons ?? []).map((sp) => {
                const extras = [sp.phone, sp.email].filter(Boolean).join(' · ');
                return (
                  <option key={sp.id} value={sp.id}>
                    {sp.code} · {sp.name}{extras ? ` · ${extras}` : ''}
                  </option>
                );
              })}
            </select>
            {selectedRep && (
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                <span className="font-semibold text-amber-800">{selectedRep.code} · {selectedRep.name}</span>
                {selectedRep.phone && (
                  <span className="inline-flex items-center gap-1"><Phone className="w-3 h-3" /> {selectedRep.phone}</span>
                )}
                {selectedRep.email && (
                  <span className="inline-flex items-center gap-1"><Mail className="w-3 h-3" /> {selectedRep.email}</span>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="form-label">Package Description</label>
            <input
              type="text"
              value={form.packageDescription}
              onChange={(e) => setForm(f => ({ ...f, packageDescription: e.target.value }))}
              className="form-input w-full"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Weight (kg)</label>
              <input
                type="number"
                value={form.weight}
                onChange={(e) => setForm(f => ({ ...f, weight: e.target.value }))}
                className="form-input w-full"
                min="0.1" step="0.1"
              />
            </div>
            <div>
              <label className="form-label">Declared Value ($)</label>
              <input
                type="number"
                value={form.declaredValue}
                onChange={(e) => setForm(f => ({ ...f, declaredValue: e.target.value }))}
                className="form-input w-full"
                min="0"
              />
            </div>
          </div>

          <div>
            <label className="form-label">Special Instructions</label>
            <textarea
              value={form.specialInstructions}
              onChange={(e) => setForm(f => ({ ...f, specialInstructions: e.target.value }))}
              rows={3}
              className="form-input w-full resize-none"
              placeholder="Any special handling notes..."
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50">
            Cancel
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="flex-1 px-4 py-2.5 rounded-xl bg-brand-navy text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            {mutation.isPending ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

interface DeleteConfirmProps {
  orderNumber: string;
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}

function DeleteConfirm({ orderNumber, onConfirm, onCancel, isPending }: DeleteConfirmProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mb-4">
          <AlertCircle className="w-6 h-6 text-red-600" />
        </div>
        <h3 className="font-bold text-slate-900 text-lg mb-1">Delete Order?</h3>
        <p className="text-slate-500 text-sm mb-5">
          This will permanently delete order <span className="font-mono font-semibold text-slate-800">{orderNumber}</span> and all related data. This cannot be undone.
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['order', id],
    queryFn: () => api.get(`/orders/${id}`).then((r) => r.data.data as OrderDetail),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/orders/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      router.push('/orders');
    },
  });

  const handleDownload = async (doc: Document) => {
    try {
      const res = await api.get(`/documents/${doc.id}/signed-url`);
      window.open(res.data.data.signedUrl, '_blank');
    } catch {
      alert('Failed to get download link');
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-brand-navy border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !data) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <AlertCircle className="w-12 h-12 mb-3" />
          <p className="font-medium">Order not found</p>
          <Link href="/orders" className="mt-4 text-brand-navy text-sm hover:underline">← Back to Orders</Link>
        </div>
      </DashboardLayout>
    );
  }

  const order = data;
  const docs: Document[] = order.documents ?? [];
  const shipment = order.shipment;
  const shipmentCfg = shipment ? SHIPMENT_STATUS_CONFIG[shipment.status as keyof typeof SHIPMENT_STATUS_CONFIG] : null;
  const rep = order.salesperson;

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/orders" className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-slate-900 font-mono">{order.orderNumber}</h1>
              <StatusBadge status={order.status} type="order" />
            </div>
            <p className="text-sm text-slate-500 mt-0.5">Created {formatDate(order.createdAt)}</p>
          </div>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowEdit(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors"
            >
              <Edit2 className="w-4 h-4" /> Edit Order
            </button>
            <button
              onClick={() => setShowDelete(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-100 transition-colors"
            >
              <Trash2 className="w-4 h-4" /> Delete
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <MapPin className="w-4 h-4" /> Shipping Route
            </h2>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1">
                <p className="text-xs text-slate-400 uppercase tracking-wider">Pickup</p>
                <p className="font-semibold text-slate-900">{order.pickupCity}, {order.pickupCountry}</p>
                <p className="text-sm text-slate-600">{order.pickupAddress}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-slate-400 uppercase tracking-wider">Delivery</p>
                <p className="font-semibold text-slate-900">{order.deliveryCity}, {order.deliveryCountry}</p>
                <p className="text-sm text-slate-600">{order.deliveryAddress}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Package className="w-4 h-4" /> Package Details
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[
                { icon: Hash, label: 'Description', value: order.packageDescription },
                { icon: Weight, label: 'Weight', value: `${order.weight} kg` },
                { icon: DollarSign, label: 'Declared Value', value: order.declaredValue ? formatCurrency(order.declaredValue) : '—' },
                ...(order.length ? [{ icon: Package, label: 'Dimensions', value: `${order.length}×${order.width}×${order.height} cm` }] : []),
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="bg-slate-50 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Icon className="w-3.5 h-3.5 text-slate-400" />
                    <p className="text-xs text-slate-500">{label}</p>
                  </div>
                  <p className="text-sm font-semibold text-slate-800">{value}</p>
                </div>
              ))}
            </div>
            {order.specialInstructions && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <p className="text-xs font-semibold text-amber-700 mb-1">Special Instructions</p>
                <p className="text-sm text-amber-800">{order.specialInstructions}</p>
              </div>
            )}
          </div>

          {shipment && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Truck className="w-4 h-4" /> Shipment
              </h2>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-mono font-bold text-brand-navy text-lg">{shipment.trackingNumber}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{shipment.origin} → {shipment.destination}</p>
                </div>
                {shipmentCfg && (
                  <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${shipmentCfg.bg} ${shipmentCfg.color}`}>
                    {shipmentCfg.label}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                {shipment.currentLocation && (
                  <div className="bg-slate-50 rounded-xl p-3">
                    <p className="text-xs text-slate-400 mb-1">Current Location</p>
                    <p className="font-semibold text-slate-800">{shipment.currentLocation}</p>
                  </div>
                )}
                {shipment.estimatedDelivery && (
                  <div className="bg-slate-50 rounded-xl p-3">
                    <p className="text-xs text-slate-400 mb-1">Est. Delivery</p>
                    <p className="font-semibold text-slate-800">{formatDate(shipment.estimatedDelivery)}</p>
                  </div>
                )}
                {shipment.carrier && (
                  <div className="bg-slate-50 rounded-xl p-3">
                    <p className="text-xs text-slate-400 mb-1">Carrier</p>
                    <p className="font-semibold text-slate-800">{shipment.carrier}</p>
                  </div>
                )}
              </div>
              <div className="mt-3">
                <Link href={`/track?number=${shipment.trackingNumber}`} className="text-xs text-brand-navy hover:underline font-medium">
                  Track this shipment →
                </Link>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4" /> Attached Documents ({docs.length})
              </h2>
              <Link href="/documents" className="text-xs text-brand-navy hover:underline">
                Upload document →
              </Link>
            </div>
            {docs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                <FileText className="w-10 h-10 mb-2 opacity-40" />
                <p className="text-sm">No documents attached to this order</p>
                <Link href="/documents" className="text-xs text-brand-navy hover:underline mt-2">
                  Upload a document
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {docs.map((doc) => (
                  <div key={doc.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors">
                    <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center text-lg flex-shrink-0">
                      {MIME_ICONS[doc.mimeType] || '📎'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{doc.originalName}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                          {DOC_TYPE_LABELS[doc.type] || doc.type}
                        </span>
                        <span className="text-xs text-slate-400">{formatFileSize(doc.size)}</span>
                        <span className="text-xs text-slate-400">{formatDateTime(doc.createdAt)}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDownload(doc)}
                      className="p-2 text-slate-400 hover:text-brand-navy hover:bg-slate-100 rounded-lg transition-colors"
                      title="Download"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-5">
          {/* Sales Rep card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                <UserCog className="w-4 h-4" /> Sales Rep
              </h2>
              {isAdmin && (
                <button
                  onClick={() => setShowEdit(true)}
                  className="text-xs text-brand-navy hover:underline font-semibold"
                >
                  {rep || order.repName ? 'Change' : 'Add Rep'}
                </button>
              )}
            </div>
            {rep ? (
              <div className="space-y-1.5">
                <p className="text-sm font-bold text-slate-900">{rep.name}</p>
                <p className="text-xs text-slate-500 font-mono">{rep.code}</p>
                {rep.phone && (
                  <p className="text-xs text-slate-600 inline-flex items-center gap-1.5">
                    <Phone className="w-3 h-3 text-slate-400" /> {rep.phone}
                  </p>
                )}
                {rep.email && (
                  <p className="text-xs text-slate-600 inline-flex items-center gap-1.5">
                    <Mail className="w-3 h-3 text-slate-400" /> {rep.email}
                  </p>
                )}
              </div>
            ) : order.repName ? (
              <p className="text-sm text-slate-700">{order.repName}</p>
            ) : (
              <p className="text-sm text-slate-400 italic">
                No rep assigned{isAdmin ? ' — click "Add Rep" to assign one.' : '.'}
              </p>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <DollarSign className="w-4 h-4" /> Order Summary
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Shipping fee</span>
                <span className="font-semibold">{order.price ? formatCurrency(order.price) : '—'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Documents</span>
                <span className="font-semibold">{docs.length} file{docs.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="border-t border-slate-100 pt-3 flex justify-between">
                <span className="font-semibold text-slate-800">Total</span>
                <span className="font-bold text-brand-navy text-lg">{order.price ? formatCurrency(order.price) : '—'}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <User className="w-4 h-4" /> Info
            </h2>
            <div className="space-y-2.5 text-sm">
              {[
                { label: 'Order #', value: order.orderNumber },
                { label: 'Created', value: formatDate(order.createdAt) },
                { label: 'Updated', value: formatDate(order.updatedAt) },
                ...(order.user ? [{ label: 'Customer', value: `${order.user.firstName} ${order.user.lastName}` }] : []),
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between">
                  <span className="text-slate-400">{label}</span>
                  <span className="font-medium text-slate-800 text-right max-w-[160px] truncate">{value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Timeline
            </h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-slate-700">Order Created</p>
                  <p className="text-xs text-slate-400">{formatDateTime(order.createdAt)}</p>
                </div>
              </div>
              {shipment && (
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-slate-700">Shipment Created</p>
                    <p className="text-xs text-slate-400">{formatDateTime(shipment.createdAt)}</p>
                  </div>
                </div>
              )}
              {shipment?.estimatedDelivery && (
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-orange-400 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-slate-700">Est. Delivery</p>
                    <p className="text-xs text-slate-400">{formatDate(shipment.estimatedDelivery)}</p>
                  </div>
                </div>
              )}
              {shipment?.actualDelivery && (
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-green-600 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-slate-700">Delivered</p>
                    <p className="text-xs text-slate-400">{formatDateTime(shipment.actualDelivery)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showEdit && (
        <EditOrderModal
          order={order}
          onClose={() => setShowEdit(false)}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ['order', id] })}
        />
      )}

      {showDelete && (
        <DeleteConfirm
          orderNumber={order.orderNumber}
          onConfirm={() => deleteMutation.mutate()}
          onCancel={() => setShowDelete(false)}
          isPending={deleteMutation.isPending}
        />
      )}
    </DashboardLayout>
  );
}
