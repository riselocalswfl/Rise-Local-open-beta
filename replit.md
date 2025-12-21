# Rise Local - SWFL Deals & Local Business Discovery

## Overview
Rise Local is a mobile-first application designed to connect local businesses in Southwest Florida (SWFL) with shoppers. Its primary purpose is to facilitate deal discovery, allowing local businesses to offer exclusive deals and shoppers to find savings while supporting their community. The platform includes features for deal discovery, a membership program (Rise Local Pass), and comprehensive business profiles. The overarching vision is to simplify the process for residents to locate attractive deals and patronize neighborhood businesses throughout SWFL, encompassing areas like Fort Myers, Cape Coral, Bonita Springs, Estero, and Naples. Businesses can list deals for free.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX
The frontend is developed using React 18, TypeScript, and Vite. It leverages Radix UI and shadcn/ui (new-york preset) for UI components, styled with Tailwind CSS. The design prioritizes a mobile-first approach, with a primary focus on iPhone/Android and secondary consideration for desktop. Key branding elements include a forest green primary color, brand-specific accent colors (Wheat, Clay, Ink, Paper), and distinct fonts (Playfair Display, Work Sans, JetBrains Mono). A consistent `BrandLogo` component links to the home page (`/discover`) from all screens. The authentication page's hero section is optimized for mobile, featuring a concise layout, a 6-word headline ("Shop local. Sell local."), a single-line subheadline, and two prominent CTAs ("Shop Local," "Sell With Us") positioned above the fold with 56px touch targets on a clean white background. The application uses a light-only theme, with no dark mode styling, and implements semantic CSS variables with Tailwind CSS.

**Typography System**: A comprehensive typography utility class system is defined in `client/src/index.css` for consistent hierarchy across all pages:
- `text-page-title`: Large page headers (1.5rem, weight 600)
- `text-section-header`: Card/section titles (1.125rem, weight 600)
- `text-deal-title`: Deal/item names (0.9375rem, weight 600)
- `text-business-name`: Business/vendor names (0.9375rem, weight 500)
- `text-body`: Body copy and descriptions (0.875rem, weight 400)
- `text-meta`: Metadata, timestamps, secondary info (0.75rem, weight 400)
- `text-label`: Form labels (0.875rem, weight 500)
- `text-input`: Form input text (0.875rem, weight 400)
- `text-button`: Button text (0.875rem, weight 500)
- `text-meta-emphasis`: Emphasized metadata (0.75rem, weight 500)

