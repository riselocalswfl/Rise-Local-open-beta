# Rise Local - SWFL Deals & Local Business Discovery

## Overview
Rise Local is a mobile-first application connecting local businesses in Southwest Florida (SWFL) with shoppers. Its core purpose is to facilitate deal discovery, allowing businesses to offer exclusive deals and shoppers to find savings while supporting local commerce. The platform includes deal discovery, a membership program (Rise Local Pass), and comprehensive business profiles. The business vision is to simplify how residents find deals and support local businesses across SWFL. Businesses can list deals for free.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX
The frontend uses React 18, TypeScript, and Vite, with Radix UI, shadcn/ui (new-york preset), and Tailwind CSS for styling. It prioritizes a mobile-first design, featuring a forest green primary color, brand-specific accent colors (Wheat, Clay, Ink, Paper), and distinct fonts (Playfair Display, Work Sans, JetBrains Mono). The application uses a light-only theme and semantic CSS variables. A comprehensive typography system ensures consistent hierarchy.

### Technical Implementations
- **Frontend State Management**: TanStack Query for server state, React hooks for UI state, and Wouter for client-side routing.
- **Backend**: Express.js with TypeScript for a RESTful API.
- **Data Storage**: PostgreSQL via Neon's serverless driver, utilizing Drizzle ORM.
- **Authentication**: Replit Auth (OIDC) with PostgreSQL session storage. Supports `buyer`, `vendor`, and `admin` roles. All pages except `/auth` require authentication, enforced by an `AuthBoundary` component. Note: `restaurant` and `service_provider` roles have been deprecated and consolidated into `vendor` - vendor types are now differentiated by the `vendorType` field (shop, dine, service) in the vendors table.
- **Unified Vendor Architecture**: A single `vendors` table handles all vendor types using `vendorType` and `capabilities` fields.
- **Simplified Authentication & Onboarding**: Streamlined signup routes users based on `intended_role` and directs all authenticated users to a `/start` gate for role-based routing and onboarding status checks.
- **5-Step Vendor Onboarding Flow**: Comprehensive onboarding at `/onboarding` for vendors, covering business details, operations, hours, and images, with auto-saving and draft persistence.
- **Universal `/start` Gate**: Central routing for authenticated users based on onboarding, role, and return URLs.
- **Mobile-First Discover Page**: Consumer home page with location filtering, horizontally-scrollable filter chips, curated deal sections, and bottom tab navigation.
- **Rise Local Pass Membership**: Subscription model ($4.99/month or $44.91/year) with `isPassMember`, `passExpiresAt`, and Stripe-related fields in the `users` table for management.
- **Centralized Membership Access Logic**: All membership checks use `shared/dealAccess.ts` as single source of truth:
  - `hasRiseLocalPass(user)`: Returns true only if user.isPassMember=true AND user.passExpiresAt is a valid future date
  - `isMemberOnlyDeal(deal)`: Returns true if deal.isPassLocked=true OR deal.tier="premium"/"member" (legacy support)
  - Backend `isUserSubscribed()` in routes.ts mirrors frontend logic for consistency
  - Debug logging available (set DEBUG_ACCESS=true in dealAccess.ts)
- **Stripe Webhook Integration**: Bulletproof webhook handler at `POST /api/stripe/webhook`:
  - **Middleware Order**: Raw body parsing (`express.raw`) in `server/index.ts` runs BEFORE `express.json()` to preserve Stripe signature
  - **Structured Event Logging**: Every event logs `eventId`, `eventType`, `livemode`, `created`, `customerId`, `subscriptionId`, `customerEmail`, `clientReferenceId`, and `metadata`
  - **Signature Verification**: Returns 400 on invalid signatures to allow Stripe retries
  - **Idempotency**: `stripe_webhook_events` table tracks processed events - duplicate events return 200 immediately
  - **Event Handling**: Processes `checkout.session.completed`, `customer.subscription.*`, `invoice.*` events
  - **User Lookup Fallbacks**: metadata.appUserId → stripeCustomerId → customer_email
  - **NEEDS_MANUAL_SYNC Pattern**: When user not found in checkout.session.completed, logs for admin resolution and returns 200 OK
  - **Admin Sync Endpoint**: `POST /api/admin/sync-membership` for manual membership fixes (accepts `ADMIN_API_KEY` header or admin session)
  - **Entitlements Refresh Endpoint**: `POST /api/entitlements/refresh` allows users to manually trigger subscription status check from Stripe (safety net for webhook failures)
  - **Audit Trail**: All membership changes logged to `membership_events` table with before/after state
