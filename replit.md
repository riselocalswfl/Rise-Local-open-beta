# Rise Local - SWFL Deals & Local Business Discovery

## Overview
Rise Local is a mobile-first application designed to connect local businesses in Southwest Florida (SWFL) with shoppers. Its primary purpose is to facilitate deal discovery, enabling businesses to offer exclusive deals and allowing shoppers to find savings while supporting local commerce. The platform includes features for deal discovery, a membership program (Rise Local Pass), and comprehensive business profiles. The business vision is to simplify how residents find deals and support local businesses across SWFL. Businesses can list deals for free.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX
The frontend is built using React 18, TypeScript, and Vite, leveraging Radix UI, shadcn/ui (new-york preset), and Tailwind CSS for styling. It emphasizes a mobile-first design with a forest green primary color, brand-specific accent colors (Wheat, Clay, Ink, Paper), and distinct fonts (Playfair Display, Work Sans, JetBrains Mono). The application uses a light-only theme and semantic CSS variables, supported by a comprehensive typography system.

### Technical Implementations
- **Frontend**: Utilizes TanStack Query for server state management, React hooks for UI state, and Wouter for client-side routing.
- **Backend**: Implemented with Express.js and TypeScript, providing a RESTful API.
- **Data Storage**: PostgreSQL, accessed via Neon's serverless driver, and managed with Drizzle ORM.
- **Authentication**: A dual system featuring custom email/password authentication (JWT-based, bcrypt hashing, account lockout, email verification, password reset) and legacy Replit Auth (OIDC). Includes an OAuth-to-Password migration system for App Store compatibility, handling user role assignments (`buyer`, `vendor`, `admin`). Account lockout (5 attempts, 15 min) clears on password reset. OAuth migration users bypass lockout checks and get directed to set password instead.
- **Multi-Role User System**: Users can have `isAdmin` and `isVendor` privileges simultaneously, with the navigation adapting accordingly.
- **Unified Vendor Architecture**: All vendor types are managed within a single `vendors` table using `vendorType` and `capabilities` fields.
- **Unified Authentication Flow**: Single AuthModal component handles login, signup, and password reset with URL-synchronized state. Clean landing page with "Get Started" and "Sign In" CTAs. Account type selection (Customer/Business) before signup. Deep-linkable URLs: `/auth`, `/auth?mode=login`, `/auth?mode=signup`.
- **Simplified Authentication & Onboarding**: Streamlined signup directs users to a `/start` gate for role-based routing and onboarding status checks.
- **5-Step Vendor Onboarding Flow**: A comprehensive `/onboarding` process for vendors, covering business details, operations, hours, and images with auto-save.
- **Mobile-First Discover Page**: Features location filtering, horizontally-scrollable filter chips, curated deal sections, and bottom tab navigation.
- **Rise Local Pass Membership**: A subscription model ($4.99/month or $44.91/year) managed through `isPassMember` and `passExpiresAt` fields in the `users` table.
- **Centralized Membership Access Logic**: All membership checks are centralized in `shared/dealAccess.ts` for consistency across frontend and backend.
- **Stripe Webhook Integration**: A robust handler at `POST /api/stripe/webhook` with raw body parsing, structured event logging, signature verification, and idempotency via `stripe_webhook_events` table. It processes various Stripe events to manage user subscriptions and includes fallbacks for user lookup.
- **CheckoutSuccess Retry Logic**: Implemented on the `/checkout/success` page for webhook processing delays.
- **Unified Vendor Dashboard**: A single `/dashboard` dynamically adjusts tabs based on vendor capabilities, optimized for mobile with sticky headers and responsive menus.
- **Mobile-First Profile Editor**: A collapsible profile editor in the Business Dashboard for managing business details, contacts, hours, and branding, supporting image uploads and auto-save.
- **Public Business Profile Parity**: Public `/businesses/:id` pages display comprehensive business information.
- **Unified Category System**: Business categories are managed through a central `categories` database table.
- **Deals-Only Focus**: The application concentrates solely on deal discovery, excluding e-commerce. Deals include `finePrint`, `savingsAmount`, `discountType`, `imageUrl`, `startsAt`, `endsAt`, and `deletedAt`, with `published`, `paused`, and `draft` statuses.
- **B2C Messaging System**: Allows consumers to message businesses with deal context, with vendor replies in the Dashboard and in-app notifications. Includes email notifications with rate limiting.
- **Near Me Location Filtering**: Uses GPS coordinates and the Haversine formula for radius-based deal discovery.
- **Time-Locked Code Redemption System**: In-person deal redemption using 6-digit codes valid for 10 minutes, with atomic redemption and claim limits.
- **Redemption Frequency Controls**: Per-deal redemption limits (e.g., once per week/month) enforced by backend validation.
- **Favorites System**: Users can save and manage deals.
- **Discount Codes**: Optional `discountCode` field on deals, visible to Pass members and blurred for non-members.
- **Viewable Locked Deals**: Pass-locked deals are fully viewable by non-members to encourage conversion, with redemption restricted.
- **Admin Dashboard**: A redesigned interface focused on founder-readable metrics for deals, membership, and business participation, including manual membership toggling for buyers.
- **Business Analytics Dashboard**: Comprehensive founder-focused analytics with:
  - **Revenue Analytics**: MRR, churn rate, ARPU, LTV, 6-month revenue trend charts
  - **User Growth Analytics**: Total users, Pass members, signups, conversion rates, DAU/WAU, 30/60/90-day retention cohorts
  - **Geographic Breakdown**: User distribution across SWFL cities (Fort Myers, Cape Coral, Naples, etc.)
  - **Deal Performance**: Top performing deals, underperforming deals (low redemptions), category performance, member redemption rates
  - **Business Health Indicators**: Churn risk alerts (inactive Pass members), inactive vendors, engagement scores, revenue concentration
  - **API Endpoints**: `/api/admin/analytics/revenue`, `/api/admin/analytics/users`, `/api/admin/analytics/deals`, `/api/admin/analytics/health`
  - **Charts**: Recharts library for line charts (MRR trend, user growth) and bar charts (geographic, category performance)

