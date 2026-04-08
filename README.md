# Nexora Shipping Frontend

Next.js 14 App Router frontend for Nexora Shipping — an enterprise shipping & logistics dashboard.

## Stack
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS (brand: navy + red)
- **State**: TanStack Query v5
- **Forms**: React Hook Form + Zod
- **Icons**: Lucide React
- **Deployment**: Vercel

## Pages
| Route | Description |
|-------|-------------|
| `/` | Landing page with tracking widget |
| `/auth/login` | Sign in |
| `/auth/register` | Create account |
| `/dashboard` | Overview stats + recent activity |
| `/orders` | Order list + create new order |
| `/orders/:id` | Order detail |
| `/shipments` | Shipment list with filters |
| `/shipments/:id` | Shipment detail + events |
| `/track` | Public tracking page |
| `/documents` | Document upload & management |

## Local Setup
```bash
cp .env.example .env.local
# Set NEXT_PUBLIC_API_URL=http://localhost:8080

npm install
npm run dev
```

## Deploy to Vercel
1. Push to GitHub
2. Import repo in Vercel dashboard
3. Add environment variable: `NEXT_PUBLIC_API_URL=https://nexora-shipping-api.onrender.com`
4. Deploy

## Brand Colors
- Navy: `#1A2B5F`
- Red: `#D32F2F`
