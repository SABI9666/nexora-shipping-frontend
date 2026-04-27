'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { X, Loader2, Package, Users, UserCog } from 'lucide-react';
import api from '@/lib/api';
import { Account, ItemMaster, Salesperson } from '@/types';

const schema = z.object({
  pickupAddress: z.string().min(5, 'Required'),
  pickupCity: z.string().min(2, 'Required'),
  pickupCountry: z.string().length(2, 'Use 2-letter country code (e.g. US)'),
  deliveryAddress: z.string().min(5, 'Required'),
  deliveryCity: z.string().min(2, 'Required'),
  deliveryCountry: z.string().length(2, 'Use 2-letter country code'),
  packageDescription: z.string().min(5, 'Required'),
  weight: z.number({ coerce: true }).positive().max(1000),
  length: z.number({ coerce: true }).positive().optional(),
  width: z.number({ coerce: true }).positive().optional(),
  height: z.number({ coerce: true }).positive().optional(),
  declaredValue: z.number({ coerce: true }).positive().optional(),
  specialInstructions: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

// Cubic meters from cm dimensions
const formatCbm = (m3: number) => `${m3.toFixed(3)} m³`;

export function NewOrderModal({ onClose, onSuccess }: Props) {
  const [error, setError] = useState('');
  const [confirmMode, setConfirmMode] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [selectedRepId, setSelectedRepId] = useState('');

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { pickupCountry: 'US', deliveryCountry: 'US' },
  });

  // Fetch masters for dropdowns — gracefully handles 404 when backend not yet deployed
  const { data: accounts } = useQuery({
    queryKey: ['accounts-for-order'],
    queryFn: () => api.get('/accounts?limit=500').then((r) => r.data.data as Account[]).catch(() => [] as Account[]),
  });
  const { data: items } = useQuery({
    queryKey: ['items-for-order'],
    queryFn: () => api.get('/items?limit=500').then((r) => r.data.data as ItemMaster[]).catch(() => [] as ItemMaster[]),
  });
  const { data: salespersons } = useQuery({
    queryKey: ['salespersons-for-order'],
    queryFn: () =>
      api
        .get('/salespersons?limit=500&active=true')
        .then((r) => r.data.data as Salesperson[])
        .catch(() => [] as Salesperson[]),
  });

  const selectedRep = (salespersons ?? []).find((s) => s.id === selectedRepId) || null;

  const handleAccountSelect = (id: string) => {
    setSelectedAccountId(id);
    if (!id) return;
    const a = (accounts ?? []).find((x) => x.id === id);
    if (!a) return;
    const addr = a.deliveryAddress || a.address || '';
    if (addr) setValue('deliveryAddress', addr, { shouldValidate: true });
    if (a.place) setValue('deliveryCity', a.place, { shouldValidate: true });
    const note = `Customer: ${a.code} — ${a.name}${a.mobile1 ? ' · ' + a.mobile1 : ''}${a.trn ? ' · TRN ' + a.trn : ''}`;
    setValue('specialInstructions', note);
    // Auto-pick the account's primary salesperson if one is set
    if (a.repId && !selectedRepId) {
      setSelectedRepId(a.repId);
    }
  };

  const handleItemSelect = (id: string) => {
    setSelectedItemId(id);
    if (!id) return;
    const it = (items ?? []).find((x) => x.id === id);
    if (!it) return;
    const note = `Customer: ${it.code} — ${it.name}${it.phone ? ' · ' + it.phone : ''}`;
    setValue('specialInstructions', note);
  };

  const length = watch('length') || 0;
  const width = watch('width') || 0;
  const height = watch('height') || 0;
  const totalCbm = (length * width * height) / 1_000_000;

  const onSubmit = async (data: FormData) => {
    setError('');
    try {
      const payload = { ...data, repId: selectedRepId || undefined };
      const response = await api.post('/orders', payload);
      const orderId = response.data.data.id;
      setCreatedOrderId(orderId);
      setConfirmMode(true);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || 'Failed to create order');
    }
  };

  const handleConfirm = async () => {
    try {
      await api.post(`/orders/${createdOrderId}/confirm`);
      onSuccess();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || 'Failed to confirm order');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-brand-navy rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">{confirmMode ? 'Confirm Order' : 'New Shipping Order'}</h2>
              <p className="text-xs text-slate-500">{confirmMode ? 'Review and confirm your order' : 'Fill in the shipment details'}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {confirmMode ? (
          <div className="p-6">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
              <p className="text-green-800 font-medium text-sm">Order created successfully!</p>
              <p className="text-green-700 text-sm mt-1">
                Total CBM: <strong>{formatCbm(totalCbm)}</strong>
              </p>
              <p className="text-green-600 text-xs mt-2">
                Confirming will create a shipment and tracking number.
              </p>
            </div>
            {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
            <div className="flex gap-3">
              <button onClick={handleConfirm} className="flex-1 btn-primary py-2.5">
                Confirm & Create Shipment
              </button>
              <button onClick={onSuccess} className="flex-1 btn-outline py-2.5">
                Save as Draft
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
            {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

            {/* Customer picker (from Masters) */}
            <div className="bg-brand-navy/5 border border-brand-navy/20 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-brand-navy" />
                <h3 className="text-sm font-semibold text-brand-navy uppercase tracking-wide">
                  Customer (optional — auto-fills fields)
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Account Master</label>
                  <select
                    value={selectedAccountId}
                    onChange={(e) => handleAccountSelect(e.target.value)}
                    className="form-input"
                  >
                    <option value="">— Select account —</option>
                    {(accounts ?? []).map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.code} · {a.name}{a.mobile1 ? ` · ${a.mobile1}` : ''}
                      </option>
                    ))}
                  </select>
                  {(accounts ?? []).length === 0 && (
                    <p className="text-xs text-slate-400 mt-1">No accounts yet — add one in Account Master.</p>
                  )}
                </div>
                <div>
                  <label className="form-label">Item Master</label>
                  <select
                    value={selectedItemId}
                    onChange={(e) => handleItemSelect(e.target.value)}
                    className="form-input"
                  >
                    <option value="">— Select item —</option>
                    {(items ?? []).map((it) => (
                      <option key={it.id} value={it.id}>
                        {it.code} · {it.name}{it.phone ? ` · ${it.phone}` : ''}
                      </option>
                    ))}
                  </select>
                  {(items ?? []).length === 0 && (
                    <p className="text-xs text-slate-400 mt-1">No items yet — add one in Item Master.</p>
                  )}
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Selecting an Account fills delivery address + city, and pre-selects its default sales rep below.
              </p>
            </div>

            {/* Sales Rep picker */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <UserCog className="w-4 h-4 text-amber-700" />
                  <h3 className="text-sm font-semibold text-amber-800 uppercase tracking-wide">
                    Sales Rep (optional)
                  </h3>
                </div>
                <a
                  href="/admin/salesperson-master"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-amber-700 hover:underline font-semibold"
                >
                  Manage Reps →
                </a>
              </div>
              <select
                value={selectedRepId}
                onChange={(e) => setSelectedRepId(e.target.value)}
                className="form-input"
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
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600 bg-white border border-amber-200 rounded-lg px-3 py-2">
                  <span className="font-semibold text-amber-800">{selectedRep.code} · {selectedRep.name}</span>
                  {selectedRep.phone && <span>📞 {selectedRep.phone}</span>}
                  {selectedRep.email && <span>✉️ {selectedRep.email}</span>}
                </div>
              )}
              {(salespersons ?? []).length === 0 && (
                <p className="text-xs text-amber-700 mt-2">
                  No salespersons defined yet — add them in the Salesperson Master. You can also leave this empty
                  and assign a rep later from the order detail page.
                </p>
              )}
            </div>

            {/* Pickup */}
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wide">Pickup Location</h3>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="form-label">Street Address</label>
                  <input {...register('pickupAddress')} className="form-input" placeholder="123 Main St" />
                  {errors.pickupAddress && <p className="text-red-500 text-xs mt-1">{errors.pickupAddress.message}</p>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="form-label">City</label>
                    <input {...register('pickupCity')} className="form-input" placeholder="New York" />
                    {errors.pickupCity && <p className="text-red-500 text-xs mt-1">{errors.pickupCity.message}</p>}
                  </div>
                  <div>
                    <label className="form-label">Country Code</label>
                    <input {...register('pickupCountry')} className="form-input" placeholder="US" maxLength={2} />
                    {errors.pickupCountry && <p className="text-red-500 text-xs mt-1">{errors.pickupCountry.message}</p>}
                  </div>
                </div>
              </div>
            </div>

            {/* Delivery */}
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wide">Delivery Location</h3>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="form-label">Street Address</label>
                  <input {...register('deliveryAddress')} className="form-input" placeholder="456 Oak Ave" />
                  {errors.deliveryAddress && <p className="text-red-500 text-xs mt-1">{errors.deliveryAddress.message}</p>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="form-label">City</label>
                    <input {...register('deliveryCity')} className="form-input" placeholder="Los Angeles" />
                    {errors.deliveryCity && <p className="text-red-500 text-xs mt-1">{errors.deliveryCity.message}</p>}
                  </div>
                  <div>
                    <label className="form-label">Country Code</label>
                    <input {...register('deliveryCountry')} className="form-input" placeholder="US" maxLength={2} />
                    {errors.deliveryCountry && <p className="text-red-500 text-xs mt-1">{errors.deliveryCountry.message}</p>}
                  </div>
                </div>
              </div>
            </div>

            {/* Package */}
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wide">Package Details</h3>
              <div className="space-y-3">
                <div>
                  <label className="form-label">Package Description</label>
                  <input {...register('packageDescription')} className="form-input" placeholder="e.g. Electronics - Laptop" />
                  {errors.packageDescription && <p className="text-red-500 text-xs mt-1">{errors.packageDescription.message}</p>}
                </div>
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <label className="form-label">Weight (kg)</label>
                    <input {...register('weight')} type="number" step="0.1" className="form-input" placeholder="2.5" />
                    {errors.weight && <p className="text-red-500 text-xs mt-1">{errors.weight.message}</p>}
                  </div>
                  <div>
                    <label className="form-label">L (cm)</label>
                    <input {...register('length')} type="number" step="1" className="form-input" placeholder="40" />
                  </div>
                  <div>
                    <label className="form-label">W (cm)</label>
                    <input {...register('width')} type="number" step="1" className="form-input" placeholder="30" />
                  </div>
                  <div>
                    <label className="form-label">H (cm)</label>
                    <input {...register('height')} type="number" step="1" className="form-input" placeholder="10" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="form-label">Declared Value ($)</label>
                    <input {...register('declaredValue')} type="number" step="0.01" className="form-input" placeholder="Optional" />
                  </div>
                  <div className="flex items-end">
                    <div className="w-full p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <p className="text-xs text-slate-500 mb-0.5">Total CBM</p>
                      <p className="text-lg font-bold text-brand-navy">{formatCbm(totalCbm)}</p>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="form-label">Special Instructions</label>
                  <textarea {...register('specialInstructions')} className="form-input" rows={2} placeholder="Fragile, handle with care..." />
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={isSubmitting} className="flex-1 btn-primary py-2.5 flex items-center justify-center gap-2">
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {isSubmitting ? 'Creating...' : 'Create Order'}
              </button>
              <button type="button" onClick={onClose} className="flex-1 btn-outline py-2.5">Cancel</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
