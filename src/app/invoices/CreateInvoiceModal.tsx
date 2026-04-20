'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { InvoiceStatus, InvoiceCurrency, Order } from '@/types';
import {
  Plus, X, AlertCircle, CheckCircle, Loader2, ChevronDown, ChevronUp,
} from 'lucide-react';

const CURRENCIES: InvoiceCurrency[] = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'INR'];

const STATUSES: { value: InvoiceStatus; label: string }[] = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'SENT', label: 'Sent' },
  { value: 'PAID', label: 'Paid' },
  { value: 'OVERDUE', label: 'Overdue' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const PAYMENT_TERMS_OPTIONS = [
  'Net 7', 'Net 15', 'Net 30', 'Net 60', 'Due on Receipt', 'Custom',
];

const COUNTRIES = [
  { code: 'US', name: 'United States' }, { code: 'GB', name: 'United Kingdom' },
  { code: 'CA', name: 'Canada' }, { code: 'AU', name: 'Australia' },
  { code: 'DE', name: 'Germany' }, { code: 'FR', name: 'France' },
  { code: 'IN', name: 'India' }, { code: 'CN', name: 'China' },
  { code: 'JP', name: 'Japan' }, { code: 'SG', name: 'Singapore' },
  { code: 'AE', name: 'UAE' }, { code: 'NL', name: 'Netherlands' },
  { code: 'BR', name: 'Brazil' }, { code: 'MX', name: 'Mexico' },
  { code: 'PK', name: 'Pakistan' }, { code: 'BD', name: 'Bangladesh' },
  { code: 'PH', name: 'Philippines' }, { code: 'MY', name: 'Malaysia' },
  { code: 'TH', name: 'Thailand' }, { code: 'ZA', name: 'South Africa' },
];

interface LineItem { description: string; quantity: string; unitPrice: string }

interface InvoiceForm {
  orderId: string;
  billToName: string; billToAddress: string; billToCity: string; billToCountry: string;
  billToEmail: string; billToPhone: string;
  shipFromName: string; shipFromAddress: string; shipFromCity: string; shipFromCountry: string;
  currency: InvoiceCurrency;
  taxRate: string; shippingCost: string;
  paymentTerms: string; notes: string; dueDate: string;
  status: InvoiceStatus;
  items: LineItem[];
}

const emptyForm = (): InvoiceForm => ({
  orderId: '',
  billToName: '', billToAddress: '', billToCity: '', billToCountry: 'US',
  billToEmail: '', billToPhone: '',
  shipFromName: 'Nexora Express', shipFromAddress: '1 Nexora Way',
  shipFromCity: 'London', shipFromCountry: 'GB',
  currency: 'USD',
  taxRate: '0', shippingCost: '0',
  paymentTerms: 'Net 30', notes: '', dueDate: '',
  status: 'DRAFT',
  items: [{ description: 'Shipping Service', quantity: '1', unitPrice: '' }],
});

function calcSubtotal(items: LineItem[]) {
  return items.reduce((s, i) => s + (parseFloat(i.quantity) || 0) * (parseFloat(i.unitPrice) || 0), 0);
}

export function CreateInvoiceModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState<InvoiceForm>(emptyForm());
  const [error, setError] = useState('');
  const [showShipFrom, setShowShipFrom] = useState(false);

  const { data: ordersData } = useQuery({
    queryKey: ['orders-for-invoice'],
    queryFn: () => api.get('/orders?limit=100').then((r) => r.data.data as Order[]),
  });
  const orders: Order[] = ordersData ?? [];

  const mutation = useMutation({
    mutationFn: () => api.post('/invoices', {
      orderId: form.orderId || undefined,
      billToName: form.billToName,
      billToAddress: form.billToAddress,
      billToCity: form.billToCity,
      billToCountry: form.billToCountry,
      billToEmail: form.billToEmail || undefined,
      billToPhone: form.billToPhone || undefined,
      shipFromName: form.shipFromName,
      shipFromAddress: form.shipFromAddress,
      shipFromCity: form.shipFromCity,
      shipFromCountry: form.shipFromCountry,
      currency: form.currency,
      taxRate: parseFloat(form.taxRate) || 0,
      shippingCost: parseFloat(form.shippingCost) || 0,
      paymentTerms: form.paymentTerms || undefined,
      notes: form.notes || undefined,
      dueDate: form.dueDate || undefined,
      status: form.status,
      items: form.items.map((i) => ({
        description: i.description,
        quantity: parseFloat(i.quantity) || 1,
        unitPrice: parseFloat(i.unitPrice) || 0,
      })),
    }),
    onSuccess: () => { onSuccess(); onClose(); },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      setError(err.response?.data?.message || 'Failed to create invoice.');
    },
  });

  const set = (key: keyof InvoiceForm, val: string) => setForm((f) => ({ ...f, [key]: val }));
  const setItem = (idx: number, key: keyof LineItem, val: string) =>
    setForm((f) => {
      const items = [...f.items];
      items[idx] = { ...items[idx], [key]: val };
      return { ...f, items };
    });
  const addItem = () =>
    setForm((f) => ({ ...f, items: [...f.items, { description: '', quantity: '1', unitPrice: '' }] }));
  const removeItem = (idx: number) =>
    setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));

  const handleOrderSelect = useCallback((orderId: string) => {
    setForm((f) => ({ ...f, orderId }));
    if (!orderId) return;
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;
    setForm((f) => ({
      ...f,
      orderId,
      billToCity: order.deliveryCity,
      billToCountry: order.deliveryCountry,
      billToAddress: order.deliveryAddress,
      items: [{ description: `Shipping: ${order.packageDescription}`, quantity: '1', unitPrice: String(order.price ?? '') }],
    }));
  }, [orders]);

  const subtotal = calcSubtotal(form.items);
  const tax = subtotal * ((parseFloat(form.taxRate) || 0) / 100);
  const shipping = parseFloat(form.shippingCost) || 0;
  const total = subtotal + tax + shipping;

  const inputCls = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy/20 focus:border-brand-navy';
  const labelCls = 'block text-xs font-semibold text-slate-600 mb-1';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">Create Invoice</h2>
            <p className="text-xs text-slate-400 mt-0.5">Invoice number auto-generated on save</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-3 sm:col-span-1">
              <label className={labelCls}>Link to Order <span className="text-slate-400 font-normal">(optional)</span></label>
              <select value={form.orderId} onChange={(e) => handleOrderSelect(e.target.value)} className={inputCls}>
                <option value="">— Select order —</option>
                {orders.map((o) => (
                  <option key={o.id} value={o.id}>{o.orderNumber} · {o.deliveryCity} · {o.status}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Status</label>
              <select value={form.status} onChange={(e) => set('status', e.target.value)} className={inputCls}>
                {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Currency</label>
              <select value={form.currency} onChange={(e) => set('currency', e.target.value)} className={inputCls}>
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Invoice Date</label>
              <input type="date" disabled value={new Date().toISOString().split('T')[0]}
                className={`${inputCls} bg-slate-50 text-slate-400`} />
            </div>
            <div>
              <label className={labelCls}>Due Date <span className="text-slate-400 font-normal">(optional)</span></label>
              <input type="date" value={form.dueDate} onChange={(e) => set('dueDate', e.target.value)} className={inputCls} />
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Bill To</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className={labelCls}>Full Name / Company *</label>
                <input value={form.billToName} onChange={(e) => set('billToName', e.target.value)}
                  placeholder="John Smith / Acme Corp" className={inputCls} />
              </div>
              <div className="col-span-2">
                <label className={labelCls}>Address *</label>
                <input value={form.billToAddress} onChange={(e) => set('billToAddress', e.target.value)}
                  placeholder="123 Main Street" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>City *</label>
                <input value={form.billToCity} onChange={(e) => set('billToCity', e.target.value)}
                  placeholder="New York" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Country *</label>
                <select value={form.billToCountry} onChange={(e) => set('billToCountry', e.target.value)} className={inputCls}>
                  {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Email</label>
                <input type="email" value={form.billToEmail} onChange={(e) => set('billToEmail', e.target.value)}
                  placeholder="client@example.com" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Phone</label>
                <input value={form.billToPhone} onChange={(e) => set('billToPhone', e.target.value)}
                  placeholder="+1 555 000 0000" className={inputCls} />
              </div>
            </div>
          </div>

          <div>
            <button type="button" onClick={() => setShowShipFrom((v) => !v)}
              className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider hover:text-slate-700">
              {showShipFrom ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              Ship From (Nexora Express) — click to edit
            </button>
            {showShipFrom && (
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div>
                  <label className={labelCls}>Company Name</label>
                  <input value={form.shipFromName} onChange={(e) => set('shipFromName', e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Address</label>
                  <input value={form.shipFromAddress} onChange={(e) => set('shipFromAddress', e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>City</label>
                  <input value={form.shipFromCity} onChange={(e) => set('shipFromCity', e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Country</label>
                  <select value={form.shipFromCountry} onChange={(e) => set('shipFromCountry', e.target.value)} className={inputCls}>
                    {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
                  </select>
                </div>
              </div>
            )}
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Line Items *</p>
            <div className="space-y-2">
              {form.items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-6">
                    {idx === 0 && <label className={labelCls}>Description</label>}
                    <input value={item.description} onChange={(e) => setItem(idx, 'description', e.target.value)}
                      placeholder="Service / item description" className={inputCls} />
                  </div>
                  <div className="col-span-2">
                    {idx === 0 && <label className={labelCls}>Qty</label>}
                    <input type="number" min="0.01" step="0.01" value={item.quantity}
                      onChange={(e) => setItem(idx, 'quantity', e.target.value)} className={inputCls} />
                  </div>
                  <div className="col-span-3">
                    {idx === 0 && <label className={labelCls}>Unit Price ({form.currency})</label>}
                    <input type="number" min="0" step="0.01" value={item.unitPrice}
                      onChange={(e) => setItem(idx, 'unitPrice', e.target.value)}
                      placeholder="0.00" className={inputCls} />
                  </div>
                  <div className={`col-span-1 ${idx === 0 ? 'pt-5' : ''} flex justify-end`}>
                    {form.items.length > 1 && (
                      <button type="button" onClick={() => removeItem(idx)}
                        className="p-1.5 text-slate-300 hover:text-red-500 rounded-lg transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <button type="button" onClick={addItem}
              className="mt-3 flex items-center gap-1.5 text-xs text-brand-navy hover:text-brand-navy/70 font-semibold">
              <Plus className="w-3.5 h-3.5" /> Add line item
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Tax Rate (%)</label>
              <input type="number" min="0" max="100" step="0.1"
                value={form.taxRate} onChange={(e) => set('taxRate', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Shipping Cost ({form.currency})</label>
              <input type="number" min="0" step="0.01"
                value={form.shippingCost} onChange={(e) => set('shippingCost', e.target.value)} className={inputCls} />
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-4">
            <div className="flex justify-end">
              <div className="w-56 space-y-1 text-sm">
                <div className="flex justify-between text-slate-600"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
                {(parseFloat(form.taxRate) || 0) > 0 && (
                  <div className="flex justify-between text-slate-600"><span>Tax ({form.taxRate}%)</span><span>{formatCurrency(tax)}</span></div>
                )}
                {(parseFloat(form.shippingCost) || 0) > 0 && (
                  <div className="flex justify-between text-slate-600"><span>Shipping</span><span>{formatCurrency(shipping)}</span></div>
                )}
                <div className="flex justify-between font-bold text-slate-900 border-t border-slate-200 pt-2">
                  <span>Total ({form.currency})</span>
                  <span className="text-brand-navy">{formatCurrency(total)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Payment Terms</label>
              <select value={form.paymentTerms} onChange={(e) => set('paymentTerms', e.target.value)} className={inputCls}>
                <option value="">— None —</option>
                {PAYMENT_TERMS_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className={labelCls}>Notes <span className="text-slate-400 font-normal">(optional)</span></label>
            <textarea rows={3} value={form.notes} onChange={(e) => set('notes', e.target.value)}
              placeholder="Additional notes, bank details, thank you message…"
              className={`${inputCls} resize-none`} />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-3">
          <span className="text-xs text-slate-400">Invoice number auto-generated on save</span>
          <div className="flex gap-3">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50">
              Cancel
            </button>
            <button type="button" onClick={() => mutation.mutate()}
              disabled={mutation.isPending || !form.billToName || !form.billToAddress || form.items.some((i) => !i.description)}
              className="px-5 py-2 text-sm font-semibold bg-brand-navy text-white rounded-xl hover:bg-brand-navy/90 disabled:opacity-50 flex items-center gap-2">
              {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              {mutation.isPending ? 'Creating…' : 'Create Invoice'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