### Security & Compliance (App Store Ready)
- **Security Headers**: Helmet middleware with HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy
- **CORS Protection**: Strict origin allowlist with proper credential handling and unknown origin blocking
- **Rate Limiting**: Tiered rate limits - general (1000/15min), auth (10/15min), password reset (3/hour)
- **Response Compression**: gzip/deflate for reduced bandwidth
- **Password Security**: bcrypt with 12 salt rounds, account lockout after 5 failed attempts
- **Session Security**: JWT tokens expire after 7 days, POST /api/auth/logout endpoint for custom auth
- **XSS Prevention**: Defense-in-depth input sanitization with strict protocol whitelist (http/https/mailto/tel only)
  - Client-side: `sanitizeUrl()` and `sanitizeText()` utilities in `client/src/lib/utils.ts`
  - Server-side: `sanitizeObject()` in `server/sanitize.ts` applied at storage layer for vendor/deal operations
- **Environment Validation**: Startup validation of required environment variables (JWT_SECRET min 32 chars, DATABASE_URL required)
- **Production Error Handling**: Stack traces hidden in production, sanitized error messages
- **Health Check**: GET /api/health returns status, uptime, version, environment
- **GDPR Compliance**: 
  - GET /api/user/data-export - Full user data export (profile, favorites, deals, notifications)
  - DELETE /api/user/account - Account deletion with related data cleanup

### Feature Specifications
- **Geographic Focus**: Southwest Florida (Fort Myers, Cape Coral, Bonita Springs, Estero, Naples).
- **Fulfillment**: Supports pickup, local delivery, and shipping options.
- **Application Routes**:
  - **Public**: `/auth`, `/reset-password`, `/set-password`, `/privacy`, `/terms`.
  - **Gate**: `/start`, `/onboarding` (for authenticated users).
  - **Protected**: All other routes require authentication and completed onboarding.
  - **Redirects**: Legacy routes are redirected to unified paths.

## External Dependencies

### UI Component Libraries
- `@radix-ui/*`
- `cmdk`
- `embla-carousel-react`
- `lucide-react`

### Form Management & Validation
- `react-hook-form`
- `@hookform/resolvers`
- `zod`
- `drizzle-zod`

### Date Handling
- `date-fns`

### Styling
- `tailwindcss`
- `tailwind-merge`
- `clsx`
- `class-variance-authority`

### Database & ORM
- `@neondatabase/serverless`
- `drizzle-orm`
- `drizzle-kit`

### Database Tables (22 Active)
- `users`, `sessions`
- `vendors`
- `categories`
- `deals`, `deal_redemptions`, `deal_claims`
- `favorites`
- `conversations`, `conversation_messages`
- `notifications`, `email_jobs`
- `membership_events`, `stripe_webhook_events`
- `preferred_placements`, `placement_impressions`, `placement_clicks`
- `admin_audit_logs`
- `services`

### APIs
- OpenStreetMap Nominatim API (for geocoding)