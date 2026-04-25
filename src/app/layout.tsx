import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from './providers';
import { PWAInstaller } from '@/components/pwa/PWAInstaller';

export const metadata: Metadata = {
  title: {
    default: 'Nexora Shipping',
    template: '%s | Nexora Shipping',
  },
  description: 'Professional shipping and logistics management platform',
  applicationName: 'Nexora Shipping',
  appleWebApp: {
    capable: true,
    title: 'Nexora Shipping',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/logo.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#0a1628',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
        <PWAInstaller />
      </body>
    </html>
  );
}
