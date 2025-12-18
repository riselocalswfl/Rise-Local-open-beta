# Rise Local - Fort Myers Deals & Local Business Discovery

## Overview
Rise Local is a mobile-first app connecting local businesses with shoppers in Fort Myers, Florida. Local businesses offer exclusive deals, and shoppers discover new places to save money while supporting their community. The platform features deal discovery, membership perks (Rise Local Pass), and business profiles. The vision is to make it easy for locals to find great deals and support neighborhood businesses in SWFL.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX
The frontend is built with React 18, TypeScript, and Vite, utilizing Radix UI and shadcn/ui (new-york preset) for components, styled with Tailwind CSS. The design is **mobile-first** (iPhone/Android primary, desktop secondary), featuring a forest green primary color, brand-specific colors (Wheat, Clay, Ink, Paper), and distinct fonts (Playfair Display, Work Sans, JetBrains Mono). The BrandLogo component always links to the home page (/discover) from every screen. The Auth page hero section is optimized for mobile with a compact layout, 6-word headline ("Shop local. Sell local."), single-line subheadline, and two large CTAs (Shop Local, Sell With Us) above the fold with 56px touch targets on a clean white background.

### Technical Implementations
- **Frontend State Management**: TanStack Query manages server state, React hooks handle local UI state. Wouter is used for client-side routing.
- **Backend**: Express.js with TypeScript provides a RESTful API.
- **Data Storage**: PostgreSQL, accessed via Neon's serverless driver, uses Drizzle ORM for type-safe queries and schema management.
- **Authentication**: Replit Auth via OIDC with sessions stored in PostgreSQL. Role-based access includes `buyer`, `vendor`, `restaurant`, `service_provider`, and `admin`. All pages require authentication except `/auth`. The `AuthBoundary` component wraps the entire router to enforce login, redirecting unauthenticated users to `/auth`. Return URLs are stored in sessionStorage for post-login redirect.
- **Unified Vendor Architecture**: All vendor types (shop, dine, service) use a single `vendors` table with a `vendorType` field and a `capabilities` JSON field, enabling polymorphic behavior. Products, menu items, and service offerings link to this unified `vendors` table.
- **Terminology Convention**: "Vendor" is used for backend/database references (API: `/api/vendors`), while "Business" is used for customer-facing UI and routes (`/businesses`, `/businesses/:id`). This provides clear separation between technical and user-facing terminology.
- **Simplified Authentication & Onboarding**: Streamlined signup routes users based on `intended_role` query parameter. After auth, all users go to `/start` gate which routes based on role and onboarding status.
- **Universal `/start` Gate**: Central routing page that redirects users based on their role and `onboardingComplete` status:
  - Unauthenticated → `/auth`
  - Authenticated + incomplete onboarding + vendor/restaurant/service_provider → `/onboarding`
  - Authenticated + incomplete onboarding + buyer → `/discover`
  - Authenticated + complete onboarding + admin → `/admin`
  - Authenticated + complete onboarding + vendor/restaurant/service_provider → `/dashboard`
  - Authenticated + complete onboarding + buyer → `/discover` (or returnTo if stored)
  - Also handles `returnTo` from sessionStorage for deep link preservation.
