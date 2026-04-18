'use client';

import { useState, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import api from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { Invoice, InvoiceItem, InvoiceStatus, InvoiceCurrency, Order } from '@/types';
import {
  Plus, FileText, Trash2, Eye, X, AlertCircle, CheckCircle,
  Loader2, ChevronDown, ChevronUp, Search, Receipt, Download,
} from 'lucide-react';

// ── Constants ────────────────────────────────────────────────────────────────

const CURRENCIES: InvoiceCurrency[] = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'INR'];

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; bg: string; color: string }> = {
  DRAFT:     { label: 'Draft',     bg: 'bg-slate-100',  color: 'text-slate-600' },
  SENT:      { label: 'Sent',      bg: 'bg-blue-50',    color: 'text-blue-600'  },
  PAID:      { label: 'Paid',      bg: 'bg-green-50',   color: 'text-green-700' },
  OVERDUE:   { label: 'Overdue',   bg: 'bg-red-50',     color: 'text-red-600'   },
  CANCELLED: { label: 'Cancelled', bg: 'bg-slate-100',  color: 'text-slate-400' },
};

const PAYMENT_TERMS_OPTIONS = [
  'Net 7', 'Net 15', 'Net 30', 'Net 60', 'Due on Receipt', 'Custom',
];

const COUNTRIES = [
  { code: 'US', name: 'United States' }, { code: 'GB', name: 'United Kingdom' },
  { code: 'CA', name: 'Canada' },        { code: 'AU', name: 'Australia' },
  { code: 'DE', name: 'Germany' },       { code: 'FR', name: 'France' },
  { code: 'IN', name: 'India' },         { code: 'CN', name: 'China' },
  { code: 'JP', name: 'Japan' },         { code: 'SG', name: 'Singapore' },
  { code: 'AE', name: 'UAE' },           { code: 'NL', name: 'Netherlands' },
  { code: 'IT', name: 'Italy' },         { code: 'ES', name: 'Spain' },
  { code: 'BR', name: 'Brazil' },        { code: 'ZA', name: 'South Africa' },
  { code: 'NG', name: 'Nigeria' },       { code: 'KE', name: 'Kenya' },
  { code: 'MX', name: 'Mexico' },        { code: 'PK', name: 'Pakistan' },
  { code: 'BD', name: 'Bangladesh' },    { code: 'PH', name: 'Philippines' },
  { code: 'MY', name: 'Malaysia' },      { code: 'TH', name: 'Thailand' },
];

// ── Types ─────────────────────────────────────────────────────────────────────

interface LineItem {
  description: string;
  quantity: string;
  unitPrice: string;
}

interface InvoiceForm {
  orderId: string;
  billToName: string;
  billToAddress: string;
  billToCity: string;
  billToCountry: string;
  billToEmail: string;
  billToPhone: string;
  shipFromName: string;
  shipFromAddress: string;
  shipFromCity: string;
  shipFromCountry: string;
  currency: InvoiceCurrency;
  taxRate: string;
  shippingCost: string;
  paymentTerms: string;
  notes: string;
  dueDate: string;
  status: InvoiceStatus;
  items: LineItem[];
}

