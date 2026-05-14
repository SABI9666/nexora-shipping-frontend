'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  Truck,
  FileText,
  FileSignature,
  MapPin,
  Receipt,
  BookOpen,
  LogOut,
  Settings,
  Users,
  Shield,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { NexoraLogo } from '@/components/ui/NexoraLogo';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/orders', label: 'Orders', icon: Package },
  { href: '/shipments', label: 'Shipments', icon: Truck },
  { href: '/documents', label: 'Documents', icon: FileText },
  { href: '/quotations', label: 'Quotations', icon: FileSignature },
  { href: '/invoices', label: 'Invoices', icon: Receipt },
  { href: '/vouchers', label: 'Vouchers', icon: BookOpen },
  { href: '/track', label: 'Track Package', icon: MapPin },
];

const adminItems = [
  { href: '/admin/users', label: 'User Management', icon: Users },
  { href: '/admin/settings', label: 'System Settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout, isAdmin } = useAuth();

  return (
    <aside className="w-64 min-h-screen bg-brand-navy flex flex-col fixed left-0 top-0 z-40">
      {/* Logo */}
      <div className="p-4 border-b border-white/10">
        <Link href="/dashboard" className="flex items-center justify-center">
          <div className="bg-white rounded-xl px-3 py-2">
            <NexoraLogo height={40} />
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider px-3 mb-2 mt-1">Main Menu</p>
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn('sidebar-link', pathname === href || pathname.startsWith(href + '/') ? 'active' : '')}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
          </Link>
        ))}

        {isAdmin && (
          <>
            <div className="pt-4 pb-1 px-3">
              <div className="flex items-center gap-1.5">
                <Shield className="w-3 h-3 text-brand-red" />
                <p className="text-brand-red/80 text-xs font-bold uppercase tracking-wider">Admin</p>
              </div>
              <div className="mt-1 h-px bg-white/10" />
            </div>

            {adminItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  'sidebar-link group',
                  pathname.startsWith(href) ? 'active' : ''
                )}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1">{label}</span>
                <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            ))}
          </>
        )}
      </nav>

      {/* User footer */}
      <div className="p-3 border-t border-white/10">
        {user && (
          <div className="flex items-center gap-3 px-2 py-2 mb-1 rounded-lg">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${isAdmin ? 'bg-brand-red' : 'bg-white/20'}`}>
              {user.firstName[0]}{user.lastName[0]}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-white text-sm font-medium truncate">{user.firstName} {user.lastName}</div>
              <div className="flex items-center gap-1 mt-0.5">
                {isAdmin && <Shield className="w-2.5 h-2.5 text-brand-red" />}
                <span className={`text-xs truncate ${isAdmin ? 'text-brand-red/80 font-semibold' : 'text-slate-400'}`}>
                  {user.role}
                </span>
              </div>
            </div>
          </div>
        )}
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/10 transition-all"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