- **Mobile-First Discover Page**: The `/discover` page is the new consumer home featuring a location bar, horizontally-scrollable filter chips (All Deals, Member-Only, Free Deals, BOGO, $5+ Value, New this week, Near me), and three curated deal sections ("Member Exclusives Near You", "Best Value Right Now", "New Local Spots Added") with horizontal card scrolling. Deal cards display savings pills, member-only badges, and locked overlays for non-members. A membership banner promotes the Rise Local Pass ($4.99/mo). Currently uses mock data. Bottom tab navigation includes Discover, Browse, Favorites, and Profile tabs.
- **Rise Local Pass Membership**: The `/membership` page presents the Rise Local Pass subscription ($4.99/month) with pricing card, benefits list, and subscribe CTA. Non-members see locked deal overlays with "Unlock with Rise Local Pass" prompts directing them to join.
- **Unified Vendor Dashboard**: A single capability-aware `/dashboard` serves all vendor types, dynamically showing/hiding tabs based on vendor capabilities.
- **Category System Removal**: Categories have been removed from the database schema and all user interfaces to simplify browsing.
- **Customer-Facing Business Pages**: Profiles (`/businesses/:id`) use a unified endpoint (`/api/vendors/:id`) and implement capability-based rendering. Legacy routes (`/vendor/:id`, `/vendors`, `/restaurant/:id`) redirect to the unified `/businesses` routes.
- **Deals-Only Focus**: The app focuses exclusively on deal discovery - cart, checkout, and order functionality have been removed. Vendors can list products/menu items for display purposes, but transactions happen directly with the business.
- **Direct Messaging**: Supports real-time user-to-vendor messaging with read status.
- **Stripe Connect Integration**: Facilitates vendor payouts, with the platform collecting payments (product price + 7% FL sales tax) and transferring the full amount to the vendor. Revenue is from an $89/month vendor membership fee, with no transaction fees.
- **Customer Profile Management**: Users manage their profile (`/profile`) with editable fields for first name, last name, and phone number, enforced by secure API endpoint whitelisting.
- **Contact Information Storage**: Vendor contact information is stored in individual database columns for improved type safety and data integrity.
- **Near Me Location Filtering**: Implements GPS coordinates and server-side geocoding for location-based filtering of deals with radius presets, using the Haversine formula for distance calculation.
- **Reservation Provider Architecture**: Utilizes an `IReservationProvider` interface with factory pattern for integrating external reservation systems (OpenTable, SevenRooms, Resy) while preserving deep linking for existing flows.
- **Restaurant Admin Settings Panel**: Adds a settings section in VendorDashboard for dine vendors to manage reservation options and deal participation.
- **Navigation Improvements**: Enhances navigation with a Home tab in the bottom navigation and a new `DetailHeader` component for detail pages.
- **Light-Only Theme**: The application uses a light-only theme, removing all dark mode styling and implementing semantic CSS variables with Tailwind CSS.
- **Service Vendor Cards**: The Home page now displays real service vendor cards fetched via a new `/api/service-vendors` endpoint.
- **Enhanced Deals API**: The deals system has been upgraded with:
  - New deal fields: `finePrint`, `savingsAmount`, `discountType`, `discountValue`, `imageUrl`, `startsAt`, `endsAt`, `deletedAt`
  - Deal visibility rules with proper HTTP error codes: `NOT_FOUND` (404), `EXPIRED` (410), `REMOVED` (410)
  - Deal tiers: `free`, `member`, `standard` with `isPassLocked` flag for membership-only deals
  - Vendor info included in deal responses with business name and location
- **Rise Local Pass User Fields**: Users table includes `isPassMember`, `passExpiresAt`, and `stripeCustomerId` for subscription management
- **Deals Seed Script**: Run `npx tsx server/seed-deals.ts` to populate 3 sample vendors and 8 deals for testing

### Feature Specifications
- **Pricing Model**: $89/month membership for vendors; buyers pay product price + 7% FL sales tax, no additional buyer or transaction fees.
- **Geographic Focus**: Exclusively serves local Fort Myers vendors.
- **Fulfillment**: Supports pickup, local delivery, and shipping options configurable by vendors.
- **Fort Myers Spotlight**: Dedicated feature for highlighting local content or businesses.
- **Application Routes**:
  - **Public Route**: `/auth` - the only route accessible without authentication.
  - **Gate Routes**: `/start` and `/onboarding` - allowed for authenticated users regardless of onboarding status; `/start` handles role-based routing.
  - **Protected Routes**: All other routes require authentication and completed onboarding including `/discover`, `/browse`, `/favorites`, `/membership`, `/products`, `/businesses`, `/businesses/:id`, `/services`, `/eat-local`, `/live-local`, `/events`, `/events/:id`, `/spotlight`, `/profile`, `/messages`, `/dashboard`, `/events/my`, `/admin`.
  - **Vendor Dashboard Access**: Vendors access their dashboard via the "Business Tools" section in the My Account page (`/profile`), which links to `/dashboard`.
  - **Legacy Route Redirects**: Old routes (`/vendors`, `/vendor/:id`, `/restaurant/:id`, `/app/businesses`) redirect to the unified `/businesses` routes for backwards compatibility.
  - **Auth Route Consolidation**: Single unified auth page at `/auth` handles both login and signup. Legacy routes (`/join`, `/login`, `/signup`, `/sign-in`, `/sign-up`, `/register`, `/welcome`) redirect to `/auth` or `/start`.
  - **Global Auth Enforcement**: `AuthBoundary` component wraps the router to check authentication on every page load. Unauthenticated users are redirected to `/auth` with return URL preserved. Authenticated users with incomplete onboarding are redirected to `/start`.

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

### Development Tools
- `@replit/vite-plugin-*`
- `tsx`
- `esbuild`

### Fonts
- Google Fonts CDN

### APIs
- OpenStreetMap Nominatim API (for geocoding)