const emptyForm = (): InvoiceForm => ({
  orderId: '',
  billToName: '',
  billToAddress: '',
  billToCity: '',
  billToCountry: 'US',
  billToEmail: '',
  billToPhone: '',
  shipFromName: 'Nexora Express',
  shipFromAddress: '1 Nexora Way',
  shipFromCity: 'London',
  shipFromCountry: 'GB',
  currency: 'USD',
  taxRate: '0',
  shippingCost: '0',
  paymentTerms: 'Net 30',
  notes: '',
  dueDate: '',
  status: 'DRAFT',
  items: [{ description: 'Shipping Service', quantity: '1', unitPrice: '' }],
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function calcSubtotal(items: LineItem[]) {
  return items.reduce((s, i) => s + (parseFloat(i.quantity) || 0) * (parseFloat(i.unitPrice) || 0), 0);
}

function calcTax(subtotal: number, taxRate: string) {
  return subtotal * ((parseFloat(taxRate) || 0) / 100);
}

// ── PDF download ──────────────────────────────────────────────────────────────

async function downloadInvoicePDF(invoice: Invoice, templateId: string) {
  const el = document.getElementById(templateId);
  if (!el) return;

  el.style.visibility = 'visible';
  el.style.left = '0px';

  const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ]);

  const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
  el.style.visibility = 'hidden';
  el.style.left = '-9999px';

  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const imgH = (canvas.height * pageW) / canvas.width;

  if (imgH <= pageH) {
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, pageW, imgH);
  } else {
    let y = 0;
    while (y < imgH) {
      const sliceCanvas = document.createElement('canvas');
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = Math.min((pageH / imgH) * canvas.height, canvas.height - (y / imgH) * canvas.height);
      const ctx = sliceCanvas.getContext('2d')!;
      ctx.drawImage(canvas, 0, (y / imgH) * canvas.height, canvas.width, sliceCanvas.height, 0, 0, canvas.width, sliceCanvas.height);
      if (y > 0) pdf.addPage();
      pdf.addImage(sliceCanvas.toDataURL('image/png'), 'PNG', 0, 0, pageW, (sliceCanvas.height * pageW) / canvas.width);
      y += pageH;
    }
  }

  pdf.save(`${invoice.invoiceNumber}.pdf`);
}

// ── Invoice print template (hidden off-screen) ────────────────────────────────