- **CheckoutSuccess Retry Logic**: Implements retry logic for webhook processing delays on the `/checkout/success` page.
- **Unified Vendor Dashboard**: A single, capability-aware `/dashboard` dynamically adjusts tabs for all vendor types. Mobile view features a sticky header with dropdown navigation (48px touch targets), full-width dropdown menu with 60vh max-height scrolling, and iOS zoom prevention (16px font on inputs).
- **Mobile-First Profile Accordion Editor**: Business Dashboard profile editor with collapsible sections for Basics, Contact, Location, Social Links, Hours, Branding, and Values, featuring auto-save and image uploads.
- **Public Business Profile Parity**: Public `/businesses/:id` pages display comprehensive business information, including hours, social links, and values.
- **Unified Category System**: `categories` database table provides a single source of truth for business categories.
- **Deals-Only Focus**: The application focuses solely on deal discovery, excluding e-commerce functionalities. Deals include fields like `finePrint`, `savingsAmount`, `discountType`, `imageUrl`, `startsAt`, `endsAt`, and `deletedAt`, with `published`, `paused`, and `draft` statuses. New deals auto-publish.
- **B2C Messaging System**: Consumer-to-business messaging with deal context, vendor replies in Dashboard, and in-app notifications. Uses `conversations` and `conversation_messages` tables, with polling for new messages. Includes email notifications for unread messages with rate limiting and job queue.
- **UserAvatar Component**: Reusable component for displaying profile photos with initial fallbacks.
- **Public Profile Endpoint**: `/api/users/:id` for limited public user data in messages.
- **Near Me Location Filtering**: GPS coordinates and Haversine formula for radius-based deal filtering.
- **Time-Locked Code Redemption System**: In-person deal redemption with 6-digit codes valid for 10 minutes, atomic redemption, and claim limits.
- **Redemption Frequency Controls**: Per-deal redemption limits (once per week/month, or unlimited) with backend validation and display on deal cards.
- **Favorites System**: Users can save and manage deals in a favorites list.
- **Discount Codes**: Optional `discountCode` field on deals (varchar 50). Vendors can add codes in dashboard; visible to Pass members, blurred for non-members.
- **Viewable Locked Deals**: Pass-locked deals are fully viewable by non-members to encourage conversion. Full description, images, and vendor info are shown, but redemption is locked ("Join to Unlock" button) and discount codes are hidden/blurred.
- **Admin Dashboard (Deal-Focused)**: Redesigned admin interface prioritizing founder-readable metrics:
  - **Deal Metrics**: Total deals, premium (Pass-only) vs free deals, redemption counts by tier
  - **Membership Metrics**: Pass holders, non-pass users, total users, conversion rate
  - **Business Participation**: Businesses with deals, businesses with premium deals, businesses needing outreach (no deals)
  - **Manual Membership Toggle**: Admins can grant/revoke Pass access for buyers via PATCH `/api/admin/users/:userId/membership`. Manual grants use plan name "admin_manual_grant" and are logged to `membership_events` for audit. Pass status badges show (Stripe) or (Manual) indicator with expiration and last updated timestamps.

### Feature Specifications
- **Geographic Focus**: Southwest Florida (Fort Myers, Cape Coral, Bonita Springs, Estero, Naples).
- **Fulfillment**: Supports pickup, local delivery, and shipping options.
- **Application Routes**:
  - **Public**: `/auth`.
  - **Gate**: `/start`, `/onboarding` (for authenticated users).
  - **Protected**: All other routes require authentication and completed onboarding (e.g., `/discover`, `/dashboard`).
  - **Redirects**: Legacy routes redirect to unified paths.

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

### APIs
- OpenStreetMap Nominatim API (for geocoding)

## Stripe Webhook Testing Checklist

### Testing Webhook Reception
1. **Send test webhook from Stripe Dashboard**:
   - Go to Stripe Dashboard → Developers → Webhooks → Your endpoint → Send test webhook
   - Test with `checkout.session.completed` event first

2. **Check server logs for**:
   ```
   [Stripe Webhook] Event received and verified { eventId, eventType, livemode, created... }
   ```

3. **Verify idempotency**: Send the same test event twice - second should log:
   ```
   [Stripe Webhook] Event already processed, skipping
   ```

### Expected Success Flow
1. Event received → Signature verified → User lookup (by appUserId, stripeCustomerId, or email) → DB updated → `stripe_webhook_events` entry created
2. Look for: `[Stripe Webhook] Pass unlock SUCCESS`
3. User's `isPassMember` = true, `passExpiresAt` = subscription period end

### Common Issues & Fixes
- **NEEDS_MANUAL_SYNC**: User not found during checkout - use `/api/admin/sync-membership` with `{ email }` or `{ subscriptionId }`
- **User not getting Pass unlocked**: User can call `POST /api/entitlements/refresh` to manually trigger Stripe check
- **Signature verification failed**: Ensure `STRIPE_WEBHOOK_SECRET` matches the endpoint's secret in Stripe Dashboard
- **Bulk fix all broken accounts**: Admin can call `POST /api/admin/bulk-sync-memberships` to find all users with `stripeSubscriptionId` but `isPassMember=false`, check each against Stripe, and update those with active subscriptions. Returns summary with synced/skipped/error counts.

### Event Types to Enable in Stripe Webhook Settings
- `checkout.session.completed` (primary for new subscriptions)
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid` (for renewal payments)
- `invoice.payment_failed`