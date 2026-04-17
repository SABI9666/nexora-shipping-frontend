'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatusBadge } from '@/components/ui/StatusBadge';
import api from '@/lib/api';
import { formatDate, SHIPMENT_STATUS_CONFIG } from '@/lib/utils';
import { Shipment, ShipmentStatus } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import {
  Truck, Search, ChevronLeft, ChevronRight, MapPin, RefreshCw,
  X, CheckCircle, AlertCircle, Anchor, PlaneTakeoff, Warehouse,
  Navigation,
} from 'lucide-react';

// ─── Route Waypoint Engine ────────────────────────────────────────────────────

type StopType = 'origin' | 'hub' | 'port' | 'airport' | 'transit' | 'destination';

interface RouteStop {
  name: string;
  type: StopType;
}

const REGION_HUBS: Record<string, RouteStop[]> = {
  US: [
    { name: 'Chicago O\'Hare Hub, US', type: 'airport' },
    { name: 'New York JFK Hub, US', type: 'airport' },
    { name: 'Los Angeles Hub, US', type: 'airport' },
    { name: 'Miami Hub, US', type: 'airport' },
    { name: 'Dallas DFW Hub, US', type: 'hub' },
  ],
  CA: [
    { name: 'Toronto Pearson Hub, CA', type: 'airport' },
    { name: 'Vancouver Hub, CA', type: 'port' },
  ],
  GB: [
    { name: 'London Heathrow Hub, GB', type: 'airport' },
    { name: 'Felixstowe Port, GB', type: 'port' },
  ],
  DE: [
    { name: 'Frankfurt Hub, DE', type: 'airport' },
    { name: 'Hamburg Port, DE', type: 'port' },
  ],
  FR: [
    { name: 'Paris CDG Hub, FR', type: 'airport' },
    { name: 'Marseille Port, FR', type: 'port' },
  ],
  NL: [
    { name: 'Amsterdam Schiphol Hub, NL', type: 'airport' },
    { name: 'Rotterdam Port, NL', type: 'port' },
  ],
  AE: [
    { name: 'Dubai International Hub, AE', type: 'airport' },
    { name: 'Jebel Ali Port, AE', type: 'port' },
  ],
  SG: [
    { name: 'Singapore Changi Hub, SG', type: 'airport' },
    { name: 'Singapore Port, SG', type: 'port' },
  ],
  HK: [
    { name: 'Hong Kong Hub, HK', type: 'airport' },
    { name: 'Hong Kong Port, HK', type: 'port' },
  ],
  JP: [
    { name: 'Tokyo Narita Hub, JP', type: 'airport' },
    { name: 'Osaka Port, JP', type: 'port' },
  ],
  CN: [
    { name: 'Shanghai Pudong Hub, CN', type: 'airport' },
    { name: 'Shanghai Port, CN', type: 'port' },
    { name: 'Shenzhen Port, CN', type: 'port' },
  ],
  IN: [
    { name: 'Mumbai BOM Hub, IN', type: 'airport' },
    { name: 'Mumbai Port, IN', type: 'port' },
    { name: 'Delhi Hub, IN', type: 'airport' },
    { name: 'Chennai Port, IN', type: 'port' },
  ],
  AU: [
    { name: 'Sydney Hub, AU', type: 'airport' },
    { name: 'Melbourne Port, AU', type: 'port' },
  ],
  BR: [
    { name: 'São Paulo GRU Hub, BR', type: 'airport' },
    { name: 'Santos Port, BR', type: 'port' },
  ],
  MX: [
    { name: 'Mexico City Hub, MX', type: 'airport' },
    { name: 'Manzanillo Port, MX', type: 'port' },
  ],
  ZA: [
    { name: 'Johannesburg Hub, ZA', type: 'airport' },
    { name: 'Cape Town Port, ZA', type: 'port' },
  ],
  NG: [
    { name: 'Lagos Hub, NG', type: 'airport' },
    { name: 'Apapa Port, NG', type: 'port' },
  ],
  EG: [
    { name: 'Cairo Hub, EG', type: 'airport' },
    { name: 'Port Said, EG', type: 'port' },
  ],
  QA: [{ name: 'Doha Hub, QA', type: 'airport' }],
  SA: [
    { name: 'Riyadh Hub, SA', type: 'airport' },
    { name: 'Jeddah Port, SA', type: 'port' },
  ],
  KR: [
    { name: 'Seoul Incheon Hub, KR', type: 'airport' },
    { name: 'Busan Port, KR', type: 'port' },
  ],
  MY: [
    { name: 'Kuala Lumpur Hub, MY', type: 'airport' },
    { name: 'Port Klang, MY', type: 'port' },
  ],
  TH: [
    { name: 'Bangkok Hub, TH', type: 'airport' },
    { name: 'Laem Chabang Port, TH', type: 'port' },
  ],
};

