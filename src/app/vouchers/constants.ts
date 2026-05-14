import { VoucherType } from '@/types';

export const VOUCHER_TYPE_LABEL: Record<VoucherType, string> = {
  CASH: 'Cash Voucher',
  PURCHASE: 'Purchase Voucher',
  PAYMENT: 'Payment Voucher',
  BANK: 'Bank Voucher',
  JOURNAL: 'Journal Voucher',
  RECEIPT: 'Customer Receipt',
  SUPPLIER_PAYMENT: 'Supplier Payment',
  CREDIT_NOTE: 'Credit Note',
  DEBIT_NOTE: 'Debit Note',
};

export const VOUCHER_TYPE_COLOR: Record<VoucherType, string> = {
  CASH: 'bg-amber-50 text-amber-700',
  PURCHASE: 'bg-purple-50 text-purple-700',
  PAYMENT: 'bg-rose-50 text-rose-700',
  BANK: 'bg-sky-50 text-sky-700',
  JOURNAL: 'bg-slate-100 text-slate-700',
  RECEIPT: 'bg-emerald-50 text-emerald-700',
  SUPPLIER_PAYMENT: 'bg-orange-50 text-orange-700',
  CREDIT_NOTE: 'bg-teal-50 text-teal-700',
  DEBIT_NOTE: 'bg-red-50 text-red-700',
};
