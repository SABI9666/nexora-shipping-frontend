import Link from 'next/link';
import { Package, MapPin, FileText, Truck, ArrowRight, Shield, Globe, Clock, ChevronRight } from 'lucide-react';
import { NexoraLogo } from '@/components/ui/NexoraLogo';

const features = [
  {
    icon: Package,
    title: 'Order Management',
    desc: 'Create, track, and manage all shipping orders from one powerful dashboard.',
    href: '/auth/login',
  },
  {
    icon: MapPin,
    title: 'Live Tracking',
    desc: 'Real-time shipment tracking with step-by-step event timeline and updates.',
    href: '/auth/login',
  },
  {
    icon: FileText,
    title: 'Document Storage',
    desc: 'Invoices, BOL, customs docs securely stored on Google Cloud infrastructure.',
    href: '/auth/login',
  },
  {
    icon: Truck,
    title: 'Instant Quotes',
    desc: 'Automated pricing based on weight, dimensions, and destination in seconds.',
    href: '/auth/login',
  },
];

const stats = [
  { value: '99.9%', label: 'Uptime SLA' },
  { value: '150+', label: 'Countries Served' },
  { value: '2M+', label: 'Shipments Processed' },
  { value: '24/7', label: 'Support Available' },
];

const benefits = [
  { icon: Shield, title: 'Enterprise Security', desc: 'Bank-grade encryption and compliance with international shipping regulations.' },
  { icon: Globe, title: 'Global Coverage', desc: 'Ship to 150+ countries with our extensive carrier network and partnerships.' },
  { icon: Clock, title: 'Real-Time Updates', desc: 'Instant notifications at every step of your shipment journey worldwide.' },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#0A0F2C] text-white">

      {/* Navbar */}
      <nav className="border-b border-white/10 bg-[#0A0F2C]/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="bg-white rounded-xl px-3 py-1.5">
            <NexoraLogo height={34} />
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-slate-400">
            <Link href="/track" className="hover:text-white transition-colors">Track Shipment</Link>
            <Link href="/auth/login" className="hover:text-white transition-colors">Solutions</Link>
            <Link href="/auth/login" className="hover:text-white transition-colors">Pricing</Link>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/auth/login" className="text-slate-300 hover:text-white text-sm font-medium transition-colors px-4 py-2">
              Sign In
            </Link>
            <Link href="/auth/register" className="bg-brand-red text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-brand-red-dark transition-colors">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-navy via-[#0A0F2C] to-[#0A0F2C] opacity-80" />
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-brand-red/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-6 pt-24 pb-20 text-center">
          <div className="inline-flex items-center gap-2 bg-brand-red/10 border border-brand-red/30 rounded-full px-4 py-1.5 text-sm text-brand-red font-medium mb-8">
            <span className="w-2 h-2 bg-brand-red rounded-full animate-pulse" />
            Enterprise Shipping Platform
          </div>

          <h1 className="text-5xl md:text-7xl font-bold leading-tight mb-6 tracking-tight">
            The Smarter Way to
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-brand-red to-red-400 mt-2">
              Ship Worldwide
            </span>
          </h1>

          <p className="text-lg md:text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            Nexora unifies your entire shipping operation — orders, tracking, documents, and billing — on one cloud-powered platform built for scale.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link href="/auth/register" className="w-full sm:w-auto bg-brand-red text-white px-8 py-4 rounded-xl font-semibold text-base hover:bg-brand-red-dark transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-red/25">
              Start for Free <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/track" className="w-full sm:w-auto border border-white/20 text-white px-8 py-4 rounded-xl font-semibold text-base hover:bg-white/5 transition-all text-center">
              Track a Shipment
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
            {stats.map(({ value, label }) => (
              <div key={label} className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-white mb-1">{value}</div>
                <div className="text-xs text-slate-500 uppercase tracking-wider">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything You Need to Ship</h2>
            <p className="text-slate-400 text-lg max-w-xl mx-auto">One platform for your entire shipping workflow, from quote to delivery.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map(({ icon: Icon, title, desc, href }) => (
              <Link key={title} href={href} className="group bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 hover:border-brand-red/30 transition-all cursor-pointer">
                <div className="w-12 h-12 bg-brand-red/15 rounded-xl flex items-center justify-center mb-5 group-hover:bg-brand-red/25 transition-colors">
                  <Icon className="w-6 h-6 text-brand-red" />
                </div>
                <h3 className="text-white font-semibold text-base mb-2 flex items-center justify-between">
                  {title}
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-brand-red group-hover:translate-x-1 transition-all" />
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 bg-white/[0.02] border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8">
            {benefits.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex gap-4">
                <div className="w-10 h-10 bg-brand-red/15 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                  <Icon className="w-5 h-5 text-brand-red" />
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-2">{title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Track Widget */}
      <section className="py-20 border-t border-white/5">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-3">Track Your Shipment</h2>
          <p className="text-slate-400 mb-8">Enter your tracking number for real-time updates</p>
          <form action="/track" method="GET" className="flex gap-3">
            <input
              name="number"
              type="text"
              placeholder="e.g. NEX1234567890US"
              className="flex-1 px-4 py-3.5 rounded-xl bg-white/5 border border-white/15 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-red/40 focus:border-brand-red/40 font-mono text-sm"
            />
            <button type="submit" className="bg-brand-red text-white px-6 py-3.5 rounded-xl font-semibold hover:bg-brand-red-dark transition-colors whitespace-nowrap">
              Track
            </button>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="bg-white rounded-lg px-2.5 py-1">
            <NexoraLogo height={28} />
          </div>
          <p className="text-slate-500 text-sm">© 2026 Nexora Shipping. All rights reserved.</p>
          <div className="flex gap-6 text-sm text-slate-500">
            <Link href="/auth/login" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="/auth/login" className="hover:text-white transition-colors">Terms</Link>
            <Link href="/auth/login" className="hover:text-white transition-colors">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
