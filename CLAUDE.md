# CLAUDE.md - Rise Local Codebase Guide

## Project Overview

Rise Local is a mobile-first web application connecting local businesses in Southwest Florida (SWFL) with consumers through a deal discovery platform. The core focus is enabling businesses to offer exclusive deals while consumers find savings supporting local commerce.

**Key Features:**
- Deal discovery and redemption system
- Rise Local Pass membership ($4.99/month or $44.91/year)
- B2C messaging between consumers and vendors
- Vendor dashboard for deal management
- Admin dashboard for platform management

**Geographic Focus:** Fort Myers, Cape Coral, Bonita Springs, Estero, Naples (Southwest Florida)

---

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for bundling and dev server
- **Wouter** for client-side routing
- **TanStack Query** for server state management
- **Tailwind CSS** with shadcn/ui components (new-york preset)
- **Radix UI** primitives

### Backend
- **Express.js** with TypeScript
- **Drizzle ORM** with PostgreSQL (Neon serverless)
- **Replit Auth** (OIDC) for authentication
- **Stripe** for payments and subscriptions

### Key Dependencies
```
drizzle-orm, @neondatabase/serverless, stripe, passport, zod
react-hook-form, @tanstack/react-query, lucide-react, date-fns
```

---

## Project Structure

```
Rise-Local-open-beta/
├── client/                    # Frontend React application
│   ├── src/
│   │   ├── App.tsx           # Main app with routing
│   │   ├── components/       # React components
│   │   │   ├── ui/           # shadcn/ui components
│   │   │   ├── layout/       # AppShell, DetailHeader
│   │   │   ├── nav/          # BottomTabs navigation
│   │   │   └── profile/      # Profile editor components
│   │   ├── pages/            # Route pages
│   │   ├── hooks/            # Custom React hooks
│   │   ├── lib/              # Utilities (queryClient, api, cn)
│   │   └── contexts/         # React contexts
│   └── index.html
├── server/                    # Backend Express application
│   ├── index.ts              # Server entry point
│   ├── routes.ts             # All API routes (~5000+ lines)
│   ├── storage.ts            # Database queries and operations
│   ├── replitAuth.ts         # Authentication setup
│   ├── objectStorage.ts      # File upload handling
│   └── geocoding.ts          # Address geocoding
├── shared/                    # Shared between client/server
│   ├── schema.ts             # Drizzle schema (database tables)
│   ├── dealAccess.ts         # Membership access logic (SSoT)
│   └── categories.ts         # Business category taxonomy
├── migrations/               # Drizzle migrations
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── vite.config.ts
└── drizzle.config.ts
```

---

## Development Commands

```bash
npm run dev          # Start development server (tsx)
npm run build        # Build for production (vite + esbuild)
npm run start        # Run production build
npm run check        # TypeScript type checking
npm run db:push      # Push schema changes to database
```

---

## Database Schema

### Core Tables (22 Active)

**Authentication & Users:**
- `users` - User accounts with membership fields
- `sessions` - Replit Auth session storage

**Business:**
- `vendors` - Unified business profiles (shop/dine/service types)
- `categories` - Business category taxonomy
- `services` - Service offerings for service vendors

**Deals System:**
- `deals` - Deal listings with membership tiers
- `deal_redemptions` - Redemption tracking
- `favorites` - User saved deals

**Messaging:**
- `conversations` - B2C conversation threads
- `conversation_messages` - Message content
- `notifications` - In-app notifications
- `email_jobs` - Email notification queue

**Membership:**
- `membership_events` - Subscription audit log
- `stripe_webhook_events` - Webhook idempotency tracking

**Advertising:**
- `preferred_placements` - Sponsored content slots
- `placement_impressions`, `placement_clicks` - Analytics

**Admin:**
- `admin_audit_logs` - Admin action tracking

**Legacy Tables (Read-Only):**
- `restaurants`, `service_providers`, `messages` - Historical data

---

## Key Architectural Patterns

### 1. Multi-Role User System
Users can have multiple roles via boolean flags:
```typescript
isAdmin: boolean   // Admin dashboard access
isVendor: boolean  // Vendor dashboard access
role: string       // Legacy: "buyer" | "vendor" | "admin"
```
Authorization pattern: `user.isAdmin || user.role === 'admin'`

### 2. Unified Vendor Architecture
Single `vendors` table handles all business types:
- `vendorType`: "shop" | "dine" | "service"
- `capabilities`: JSON with `{products, services, menu}` flags
- Type-specific details in `restaurantDetails` / `serviceDetails` JSON

### 3. Centralized Membership Access (Single Source of Truth)
**File:** `shared/dealAccess.ts`

```typescript
// Check if user has active membership
hasRiseLocalPass(user): boolean
// Requirements: isPassMember=true AND passExpiresAt > now

// Check if deal requires membership
isMemberOnlyDeal(deal): boolean
// Triggers: isPassLocked=true OR tier="premium"/"member"

// Combined access check
canUserAccessDeal(user, deal): boolean
```

Backend mirrors this logic in `routes.ts:isUserSubscribed()`.

### 4. API Pattern
- RESTful endpoints under `/api/*`
- TanStack Query for client-side caching
- Query keys as URL paths: `queryKey: ["/api/auth/user"]`
- Automatic fetch via `queryClient` default query function

