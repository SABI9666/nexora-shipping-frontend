'use client';

import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { Shield, Server, Activity, Globe, Clock, Database, CheckCircle, AlertCircle } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export default function AdminSettingsPage() {
  const { user } = useAuth();

  const { data: health, isLoading: healthLoading } = useQuery({
    queryKey: ['health'],
    queryFn: () =>
      fetch(`${API_URL}/health`).then((r) => r.json()),
    refetchInterval: 30000,
  });

  const { data: orderStats } = useQuery({
    queryKey: ['order-stats-admin'],
    queryFn: () => api.get('/orders/stats').then((r) => r.data.data),
  });

  const { data: shipmentStats } = useQuery({
    queryKey: ['shipment-stats-admin'],
    queryFn: () => api.get('/shipments/stats').then((r) => r.data.data),
  });

  const { data: userStats } = useQuery({
    queryKey: ['user-stats'],
    queryFn: () => api.get('/users?limit=1').then((r) => r.data.meta),
  });

  const isHealthy = health?.status === 'ok';

  const systemCards = [
    {
      icon: Activity,
      label: 'API Status',
      value: healthLoading ? 'Checking…' : isHealthy ? 'Operational' : 'Degraded',
      sub: health?.timestamp ? new Date(health.timestamp).toLocaleTimeString() : '—',
      color: healthLoading ? 'text-slate-500' : isHealthy ? 'text-green-600' : 'text-red-600',
      bg: healthLoading ? 'bg-slate-100' : isHealthy ? 'bg-green-100' : 'bg-red-100',
      ok: isHealthy,
    },
    {
      icon: Server,
      label: 'Service Name',
      value: health?.service || 'nexora-shipping-api',
      sub: `v${health?.version || '1.0.0'}`,
      color: 'text-indigo-600',
      bg: 'bg-indigo-100',
      ok: true,
    },
    {
      icon: Database,
      label: 'Total Orders',
      value: orderStats?.total ?? '—',
      sub: `${orderStats?.byStatus?.COMPLETED ?? 0} completed`,
      color: 'text-blue-600',
      bg: 'bg-blue-100',
      ok: true,
    },
    {
      icon: Globe,
      label: 'Total Shipments',
      value: shipmentStats?.total ?? '—',
      sub: `${shipmentStats?.deliveredLast30Days ?? 0} delivered this month`,
      color: 'text-cyan-600',
      bg: 'bg-cyan-100',
      ok: true,
    },
    {
      icon: Shield,
      label: 'Total Users',
      value: userStats?.total ?? '—',
      sub: 'Registered accounts',
      color: 'text-purple-600',
      bg: 'bg-purple-100',
      ok: true,
    },
    {
      icon: Clock,
      label: 'Revenue (All Time)',
      value: orderStats?.totalRevenue
        ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(orderStats.totalRevenue)
        : '—',
      sub: 'From completed orders',
      color: 'text-green-600',
      bg: 'bg-green-100',
      ok: true,
    },
  ];

  return (
    <DashboardLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">System Settings</h1>
          <p className="page-subtitle">Platform overview and configuration</p>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${isHealthy ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {isHealthy ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
          {isHealthy ? 'All Systems Operational' : 'System Issue Detected'}
        </div>
      </div>

      {/* System cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
        {systemCards.map(({ icon: Icon, label, value, sub, color, bg }) => (
          <div key={label} className="stat-card">
            <div className="flex items-start justify-between mb-3">
              <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900 mb-0.5">{value}</p>
            <p className="text-sm text-slate-500 font-medium">{label}</p>
            <p className="text-xs text-slate-400 mt-1">{sub}</p>
          </div>
        ))}
      </div>

      {/* Environment Info */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Admin Session</h2>
        </div>
        <div className="divide-y divide-slate-50">
          {[
            { label: 'Logged in as', value: `${user?.firstName} ${user?.lastName}` },
            { label: 'Email', value: user?.email ?? '—' },
            { label: 'Role', value: user?.role ?? '—' },
            { label: 'API Endpoint', value: API_URL },
          ].map(({ label, value }) => (
            <div key={label} className="px-5 py-3.5 flex items-center justify-between">
              <span className="text-sm text-slate-500">{label}</span>
              <span className="text-sm font-medium text-slate-800 font-mono">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Shipment status breakdown */}
      {shipmentStats?.byStatus && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm mt-6">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">Shipment Status Breakdown</h2>
          </div>
          <div className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Object.entries(shipmentStats.byStatus).map(([status, count]) => (
              <div key={status} className="text-center">
                <p className="text-2xl font-bold text-slate-900">{count as number}</p>
                <p className="text-xs text-slate-500 mt-0.5">{status.replace(/_/g, ' ')}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
