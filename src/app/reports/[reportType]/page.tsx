'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import api from '@/lib/api';
import { downloadDocx } from '@/lib/downloadDocx';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Voucher, Account } from '@/types';
import { VOUCHER_TYPE_LABEL, VOUCHER_TYPE_COLOR } from '@/app/vouchers/constants';
import { ArrowLeft, Download, FileText, Loader2 } from 'lucide-react';

const REPORT_META: Record<string, { title: string; desc: string }> = {
  'sales-summary': { title: 'Sales Summary', desc: 'Invoices issued, paid and outstanding for the period.' },
  'orders-summary': { title: 'Orders Summary', desc: 'Orders by status, salesperson and destination.' },
  'voucher-register': { title: 'Voucher Register', desc: 'All vouchers in the period with totals by type.' },
  'outstanding-receivables': { title: 'Outstanding Receivables', desc: 'Open invoices with voucher-adjusted outstanding.' },
  'account-statement': { title: 'Account Statement', desc: 'Per-account ledger — chronological Dr/Cr.' },
  'customer-statement': { title: 'Customer Statement (SOA)', desc: 'Per-customer outstanding statement — aging days and cumulative balance.' },
};

function defaultRange(): { from: string; to: string } {
  const today = new Date();
  const first = new Date(today.getFullYear(), today.getMonth() - 2, 1);
  return {
    from: first.toISOString().slice(0, 10),
    to: today.toISOString().slice(0, 10),
  };
}

