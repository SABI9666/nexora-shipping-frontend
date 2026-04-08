import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow } from 'date-fns';
import { ShipmentStatus, OrderStatus } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  return format(new Date(date), 'MMM dd, yyyy');
}

export function formatDateTime(date: string | Date): string {
  return format(new Date(date), 'MMM dd, yyyy HH:mm');
}

export function formatRelativeTime(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export const SHIPMENT_STATUS_CONFIG: Record<ShipmentStatus, { label: string; color: string; bg: string }> = {
  PENDING: { label: 'Pending', color: 'text-yellow-700', bg: 'bg-yellow-100' },
  PICKED_UP: { label: 'Picked Up', color: 'text-blue-700', bg: 'bg-blue-100' },
  IN_TRANSIT: { label: 'In Transit', color: 'text-indigo-700', bg: 'bg-indigo-100' },
  OUT_FOR_DELIVERY: { label: 'Out for Delivery', color: 'text-orange-700', bg: 'bg-orange-100' },
  DELIVERED: { label: 'Delivered', color: 'text-green-700', bg: 'bg-green-100' },
  FAILED: { label: 'Failed', color: 'text-red-700', bg: 'bg-red-100' },
  CANCELLED: { label: 'Cancelled', color: 'text-gray-700', bg: 'bg-gray-100' },
  RETURNED: { label: 'Returned', color: 'text-purple-700', bg: 'bg-purple-100' },
};

export const ORDER_STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; bg: string }> = {
  DRAFT: { label: 'Draft', color: 'text-gray-700', bg: 'bg-gray-100' },
  CONFIRMED: { label: 'Confirmed', color: 'text-blue-700', bg: 'bg-blue-100' },
  PROCESSING: { label: 'Processing', color: 'text-yellow-700', bg: 'bg-yellow-100' },
  SHIPPED: { label: 'Shipped', color: 'text-indigo-700', bg: 'bg-indigo-100' },
  COMPLETED: { label: 'Completed', color: 'text-green-700', bg: 'bg-green-100' },
  CANCELLED: { label: 'Cancelled', color: 'text-red-700', bg: 'bg-red-100' },
};