const TRANSIT_HUBS: Record<string, RouteStop> = {
  MIDEAST: { name: 'Dubai International Hub, AE', type: 'transit' },
  EUROPE: { name: 'Frankfurt Hub, DE', type: 'transit' },
  ASIA: { name: 'Singapore Changi Hub, SG', type: 'transit' },
  EASTUS: { name: 'New York JFK Hub, US', type: 'transit' },
  WESTUS: { name: 'Los Angeles Hub, US', type: 'transit' },
  ROTTERDAM: { name: 'Rotterdam Port, NL', type: 'transit' },
};

function getRegion(country: string): string {
  const regions: Record<string, string> = {
    US: 'AMERICAS', CA: 'AMERICAS', MX: 'AMERICAS', BR: 'AMERICAS',
    CO: 'AMERICAS', AR: 'AMERICAS', CL: 'AMERICAS', PE: 'AMERICAS',
    GB: 'EUROPE', DE: 'EUROPE', FR: 'EUROPE', NL: 'EUROPE', IT: 'EUROPE',
    ES: 'EUROPE', CH: 'EUROPE', SE: 'EUROPE', NO: 'EUROPE', PL: 'EUROPE',
    AE: 'MIDEAST', SA: 'MIDEAST', QA: 'MIDEAST', KW: 'MIDEAST', OM: 'MIDEAST',
    IN: 'SOUTH_ASIA', PK: 'SOUTH_ASIA', BD: 'SOUTH_ASIA', LK: 'SOUTH_ASIA',
    CN: 'EAST_ASIA', JP: 'EAST_ASIA', KR: 'EAST_ASIA', HK: 'EAST_ASIA',
    TW: 'EAST_ASIA',
    SG: 'SEA', MY: 'SEA', TH: 'SEA', ID: 'SEA', VN: 'SEA', PH: 'SEA',
    AU: 'OCEANIA', NZ: 'OCEANIA',
    ZA: 'AFRICA', NG: 'AFRICA', KE: 'AFRICA', EG: 'AFRICA', GH: 'AFRICA',
  };
  return regions[country] || 'OTHER';
}

function parseCountry(location: string): string {
  const parts = location.split(',');
  return parts[parts.length - 1].trim().toUpperCase().slice(0, 2);
}

