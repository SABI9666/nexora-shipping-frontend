export type Role = 'CUSTOMER' | 'ADMIN' | 'DRIVER';

export type ShipmentStatus =
  | 'PENDING'
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'FAILED'
  | 'CANCELLED'
  | 'RETURNED';

export type OrderStatus =
  | 'DRAFT'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'COMPLETED'
  | 'CANCELLED';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: Role;
  isVerified: boolean;
  createdAt: string;
  _count?: { orders: number; shipments: number };
}

export interface ShipmentEvent {
  id: string;
  shipmentId: string;
  status: ShipmentStatus;
  location: string;
  description: string;
  timestamp: string;
}

export interface Shipment {
  id: string;
  trackingNumber: string;
  status: ShipmentStatus;
  origin: string;
  destination: string;
  currentLocation?: string;
  weight: number;
  description?: string;
  carrier?: string;
  estimatedDelivery?: string;
  actualDelivery?: string;
  userId: string;
  orderId?: string;
  createdAt: string;
  updatedAt: string;
  events?: ShipmentEvent[];
  order?: Partial<Order>;
  user?: Partial<User>;
  _count?: { events: number };
}

export interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  pickupAddress: string;
  pickupCity: string;
  pickupCountry: string;
  deliveryAddress: string;
  deliveryCity: string;
  deliveryCountry: string;
  packageDescription: string;
  weight: number;
  length?: number;
  width?: number;
  height?: number;
  declaredValue?: number;
  price?: number;
  specialInstructions?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  shipment?: Partial<Shipment>;
  user?: Partial<User>;
  documents?: Document[];
  _count?: { documents: number };
}

export interface Document {
  id: string;
  name: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  type: string;
  orderId?: string;
  shipmentId?: string;
  uploadedBy: string;
  createdAt: string;
}

export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED';
export type InvoiceCurrency = 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD' | 'JPY' | 'INR';

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  invoiceDate: string;
  dueDate?: string;
  billToName: string;
  billToAddress: string;
  billToCity: string;
  billToCountry: string;
  billToEmail?: string;
  billToPhone?: string;
  shipFromName: string;
  shipFromAddress: string;
  shipFromCity: string;
  shipFromCountry: string;
  currency: InvoiceCurrency;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  shippingCost: number;
  total: number;
  paymentTerms?: string;
  notes?: string;
  orderId?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  items: InvoiceItem[];
  orderRef?: { id: string; orderNumber: string; status?: string };
  user?: Partial<User>;
}

export type QuotationStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'CANCELLED';

export interface QuotationItem {
  id: string;
  quotationId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface Quotation {
  id: string;
  quotationNumber: string;
  status: QuotationStatus;
  quotationDate: string;
  validUntil?: string;
  billToName: string;
  billToAddress: string;
  billToCity: string;
  billToCountry: string;
  billToEmail?: string;
  billToPhone?: string;
  shipFromName: string;
  shipFromAddress: string;
  shipFromCity: string;
  shipFromCountry: string;
  currency: InvoiceCurrency;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  shippingCost: number;
  total: number;
  terms?: string;
  notes?: string;
  orderId?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  items: QuotationItem[];
  orderRef?: { id: string; orderNumber: string; status?: string };
  user?: Partial<User>;
}

export type VoucherType =
  | 'CASH'
  | 'PURCHASE'
  | 'PAYMENT'
  | 'BANK'
  | 'JOURNAL'
  | 'RECEIPT'
  | 'SUPPLIER_PAYMENT'
  | 'CREDIT_NOTE'
  | 'DEBIT_NOTE';

export type VoucherDirection = 'DEBIT' | 'CREDIT';
export type VoucherReferenceType = 'NONE' | 'INVOICE' | 'ORDER';

export interface Voucher {
  id: string;
  voucherNumber: string;
  type: VoucherType;
  direction: VoucherDirection;
  voucherDate: string;
  amount: number;
  currency: string;
  referenceType: VoucherReferenceType;
  invoiceId?: string | null;
  orderId?: string | null;
  partyName?: string | null;
  narration?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  fileMimeType?: string | null;
  fileSize?: number | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
  invoice?: {
    id: string;
    invoiceNumber: string;
    total: number;
    currency: string;
    billToName: string;
  } | null;
  order?: {
    id: string;
    orderNumber: string;
    price: number | null;
  } | null;
  user?: Partial<User>;
}

export interface VoucherReferenceValue {
  reference: {
    type: 'INVOICE' | 'ORDER';
    id: string;
    number: string;
    party: string | null;
    status: string;
  };
  baseValue: number;
  creditTotal: number;
  debitTotal: number;
  outstanding: number;
  currency: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface DashboardStats {
  orders: {
    total: number;
    byStatus: Record<OrderStatus, number>;
    totalRevenue: number;
  };
  shipments: {
    total: number;
    byStatus: Record<ShipmentStatus, number>;
    deliveredLast30Days: number;
  };
}
