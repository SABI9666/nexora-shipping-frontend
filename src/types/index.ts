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