function InvoicePrintTemplate({ invoice, id }: { invoice: Invoice; id: string }) {
  const fmt = (n: number) => formatCurrency(n);
  return (
    <div
      id={id}
      style={{
        position: 'fixed',
        left: '-9999px',
        top: 0,
        visibility: 'hidden',
        width: '794px',
        minHeight: '1123px',
        background: '#ffffff',
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '13px',
        color: '#1e293b',
        padding: '56px 56px 48px 56px',
        boxSizing: 'border-box',
      }}
    >
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <div>
          <div style={{ fontSize: '26px', fontWeight: '900', color: '#0f172a', letterSpacing: '-0.5px', lineHeight: 1 }}>
            NEXORA EXPRESS
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>nexorashipping.com</div>
          <div style={{ fontSize: '11px', color: '#64748b' }}>{invoice.shipFromAddress}, {invoice.shipFromCity}, {invoice.shipFromCountry}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '32px', fontWeight: '800', color: '#1e3a5f', letterSpacing: '-1px', lineHeight: 1 }}>INVOICE</div>
          <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', marginTop: '6px', fontFamily: 'monospace' }}>{invoice.invoiceNumber}</div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>Date: {formatDate(invoice.invoiceDate)}</div>
          {invoice.dueDate && <div style={{ fontSize: '11px', color: '#64748b' }}>Due: {formatDate(invoice.dueDate)}</div>}
          <div style={{ marginTop: '6px' }}>
            <span style={{
              fontSize: '10px', fontWeight: '700', padding: '3px 10px', borderRadius: '20px',
              background: invoice.status === 'PAID' ? '#dcfce7' : invoice.status === 'OVERDUE' ? '#fee2e2' : '#f1f5f9',
              color: invoice.status === 'PAID' ? '#166534' : invoice.status === 'OVERDUE' ? '#dc2626' : '#475569',
            }}>
              {invoice.status}
            </span>
          </div>
        </div>
      </div>

      {/* ── Navy rule ── */}
      <div style={{ borderTop: '3px solid #1e3a5f', marginBottom: '28px' }} />

      {/* ── From / Bill To ── */}
      <div style={{ display: 'flex', gap: '24px', marginBottom: '28px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '9px', fontWeight: '700', color: '#94a3b8', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '8px' }}>From</div>
          <div style={{ fontWeight: '700', fontSize: '13px', color: '#0f172a' }}>{invoice.shipFromName}</div>
          <div style={{ color: '#475569', fontSize: '12px', marginTop: '2px' }}>{invoice.shipFromAddress}</div>
          <div style={{ color: '#475569', fontSize: '12px' }}>{invoice.shipFromCity}, {invoice.shipFromCountry}</div>
        </div>
        <div style={{ flex: 1, background: '#f8fafc', borderRadius: '8px', padding: '14px 16px' }}>
          <div style={{ fontSize: '9px', fontWeight: '700', color: '#94a3b8', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '8px' }}>Bill To</div>
          <div style={{ fontWeight: '700', fontSize: '13px', color: '#0f172a' }}>{invoice.billToName}</div>
          <div style={{ color: '#475569', fontSize: '12px', marginTop: '2px' }}>{invoice.billToAddress}</div>
          <div style={{ color: '#475569', fontSize: '12px' }}>{invoice.billToCity}, {invoice.billToCountry}</div>
          {invoice.billToEmail && <div style={{ color: '#94a3b8', fontSize: '11px', marginTop: '4px' }}>{invoice.billToEmail}</div>}
          {invoice.billToPhone && <div style={{ color: '#94a3b8', fontSize: '11px' }}>{invoice.billToPhone}</div>}
        </div>
      </div>

      {/* ── Meta row ── */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '28px' }}>
        {[
          { label: 'Invoice Date', value: formatDate(invoice.invoiceDate) },
          { label: 'Due Date', value: invoice.dueDate ? formatDate(invoice.dueDate) : '—' },
          { label: 'Payment Terms', value: invoice.paymentTerms || '—' },
          { label: 'Currency', value: invoice.currency },
        ].map(({ label, value }) => (
          <div key={label} style={{ flex: 1, background: '#f8fafc', borderRadius: '6px', padding: '10px 12px' }}>
            <div style={{ fontSize: '9px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>{label}</div>
            <div style={{ fontWeight: '600', fontSize: '12px', color: '#0f172a' }}>{value}</div>
          </div>
        ))}
      </div>

      {/* ── Order ref ── */}
      {invoice.orderRef && (
        <div style={{ background: '#eff6ff', borderRadius: '6px', padding: '8px 14px', marginBottom: '20px', fontSize: '12px', color: '#1d4ed8' }}>
          Order Reference: <strong style={{ fontFamily: 'monospace' }}>{invoice.orderRef.orderNumber}</strong>
        </div>
      )}

      {/* ── Line items table ── */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px' }}>
        <thead>
          <tr style={{ background: '#1e3a5f' }}>
            {['Description', 'Qty', 'Unit Price', 'Amount'].map((h, i) => (
              <th key={h} style={{
                padding: '10px 14px', fontSize: '10px', fontWeight: '700', color: '#ffffff',
                textAlign: i === 0 ? 'left' : 'right',
                letterSpacing: '0.5px', textTransform: 'uppercase',
                width: i === 0 ? 'auto' : i === 1 ? '60px' : '110px',
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((item, i) => (
            <tr key={item.id} style={{ background: i % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
              <td style={{ padding: '10px 14px', fontSize: '12px', color: '#334155', borderBottom: '1px solid #e2e8f0' }}>{item.description}</td>
              <td style={{ padding: '10px 14px', fontSize: '12px', color: '#334155', textAlign: 'right', borderBottom: '1px solid #e2e8f0' }}>{item.quantity}</td>
              <td style={{ padding: '10px 14px', fontSize: '12px', color: '#334155', textAlign: 'right', borderBottom: '1px solid #e2e8f0' }}>{fmt(item.unitPrice)}</td>
              <td style={{ padding: '10px 14px', fontSize: '12px', fontWeight: '700', color: '#0f172a', textAlign: 'right', borderBottom: '1px solid #e2e8f0' }}>{fmt(item.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ── Totals ── */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '32px' }}>
        <div style={{ width: '260px' }}>
          {[
            { label: 'Subtotal', value: fmt(invoice.subtotal), bold: false },
            ...(invoice.taxRate > 0 ? [{ label: `Tax (${invoice.taxRate}%)`, value: fmt(invoice.taxAmount), bold: false }] : []),
            ...(invoice.shippingCost > 0 ? [{ label: 'Shipping', value: fmt(invoice.shippingCost), bold: false }] : []),
          ].map(({ label, value }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b', padding: '3px 0' }}>
              <span>{label}</span><span>{value}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: '800', color: '#0f172a', borderTop: '2px solid #1e3a5f', marginTop: '8px', paddingTop: '10px' }}>
            <span>Total ({invoice.currency})</span>
            <span style={{ color: '#1e3a5f' }}>{fmt(invoice.total)}</span>
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
        {invoice.paymentTerms && (
          <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>
            <strong>Payment Terms:</strong> {invoice.paymentTerms}
          </div>
        )}
        {invoice.notes && (
          <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '8px' }}>{invoice.notes}</div>
        )}
        <div style={{ marginTop: '24px', fontSize: '11px', color: '#94a3b8', textAlign: 'center' }}>
          Thank you for your business · Nexora Express Logistics · nexorashipping.com
        </div>
      </div>
    </div>
  );
}

// ── Invoice Detail Modal ───────────────────────────────────────────────────────

function InvoiceDetailModal({ invoice, onClose }: { invoice: Invoice; onClose: () => void }) {
  const subtotal = invoice.subtotal;
  const cfg = STATUS_CONFIG[invoice.status];
  const [downloading, setDownloading] = useState(false);
  const templateId = `inv-print-${invoice.id}`;

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadInvoicePDF(invoice, templateId);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      <InvoicePrintTemplate invoice={invoice} id={templateId} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-base font-bold text-slate-900 font-mono">{invoice.invoiceNumber}</h2>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.color}`}>
                  {cfg.label}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Created {formatDate(invoice.invoiceDate)}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold text-brand-navy border border-brand-navy/30 rounded-xl hover:bg-brand-navy/5 disabled:opacity-50 transition-colors"
              >
                {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                {downloading ? 'Generating…' : 'Download PDF'}
              </button>
              <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

          {/* From / To */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">From</p>
              <p className="font-semibold text-slate-800 text-sm">{invoice.shipFromName}</p>
              <p className="text-sm text-slate-600">{invoice.shipFromAddress}</p>
              <p className="text-sm text-slate-600">{invoice.shipFromCity}, {invoice.shipFromCountry}</p>
            </div>
            <div className="bg-brand-navy/5 rounded-xl p-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Bill To</p>
              <p className="font-semibold text-slate-800 text-sm">{invoice.billToName}</p>
              <p className="text-sm text-slate-600">{invoice.billToAddress}</p>
              <p className="text-sm text-slate-600">{invoice.billToCity}, {invoice.billToCountry}</p>
              {invoice.billToEmail && <p className="text-xs text-slate-400 mt-1">{invoice.billToEmail}</p>}
              {invoice.billToPhone && <p className="text-xs text-slate-400">{invoice.billToPhone}</p>}
            </div>
          </div>

          {/* Meta */}
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-400 mb-0.5">Invoice Date</p>
              <p className="font-semibold text-slate-800">{formatDate(invoice.invoiceDate)}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-400 mb-0.5">Due Date</p>
              <p className="font-semibold text-slate-800">{invoice.dueDate ? formatDate(invoice.dueDate) : '—'}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-400 mb-0.5">Payment Terms</p>
              <p className="font-semibold text-slate-800">{invoice.paymentTerms || '—'}</p>
            </div>
          </div>

          {invoice.orderRef && (
            <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded-lg">
              <Receipt className="w-4 h-4" />
              Linked to order <span className="font-mono font-semibold">{invoice.orderRef.orderNumber}</span>
            </div>
          )}

          {/* Line items */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Line Items</p>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500">Description</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500">Qty</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500">Unit Price</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoice.items.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-800">{item.description}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{item.quantity}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(item.unitPrice)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-800">{formatCurrency(item.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-64 space-y-1.5 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {invoice.taxRate > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Tax ({invoice.taxRate}%)</span>
                  <span>{formatCurrency(invoice.taxAmount)}</span>
                </div>
              )}
              {invoice.shippingCost > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Shipping</span>
                  <span>{formatCurrency(invoice.shippingCost)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-slate-900 border-t border-slate-200 pt-2 mt-2">
                <span>Total ({invoice.currency})</span>
                <span className="text-brand-navy text-base">{formatCurrency(invoice.total)}</span>
              </div>
            </div>
          </div>

          {invoice.notes && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-xs font-semibold text-amber-700 mb-1">Notes</p>
              <p className="text-sm text-amber-800">{invoice.notes}</p>
            </div>
          )}
          </div>
        </div>
      </div>
    </>
  );
}

// ── Create Invoice Modal ───────────────────────────────────────────────────────

function CreateInvoiceModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
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

  const set = (key: keyof InvoiceForm, val: string) =>
    setForm((f) => ({ ...f, [key]: val }));

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

  // Auto-fill Bill To when an order is selected
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
      items: [
        {
          description: `Shipping: ${order.packageDescription}`,
          quantity: '1',
          unitPrice: String(order.price ?? ''),
        },
      ],
    }));
  }, [orders]);

  const subtotal = calcSubtotal(form.items);
  const tax = calcTax(subtotal, form.taxRate);
  const shipping = parseFloat(form.shippingCost) || 0;
  const total = subtotal + tax + shipping;

  const inputCls = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy/20 focus:border-brand-navy';
  const labelCls = 'block text-xs font-semibold text-slate-600 mb-1';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">Create Invoice</h2>
            <p className="text-xs text-slate-400 mt-0.5">Manual invoice entry — number auto-generated</p>
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

          {/* ── Row 1: Order + Status + Currency ── */}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-3 sm:col-span-1">
              <label className={labelCls}>
                Link to Order <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <select
                value={form.orderId}
                onChange={(e) => handleOrderSelect(e.target.value)}
                className={inputCls}
              >
                <option value="">— Select order —</option>
                {orders.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.orderNumber} · {o.deliveryCity} · {o.status}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Status</label>
              <select value={form.status} onChange={(e) => set('status', e.target.value)} className={inputCls}>
                {(Object.keys(STATUS_CONFIG) as InvoiceStatus[]).map((s) => (
                  <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Currency</label>
              <select value={form.currency} onChange={(e) => set('currency', e.target.value)} className={inputCls}>
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* ── Dates ── */}
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

          {/* ── Bill To ── */}
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

          {/* ── Ship From (collapsible) ── */}
          <div>
            <button
              type="button"
              onClick={() => setShowShipFrom((v) => !v)}
              className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider hover:text-slate-700"
            >
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

          {/* ── Line Items ── */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Line Items *</p>
            <div className="space-y-2">
              {form.items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-6">
                    {idx === 0 && <label className={labelCls}>Description</label>}
                    <input
                      value={item.description}
                      onChange={(e) => setItem(idx, 'description', e.target.value)}
                      placeholder="Shipping service / Item description"
                      className={inputCls}
                    />
                  </div>
                  <div className="col-span-2">
                    {idx === 0 && <label className={labelCls}>Qty</label>}
                    <input
                      type="number" min="0.01" step="0.01"
                      value={item.quantity}
                      onChange={(e) => setItem(idx, 'quantity', e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div className="col-span-3">
                    {idx === 0 && <label className={labelCls}>Unit Price ({form.currency})</label>}
                    <input
                      type="number" min="0" step="0.01"
                      value={item.unitPrice}
                      onChange={(e) => setItem(idx, 'unitPrice', e.target.value)}
                      placeholder="0.00"
                      className={inputCls}
                    />
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

          {/* ── Financial ── */}
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

          {/* Total preview */}
          <div className="bg-slate-50 rounded-xl p-4">
            <div className="flex justify-end">
              <div className="w-56 space-y-1 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                {(parseFloat(form.taxRate) || 0) > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Tax ({form.taxRate}%)</span>
                    <span>{formatCurrency(tax)}</span>
                  </div>
                )}
                {(parseFloat(form.shippingCost) || 0) > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Shipping</span>
                    <span>{formatCurrency(shipping)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-slate-900 border-t border-slate-200 pt-2">
                  <span>Total ({form.currency})</span>
                  <span className="text-brand-navy">{formatCurrency(total)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Payment Terms + Notes ── */}
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

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-3">
          <span className="text-xs text-slate-400">Invoice number auto-generated on save</span>
          <div className="flex gap-3">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50">
              Cancel
            </button>
            <button
              type="button"
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending || !form.billToName || !form.billToAddress || form.items.some((i) => !i.description)}
              className="px-5 py-2 text-sm font-semibold bg-brand-navy text-white rounded-xl hover:bg-brand-navy/90 disabled:opacity-50 flex items-center gap-2"
            >
              {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              {mutation.isPending ? 'Creating…' : 'Create Invoice'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function InvoicesPage() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | ''>('');

  const { data, isLoading } = useQuery({
    queryKey: ['invoices', statusFilter, search],
    queryFn: () => {
      const params = new URLSearchParams({ limit: '50' });
      if (statusFilter) params.set('status', statusFilter);
      if (search) params.set('search', search);
      return api.get(`/invoices?${params}`).then((r) => r.data);
    },
  });

  const invoices: Invoice[] = data?.data ?? [];

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/invoices/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['invoices'] }),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: InvoiceStatus }) =>
      api.patch(`/invoices/${id}`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['invoices'] }),
  });

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Invoices</h1>
          <p className="page-subtitle">Create and manage shipping invoices</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-navy text-white rounded-xl text-sm font-semibold hover:bg-brand-navy/90 transition-colors"
        >
          <Plus className="w-4 h-4" /> New Invoice
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search invoice number, client name…"
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-navy/20 focus:border-brand-navy"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as InvoiceStatus | '')}
          className="px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-navy/20 bg-white"
        >
          <option value="">All Statuses</option>
          {(Object.keys(STATUS_CONFIG) as InvoiceStatus[]).map((s) => (
            <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-brand-navy border-t-transparent rounded-full animate-spin" />
          </div>
        ) : invoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <FileText className="w-12 h-12 mb-3 opacity-40" />
            <p className="font-medium text-slate-500">No invoices yet</p>
            <p className="text-xs mt-1">Click <span className="font-semibold">New Invoice</span> to create one</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Invoice #</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Client</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Order</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Due</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Total</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map((inv) => {
                  const cfg = STATUS_CONFIG[inv.status];
                  return (
                    <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3.5 font-mono font-semibold text-brand-navy">{inv.invoiceNumber}</td>
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-slate-800 truncate max-w-[140px]">{inv.billToName}</p>
                        {inv.billToEmail && <p className="text-xs text-slate-400 truncate">{inv.billToEmail}</p>}
                      </td>
                      <td className="px-4 py-3.5 hidden md:table-cell">
                        {inv.orderRef ? (
                          <span className="text-xs font-mono bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                            {inv.orderRef.orderNumber}
                          </span>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-slate-500 hidden sm:table-cell">{formatDate(inv.invoiceDate)}</td>
                      <td className="px-4 py-3.5 hidden lg:table-cell">
                        {inv.dueDate ? (
                          <span className={new Date(inv.dueDate) < new Date() && inv.status !== 'PAID' ? 'text-red-500 font-semibold' : 'text-slate-500'}>
                            {formatDate(inv.dueDate)}
                          </span>
                        ) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold text-slate-900">
                        {formatCurrency(inv.total)}
                        <span className="text-xs font-normal text-slate-400 ml-1">{inv.currency}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        {isAdmin ? (
                          <select
                            value={inv.status}
                            onChange={(e) => updateStatusMutation.mutate({ id: inv.id, status: e.target.value as InvoiceStatus })}
                            className={`text-xs font-semibold px-2 py-1 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-brand-navy/30 ${cfg.bg} ${cfg.color}`}
                          >
                            {(Object.keys(STATUS_CONFIG) as InvoiceStatus[]).map((s) => (
                              <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                            ))}
                          </select>
                        ) : (
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.color}`}>
                            {cfg.label}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => setViewInvoice(inv)}
                            className="p-1.5 text-slate-400 hover:text-brand-navy hover:bg-slate-100 rounded-lg transition-colors"
                            title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => { if (confirm(`Delete invoice ${inv.invoiceNumber}?`)) deleteMutation.mutate(inv.id); }}
                            disabled={deleteMutation.isPending}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Summary bar */}
      {invoices.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-500">
          <span>{invoices.length} invoice{invoices.length !== 1 ? 's' : ''}</span>
          <span>·</span>
          <span>Total outstanding: <span className="font-semibold text-slate-800">
            {formatCurrency(invoices.filter((i) => i.status !== 'PAID' && i.status !== 'CANCELLED').reduce((s, i) => s + i.total, 0))}
          </span></span>
          <span>·</span>
          <span>Paid: <span className="font-semibold text-green-700">
            {formatCurrency(invoices.filter((i) => i.status === 'PAID').reduce((s, i) => s + i.total, 0))}
          </span></span>
        </div>
      )}

      {/* Modals */}
      {showCreate && (
        <CreateInvoiceModal
          onClose={() => setShowCreate(false)}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ['invoices'] })}
        />
      )}
      {viewInvoice && (
        <InvoiceDetailModal invoice={viewInvoice} onClose={() => setViewInvoice(null)} />
      )}
    </DashboardLayout>
  );
}