function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const escape = (v: string | number | null | undefined) => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  return [headers, ...rows].map((r) => r.map(escape).join(',')).join('\n');
}

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportDetailPage() {
  const { reportType } = useParams<{ reportType: string }>();
  const meta = REPORT_META[reportType] || { title: 'Report', desc: '' };

  const initialRange = useMemo(defaultRange, []);
  const [from, setFrom] = useState(initialRange.from);
  const [to, setTo] = useState(initialRange.to);
  const [voucherType, setVoucherType] = useState('');
  const [accountId, setAccountId] = useState('');
  const [asOf, setAsOf] = useState(initialRange.to);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const needsAccount = reportType === 'account-statement' || reportType === 'customer-statement';
  const { data: accountList } = useQuery({
    queryKey: ['report-accounts'],
    queryFn: () => api.get('/accounts?limit=1000').then((r) => r.data).catch(() => ({ data: [] })),
  });
  const accounts: Account[] = accountList?.data ?? [];

  const queryKey = ['report', reportType, from, to, voucherType, accountId, asOf];
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey,
    enabled: !needsAccount || !!accountId,
    queryFn: () => {
      const params = new URLSearchParams();
      if (reportType === 'outstanding-receivables' || reportType === 'customer-statement') {
        params.set('asOf', asOf);
      } else {
        if (from) params.set('from', from);
        if (to) params.set('to', to);
      }
      if (reportType === 'voucher-register') {
        if (voucherType) params.set('type', voucherType);
        if (accountId) params.set('accountId', accountId);
      }
      if (reportType === 'account-statement' || reportType === 'customer-statement') {
        params.set('accountId', accountId);
      }
      return api.get(`/reports/${reportType}?${params}`).then((r) => r.data.data);
    },
  });

  const handlePdfDownload = async () => {
    if (!accountId) return;
    setDownloadingPdf(true);
    try {
      const params = new URLSearchParams();
      params.set('accountId', accountId);
      if (asOf) params.set('asOf', asOf);
      const customerName = accounts.find((a) => a.id === accountId)?.name || 'CUSTOMER';
      const safe = customerName.replace(/[^A-Z0-9_-]+/gi, '_').slice(0, 40);
      const stamp = asOf.replace(/-/g, '');
      await downloadDocx(`/reports/customer-statement/pdf?${params}`, `SOA_${safe}_${stamp}.pdf`);
    } catch {
      alert('Failed to download SOA PDF.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleExport = () => {
    if (!data) return;
    if (reportType === 'sales-summary') {
      const headers = ['Invoice #', 'Date', 'Due', 'Customer', 'Status', 'Currency', 'Subtotal', 'Tax', 'Shipping', 'Total'];
      const rows = (data.invoices || []).map((i: { invoiceNumber: string; invoiceDate: string; dueDate: string | null; billToName: string; status: string; currency: string; subtotal: number; taxAmount: number; shippingCost: number; total: number }) => [
        i.invoiceNumber, i.invoiceDate?.slice(0, 10), i.dueDate?.slice(0, 10) ?? '',
        i.billToName, i.status, i.currency,
        i.subtotal, i.taxAmount, i.shippingCost, i.total,
      ]);
      downloadCsv(`sales-summary-${from}_to_${to}.csv`, toCsv(headers, rows));
    } else if (reportType === 'orders-summary') {
      const headers = ['Order #', 'Date', 'Status', 'Customer', 'Salesperson', 'Destination', 'CBM', 'Weight (kg)', 'Price'];
      const rows = (data.orders || []).map((o: { orderNumber: string; createdAt: string; status: string; user?: { firstName?: string; lastName?: string }; salesperson?: { name?: string } | null; repName?: string | null; deliveryCity?: string | null; deliveryCountry?: string | null; cbm?: number | null; weight?: number | null; price?: number | null }) => [
        o.orderNumber, o.createdAt?.slice(0, 10), o.status,
        `${o.user?.firstName ?? ''} ${o.user?.lastName ?? ''}`.trim(),
        o.salesperson?.name ?? o.repName ?? '',
        `${o.deliveryCity || ''}, ${o.deliveryCountry || ''}`,
        o.cbm ?? '', o.weight ?? '', o.price ?? '',
      ]);
      downloadCsv(`orders-summary-${from}_to_${to}.csv`, toCsv(headers, rows));
    } else if (reportType === 'voucher-register') {
      const headers = ['Voucher #', 'Date', 'Type', 'Direction', 'Account', 'Contra', 'Reference', 'Currency', 'Amount', 'Narration'];
      const rows = (data.vouchers || []).map((v: Voucher) => [
        v.voucherNumber, v.voucherDate?.slice(0, 10),
        v.type, v.direction,
        v.account ? `${v.account.code} · ${v.account.name}` : (v.partyName || ''),
        v.contraAccount ? `${v.contraAccount.code} · ${v.contraAccount.name}` : '',
        v.invoice ? `INV ${v.invoice.invoiceNumber}` : (v.order ? `ORD ${v.order.orderNumber}` : ''),
        v.currency, v.amount, v.narration ?? '',
      ]);
      downloadCsv(`voucher-register-${from}_to_${to}.csv`, toCsv(headers, rows));
    } else if (reportType === 'outstanding-receivables') {
      const headers = ['Invoice #', 'Date', 'Due', 'Customer', 'Status', 'Currency', 'Total', 'Paid', 'Adjustments', 'Outstanding', 'Days Overdue'];
      const rows = (data.rows || []).map((r: { invoiceNumber: string; invoiceDate: string; dueDate: string | null; billToName: string; status: string; currency: string; total: number; paid: number; adjustments: number; outstanding: number; daysOverdue: number }) => [
        r.invoiceNumber, r.invoiceDate?.slice(0, 10), r.dueDate?.slice(0, 10) ?? '',
        r.billToName, r.status, r.currency,
        r.total, r.paid, r.adjustments, r.outstanding, r.daysOverdue,
      ]);
      downloadCsv(`outstanding-${asOf}.csv`, toCsv(headers, rows));
    } else if (reportType === 'account-statement') {
      const headers = ['Date', 'Voucher #', 'Type', 'Reference', 'Narration', 'Currency', 'Debit', 'Credit', 'Balance'];
      const rows = (data.rows || []).map((r: { date: string; voucherNumber: string; type: string; reference: string | null; narration: string | null; currency: string; debit: number; credit: number; runningBalance: number; runningSide: string }) => [
        r.date?.slice(0, 10), r.voucherNumber, r.type, r.reference ?? '',
        r.narration ?? '', r.currency, r.debit, r.credit, `${r.runningBalance} ${r.runningSide}`,
      ]);
      downloadCsv(`statement-${data.account?.code || 'account'}.csv`, toCsv(headers, rows));
    } else if (reportType === 'customer-statement') {
      const headers = ['Sl No', 'Invoice No', 'Date', 'Days', 'Balance Amount', 'Cum. Balance'];
      const rows = (data.rows || []).map((r: { invoiceNumber: string; invoiceDate: string; days: number; balance: number; cumBalance: number }, idx: number) => [
        idx + 1, r.invoiceNumber, r.invoiceDate?.slice(0, 10), r.days, r.balance, r.cumBalance,
      ]);
      downloadCsv(`SOA-${data.account?.code || 'customer'}-${asOf}.csv`, toCsv(headers, rows));
    }
  };

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-4">
        <div>
          <Link href="/reports" className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-brand-navy mb-1">
            <ArrowLeft className="w-3 h-3" /> Reports
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">{meta.title}</h1>
          <p className="text-sm text-slate-500">{meta.desc}</p>
        </div>
        <div className="flex items-center gap-2">
          {reportType === 'customer-statement' && (
            <button
              onClick={handlePdfDownload}
              disabled={!data || !accountId || downloadingPdf}
              className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
            >
              {downloadingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              Print PDF
            </button>
          )}
          <button
            onClick={handleExport}
            disabled={!data}
            className="flex items-center gap-2 px-4 py-2 bg-brand-navy text-white rounded-xl text-sm font-semibold hover:bg-brand-navy/90 disabled:opacity-50"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 mb-5 bg-white border border-slate-200 rounded-xl p-4">
        {reportType === 'outstanding-receivables' || reportType === 'customer-statement' ? (
          <div>
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1 block">As of</label>
            <input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)}
              className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg" />
          </div>
        ) : (
          <>
            <div>
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1 block">From</label>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
                className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg" />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1 block">To</label>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
                className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg" />
            </div>
          </>
        )}
        {reportType === 'voucher-register' && (
          <>
            <div>
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Type</label>
              <select value={voucherType} onChange={(e) => setVoucherType(e.target.value)}
                className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white">
                <option value="">All types</option>
                {Object.entries(VOUCHER_TYPE_LABEL).map(([k, label]) => (
                  <option key={k} value={k}>{label}</option>
                ))}
              </select>
            </div>
            <div className="min-w-[260px]">
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Account (optional)</label>
              <select value={accountId} onChange={(e) => setAccountId(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white">
                <option value="">All accounts</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.code} · {a.name}</option>
                ))}
              </select>
            </div>
          </>
        )}
        {(reportType === 'account-statement' || reportType === 'customer-statement') && (
          <div className="min-w-[300px] flex-1">
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1 block">
              {reportType === 'customer-statement' ? 'Customer' : 'Account'}
            </label>
            <select value={accountId} onChange={(e) => setAccountId(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white">
              <option value="">Select {reportType === 'customer-statement' ? 'a customer' : 'an account'}…</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.code} · {a.name}{a.accountGroup ? ` · ${a.accountGroup.name}` : ''}</option>
              ))}
            </select>
          </div>
        )}
        <button onClick={() => refetch()}
          className="px-4 py-1.5 text-sm font-semibold border border-slate-200 rounded-lg hover:bg-slate-50">
          Apply
        </button>
      </div>

      {isError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mb-4">
          {(error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to load report.'}
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-16 text-slate-400 gap-2">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading…
        </div>
      )}

      {!isLoading && data && reportType === 'sales-summary' && <SalesSummaryView data={data} />}
      {!isLoading && data && reportType === 'orders-summary' && <OrdersSummaryView data={data} />}
      {!isLoading && data && reportType === 'voucher-register' && <VoucherRegisterView data={data} />}
      {!isLoading && data && reportType === 'outstanding-receivables' && <OutstandingView data={data} />}
      {!isLoading && data && reportType === 'account-statement' && <StatementView data={data} />}
      {!isLoading && data && reportType === 'customer-statement' && <CustomerStatementView data={data} />}

      {!isLoading && !data && needsAccount && !accountId && (
        <div className="text-center py-12 text-slate-400 text-sm">
          Pick {reportType === 'customer-statement' ? 'a customer' : 'an account'} to view {reportType === 'customer-statement' ? 'their outstanding statement' : 'its statement'}.
        </div>
      )}
    </DashboardLayout>
  );
}

