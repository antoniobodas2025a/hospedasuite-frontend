# Hospedasuite Platform

Hotel management SaaS — property onboarding, OTA bookings, and multi-tenant administration for Latin American hotels and hostels.

## Architecture

```
src/
├── app/                    # Next.js 16 App Router
│   ├── (ota)/              # Guest-facing booking OTA (hotel discovery, rooms, booking)
│   ├── (admin)/            # Hotel owner dashboard
│   ├── (super-admin)/      # Platform administration
│   ├── (auth)/             # Authentication flow
│   ├── (direct)/           # Direct booking funnel
│   ├── api/                # Cron jobs, geocoding, onboarding, QRs, webhooks
│   └── software/           # Public landing & legal pages
├── components/             # shadcn/ui + Radix UI primitives
│   ├── ota/                # Booking widget, gallery, map, search
│   ├── onboarding/         # Multi-step hotel registration wizard
│   └── auth/               # Login keypad and auth UI
├── lib/                    # Business logic (server-safe)
│   ├── supabase.ts         # Client singleton
│   ├── supabase-admin.ts   # Service-role client
│   ├── r2-client.ts        # Cloudflare R2 image upload pipeline
│   ├── pricing.ts          # Tax regime pricing (Simplificado / Ordinario)
│   ├── geocoding.ts        # Mapbox geocoding + coordinate cache
│   ├── ical-sync.ts        # iCal feed parser and sync engine
│   ├── booking-helpers.ts  # Date math, availability, occupancy
│   ├── fuzzy-search.ts     # Fuse.js instant search for OTA
│   └── __tests__/          # Vitest unit tests
├── store/                  # Zustand client state (onboarding wizard)
├── hooks/                  # Custom React hooks
├── emails/                 # react-email templates (Resend provider)
├── config/                 # Feature flags, constants
├── i18n/messages/          # next-intl JSON dictionaries (es/en)
└── e2e/                    # Playwright end-to-end specs
    ├── ota/                # Guest journey tests
    └── readiness/          # Plan tier & checklist tests
```

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 + shadcn/ui + Radix UI |
| Backend | Supabase (Postgres, Auth, Storage/R2) |
| State | Zustand |
| Forms | react-hook-form + Zod 4 |
| i18n | next-intl (es / en) |
| Payments | Wompi (Nequi, PSE, cards) |
| Email | Resend + react-email |
| Maps | Leaflet + react-leaflet |
| Monitoring | Sentry + PostHog |
| Testing | Vitest (unit) + Playwright (e2e) |

## Getting Started

### Prerequisites

- **Bun** (recommended) or Node.js 22+
- Supabase project (see `.env.example`)
- Cloudflare R2 bucket for image uploads
- Wompi account for payment processing

### Setup

```bash
# Install dependencies
bun install

# Copy environment variables
cp .env.example .env.local
# Fill in your Supabase, R2, and Wompi credentials

# Start development server
bun dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

See `.env.example` for the full list. Key variables:

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role (server only) |
| `DIRECT_URL` | Postgres direct connection string |
| `NEXT_PUBLIC_IMAGE_SOURCE` | `r2` (Cloudflare R2) |
| `NEXT_PUBLIC_IMAGE_BASE_URL` | R2 public bucket URL |
| `NEXT_PUBLIC_WOMPI_PUBLIC_KEY` | Wompi public key |
| `NEXT_PUBLIC_POSTHOG_KEY` | PostHog project key |
| `NEXT_PUBLIC_APP_URL` | Production URL |

## Testing

```bash
# Unit tests (Vitest)
bun test

# Watch mode
bun test:watch

# E2E tests (Playwright)
npx playwright test
```

## Project Conventions

- **Commits**: [Conventional Commits](https://www.conventionalcommits.org/)
- **Linting**: ESLint with `eslint-config-next`
- **Pre-commit**: Husky + lint-staged (auto-fix on staged TS/TSX files)
- **Path aliases**: `@/` maps to `src/`
- **SDD**: Architecture decisions use [OpenSpec](./openspec/config.yaml) workflow
- **ADR**: See `docs/adr/` for architecture decision records

## Database

Supabase Postgres with 27 migrations under `supabase/migrations/`. Key RPC functions in `supabase/rpc-atomic-checkin-checkout.sql`. Database schema includes:

- Hotels, rooms, amenities
- Bookings and availability
- Guest reviews with moderation
- iCal sync state
- Geocoding cache
- Audit log
- Pricing and tax regimes
- Event types and triggers

## Deployment

Deployed on **Vercel** with Edge Functions. See `vercel.json` for routing configuration.

## Documentation

- `docs/PRD-*.md` — Product Requirement Documents
- `docs/adr/` — Architecture Decision Records (ADR)
- `openspec/` — SDD change management artifacts
- `docs/FIN-001-enterprise-financial-study.md` — Financial analysis
- `docs/AUDIT-001-enterprise-vs-economy.md` — Pricing audit

## License

Private — all rights reserved.