### Technical Implementations
- **Frontend State Management**: TanStack Query manages server-side state, while React hooks handle local UI state. Wouter is used for client-side routing.
- **Backend**: An Express.js server with TypeScript provides a RESTful API.
- **Data Storage**: PostgreSQL, accessed via Neon's serverless driver, uses Drizzle ORM for type-safe queries and schema management.
- **Authentication**: Replit Auth via OIDC is used, with sessions stored in PostgreSQL. Role-based access supports `buyer`, `vendor`, `restaurant`, `service_provider`, and `admin`. All pages, except `/auth`, require authentication. An `AuthBoundary` component enforces login, redirecting unauthenticated users to `/auth` and storing return URLs in `sessionStorage`.
- **Unified Vendor Architecture**: A single `vendors` table accommodates all vendor types (shop, dine, service) using a `vendorType` field and a `capabilities` JSON field for polymorphic behavior. Products, menu items, and service offerings link to this unified table. Customer-facing terminology uses "Business" (e.g., `/businesses`), while backend and API references use "Vendor" (e.g., `/api/vendors`).
- **Simplified Authentication & Onboarding**: Streamlined signup routes users based on an `intended_role` query parameter. After authentication, all users are directed to a `/start` gate that routes them based on their role and onboarding completion status.
- **5-Step Vendor Onboarding Flow**: Vendors complete a comprehensive onboarding process at `/onboarding`, covering basic information, business details, operations, hours/address/images, and a final review. This flow includes auto-saving, draft persistence, and image uploads.
- **Universal `/start` Gate**: This central routing page handles redirection based on authentication status, onboarding completion, user role, and `returnTo` URLs.
- **Mobile-First Discover Page**: The `/discover` page serves as the consumer home, featuring a location bar, horizontally-scrollable filter chips, and three curated deal sections with horizontal card scrolling. Deal cards display savings, member-only badges, and locked overlays for non-members. A membership banner promotes the Rise Local Pass. Bottom tab navigation includes Discover, Browse, Favorites, and Profile.
- **Rise Local Pass Membership**: The `/membership` page details the Rise Local Pass subscription ($4.99/month), showcasing benefits and a subscribe CTA. Non-members encounter locked deal overlays prompting them to subscribe. The `users` table includes `isPassMember`, `passExpiresAt`, and `stripeCustomerId` for subscription management.
- **Unified Vendor Dashboard**: A single capability-aware `/dashboard` serves all vendor types, dynamically adjusting tabs based on vendor capabilities.
- **Mobile-First Profile Accordion Editor**: The Business Dashboard Profile tab uses a mobile-optimized accordion layout (`ProfileAccordionEditor`) with 7 collapsible sections: Basics, Contact, Location, Social Links, Hours, Branding, and Values. Each section shows completion indicators. Reusable components in `client/src/components/profile/` include `HoursEditor` (with by-appointment toggle and quick-copy), `SocialLinksEditor`, `ValuesEditor`, `BrandingUploader`, and `StickyActionBar` (mobile sticky footer with Preview button). Changes auto-save on blur with toast feedback. The hours data is stored as `{ byAppointment: boolean, schedule: Record<string, string> }`.
- **Public BusinessProfile Field Parity**: The `/businesses/:id` page displays banner images, full addresses, business hours (with by-appointment support), social links (with URL normalization), and business values/local sourcing badges. Empty sections are hidden. Social URL handling normalizes both handles (@username) and full URLs.
- **Unified Business Dashboard**: Business owners manage their account at `/dashboard` with a comprehensive vendor dashboard featuring profile management, deals, messaging, and analytics tabs. Customer users access `/profile` for personal account management. Legacy `/account` routes redirect to `/dashboard`.
- **Unified Category System**: A dedicated `categories` database table provides a single source of truth for business categories, served by the `/api/categories` endpoint. Five default categories are seeded, each supporting custom Lucide icons and sort ordering.
- **Deals-Only Focus**: The application focuses exclusively on deal discovery, excluding cart, checkout, and order functionalities. Transactions occur directly with businesses. The deals system includes new fields (`finePrint`, `savingsAmount`, `discountType`, `discountValue`, `imageUrl`, `startsAt`, `endsAt`, `deletedAt`), visibility rules, and deal tiers (`free`, `member`, `standard`).
- **B2C Messaging System**: Implements a consumer-to-business messaging system with optional deal context. Features include "Message Business" buttons, vendor message viewing and replies in the Dashboard, and in-app notifications.
- **Near Me Location Filtering**: Implements GPS coordinates and server-side geocoding with the Haversine formula for radius-based deal filtering.
- **Time-Locked Code Redemption System**: A comprehensive in-person deal redemption flow where consumers claim deals to receive a 6-digit code valid for 10 minutes. Vendors redeem codes at a specific screen, with atomic redemption, race condition protection, claim limit enforcement, and collision-resistant code generation. Verification response includes customer name and email for vendor reference.
- **Favorites System**: Users can save deals to their favorites list via heart button on deal detail pages. The `/favorites` page displays all saved deals with vendor info and remove functionality. API endpoints: GET/POST/DELETE `/api/favorites/:dealId`, GET `/api/favorites`.

### Feature Specifications
- **Geographic Focus**: Serves local vendors across Southwest Florida (SWFL), including Fort Myers, Cape Coral, Bonita Springs, Estero, and Naples.
- **Fulfillment**: Supports pickup, local delivery, and shipping options configurable by vendors.
- **Application Routes**:
  - **Public Route**: `/auth` is the only route accessible without authentication.
  - **Gate Routes**: `/start` and `/onboarding` are allowed for authenticated users regardless of onboarding status; `/start` handles role-based routing.
  - **Protected Routes**: All other routes require authentication and completed onboarding (e.g., `/discover`, `/dashboard`, `/profile`, `/account`).
  - **Redirects**: Legacy routes are redirected to unified paths (e.g., old vendor routes to `/businesses`, various signup/login routes to `/auth`).
  - **Global Auth Enforcement**: An `AuthBoundary` component globally enforces authentication and redirects.

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