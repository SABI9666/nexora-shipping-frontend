import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Nexora Shipping',
    short_name: 'Nexora',
    description: 'Professional shipping and logistics management platform',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    background_color: '#0a1628',
    theme_color: '#0a1628',
    orientation: 'portrait-primary',
    icons: [
      { src: '/logo.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/logo.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/logo.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    categories: ['business', 'productivity', 'logistics'],
  };
}
