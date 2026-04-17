'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import {
  Users, Search, ChevronLeft, ChevronRight,
  Shield, Truck, User as UserIcon, Trash2,
  CheckCircle, X, AlertCircle,
} from 'lucide-react';

type Role = 'CUSTOMER' | 'DRIVER' | 'ADMIN';

interface UserRecord {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: Role;
  isVerified: boolean;
  createdAt: string;
  _count: { orders: number; shipments: number };
}

const ROLE_CONFIG: Record<Role, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  ADMIN: { label: 'Admin', color: 'text-red-700', bg: 'bg-red-100', icon: Shield },
  DRIVER: { label: 'Driver', color: 'text-blue-700', bg: 'bg-blue-100', icon: Truck },
  CUSTOMER: { label: 'Customer', color: 'text-slate-700', bg: 'bg-slate-100', icon: UserIcon },
};

const ROLE_FILTERS = [
  { label: 'All Users', value: '' },
  { label: 'Admins', value: 'ADMIN' },
  { label: 'Drivers', value: 'DRIVER' },
  { label: 'Customers', value: 'CUSTOMER' },
];

interface RoleSelectProps {
  userId: string;
  currentRole: Role;
  selfId: string;
  onSuccess: () => void;
}

function RoleSelect({ userId, currentRole, selfId, onSuccess }: RoleSelectProps) {
  const [toast, setToast] = useState('');

  const mutation = useMutation({
    mutationFn: (role: Role) => api.patch(`/users/${userId}/role`, { role }),
    onSuccess: () => {
      onSuccess();
      setToast('Role updated');
      setTimeout(() => setToast(''), 2500);
    },
  });

  if (userId === selfId) {
    const cfg = ROLE_CONFIG[currentRole];
    return (
      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.color}`}>
        <cfg.icon className="w-3 h-3" /> {cfg.label} (you)
      </span>
    );
  }

  return (
    <div className="relative flex items-center gap-2">
      <select
        defaultValue={currentRole}
        onChange={(e) => mutation.mutate(e.target.value as Role)}
        disabled={mutation.isPending}
        className={`text-xs font-semibold pl-2.5 pr-7 py-1.5 rounded-full border appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-navy/20 transition-all disabled:opacity-60
          ${currentRole === 'ADMIN' ? 'bg-red-50 border-red-200 text-red-700' :
            currentRole === 'DRIVER' ? 'bg-blue-50 border-blue-200 text-blue-700' :
            'bg-slate-50 border-slate-200 text-slate-700'}`}
      >
        <option value="CUSTOMER">Customer</option>
        <option value="DRIVER">Driver</option>
        <option value="ADMIN">Admin</option>
      </select>
      {toast && (
        <span className="text-xs text-green-600 flex items-center gap-1">
          <CheckCircle className="w-3 h-3" /> {toast}
        </span>
      )}
    </div>
  );
}

interface DeleteConfirmProps {
  user: UserRecord;
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}

function DeleteConfirm({ user, onConfirm, onCancel, isPending }: DeleteConfirmProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mb-4">
          <AlertCircle className="w-6 h-6 text-red-600" />
        </div>
        <h3 className="font-bold text-slate-900 text-lg mb-1">Delete User?</h3>
        <p className="text-slate-500 text-sm mb-5">
          This will permanently delete <span className="font-semibold text-slate-800">{user.firstName} {user.lastName}</span> and all their data. This cannot be undone.
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {isPending ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminUsersPage() {
  const { user: self } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<UserRecord | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', page, search, role],
    queryFn: () =>
      api.get(`/users?page=${page}&limit=20&search=${encodeURIComponent(search)}&role=${role}`).then((r) => r.data),
  });

  const users: UserRecord[] = data?.data ?? [];
  const meta = data?.meta;

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setDeleteTarget(null);
    },
  });

  const roleCounts = users.reduce(
    (acc, u) => ({ ...acc, [u.role]: (acc[u.role as Role] || 0) + 1 }),
    {} as Record<Role, number>
  );

  return (
    <DashboardLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">User Management</h1>
          <p className="page-subtitle">{meta?.total ?? 0} registered users</p>
        </div>
        <div className="flex items-center gap-3">
          {(['ADMIN', 'DRIVER', 'CUSTOMER'] as Role[]).map((r) => {
            const cfg = ROLE_CONFIG[r];
            return (
              <div key={r} className={`hidden md:flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${cfg.bg} ${cfg.color}`}>
                <cfg.icon className="w-3 h-3" />
                {roleCounts[r] ?? 0} {cfg.label}s
              </div>
            );
          })}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-6 p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name or email..."
            className="form-input pl-9 w-full"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {ROLE_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => { setRole(f.value); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                role === f.value ? 'bg-brand-navy text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
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
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Users className="w-12 h-12 mb-3 opacity-50" />
            <p className="font-medium">No users found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Orders</th>
                  <th>Shipments</th>
                  <th>Verified</th>
                  <th>Joined</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand-navy flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {u.firstName[0]}{u.lastName[0]}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{u.firstName} {u.lastName}</p>
                          {u.phone && <p className="text-xs text-slate-400">{u.phone}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="text-sm text-slate-600">{u.email}</td>
                    <td>
                      <RoleSelect
                        userId={u.id}
                        currentRole={u.role}
                        selfId={self?.id ?? ''}
                        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['admin-users'] })}
                      />
                    </td>
                    <td className="text-sm font-medium text-center">{u._count.orders}</td>
                    <td className="text-sm font-medium text-center">{u._count.shipments}</td>
                    <td>
                      {u.isVerified ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <X className="w-4 h-4 text-slate-300" />
                      )}
                    </td>
                    <td className="text-sm text-slate-500">{formatDate(u.createdAt)}</td>
                    <td>
                      {u.id !== self?.id && (
                        <button
                          onClick={() => setDeleteTarget(u)}
                          className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
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
              Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, meta.total)} of {meta.total}
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

      {deleteTarget && (
        <DeleteConfirm
          user={deleteTarget}
          onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
          isPending={deleteMutation.isPending}
        />
      )}
    </DashboardLayout>
  );
}
