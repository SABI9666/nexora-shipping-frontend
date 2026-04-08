'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  Truck,
  FileText,
  MapPin,
  LogOut,
  Ship,
  Settings,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/orders', label: 'Orders', icon: Package },
  { href: '/shipments', label: 'Shipments', icon: Truck },
  { href: '/documents', label: 'Documents', icon: FileText },
  { href: '/track', label: 'Track Package', icon: MapPin },
];

const adminItems = [
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout, isAdmin } = useAuth();

  return (
    <aside className="w-64 min-h-screen bg-brand-navy flex flex-col fixed left-0 top-0 z-40">
      {/* Logo */}
      <div className="p-6 border-b border-white/10">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-9 h-9 bg-brand-red rounded-lg flex items-center justify-center flex-shrink-0">
            <Ship className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-white font-bold text-base leading-tight">NEXORA</div>
            <div className="text-brand-red text-xs font-semibold tracking-widest">SHIPPING</div>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider px-3 mb-3">Main Menu</p>
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
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider px-3 mt-6 mb-3">Admin</p>
            {adminItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn('sidebar-link', pathname.startsWith(href) ? 'active' : '')}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {label}
              </Link>
            ))}
          </>
        )}
      </nav>

      {/* User footer */}
      <div className="p-4 border-t border-white/10">
        {user && (
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-brand-red flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {user.firstName[0]}{user.lastName[0]}
            </div>
            <div className="min-w-0">
              <div className="text-white text-sm font-medium truncate">{user.firstName} {user.lastName}</div>
              <div className="text-slate-400 text-xs truncate">{user.email}</div>
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
