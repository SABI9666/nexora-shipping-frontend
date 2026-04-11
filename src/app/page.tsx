import Link from 'next/link';
import Image from 'next/image';
import { Package, MapPin, FileText, ArrowRight, CheckCircle, Truck } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-navy-dark via-brand-navy to-brand-navy-light">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <div className="flex items-center">
          <div className="bg-white rounded-xl px-3 py-1.5">
            <Image src="/logo.png" alt="Nexora Shipping" width={140} height={36} className="h-9 w-auto object-contain" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/auth/login" className="text-slate-300 hover:text-white text-sm font-medium transition-colors">
            Sign In
          </Link>
          <Link href="/auth/register" className="bg-brand-red text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-red-dark transition-colors">
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <div className="max-w-7xl mx-auto px-6 pt-20 pb-16">
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-sm text-slate-300 mb-6">
            <CheckCircle className="w-4 h-4 text-green-400" />
            Trusted by 10,000+ businesses worldwide
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-white leading-tight mb-6">
            Ship Smarter with
            <span className="text-brand-red block">Nexora</span>
          </h1>
          <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
            Streamline your shipping operations with real-time tracking, automated billing, document management, and Google Cloud-powered infrastructure.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/auth/register" className="w-full sm:w-auto bg-brand-red text-white px-8 py-3.5 rounded-xl font-semibold text-lg hover:bg-brand-red-dark transition-colors flex items-center justify-center gap-2">
              Start Shipping Free <ArrowRight className="w-5 h-5" />
            </Link>
            <Link href="/track" className="w-full sm:w-auto bg-white/10 border border-white/20 text-white px-8 py-3.5 rounded-xl font-semibold text-lg hover:bg-white/20 transition-colors text-center">
              Track a Package
            </Link>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-7xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: Package, title: 'Order Management', desc: 'Create, track, and manage all shipping orders from one dashboard.' },
            { icon: MapPin, title: 'Live Tracking', desc: 'Real-time shipment tracking with step-by-step event timeline.' },
            { icon: FileText, title: 'Document Storage', desc: 'Invoices, BOL, customs docs securely stored on Google Cloud.' },
            { icon: Truck, title: 'Instant Quotes', desc: 'Automated pricing based on weight, dimensions, and destination.' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 hover:bg-white/15 transition-all">
              <div className="w-12 h-12 bg-brand-red/20 rounded-xl flex items-center justify-center mb-4">
                <Icon className="w-6 h-6 text-brand-red" />
              </div>
              <h3 className="text-white font-semibold text-lg mb-2">{title}</h3>
              <p className="text-slate-300 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Track widget at bottom */}
      <div className="bg-white/5 border-t border-white/10 py-12">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-white text-2xl font-bold mb-2">Track Your Shipment</h2>
          <p className="text-slate-400 mb-6 text-sm">Enter your tracking number below</p>
          <form action="/track" method="GET" className="flex gap-3">
            <input
              name="number"
              type="text"
              placeholder="e.g. NEX1234567890US"
              className="flex-1 px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-red/50 focus:border-brand-red/50 font-mono text-sm"
            />
            <button type="submit" className="bg-brand-red text-white px-6 py-3 rounded-xl font-semibold hover:bg-brand-red-dark transition-colors whitespace-nowrap">
              Track
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
