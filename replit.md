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
- **Authentication**: Replit Auth (OIDC) with PostgreSQL session storage. Supports `buyer`, `vendor`, `restaurant`, `service_provider`, and `admin` roles. All pages except `/auth` require authentication, enforced by an `AuthBoundary` component.
- **Unified Vendor Architecture**: A single `vendors` table handles all vendor types using `vendorType` and `capabilities` fields.
- **Simplified Authentication & Onboarding**: Streamlined signup routes users based on `intended_role` and directs all authenticated users to a `/start` gate for role-based routing and onboarding status checks.
- **5-Step Vendor Onboarding Flow**: Comprehensive onboarding at `/onboarding` for vendors, covering business details, operations, hours, and images, with auto-saving and draft persistence.
- **Universal `/start` Gate**: Central routing for authenticated users based on onboarding, role, and return URLs.
- **Mobile-First Discover Page**: Consumer home page with location filtering, horizontally-scrollable filter chips, curated deal sections, and bottom tab navigation.
- **Rise Local Pass Membership**: Subscription model ($4.99/month or $44.91/year) with `isPassMember`, `passExpiresAt`, and Stripe-related fields in the `users` table for management.
- **Stripe Webhook Integration**: Handles Stripe events (`checkout.session.completed`, `customer.subscription.*`, `invoice.*`) with user lookup fallbacks and logs membership state changes to an `membership_events` audit table.
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