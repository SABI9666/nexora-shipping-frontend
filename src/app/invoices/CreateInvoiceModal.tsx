'use client';

import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { COUNTRIES, inferCountryCode, normalizeCountryCode } from '@/lib/countries';
import { InvoiceStatus, InvoiceCurrency, Order, ChargeItem, BankAccount } from '@/types';
import {
  Plus, X, AlertCircle, CheckCircle, Loader2, ChevronDown, ChevronUp,
} from 'lucide-react';

const CURRENCIES: InvoiceCurrency[] = ['AED', 'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'INR', 'SAR'];

const STATUSES: { value: InvoiceStatus; label: string }[] = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'SENT', label: 'Sent' },
  { value: 'PAID', label: 'Paid' },
  { value: 'OVERDUE', label: 'Overdue' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const PAYMENT_TERMS_OPTIONS = [
  'Cash', 'Net 7', 'Net 15', 'Net 30', 'Net 60', 'Due on Receipt', 'Custom',
];

// Country list now lives in src/lib/countries.ts and is shared across forms.

interface LineItem {
  description: string;
  quantity: string;
  unitPrice: string;
  lineCurrency: string;
  exchangeRate: string;
  vatPercent: string;
  remarks: string;
}

interface InvoiceForm {
  orderId: string;
  billToName: string; billToAddress: string; billToCity: string; billToCountry: string;
  billToEmail: string; billToPhone: string;
  shipFromName: string; shipFromAddress: string; shipFromCity: string; shipFromCountry: string;
  companyTrn: string;
  jobNo: string; originPort: string; destPort: string;
  masterBl: string; houseBl: string; commodity: string;
  boeNumber: string; grossWeight: string; volume: string; packages: string;
  shipperName: string; consigneeName: string; customerRef: string;
  bankName: string; bankAddress: string; accountName: string;
  accountNumber: string; iban: string; swiftCode: string;
  currency: InvoiceCurrency;
  taxRate: string; shippingCost: string;
  paymentTerms: string; notes: string; invoiceDate: string; dueDate: string;
  status: InvoiceStatus;
  items: LineItem[];
}

const BANK_DEFAULTS_KEY = 'nexora.invoice.bank.defaults';

interface BankDefaults {
  companyTrn?: string;
  bankName?: string;
  bankAddress?: string;
  accountName?: string;
  accountNumber?: string;
  iban?: string;
  swiftCode?: string;
}

function loadBankDefaults(): BankDefaults {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(BANK_DEFAULTS_KEY);
    return raw ? (JSON.parse(raw) as BankDefaults) : {};
  } catch {
    return {};
  }
}

const emptyLine = (currency: string): LineItem => ({
  description: '',
  quantity: '1',
  unitPrice: '',
  lineCurrency: currency,
  exchangeRate: '1',
  vatPercent: '0',
  remarks: '',
});