function buildRoute(origin: string, destination: string): RouteStop[] {
  const originCountry = parseCountry(origin);
  const destCountry = parseCountry(destination);
  const originRegion = getRegion(originCountry);
  const destRegion = getRegion(destCountry);

  const originStop: RouteStop = { name: origin, type: 'origin' };
  const destStop: RouteStop = { name: destination, type: 'destination' };

  if (originCountry === destCountry) {
    const hubs = (REGION_HUBS[originCountry] || []).slice(0, 2);
    return [originStop, ...hubs, destStop];
  }

  const middle: RouteStop[] = [];

  const originHubs = (REGION_HUBS[originCountry] || []).slice(0, 1);
  const destHubs = (REGION_HUBS[destCountry] || []).slice(0, 1);

  middle.push(...originHubs);

  // Add transit hubs between different regions
  if (originRegion !== destRegion) {
    if (originRegion === 'AMERICAS' && destRegion === 'EUROPE') {
      middle.push(TRANSIT_HUBS.EASTUS, TRANSIT_HUBS.ROTTERDAM);
    } else if (originRegion === 'AMERICAS' && (destRegion === 'EAST_ASIA' || destRegion === 'SEA')) {
      middle.push(TRANSIT_HUBS.WESTUS, TRANSIT_HUBS.ASIA);
    } else if (originRegion === 'AMERICAS' && destRegion === 'SOUTH_ASIA') {
      middle.push(TRANSIT_HUBS.EASTUS, TRANSIT_HUBS.MIDEAST);
    } else if (originRegion === 'AMERICAS' && destRegion === 'MIDEAST') {
      middle.push(TRANSIT_HUBS.EASTUS, TRANSIT_HUBS.EUROPE);
    } else if (originRegion === 'EUROPE' && (destRegion === 'EAST_ASIA' || destRegion === 'SEA')) {
      middle.push(TRANSIT_HUBS.MIDEAST, TRANSIT_HUBS.ASIA);
    } else if (originRegion === 'EUROPE' && destRegion === 'SOUTH_ASIA') {
      middle.push(TRANSIT_HUBS.MIDEAST);
    } else if (originRegion === 'EUROPE' && destRegion === 'MIDEAST') {
      middle.push(TRANSIT_HUBS.MIDEAST);
    } else if (originRegion === 'MIDEAST' && (destRegion === 'EAST_ASIA' || destRegion === 'SEA')) {
      middle.push(TRANSIT_HUBS.ASIA);
    } else if (originRegion === 'SOUTH_ASIA' && (destRegion === 'EAST_ASIA' || destRegion === 'SEA')) {
      middle.push(TRANSIT_HUBS.ASIA);
    } else if (originRegion === 'SOUTH_ASIA' && destRegion === 'AMERICAS') {
      middle.push(TRANSIT_HUBS.MIDEAST, TRANSIT_HUBS.EUROPE);
    } else if ((originRegion === 'EAST_ASIA' || originRegion === 'SEA') && destRegion === 'AMERICAS') {
      middle.push(TRANSIT_HUBS.ASIA, TRANSIT_HUBS.WESTUS);
    } else if ((originRegion === 'EAST_ASIA' || originRegion === 'SEA') && destRegion === 'EUROPE') {
      middle.push(TRANSIT_HUBS.ASIA, TRANSIT_HUBS.MIDEAST);
    } else if (originRegion === 'AFRICA' || destRegion === 'AFRICA') {
      middle.push(TRANSIT_HUBS.EUROPE);
    } else if (originRegion === 'OCEANIA' || destRegion === 'OCEANIA') {
      middle.push(TRANSIT_HUBS.ASIA);
    } else {
      middle.push(TRANSIT_HUBS.MIDEAST);
    }
  }

  middle.push(...destHubs);

  // Deduplicate by name
  const seen = new Set<string>([origin, destination]);
  const unique = middle.filter((s) => {
    if (seen.has(s.name)) return false;
    seen.add(s.name);
    return true;
  });

  return [originStop, ...unique, destStop];
}

// ─── Waypoint Icons ───────────────────────────────────────────────────────────

const STOP_ICON: Record<StopType, React.ElementType> = {
  origin: MapPin,
  destination: MapPin,
  hub: Warehouse,
  port: Anchor,
  airport: PlaneTakeoff,
  transit: Navigation,
};