### 5. Authentication Flow
1. `/auth` - Single authentication page
2. `/start` - Universal gate for role-based routing
3. `/onboarding` - 5-step vendor onboarding
4. `/welcome` - New user carousel intro

---

## Important Code Locations

### Authentication
- `server/replitAuth.ts` - Auth setup and middleware
- `client/src/hooks/useAuth.ts` - Auth hook
- `client/src/components/AuthBoundary.tsx` - Protected routes

### Deal System
- `shared/schema.ts:deals` - Deal table definition (line ~745)
- `shared/dealAccess.ts` - Access control logic
- `client/src/pages/Discover.tsx` - Consumer deal browsing
- `client/src/pages/DealDetailPage.tsx` - Deal details

### Vendor Dashboard
- `client/src/pages/BusinessDashboard.tsx` - Vendor management
- `client/src/components/profile/ProfileAccordionEditor.tsx` - Profile editing

### Stripe Integration
- Webhook endpoint: `POST /api/stripe/webhook`
- `server/index.ts:16` - Raw body parsing for webhooks (CRITICAL)
- Key events: `checkout.session.completed`, `customer.subscription.*`

---

## Environment Variables Required

```bash
DATABASE_URL          # Neon PostgreSQL connection string
STRIPE_SECRET_KEY     # Stripe API secret key
STRIPE_WEBHOOK_SECRET # Stripe webhook signing secret
# Replit Auth is configured automatically in Replit environment
```

---

## Coding Conventions

### TypeScript
- Strict mode enabled
- Path aliases: `@/*` → `client/src/*`, `@shared/*` → `shared/*`
- Zod schemas for validation with `drizzle-zod` integration
- Types exported from schema: `type User = typeof users.$inferSelect`

### React Components
- Functional components with hooks
- shadcn/ui components in `client/src/components/ui/`
- Custom brand components: `BrandButton`, `BrandCard`, `BrandBadge`
- Mobile-first responsive design

### Styling
- Tailwind CSS with CSS variables for theming
- Brand colors: primary (forest green), accent (warm orange)
- Light mode only (no dark mode toggle)
- Fonts: Playfair Display (headings), Work Sans (body)

### Database
- UUIDs for primary keys: `gen_random_uuid()`
- Timestamps: `createdAt`, `updatedAt`
- Soft deletes via `deletedAt` where applicable
- JSONB for flexible structured data

---

## Common Tasks

### Adding a New API Endpoint
1. Add route in `server/routes.ts`
2. Add storage methods in `server/storage.ts` if needed
3. Use `isAuthenticated` middleware for protected routes

### Adding a New Page
1. Create page component in `client/src/pages/`
2. Add route in `client/src/App.tsx`
3. Wrap with `<AppShell>` for navigation

### Database Schema Changes
1. Modify `shared/schema.ts`
2. Run `npm run db:push` to apply changes
3. Add migration file if needed for production

### Working with Deals
```typescript
// Check deal access
import { canUserAccessDeal, hasRiseLocalPass } from '@shared/dealAccess';

const canAccess = canUserAccessDeal(user, deal);
const hasMembership = hasRiseLocalPass(user);
```

---

## Testing Stripe Webhooks

1. Send test webhook from Stripe Dashboard
2. Check server logs for: `[Stripe Webhook] Event received and verified`
3. Verify idempotency: second send should log "Event already processed"

**Common Issues:**
- `NEEDS_MANUAL_SYNC`: User not found → use admin sync endpoint
- Signature failed: Check `STRIPE_WEBHOOK_SECRET` matches

---

## Gotchas and Important Notes

1. **Stripe Webhook Order**: Raw body parsing MUST come before `express.json()` in `server/index.ts`

2. **Legacy Routes**: Many routes redirect to new unified paths (e.g., `/vendors` → `/businesses`)

3. **Vendor Types**: The `restaurant` and `service_provider` roles are deprecated. Use `vendor` with `vendorType` field.

4. **Membership Expiration**: Always check `passExpiresAt` in addition to `isPassMember` flag

5. **Mobile-First**: Design for mobile viewport first, then scale up

6. **No E-commerce**: This is a deals-only platform, not a marketplace. No shopping cart or checkout for products.

7. **Category System**: Categories are stored in the `categories` table AND defined in `shared/categories.ts` for hierarchical display

---

## API Route Examples

```bash
# Auth
GET  /api/auth/user              # Get current user

# Deals
GET  /api/deals                  # List deals (with filters)
GET  /api/deals/:id              # Get deal details
POST /api/deals/:id/redeem       # Redeem a deal

# Vendors
GET  /api/vendors                # List vendors
GET  /api/vendors/me             # Current vendor profile
PATCH /api/vendors/me            # Update vendor profile

# Favorites
GET  /api/favorites              # User's saved deals
POST /api/favorites/:dealId      # Add to favorites
DELETE /api/favorites/:dealId    # Remove from favorites

# Conversations
GET  /api/conversations          # User's conversations
POST /api/conversations          # Start new conversation
POST /api/conversations/:id/messages  # Send message

# Admin
GET  /api/admin/stats            # Dashboard metrics
POST /api/admin/sync-membership  # Manual membership sync
```

---

## Recent Changes (January 2026)

- Simplified deal redemption to button-based system (removed time-locked codes)
- Added `dealAccess.ts` as single source of truth for membership logic
- Removed e-commerce tables (products, orders, cart, etc.)
- Unified vendor dashboard for all business types
- Added bulk membership sync endpoint for admin