// ── Section components ───────────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
      <p className="text-xl font-bold text-slate-900 mt-1">{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}

interface SalesSummaryData {
  totals: { invoiceCount: number; totalAmount: number; paidAmount: number; outstandingAmount: number };
  byStatus: { status: string; count: number; amount: number }[];
  byMonth: { month: string; count: number; amount: number }[];
  topCustomers: { name: string; count: number; amount: number }[];
  invoices: { id: string; invoiceNumber: string; invoiceDate: string; billToName: string; status: string; currency: string; total: number }[];
}
function SalesSummaryView({ data }: { data: SalesSummaryData }) {
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-5">
        <StatCard label="Invoices" value={String(data.totals.invoiceCount)} />
        <StatCard label="Total billed" value={formatCurrency(data.totals.totalAmount)} />
        <StatCard label="Paid" value={formatCurrency(data.totals.paidAmount)} />
        <StatCard label="Outstanding" value={formatCurrency(data.totals.outstandingAmount)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-5">
        <Panel title="By Status">
          <BreakdownTable rows={data.byStatus.map((s) => ({ label: s.status, count: s.count, amount: s.amount }))} />
        </Panel>
        <Panel title="By Month">
          <BreakdownTable rows={data.byMonth.map((m) => ({ label: m.month, count: m.count, amount: m.amount }))} />
        </Panel>
        <Panel title="Top Customers">
          <BreakdownTable rows={data.topCustomers.map((c) => ({ label: c.name, count: c.count, amount: c.amount }))} />
        </Panel>
      </div>

      <Panel title={`Invoices (${data.invoices.length})`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <Th>Invoice #</Th><Th>Date</Th><Th>Customer</Th><Th>Status</Th><Th align="right">Total</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.invoices.map((i) => (
                <tr key={i.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2 font-mono text-brand-navy">{i.invoiceNumber}</td>
                  <td className="px-4 py-2 text-slate-500">{formatDate(i.invoiceDate)}</td>
                  <td className="px-4 py-2">{i.billToName}</td>
                  <td className="px-4 py-2"><Pill>{i.status}</Pill></td>
                  <td className="px-4 py-2 text-right font-semibold">{formatCurrency(i.total, i.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}

interface OrdersSummaryData {
  totals: { orderCount: number; totalValue: number; totalCbm: number; totalWeight: number };
  byStatus: { status: string; count: number; amount: number }[];
  bySalesperson: { name: string; count: number; amount: number }[];
  byDestination: { country: string; count: number; amount: number }[];
  orders: { id: string; orderNumber: string; createdAt: string; status: string; deliveryCity?: string; deliveryCountry?: string; cbm?: number | null; weight?: number | null; price?: number | null; salesperson?: { name?: string } | null; repName?: string | null }[];
}
function OrdersSummaryView({ data }: { data: OrdersSummaryData }) {
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-5">
        <StatCard label="Orders" value={String(data.totals.orderCount)} />
        <StatCard label="Total value" value={formatCurrency(data.totals.totalValue)} />
        <StatCard label="Total CBM" value={`${data.totals.totalCbm.toFixed(3)} m³`} />
        <StatCard label="Total weight" value={`${data.totals.totalWeight.toFixed(1)} kg`} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-5">
        <Panel title="By Status">
          <BreakdownTable rows={data.byStatus.map((s) => ({ label: s.status, count: s.count, amount: s.amount }))} />
        </Panel>
        <Panel title="By Salesperson">
          <BreakdownTable rows={data.bySalesperson.map((s) => ({ label: s.name, count: s.count, amount: s.amount }))} />
        </Panel>
        <Panel title="By Destination">
          <BreakdownTable rows={data.byDestination.map((d) => ({ label: d.country, count: d.count, amount: d.amount }))} />
        </Panel>
      </div>

      <Panel title={`Orders (${data.orders.length})`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <Th>Order #</Th><Th>Date</Th><Th>Status</Th><Th>Salesperson</Th><Th>Destination</Th><Th align="right">Price</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.orders.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2 font-mono text-brand-navy">{o.orderNumber}</td>
                  <td className="px-4 py-2 text-slate-500">{formatDate(o.createdAt)}</td>
                  <td className="px-4 py-2"><Pill>{o.status}</Pill></td>
                  <td className="px-4 py-2">{o.salesperson?.name ?? o.repName ?? '—'}</td>
                  <td className="px-4 py-2 text-slate-600">{o.deliveryCity}, {o.deliveryCountry}</td>
                  <td className="px-4 py-2 text-right font-semibold">{formatCurrency(o.price ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}

interface VoucherRegisterData {
  totals: { voucherCount: number; totalCredit: number; totalDebit: number; net: number };
  byType: { type: string; count: number; credit: number; debit: number; net: number }[];
  vouchers: Voucher[];
}
function VoucherRegisterView({ data }: { data: VoucherRegisterData }) {
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-5">
        <StatCard label="Vouchers" value={String(data.totals.voucherCount)} />
        <StatCard label="Total credits" value={formatCurrency(data.totals.totalCredit)} sub="deducted from outstanding" />
        <StatCard label="Total debits" value={formatCurrency(data.totals.totalDebit)} sub="added to outstanding" />
        <StatCard label="Net (Dr − Cr)" value={formatCurrency(data.totals.net)} />
      </div>
      <Panel title="By Type">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <Th>Type</Th><Th align="right">Count</Th><Th align="right">Debit</Th><Th align="right">Credit</Th><Th align="right">Net</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.byType.map((t) => (
                <tr key={t.type}>
                  <td className="px-4 py-2">{VOUCHER_TYPE_LABEL[t.type as keyof typeof VOUCHER_TYPE_LABEL] || t.type}</td>
                  <td className="px-4 py-2 text-right">{t.count}</td>
                  <td className="px-4 py-2 text-right text-rose-700">{formatCurrency(t.debit)}</td>
                  <td className="px-4 py-2 text-right text-emerald-700">{formatCurrency(t.credit)}</td>
                  <td className="px-4 py-2 text-right font-semibold">{formatCurrency(t.net)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <div className="h-3" />
      <Panel title={`Vouchers (${data.vouchers.length})`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <Th>Voucher #</Th><Th>Date</Th><Th>Type</Th><Th>Party</Th><Th>Reference</Th><Th align="right">Debit</Th><Th align="right">Credit</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.vouchers.map((v) => (
                <tr key={v.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2 font-mono text-brand-navy">{v.voucherNumber}</td>
                  <td className="px-4 py-2 text-slate-500">{formatDate(v.voucherDate)}</td>
                  <td className="px-4 py-2">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${VOUCHER_TYPE_COLOR[v.type]}`}>
                      {VOUCHER_TYPE_LABEL[v.type]}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    {v.account ? `${v.account.code} · ${v.account.name}` : (v.partyName || '—')}
                  </td>
                  <td className="px-4 py-2 text-xs font-mono text-slate-500">
                    {v.invoice ? `INV · ${v.invoice.invoiceNumber}` : (v.order ? `ORD · ${v.order.orderNumber}` : '—')}
                  </td>
                  <td className="px-4 py-2 text-right text-rose-700">
                    {v.direction === 'DEBIT' ? formatCurrency(v.amount, v.currency) : '—'}
                  </td>
                  <td className="px-4 py-2 text-right text-emerald-700">
                    {v.direction === 'CREDIT' ? formatCurrency(v.amount, v.currency) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}

interface OutstandingData {
  asOf: string;
  totals: { invoiceCount: number; outstandingAed: number };
  byCurrency: { currency: string; count: number; outstanding: number }[];
  rows: { id: string; invoiceNumber: string; invoiceDate: string; dueDate: string | null; billToName: string; status: string; currency: string; total: number; paid: number; adjustments: number; outstanding: number; daysOverdue: number }[];
}
function OutstandingView({ data }: { data: OutstandingData }) {
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <StatCard label="Open invoices" value={String(data.totals.invoiceCount)} sub={`as of ${formatDate(data.asOf)}`} />
        <StatCard label="Outstanding (AED)" value={formatCurrency(data.totals.outstandingAed)} />
        <Panel title="By Currency">
          <BreakdownTable rows={data.byCurrency.map((c) => ({ label: c.currency, count: c.count, amount: c.outstanding }))} />
        </Panel>
      </div>
      <Panel title={`Open invoices (${data.rows.length})`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <Th>Invoice #</Th><Th>Date</Th><Th>Due</Th><Th>Customer</Th><Th>Status</Th>
                <Th align="right">Total</Th><Th align="right">Paid</Th><Th align="right">Adj</Th><Th align="right">Outstanding</Th><Th align="right">Overdue</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.rows.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2 font-mono text-brand-navy">{r.invoiceNumber}</td>
                  <td className="px-4 py-2 text-slate-500">{formatDate(r.invoiceDate)}</td>
                  <td className="px-4 py-2 text-slate-500">{r.dueDate ? formatDate(r.dueDate) : '—'}</td>
                  <td className="px-4 py-2">{r.billToName}</td>
                  <td className="px-4 py-2"><Pill>{r.status}</Pill></td>
                  <td className="px-4 py-2 text-right">{formatCurrency(r.total, r.currency)}</td>
                  <td className="px-4 py-2 text-right text-emerald-700">{formatCurrency(r.paid, r.currency)}</td>
                  <td className="px-4 py-2 text-right text-rose-700">{formatCurrency(r.adjustments, r.currency)}</td>
                  <td className="px-4 py-2 text-right font-bold">{formatCurrency(r.outstanding, r.currency)}</td>
                  <td className={`px-4 py-2 text-right ${r.daysOverdue > 0 ? 'text-rose-700 font-semibold' : 'text-slate-400'}`}>
                    {r.daysOverdue > 0 ? `${r.daysOverdue}d` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}

interface StatementData {
  account: { code: string; name: string; accountGroup?: { name: string; groupType: string } | null; trn?: string | null; mobile1?: string | null; email?: string | null };
  period: { from: string | null; to: string | null };
  opening: { debit: number; credit: number };
  totals: { totalDebit: number; totalCredit: number };
  closing: { balance: number; side: 'Dr' | 'Cr' };
  rows: { date: string; voucherNumber: string; type: string; reference: string | null; narration: string | null; currency: string; debit: number; credit: number; runningBalance: number; runningSide: 'Dr' | 'Cr' }[];
}
function StatementView({ data }: { data: StatementData }) {
  return (
    <>
      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Account</p>
            <p className="text-lg font-bold text-slate-900">{data.account.code} · {data.account.name}</p>
            <p className="text-xs text-slate-500">
              {data.account.accountGroup?.name}{data.account.trn ? `  ·  TRN ${data.account.trn}` : ''}
              {data.account.mobile1 ? `  ·  ${data.account.mobile1}` : ''}
              {data.account.email ? `  ·  ${data.account.email}` : ''}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Closing balance</p>
            <p className="text-xl font-bold text-brand-navy">
              {formatCurrency(data.closing.balance)} <span className="text-sm text-slate-500">{data.closing.side}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <StatCard
          label="Opening"
          value={data.opening.debit ? `${formatCurrency(data.opening.debit)} Dr` : data.opening.credit ? `${formatCurrency(data.opening.credit)} Cr` : '—'}
        />
        <StatCard label="Total debit (period)" value={formatCurrency(data.totals.totalDebit)} />
        <StatCard label="Total credit (period)" value={formatCurrency(data.totals.totalCredit)} />
      </div>

      <Panel title={`Ledger (${data.rows.length})`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <Th>Date</Th><Th>Voucher #</Th><Th>Type</Th><Th>Reference</Th><Th>Narration</Th>
                <Th align="right">Debit</Th><Th align="right">Credit</Th><Th align="right">Balance</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.rows.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">No entries in this period.</td></tr>
              )}
              {data.rows.map((r) => (
                <tr key={r.voucherNumber} className="hover:bg-slate-50">
                  <td className="px-4 py-2 text-slate-500">{formatDate(r.date)}</td>
                  <td className="px-4 py-2 font-mono text-brand-navy">{r.voucherNumber}</td>
                  <td className="px-4 py-2">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${VOUCHER_TYPE_COLOR[r.type as keyof typeof VOUCHER_TYPE_COLOR]}`}>
                      {VOUCHER_TYPE_LABEL[r.type as keyof typeof VOUCHER_TYPE_LABEL] || r.type}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-xs font-mono text-slate-500">{r.reference || '—'}</td>
                  <td className="px-4 py-2 text-slate-600 max-w-[260px] truncate">{r.narration || '—'}</td>
                  <td className="px-4 py-2 text-right text-rose-700">{r.debit > 0 ? formatCurrency(r.debit, r.currency) : '—'}</td>
                  <td className="px-4 py-2 text-right text-emerald-700">{r.credit > 0 ? formatCurrency(r.credit, r.currency) : '—'}</td>
                  <td className="px-4 py-2 text-right font-semibold">
                    {formatCurrency(r.runningBalance, r.currency)}
                    <span className="text-xs text-slate-400 ml-1">{r.runningSide}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}

// ── Customer Statement (SOA) view ───────────────────────────────────────────
interface CustomerStatementData {
  account: {
    code: string;
    name: string;
    accountGroup?: { name: string; groupType: string } | null;
    phone1?: string | null;
    mobile1?: string | null;
    mobile2?: string | null;
    trn?: string | null;
    email?: string | null;
    address?: string | null;
  };
  asOf: string;
  currency: string;
  totals: { invoiceCount: number; totalOutstanding: number };
  rows: { id: string; invoiceNumber: string; invoiceDate: string; currency: string; days: number; balance: number; cumBalance: number }[];
}
function CustomerStatementView({ data }: { data: CustomerStatementData }) {
  return (
    <>
      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Customer Outstanding Statement as of {formatDate(data.asOf)}
            </p>
            <p className="text-lg font-bold text-slate-900 mt-1">{data.account.name}</p>
            <p className="text-xs text-slate-500">
              {data.account.code}
              {data.account.trn ? `  ·  TRN ${data.account.trn}` : ''}
              {data.account.accountGroup ? `  ·  ${data.account.accountGroup.name}` : ''}
            </p>
          </div>
          <div className="text-right text-sm text-slate-600 space-y-0.5">
            <p>Phone : <span className="font-medium">{data.account.phone1 || '—'}</span></p>
            <p>Mobile : <span className="font-medium">{data.account.mobile1 || data.account.mobile2 || '—'}</span></p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <StatCard label="Open invoices" value={String(data.totals.invoiceCount)} />
        <StatCard label="Total outstanding" value={formatCurrency(data.totals.totalOutstanding, data.currency)} />
        <StatCard label="As of" value={formatDate(data.asOf)} />
      </div>

      <Panel title={`Outstanding invoices (${data.rows.length})`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <Th align="center">Sl No</Th>
                <Th>Invoice No</Th>
                <Th>Date</Th>
                <Th align="center">Days</Th>
                <Th align="right">Balance Amount</Th>
                <Th align="right">Cum. Balance</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.rows.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No outstanding invoices.</td></tr>
              )}
              {data.rows.map((r, idx) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2 text-center text-slate-500">{idx + 1}</td>
                  <td className="px-4 py-2 font-mono text-brand-navy">{r.invoiceNumber}</td>
                  <td className="px-4 py-2 text-slate-500">{formatDate(r.invoiceDate)}</td>
                  <td className="px-4 py-2 text-center text-slate-700">{r.days}</td>
                  <td className="px-4 py-2 text-right">{formatCurrency(r.balance, r.currency)}</td>
                  <td className="px-4 py-2 text-right font-semibold text-brand-navy">{formatCurrency(r.cumBalance, r.currency)}</td>
                </tr>
              ))}
            </tbody>
            {data.rows.length > 0 && (
              <tfoot className="bg-brand-navy/5 border-t-2 border-brand-navy">
                <tr>
                  <td colSpan={4} className="px-4 py-2 text-right text-xs font-bold text-brand-navy uppercase">Total Outstanding</td>
                  <td className="px-4 py-2 text-right font-bold text-brand-navy" colSpan={2}>
                    {formatCurrency(data.totals.totalOutstanding, data.currency)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </Panel>
    </>
  );
}

// ── Small reusable bits ────────────────────────────────────────────────────────────────────────
function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
        {title}
      </div>
      <div>{children}</div>
    </div>
  );
}

function Th({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' | 'center' }) {
  return (
    <th className={`px-4 py-2.5 text-${align} text-xs font-semibold text-slate-500 uppercase tracking-wider`}>
      {children}
    </th>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 text-xs font-semibold bg-slate-100 text-slate-700 rounded-full">
      {children}
    </span>
  );
}

function BreakdownTable({ rows }: { rows: { label: string; count: number; amount: number }[] }) {
  if (rows.length === 0) return <div className="px-4 py-3 text-xs text-slate-400">No data.</div>;
  return (
    <table className="w-full text-sm">
      <tbody className="divide-y divide-slate-100">
        {rows.map((r) => (
          <tr key={r.label}>
            <td className="px-4 py-2 text-slate-700 truncate max-w-[180px]">{r.label}</td>
            <td className="px-4 py-2 text-right text-xs text-slate-400">{r.count}</td>
            <td className="px-4 py-2 text-right font-semibold">{formatCurrency(r.amount)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