const STOP_COLOR: Record<StopType, { dot: string; bg: string; text: string; border: string }> = {
  origin: { dot: 'bg-green-500', bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  destination: { dot: 'bg-brand-red', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  hub: { dot: 'bg-blue-500', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  port: { dot: 'bg-cyan-500', bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200' },
  airport: { dot: 'bg-indigo-500', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  transit: { dot: 'bg-orange-500', bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
};

const STOP_LABEL: Record<StopType, string> = {
  origin: 'Origin',
  destination: 'Destination',
  hub: 'Sorting Hub',
  port: 'Sea Port',
  airport: 'Air Hub',
  transit: 'Transit Hub',
};

// ─── Status Update Modal ──────────────────────────────────────────────────────

const UPDATABLE_STATUSES: { value: ShipmentStatus; label: string }[] = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'PICKED_UP', label: 'Picked Up' },
  { value: 'IN_TRANSIT', label: 'In Transit' },
  { value: 'OUT_FOR_DELIVERY', label: 'Out for Delivery' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'RETURNED', label: 'Returned' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

interface UpdateStatusForm {
  status: ShipmentStatus;
  location: string;
  description: string;
}

interface UpdateStatusModalProps {
  shipment: Shipment;
  onClose: () => void;
  onSuccess: () => void;
}

function UpdateStatusModal({ shipment, onClose, onSuccess }: UpdateStatusModalProps) {
  const [form, setForm] = useState<UpdateStatusForm>({
    status: shipment.status,
    location: shipment.currentLocation || '',
    description: '',
  });
  const [error, setError] = useState('');

  const routeStops = buildRoute(shipment.origin, shipment.destination);

  const mutation = useMutation({
    mutationFn: (data: UpdateStatusForm) =>
      api.patch(`/shipments/${shipment.id}/status`, data),
    onSuccess: () => {
      onSuccess();
      onClose();
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      setError(err.response?.data?.message || 'Failed to update status. Please try again.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.location.trim()) { setError('Location is required.'); return; }
    if (!form.description.trim()) { setError('Description is required.'); return; }
    setError('');
    mutation.mutate(form);
  };

  const cfg = SHIPMENT_STATUS_CONFIG[form.status];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div>
            <h2 className="text-base font-bold text-slate-900">Update Shipment Status</h2>
            <p className="text-xs text-slate-500 font-mono mt-0.5">{shipment.trackingNumber}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">

            {/* ── Route Timeline ──────────────────────────────────── */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                Select Current Location
              </p>

              {/* Horizontal scrollable route */}
              <div className="overflow-x-auto pb-2">
                <div className="flex items-start gap-0 min-w-max">
                  {routeStops.map((stop, i) => {
                    const Icon = STOP_ICON[stop.type];
                    const colors = STOP_COLOR[stop.type];
                    const isSelected = form.location === stop.name;
                    const isLast = i === routeStops.length - 1;

                    return (
                      <div key={stop.name} className="flex items-start">
                        {/* Stop button */}
                        <div className="flex flex-col items-center w-28">
                          <button
                            type="button"
                            onClick={() => setForm(f => ({ ...f, location: stop.name }))}
                            className={`
                              w-full flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-all
                              ${isSelected
                                ? `${colors.bg} ${colors.border} shadow-sm`
                                : 'border-transparent hover:bg-slate-50 hover:border-slate-200'
                              }
                            `}
                          >
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center ${isSelected ? colors.dot : 'bg-slate-100'}`}>
                              <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                            </div>
                            <div className="text-center">
                              <p className={`text-[10px] font-bold leading-tight ${isSelected ? colors.text : 'text-slate-500'}`}>
                                {STOP_LABEL[stop.type]}
                              </p>
                              <p className={`text-[9px] leading-tight mt-0.5 ${isSelected ? colors.text : 'text-slate-400'} line-clamp-2`}>
                                {stop.name}
                              </p>
                            </div>
                          </button>
                        </div>

                        {/* Connector line */}
                        {!isLast && (
                          <div className="flex items-start pt-4 flex-shrink-0">
                            <div className="w-5 h-px bg-slate-300 mt-1" />
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-300 -mt-[2px] ml-0.5" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Manual input */}
              <div className="mt-3 relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => setForm(f => ({ ...f, location: e.target.value }))}
                  placeholder="Or type a custom location..."
                  className="form-input w-full pl-9 text-sm"
                />
              </div>
              {form.location && (
                <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  Location set to: <span className="font-medium text-slate-700">{form.location}</span>
                </p>
              )}
            </div>

            {/* ── Status ──────────────────────────────────────────── */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                New Status
              </label>
              <select
                value={form.status}
                onChange={(e) => setForm(f => ({ ...f, status: e.target.value as ShipmentStatus }))}
                className="form-input w-full"
              >
                {UPDATABLE_STATUSES.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              {cfg && (
                <div className={`mt-2 inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.color}`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                  {cfg.label}
                </div>
              )}
            </div>

            {/* ── Description ─────────────────────────────────────── */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Update Note
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="e.g. Package cleared customs and is being forwarded to next hub"
                rows={3}
                className="form-input w-full resize-none text-sm"
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                {error}
              </div>
            )}
          </form>
        </div>

        {/* Footer buttons */}
        <div className="px-6 py-4 border-t border-slate-100 flex gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit as unknown as React.MouseEventHandler}
            disabled={mutation.isPending}
            className="flex-1 px-4 py-2.5 rounded-xl bg-brand-navy text-white text-sm font-semibold hover:bg-brand-navy/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {mutation.isPending ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4" />
            )}
            {mutation.isPending ? 'Updating…' : 'Update Status'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Status Filters ───────────────────────────────────────────────────────────

const STATUS_FILTERS: { label: string; value: string }[] = [
  { label: 'All', value: '' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Picked Up', value: 'PICKED_UP' },
  { label: 'In Transit', value: 'IN_TRANSIT' },
  { label: 'Out for Delivery', value: 'OUT_FOR_DELIVERY' },
  { label: 'Delivered', value: 'DELIVERED' },
  { label: 'Failed', value: 'FAILED' },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ShipmentsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);

  const canUpdateStatus = user?.role === 'ADMIN' || user?.role === 'DRIVER';

  const { data, isLoading } = useQuery({
    queryKey: ['shipments', page, search, status],
    queryFn: () =>
      api.get(`/shipments?page=${page}&limit=10&search=${encodeURIComponent(search)}&status=${status}`).then((r) => r.data),
  });

  const shipments: Shipment[] = data?.data ?? [];
  const meta = data?.meta;

  const handleUpdateSuccess = (shipmentId: string) => {
    queryClient.invalidateQueries({ queryKey: ['shipments'] });
    setSuccessId(shipmentId);
    setTimeout(() => setSuccessId(null), 3000);
  };

  return (
    <DashboardLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Shipments</h1>
          <p className="page-subtitle">{meta?.total ?? 0} total shipments</p>
        </div>
        <Link href="/track" className="btn-outline flex items-center gap-2">
          <MapPin className="w-4 h-4" /> Track Package
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-6 p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by tracking number, location..."
            className="form-input pl-9 w-full"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => { setStatus(f.value); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                status === f.value
                  ? 'bg-brand-navy text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-brand-navy border-t-transparent rounded-full animate-spin" />
          </div>
        ) : shipments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Truck className="w-12 h-12 mb-3 opacity-50" />
            <p className="font-medium">No shipments found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tracking #</th>
                  <th>Route</th>
                  <th>Current Location</th>
                  <th>Weight</th>
                  <th>Status</th>
                  <th>Est. Delivery</th>
                  <th>Created</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {shipments.map((s) => (
                  <tr key={s.id} className={successId === s.id ? 'bg-green-50' : ''}>
                    <td>
                      <span className="font-mono text-sm font-semibold text-brand-navy">{s.trackingNumber}</span>
                    </td>
                    <td>
                      <div className="text-sm">
                        <span>{s.origin}</span>
                        <span className="text-slate-400 mx-1">→</span>
                        <span>{s.destination}</span>
                      </div>
                    </td>
                    <td className="text-sm text-slate-600">{s.currentLocation || '—'}</td>
                    <td className="text-sm">{s.weight} kg</td>
                    <td><StatusBadge status={s.status} type="shipment" /></td>
                    <td className="text-sm text-slate-600">{s.estimatedDelivery ? formatDate(s.estimatedDelivery) : '—'}</td>
                    <td className="text-sm text-slate-500">{formatDate(s.createdAt)}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <Link href={`/shipments/${s.id}`} className="text-brand-navy text-xs hover:underline font-medium">
                          View
                        </Link>
                        {canUpdateStatus && (
                          <button
                            onClick={() => setSelectedShipment(s)}
                            className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-brand-navy border border-slate-200 hover:border-brand-navy/30 rounded-lg px-2 py-1 transition-all"
                          >
                            <RefreshCw className="w-3 h-3" />
                            Update
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <p className="text-sm text-slate-500">
              Showing {(page - 1) * 10 + 1}–{Math.min(page * 10, meta.total)} of {meta.total}
            </p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => p - 1)} disabled={page === 1} className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-slate-700 font-medium">{page} / {meta.totalPages}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={page === meta.totalPages} className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Status Update Modal */}
      {selectedShipment && (
        <UpdateStatusModal
          shipment={selectedShipment}
          onClose={() => setSelectedShipment(null)}
          onSuccess={() => handleUpdateSuccess(selectedShipment.id)}
        />
      )}
    </DashboardLayout>
  );
}
