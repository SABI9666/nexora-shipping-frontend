import { cn, SHIPMENT_STATUS_CONFIG, ORDER_STATUS_CONFIG } from '@/lib/utils';
import { ShipmentStatus, OrderStatus } from '@/types';

interface StatusBadgeProps {
  status: ShipmentStatus | OrderStatus;
  type: 'shipment' | 'order';
  className?: string;
}

export function StatusBadge({ status, type, className }: StatusBadgeProps) {
  const config =
    type === 'shipment'
      ? SHIPMENT_STATUS_CONFIG[status as ShipmentStatus]
      : ORDER_STATUS_CONFIG[status as OrderStatus];

  if (!config) return <span className="badge bg-gray-100 text-gray-700">{status}</span>;

  return (
    <span className={cn('badge', config.bg, config.color, className)}>
      {config.label}
    </span>
  );
}
