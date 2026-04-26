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
  repId?: string | null;
  repName?: string | null;
  createdAt: string;
  updatedAt: string;
  shipment?: Partial<Shipment>;
  user?: Partial<User>;
  documents?: Document[];
  salesperson?: Pick<Salesperson, 'id' | 'code' | 'name' | 'phone' | 'email'> | null;
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

// ── Masters ──────────────────────────────────────────────────────────────────

export type AccountGroupType = 'ASSET' | 'LIABILITIES' | 'PL' | 'TRADING';

export interface AccountGroup {
  id: string;
  code: string;
  name: string;
  groupType: AccountGroupType;
  printOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerGroup {
  id: string;
  code: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubAccount {
  id: string;
  code: string;
  name: string;
  accountId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Salesperson {
  id: string;
  code: string;
  name: string;
  phone?: string;
  email?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Account {
  id: string;
  code: string;
  name: string;
  arabicName?: string;
  accountGroupId: string;
  destination?: string;
  address?: string;
  road?: string;
  place?: string;
  route?: string;
  subRoute?: string;
  phone1?: string;
  mobile1?: string;
  mobile2?: string;
  email?: string;
  financeEmail?: string;
  contactPerson?: string;
  acContactPerson?: string;
  acMobileNo?: string;
  rep?: string;
  rep2?: string;
  repId?: string;
  rep2Id?: string;
  opBalance: number;
  opBalanceType: 'Credit' | 'Debit';
  narration?: string;
  paymentTerms?: string;
  trn?: string;
  creditDays: number;
  creditInvoices: number;
  creditLimit: number;
  customerGroupId?: string;
  deliveryAddress?: string;
  createdAt: string;
  updatedAt: string;
  accountGroup?: Pick<AccountGroup, 'id' | 'code' | 'name' | 'groupType'>;
  customerGroup?: Pick<CustomerGroup, 'id' | 'code' | 'name'>;
  salesperson?: Pick<Salesperson, 'id' | 'code' | 'name' | 'phone' | 'email'>;
  salesperson2?: Pick<Salesperson, 'id' | 'code' | 'name' | 'phone' | 'email'>;
  subAccounts?: SubAccount[];
}

export interface ItemMaster {
  id: string;
  code: string;
  name: string;
  phone?: string;
  createdAt: string;
  updatedAt: string;
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
