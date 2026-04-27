'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Loader2, Package } from 'lucide-react';
import api from '@/lib/api';

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

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { pickupCountry: 'US', deliveryCountry: 'US' },
  });

  const length = watch('length') || 0;
  const width = watch('width') || 0;
  const height = watch('height') || 0;
  const totalCbm = (length * width * height) / 1_000_000;

  const onSubmit = async (data: FormData) => {
    setError('');
    try {
      const response = await api.post('/orders', data);
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
        {/* Header */}
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
