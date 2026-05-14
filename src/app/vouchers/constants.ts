import { AccountGroupType, VoucherType } from '@/types';

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

// Label that fits the voucher context, e.g. "Supplier" for PURCHASE.
export const VOUCHER_PARTY_LABEL: Record<VoucherType, string> = {
  CASH: 'Party',
  PURCHASE: 'Supplier',
  PAYMENT: 'Paid to',
  BANK: 'Counterparty',
  JOURNAL: 'Party',
  RECEIPT: 'Received from (Customer)',
  SUPPLIER_PAYMENT: 'Supplier',
  CREDIT_NOTE: 'Issued to (Customer)',
  DEBIT_NOTE: 'Issued to (Supplier)',
};

// Suggested account group filter for the party picker.
// Customers / Debtors live under ASSET; Suppliers / Creditors live under
// LIABILITIES. `null` = show every account in the master.
export const VOUCHER_PARTY_FILTER: Record<VoucherType, AccountGroupType[] | null> = {
  CASH: null,
  PURCHASE: ['LIABILITIES'],
  PAYMENT: ['LIABILITIES'],
  BANK: null,
  JOURNAL: null,
  RECEIPT: ['ASSET'],
  SUPPLIER_PAYMENT: ['LIABILITIES'],
  CREDIT_NOTE: ['ASSET'],
  DEBIT_NOTE: ['LIABILITIES'],
};

// Contra account is typically a cash/bank account (asset). Credit / debit
// notes don't move money so contra is irrelevant there.
export const VOUCHER_CONTRA_FILTER: Record<VoucherType, AccountGroupType[] | null> = {
  CASH: ['ASSET'],
  PURCHASE: ['ASSET'],
  PAYMENT: ['ASSET'],
  BANK: ['ASSET'],
  JOURNAL: null,
  RECEIPT: ['ASSET'],
  SUPPLIER_PAYMENT: ['ASSET'],
  CREDIT_NOTE: null,
  DEBIT_NOTE: null,
};

export const VOUCHER_SHOWS_CONTRA: Record<VoucherType, boolean> = {
  CASH: true,
  PURCHASE: true,
  PAYMENT: true,
  BANK: true,
  JOURNAL: true,
  RECEIPT: true,
  SUPPLIER_PAYMENT: true,
  CREDIT_NOTE: false,
  DEBIT_NOTE: false,
};
