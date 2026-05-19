import { AccountGroupType, VoucherType } from '@/types';

export const VOUCHER_TYPE_LABEL: Record<VoucherType, string> = {
  CASH: 'Cash Voucher',
  PURCHASE: 'Purchase Entry',
  PAYMENT: 'Payment Voucher',
  BANK: 'Bank Voucher',
  JOURNAL: 'Journal Voucher',
  RECEIPT: 'Receipt Voucher',
  SUPPLIER_PAYMENT: 'Purchase Voucher',
  CREDIT_NOTE: 'Credit Voucher',
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

// Voucher types that open the bill-allocation modal (party search +
// bank picker + invoice allocation table + dedicated PDF layout).
// Receipt and Credit vouchers reuse the same flow as Purchase Voucher.
export const VOUCHER_USES_PAYMENT_FORM: Record<VoucherType, boolean> = {
  CASH: false,
  PURCHASE: true,
  PAYMENT: true,
  BANK: false,
  JOURNAL: false,
  RECEIPT: true,
  SUPPLIER_PAYMENT: true,
  CREDIT_NOTE: true,
  DEBIT_NOTE: false,
};

export type VoucherPaymentMethod = 'CASH' | 'CHEQUE' | 'BANK_TRANSFER' | 'CONTRA';

export const PAYMENT_METHOD_LABEL: Record<VoucherPaymentMethod, string> = {
  CASH: 'Cash',
  CHEQUE: 'Cheque',
  BANK_TRANSFER: 'Bank Transfer',
  CONTRA: 'Contra',
};

// Per-type copy/labels used by the bill-allocation modal so the same
// form works for Purchase / Receipt / Credit / Payment vouchers.
export type VoucherFormCopy = {
  subtitle: string;
  partySearchPlaceholder: string;
  allocColLabel: string;
  totalLabel: string;
  emptyHint: string;
  saveCta: string;
};

export const VOUCHER_FORM_COPY: Record<VoucherType, VoucherFormCopy> = {
  CASH: {
    subtitle: 'Cash voucher.',
    partySearchPlaceholder: 'Search account from master…',
    allocColLabel: 'Amt.',
    totalLabel: 'Total',
    emptyHint: 'Select a party to load open bills.',
    saveCta: 'Save Voucher',
  },
  PURCHASE: {
    subtitle: 'Select a supplier and pick bills you are paying.',
    partySearchPlaceholder: 'Search supplier from master…',
    allocColLabel: 'Paid Amt.',
    totalLabel: 'Total Paid',
    emptyHint: 'Select a supplier to load open bills.',
    saveCta: 'Save Purchase Entry',
  },
  PAYMENT: {
    subtitle: 'Select payee and pick bills you are paying.',
    partySearchPlaceholder: 'Search payee from master…',
    allocColLabel: 'Paid Amt.',
    totalLabel: 'Total Paid',
    emptyHint: 'Select a payee to load open bills.',
    saveCta: 'Save Payment',
  },
  BANK: {
    subtitle: 'Bank voucher.',
    partySearchPlaceholder: 'Search account from master…',
    allocColLabel: 'Amt.',
    totalLabel: 'Total',
    emptyHint: 'Select a party to load open bills.',
    saveCta: 'Save Voucher',
  },
  JOURNAL: {
    subtitle: 'Journal entry.',
    partySearchPlaceholder: 'Search account from master…',
    allocColLabel: 'Amt.',
    totalLabel: 'Total',
    emptyHint: 'Select a party to load open bills.',
    saveCta: 'Save Voucher',
  },
  RECEIPT: {
    subtitle: 'Select a customer and pick invoices the customer is paying.',
    partySearchPlaceholder: 'Search customer from master…',
    allocColLabel: 'Recd. Amt.',
    totalLabel: 'Total Received',
    emptyHint: 'Select a customer to load open invoices.',
    saveCta: 'Save Receipt',
  },
  SUPPLIER_PAYMENT: {
    subtitle: 'Select a supplier and pick bills you are paying.',
    partySearchPlaceholder: 'Search supplier from master…',
    allocColLabel: 'Paid Amt.',
    totalLabel: 'Total Paid',
    emptyHint: 'Select a supplier to load open bills.',
    saveCta: 'Save Purchase Voucher',
  },
  CREDIT_NOTE: {
    subtitle: 'Select a customer and pick invoices to issue credit against.',
    partySearchPlaceholder: 'Search customer from master…',
    allocColLabel: 'Cr. Amt.',
    totalLabel: 'Total Credit',
    emptyHint: 'Select a customer to load open invoices.',
    saveCta: 'Save Credit Voucher',
  },
  DEBIT_NOTE: {
    subtitle: 'Select a supplier and pick bills to debit against.',
    partySearchPlaceholder: 'Search supplier from master…',
    allocColLabel: 'Dr. Amt.',
    totalLabel: 'Total Debit',
    emptyHint: 'Select a supplier to load open bills.',
    saveCta: 'Save Debit Voucher',
  },
};
