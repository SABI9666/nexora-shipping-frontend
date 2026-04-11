'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import { Search, MapPin, Package, CheckCircle, Circle, Clock, AlertCircle, ArrowLeft } from 'lucide-react';
import { Shipment, ShipmentEvent, ShipmentStatus } from '@/types';
import { formatDateTime, SHIPMENT_STATUS_CONFIG } from '@/lib/utils';
import { NexoraLogo } from '@/components/ui/NexoraLogo';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

const STATUS_ICONS: Record<ShipmentStatus, React.ElementType> = {
  PENDING: Clock,
  PICKED_UP: Package,
  IN_TRANSIT: MapPin,
  OUT_FOR_DELIVERY: MapPin,
  DELIVERED: CheckCircle,
  FAILED: AlertCircle,
  CANCELLED: AlertCircle,
  RETURNED: AlertCircle,
};

// Inner component that uses useSearchParams — must be inside Suspense
function TrackContent() {
  const searchParams = useSearchParams();
  const [trackingNumber, setTrackingNumber] = useState(searchParams.get('number') || '');
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const number = searchParams.get('number');
    if (number) {
      setTrackingNumber(number);
      handleTrack(number);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTrack = async (number?: string) => {
    const tn = (number || trackingNumber).trim().toUpperCase();
    if (!tn) return;
    setLoading(true);
    setError('');
    setShipment(null);
    try {
      const response = await axios.get(`${API_URL}/api/shipments/track/${tn}`);
      setShipment(response.data.data);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || 'Shipment not found. Please check your tracking number.');
    } finally {
      setLoading(false);
    }
  };

  const statusConfig = shipment ? SHIPMENT_STATUS_CONFIG[shipment.status] : null;

  return (
    <>
      {/* Search */}
      <div className="max-w-2xl mx-auto px-4 -mt-6 mb-8">
        <div className="bg-white rounded-2xl shadow-lg p-2 flex gap-2">
          <input
            type="text"
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && handleTrack()}
            placeholder="e.g. NEX1234567890US"
            className="flex-1 px-4 py-3 text-sm font-mono focus:outline-none placeholder:text-slate-400"
          />
          <button
            onClick={() => handleTrack()}
            disabled={loading}
            className="bg-brand-red text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-brand-red-dark transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            Track
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pb-12">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        {shipment && (
          <div className="space-y-4">
            {/* Status card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Tracking Number</p>
                  <p className="font-mono font-bold text-lg text-brand-navy">{shipment.trackingNumber}</p>
                </div>
                {statusConfig && (
                  <span className={`badge text-sm px-3 py-1 ${statusConfig.bg} ${statusConfig.color}`}>
                    {statusConfig.label}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 mb-1">From</p>
                  <p className="text-sm font-medium text-slate-800">{shipment.origin}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">To</p>
                  <p className="text-sm font-medium text-slate-800">{shipment.destination}</p>
                </div>
                {shipment.currentLocation && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Current Location</p>
                    <p className="text-sm font-medium text-slate-800 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-brand-red" />
                      {shipment.currentLocation}
                    </p>
                  </div>
                )}
                {shipment.estimatedDelivery && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Est. Delivery</p>
                    <p className="text-sm font-medium text-slate-800">{formatDateTime(shipment.estimatedDelivery)}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Timeline */}
            {shipment.events && shipment.events.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <h3 className="font-semibold text-slate-900 mb-5">Shipment Timeline</h3>
                <div className="space-y-0">
                  {shipment.events.map((event: ShipmentEvent, index: number) => {
                    const Icon = STATUS_ICONS[event.status] || Circle;
                    const isFirst = index === 0;
                    return (
                      <div key={event.id} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isFirst ? 'bg-brand-navy' : 'bg-slate-100'}`}>
                            <Icon className={`w-4 h-4 ${isFirst ? 'text-white' : 'text-slate-400'}`} />
                          </div>
                          {index < shipment.events!.length - 1 && (
                            <div className="w-px flex-1 bg-slate-200 my-1 min-h-[24px]" />
                          )}
                        </div>
                        <div className="pb-5">
                          <p className={`text-sm font-semibold ${isFirst ? 'text-slate-900' : 'text-slate-600'}`}>
                            {event.description}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">{event.location}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{formatDateTime(event.timestamp)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

export default function TrackPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-brand-navy py-12 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <Link href="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to home
          </Link>
          <div className="flex items-center justify-center mb-4">
            <div className="bg-white rounded-xl px-4 py-2">
              <NexoraLogo height={44} />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Track Your Shipment</h1>
          <p className="text-slate-400">Enter your tracking number for real-time updates</p>
        </div>
      </div>

      {/* Suspense required for useSearchParams in Next.js 14 */}
      <Suspense fallback={
        <div className="max-w-2xl mx-auto px-4 mt-8 flex justify-center">
          <div className="w-6 h-6 border-2 border-brand-navy border-t-transparent rounded-full animate-spin" />
        </div>
      }>
        <TrackContent />
      </Suspense>
    </div>
  );
}