const emptyForm = (): InvoiceForm => {
  const bd = loadBankDefaults();
  return {
    orderId: '',
    billToName: '', billToAddress: '', billToCity: '', billToCountry: 'ARE',
    billToEmail: '', billToPhone: '',
    shipFromName: 'Nexora Shipping LLC', shipFromAddress: 'Khansaheb warehouse B1-14, Al Qusais Industrial Area 1',
    shipFromCity: 'Dubai', shipFromCountry: 'ARE',
    companyTrn: bd.companyTrn ?? '105413106300003',
    jobNo: '', originPort: '', destPort: '',
    masterBl: '', houseBl: '', commodity: '',
    boeNumber: '', grossWeight: '', volume: '', packages: '',
    shipperName: '', consigneeName: '', customerRef: '',
    bankName: bd.bankName ?? '', bankAddress: bd.bankAddress ?? '',
    accountName: bd.accountName ?? '', accountNumber: bd.accountNumber ?? '',
    iban: bd.iban ?? '', swiftCode: bd.swiftCode ?? '',
    currency: 'AED',
    taxRate: '0', shippingCost: '0',
    paymentTerms: '', notes: '',
    invoiceDate: new Date().toISOString().split('T')[0], dueDate: '',
    status: 'DRAFT',
    items: [{ description: '', quantity: '1', unitPrice: '', lineCurrency: 'AED', exchangeRate: '1', vatPercent: '0', remarks: '' }],
  };
};

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

  const { data: chargeItems } = useQuery({
    queryKey: ['charge-items-for-invoice'],
    queryFn: () =>
      api
        .get('/charge-items?limit=500')
        .then((r) => r.data.data as ChargeItem[])
        .catch(() => [] as ChargeItem[]),
  });

  const { data: bankAccounts } = useQuery({
    queryKey: ['bank-accounts-for-invoice'],
    queryFn: () =>
      api
        .get('/bank-accounts')
        .then((r) => r.data.data as BankAccount[])
        .catch(() => [] as BankAccount[]),
  });

  const [selectedBankId, setSelectedBankId] = useState('');

  // Auto-select default bank when the list arrives and the form's bank fields are still empty
  useEffect(() => {
    if (selectedBankId) return;
    if (!bankAccounts || bankAccounts.length === 0) return;
    if (form.bankName || form.accountNumber) return;
    const def = bankAccounts.find((b) => b.isDefault) ?? bankAccounts[0];
    setSelectedBankId(def.id);
    setForm((f) => ({
      ...f,
      bankName: def.bankName,
      bankAddress: def.bankAddress ?? '',
      accountName: def.accountName,
      accountNumber: def.accountNumber,
      iban: def.iban ?? '',
      swiftCode: def.swiftCode ?? '',
      companyTrn: f.companyTrn || (def.companyTrn ?? ''),
    }));
  }, [bankAccounts, selectedBankId, form.bankName, form.accountNumber]);

  const applyBank = (id: string) => {
    setSelectedBankId(id);
    if (!id) return;
    const b = (bankAccounts ?? []).find((x) => x.id === id);
    if (!b) return;
    setForm((f) => ({
      ...f,
      bankName: b.bankName,
      bankAddress: b.bankAddress ?? '',
      accountName: b.accountName,
      accountNumber: b.accountNumber,
      iban: b.iban ?? '',
      swiftCode: b.swiftCode ?? '',
      // Pull TRN from the chosen bank when the form's TRN is still empty
      // so the user can override after picking.
      companyTrn: f.companyTrn || (b.companyTrn ?? ''),
    }));
  };

  const mutation = useMutation({
    mutationFn: () => {
      // Persist bank/TRN defaults locally so the next invoice pre-fills
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(BANK_DEFAULTS_KEY, JSON.stringify({
            companyTrn: form.companyTrn,
            bankName: form.bankName,
            bankAddress: form.bankAddress,
            accountName: form.accountName,
            accountNumber: form.accountNumber,
            iban: form.iban,
            swiftCode: form.swiftCode,
          }));
        } catch { /* ignore storage errors */ }
      }
      return api.post('/invoices', {
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
        companyTrn: form.companyTrn || undefined,
        jobNo: form.jobNo || undefined,
        originPort: form.originPort || undefined,
        destPort: form.destPort || undefined,
        masterBl: form.masterBl || undefined,
        houseBl: form.houseBl || undefined,
        commodity: form.commodity || undefined,
        boeNumber: form.boeNumber || undefined,
        grossWeight: form.grossWeight || undefined,
        volume: form.volume || undefined,
        packages: form.packages || undefined,
        shipperName: form.shipperName || undefined,
        consigneeName: form.consigneeName || undefined,
        customerRef: form.customerRef || undefined,
        bankName: form.bankName || undefined,
        bankAddress: form.bankAddress || undefined,
        accountName: form.accountName || undefined,
        accountNumber: form.accountNumber || undefined,
        iban: form.iban || undefined,
        swiftCode: form.swiftCode || undefined,
        currency: form.currency,
        taxRate: parseFloat(form.taxRate) || 0,
        shippingCost: parseFloat(form.shippingCost) || 0,
        paymentTerms: form.paymentTerms || undefined,
        notes: form.notes || undefined,
        invoiceDate: form.invoiceDate || undefined,
        dueDate: form.dueDate || undefined,
        status: form.status,
        items: form.items.map((i) => ({
          description: i.description,
          quantity: parseFloat(i.quantity) || 1,
          unitPrice: parseFloat(i.unitPrice) || 0,
          lineCurrency: i.lineCurrency || form.currency,
          exchangeRate: parseFloat(i.exchangeRate) || 1,
          vatPercent: parseFloat(i.vatPercent) || 0,
          remarks: i.remarks || undefined,
        })),
      });
    },
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
    setForm((f) => ({ ...f, items: [...f.items, emptyLine(f.currency)] }));
  const removeItem = (idx: number) =>
    setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));

  const handleOrderSelect = useCallback((orderId: string) => {
    setForm((f) => ({ ...f, orderId }));
    if (!orderId) return;
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;
    const inferred =
      normalizeCountryCode(order.deliveryCountry) ||
      inferCountryCode(`${order.deliveryAddress} ${order.deliveryCity}`) ||
      '';
    setForm((f) => ({
      ...f,
      orderId,
      jobNo: order.orderNumber,
      billToCity: order.deliveryCity,
      billToCountry: inferred || f.billToCountry,
      billToAddress: order.deliveryAddress,
      // Auto-fill shipment details from the order — user can still edit
      originPort: f.originPort || order.pickupCity || '',
      destPort: f.destPort || order.deliveryCity || '',
      volume: f.volume || (order.cbm != null ? `${order.cbm} CBM` : ''),
      grossWeight: f.grossWeight || (order.weight != null ? `${order.weight} KGS` : ''),
      commodity: f.commodity || order.packageDescription || '',
      items: [{
        description: `Shipping: ${order.packageDescription}`,
        quantity: '1',
        unitPrice: String(order.price ?? ''),
        lineCurrency: f.currency,
        exchangeRate: '1',
        vatPercent: '0',
        remarks: '',
      }],
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
              <label className={labelCls}>Invoice Date <span className="text-slate-400 font-normal">· editable, supports backdating</span></label>
              <input
                type="date"
                value={form.invoiceDate}
                onChange={(e) => set('invoiceDate', e.target.value)}
                className={inputCls}
              />
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
                <input
                  value={form.billToAddress}
                  onChange={(e) => set('billToAddress', e.target.value)}
                  onBlur={(e) => {
                    const code = inferCountryCode(`${e.target.value} ${form.billToCity}`);
                    if (code) set('billToCountry', code);
                  }}
                  placeholder="123 Main Street"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>City *</label>
                <input
                  value={form.billToCity}
                  onChange={(e) => set('billToCity', e.target.value)}
                  onBlur={(e) => {
                    const code = inferCountryCode(`${form.billToAddress} ${e.target.value}`);
                    if (code) set('billToCountry', code);
                  }}
                  placeholder="Dubai"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Country * <span className="text-slate-400 font-normal">· auto</span></label>
                <select value={normalizeCountryCode(form.billToCountry)} onChange={(e) => set('billToCountry', e.target.value)} className={inputCls}>
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
                  <select value={normalizeCountryCode(form.shipFromCountry)} onChange={(e) => set('shipFromCountry', e.target.value)} className={inputCls}>
                    {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Shipment Details */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Shipment Details</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>Job No <span className="text-slate-400 font-normal">· auto</span></label>
                <input value={form.jobNo} onChange={(e) => set('jobNo', e.target.value)}
                  placeholder="auto: NEXDX{YY}-{NNNNN}" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Customer Ref <span className="text-slate-400 font-normal">· auto</span></label>
                <input value={form.customerRef} onChange={(e) => set('customerRef', e.target.value)}
                  placeholder="auto: INV-{invoice no}" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Company TRN <span className="text-slate-400 font-normal">· auto from bank</span></label>
                <input value={form.companyTrn} onChange={(e) => set('companyTrn', e.target.value)}
                  placeholder="105413106300003" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Origin / POR <span className="text-slate-400 font-normal">· auto from order</span></label>
                <input value={form.originPort} onChange={(e) => set('originPort', e.target.value)}
                  placeholder="auto-filled from linked order" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Destination Port <span className="text-slate-400 font-normal">· auto from order</span></label>
                <input value={form.destPort} onChange={(e) => set('destPort', e.target.value)}
                  placeholder="auto-filled from linked order" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Commodity <span className="text-slate-400 font-normal">· auto from order</span></label>
                <input value={form.commodity} onChange={(e) => set('commodity', e.target.value)}
                  placeholder="auto-filled from linked order" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>MB/L</label>
                <input value={form.masterBl} onChange={(e) => set('masterBl', e.target.value)}
                  placeholder="DOC 00027" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>HB/L</label>
                <input value={form.houseBl} onChange={(e) => set('houseBl', e.target.value)}
                  className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>BOE No.</label>
                <input value={form.boeNumber} onChange={(e) => set('boeNumber', e.target.value)}
                  placeholder="502-00212667-26" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Gross Weight <span className="text-slate-400 font-normal">· auto from order</span></label>
                <input value={form.grossWeight} onChange={(e) => set('grossWeight', e.target.value)}
                  placeholder="auto-filled from linked order" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Volume <span className="text-slate-400 font-normal">· auto from order CBM</span></label>
                <input value={form.volume} onChange={(e) => set('volume', e.target.value)}
                  placeholder="auto-filled from linked order" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Packages</label>
                <input value={form.packages} onChange={(e) => set('packages', e.target.value)}
                  placeholder="4 PKGS" className={inputCls} />
              </div>
              <div className="col-span-3 grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Shipper</label>
                  <input value={form.shipperName} onChange={(e) => set('shipperName', e.target.value)}
                    placeholder="FIRST ACCESS SHIPPING" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Consignee</label>
                  <input value={form.consigneeName} onChange={(e) => set('consigneeName', e.target.value)}
                    placeholder="HITECH TRANSPORT LLC (BRANCH)" className={inputCls} />
                </div>
              </div>
            </div>
          </div>

          <div>
            <datalist id="invoice-charge-items">
              {(chargeItems ?? []).map((c) => (
                <option key={c.id} value={c.name}>{c.code} · {c.name}</option>
              ))}
            </datalist>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Line Items *</p>
            <div className="space-y-2">
              {form.items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-6">
                    {idx === 0 && <label className={labelCls}>Description</label>}
                    <input
                      value={item.description}
                      onChange={(e) => {
                        const v = e.target.value;
                        setItem(idx, 'description', v);
                        const match = (chargeItems ?? []).find((c) => c.name === v || `${c.code} · ${c.name}` === v);
                        if (match) {
                          setItem(idx, 'description', match.name);
                          if (!item.unitPrice && match.defaultRate != null) {
                            setItem(idx, 'unitPrice', String(match.defaultRate));
                          }
                        }
                      }}
                      list="invoice-charge-items"
                      placeholder="Service / item description (start typing to autocomplete)"
                      className={inputCls}
                    />
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
                  <div className="col-span-12 grid grid-cols-12 gap-2 -mt-1 mb-2 pl-1">
                    <div className="col-span-2">
                      <label className={`${labelCls} text-[10px]`}>Curr</label>
                      <input value={item.lineCurrency}
                        onChange={(e) => setItem(idx, 'lineCurrency', e.target.value.toUpperCase())}
                        placeholder={form.currency} maxLength={3}
                        className={`${inputCls} text-xs py-1.5`} />
                    </div>
                    <div className="col-span-2">
                      <label className={`${labelCls} text-[10px]`}>Ex Rate</label>
                      <input type="number" min="0" step="0.0001"
                        value={item.exchangeRate}
                        onChange={(e) => setItem(idx, 'exchangeRate', e.target.value)}
                        className={`${inputCls} text-xs py-1.5`} />
                    </div>
                    <div className="col-span-2">
                      <label className={`${labelCls} text-[10px]`}>VAT %</label>
                      <input type="number" min="0" max="100" step="0.01"
                        value={item.vatPercent}
                        onChange={(e) => setItem(idx, 'vatPercent', e.target.value)}
                        className={`${inputCls} text-xs py-1.5`} />
                    </div>
                    <div className="col-span-6">
                      <label className={`${labelCls} text-[10px]`}>
                        Remarks <span className="text-slate-400 font-normal normal-case">· prints on right side of invoice</span>
                      </label>
                      <input value={item.remarks}
                        onChange={(e) => setItem(idx, 'remarks', e.target.value)}
                        placeholder="Optional note — e.g. container no., reference, payment ref"
                        className={`${inputCls} text-xs py-1.5`} />
                    </div>
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
                <div className="flex justify-between text-slate-600"><span>Subtotal</span><span>{formatCurrency(subtotal, form.currency)}</span></div>
                {(parseFloat(form.taxRate) || 0) > 0 && (
                  <div className="flex justify-between text-slate-600"><span>Tax ({form.taxRate}%)</span><span>{formatCurrency(tax, form.currency)}</span></div>
                )}
                {(parseFloat(form.shippingCost) || 0) > 0 && (
                  <div className="flex justify-between text-slate-600"><span>Shipping</span><span>{formatCurrency(shipping, form.currency)}</span></div>
                )}
                <div className="flex justify-between font-bold text-slate-900 border-t border-slate-200 pt-2">
                  <span>Total ({form.currency})</span>
                  <span className="text-brand-navy">{formatCurrency(total, form.currency)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bank Details */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3 gap-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Bank Details <span className="text-slate-400 font-normal normal-case">· auto-filled, switch below if needed</span>
              </p>
              {(bankAccounts ?? []).length > 0 && (
                <select
                  value={selectedBankId}
                  onChange={(e) => applyBank(e.target.value)}
                  className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand-navy/20"
                >
                  <option value="">— pick saved account —</option>
                  {(bankAccounts ?? []).map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.label}{b.isDefault ? ' (default)' : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Bank Name</label>
                <input value={form.bankName} onChange={(e) => set('bankName', e.target.value)}
                  placeholder="Abu Dhabi Commercial Bank PJSC" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Bank Address</label>
                <input value={form.bankAddress} onChange={(e) => set('bankAddress', e.target.value)}
                  placeholder="AL RIGGAH ROAD" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Account Name</label>
                <input value={form.accountName} onChange={(e) => set('accountName', e.target.value)}
                  placeholder="NEXORA SHIPPING LLC" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Account Number</label>
                <input value={form.accountNumber} onChange={(e) => set('accountNumber', e.target.value)}
                  placeholder="14505966920001" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>IBAN</label>
                <input value={form.iban} onChange={(e) => set('iban', e.target.value)}
                  placeholder="AE060030014505966920001" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Swift Code</label>
                <input value={form.swiftCode} onChange={(e) => set('swiftCode', e.target.value)}
                  placeholder="ADCBAEAA" className={inputCls} />
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
