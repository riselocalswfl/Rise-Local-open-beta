# Rise Local - Fort Myers Marketplace & Community

## Overview
Rise Local is a full-stack web application designed to connect local vendors, artisans, and farmers with buyers in Fort Myers, Florida. Its primary purpose is to foster local commerce, sustainability, and community engagement by providing a marketplace for products and event management with RSVP and attendance tracking. The platform aims to facilitate local transactions, offer a robust platform for vendors, and enrich community interaction, all while maintaining a counterculture yet polished brand aesthetic.

## User Preferences
Preferred communication style: Simple, everyday language.

## Recent Changes

### Navigation Improvements (December 14, 2024)
- **Home Tab in Bottom Navigation**: Added Home as first tab in BottomTabs.tsx with House icon routing to /
- **DetailHeader Component**: Created new `client/src/components/layout/DetailHeader.tsx` with Back button + Home icon for detail pages
- **Detail Pages Updated**: VendorProfile, DealDetailPage, Cart, Checkout, EventDetail, OrderConfirmation now use DetailHeader
- **Empty States**: Added "Back to Home" buttons to empty cart, checkout empty, vendor not found, event/deal not found pages
- **Files Modified**: BottomTabs.tsx, DetailHeader.tsx (new), VendorProfile.tsx, DealDetailPage.tsx, Cart.tsx, Checkout.tsx, EventDetail.tsx, OrderConfirmation.tsx

### Light-Only Theme Implementation (December 13, 2024)
- **Theme Simplification**: Removed all dark mode styling from the application
- **CSS Variables**: Added proper shadcn semantic color variables in index.css (--background, --foreground, --card, --popover, etc.)
- **Tailwind Config**: Updated tailwind.config.ts to use CSS variable-based colors for all semantic tokens
- **Component Updates**: Removed all `dark:` Tailwind variants from components (Select, Alert, Avatar, VendorCard, ProductCard, etc.)
- **Color Scheme**: Light cream background (#FDFBF7), white cards/popovers, dark gray text for readability
- **Files Modified**: index.css, tailwind.config.ts, select.tsx, dropdown-menu.tsx, popover.tsx, alert.tsx, avatar.tsx, chart.tsx, StripeConnectCard.tsx, Checkout.tsx, Orders.tsx, SpotlightBanner.tsx, VendorCard.tsx, ProductCard.tsx, CartItem.tsx

### Service Vendor Cards on Home Page (November 24, 2024)
- **Service Section Update**: Home page now displays real service vendor cards instead of blank placeholders
- **New Endpoint**: Created `/api/service-vendors` endpoint to fetch service vendors (vendorType='service') with completed profiles
- **ServiceVendorCard Component**: New card component displaying vendor photo, business name, tagline, service areas, location, badges, and clickable profile links
- **Data Flow**: Fetches from unified vendors table, filters for service type vendors  
- **Mobile Responsive**: Cards use HorizontalCarousel component for smooth mobile scrolling
- **Routing**: All service cards link to `/vendor/:id` profile pages
- **Files Modified**: 
  - `server/storage.ts` - Added `getServiceVendors()` method
  - `server/routes.ts` - Added `/api/service-vendors` endpoint
  - `client/src/components/ServiceVendorCard.tsx` - New component created
  - `client/src/pages/Home.tsx` - Updated to use service vendors instead of service offerings

## System Architecture

### UI/UX
The frontend is built with React 18, TypeScript, and Vite. UI components leverage Radix UI for accessibility and shadcn/ui (new-york preset), styled using Tailwind CSS. The design incorporates a forest green primary color, brand-specific colors (Wheat, Clay, Ink, Paper), and distinct fonts (Playfair Display, Work Sans, JetBrains Mono). The homepage hero section emphasizes the mission: "Rise Local is your one-stop-shop for all things local in SWFL. This app is here to connect you to events, restaurants, goods, and services, which makes supporting local the easiest choice."

### Technical Implementations
- **Frontend State Management**: TanStack Query manages server state, React hooks handle local UI state, and React Context with localStorage persists the shopping cart. Wouter is used for client-side routing.
- **Backend**: Express.js with TypeScript provides a RESTful API.
- **Data Storage**: PostgreSQL, accessed via Neon's serverless driver, uses Drizzle ORM for type-safe queries and schema management.
- **Authentication**: Replit Auth via OIDC manages authentication, with sessions stored in PostgreSQL. Role-based access includes `buyer`, `vendor`, and `admin`. **Public Browsing Model**: The marketplace is fully browsable without authentication. Users can view all products, services, vendors, and events without creating an account. A non-intrusive signup banner (SignupBanner component) encourages account creation. Authentication is only required for account-specific actions like checkout, viewing orders, sending messages, and vendor operations. The `/join` page provides dual signup options (buyer/vendor).
- **Unified Vendor Architecture**: All vendor types (shop, dine, service) use a single `vendors` table with polymorphic capabilities via a `vendorType` field and a `capabilities` JSON field that determines enabled features (products, services, menu). Products, menu items, and service offerings link to this unified `vendors` table via `vendorId`.
- **Simplified Authentication & Onboarding**: A streamlined signup process routes users based on `intended_role` query parameter. A single universal onboarding flow at `/onboarding` guides all vendor types through business profile creation, including self-selection of `vendorType` and auto-setting of initial capabilities. An auto-save system with debounced triggers creates draft profiles.
- **Unified Vendor Dashboard**: A single capability-aware dashboard (`/dashboard`) serves all vendor types. Tabs are dynamically shown/hidden based on vendor capabilities, which can be toggled via settings.
- **Category System Removal**: The platform has completely removed categories from the database schema and all user interfaces to simplify the browsing experience.
- **Customer-Facing Vendor Pages**: Customer-facing vendor profile pages (`/vendor/:id`) use the unified `/api/vendors/:id` endpoint and implement capability-based rendering, ensuring only enabled features are displayed.
- **Shopping Cart**: A React Context-based system with localStorage persistence, supporting product variants and tax calculation (7% FL sales tax).
- **Direct Messaging**: Supports real-time user-to-vendor messaging with read status.
- **Stripe Connect Integration**: Integrates Stripe Connect for vendor payouts, with the platform collecting payments (product price + 7% FL sales tax) and automatically transferring the full amount to the vendor. The platform's revenue is from an $89/month vendor membership fee, with no transaction fees.
- **Customer Profile Management**: Users can manage their profile (`/profile`) with editable fields for first name, last name, and phone number, enforced by secure API endpoint whitelisting.
- **Contact Information Storage**: Vendor contact information is stored in individual database columns for improved type safety and data integrity.

### Feature Specifications
- **Pricing Model**: $89/month membership for vendors; buyers pay product price + 7% FL sales tax, with no additional buyer or transaction fees.
- **Geographic Focus**: Exclusively serves local Fort Myers vendors.
- **Fulfillment**: Supports pickup, local delivery, and shipping options configurable by vendors.
- **Fort Myers Spotlight**: A dedicated feature for highlighting local content or businesses.
- **Application Routes**: 
  - **Public Routes** (no authentication required): `/` (homepage), `/join`, `/products`, `/vendors`, `/vendor/:id`, `/services`, `/eat-local`, `/live-local`, `/events`, `/events/:id`, `/spotlight`, `/cart`
  - **Protected Routes** (authentication required): `/checkout`, `/orders`, `/order-confirmation`, `/profile`, `/messages`, `/dashboard`, `/onboarding`, `/events/my`, `/admin`
  - **Signup Encouragement**: A dismissible SignupBanner component (bottom banner) displays on public pages for unauthenticated users, with localStorage-based dismissal persistence and SSR-safe browser guards
  - **Authentication Flow**: Clicking "Sign Up Free" on the banner or attempting protected actions redirects to `/join` with dual signup options (buyer/vendor). Legacy authentication routes redirect to `/join`.

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

## Authentication & Onboarding System Status

### Development Environment - Verified Working ✓
As of November 24, 2024, the authentication and onboarding system has been fully verified in the development environment:

**Sign-In Flow (Buyer)**
- ✓ Users can access `/join` page with buyer and vendor signup options
- ✓ Clicking "Sign up to Shop" button initiates Replit Auth flow with `intended_role=buyer`
- ✓ After authentication, buyers are created in the database with `role='buyer'`
- ✓ Buyers are redirected to the homepage (`/`)
- ✓ Database confirmed: Multiple buyer users successfully created

**Sign-In Flow (Vendor)**
- ✓ Clicking "Start Selling" button initiates Replit Auth flow with `intended_role=vendor`
- ✓ After authentication, vendors are created in the database with `role='vendor'`
- ✓ New vendors (without existing profile) are redirected to `/onboarding`
- ✓ Returning vendors (with existing profile) proceed to dashboard
- ✓ Database confirmed: Multiple vendor users successfully created

**Vendor Onboarding (3-Step Process)**
- ✓ **Step 1 - Business Basics**: Vendor type selection (shop/dine/service), business name, contact info, location, bio
- ✓ **Step 2 - Business Details**: Type-specific fields (e.g., shop: local sourcing %, dine: price range/dietary options, service: areas/certifications)
- ✓ **Step 3 - Payment & Fulfillment**: Payment methods and fulfillment options
- ✓ Navigation: Forward/backward buttons between all 3 steps working correctly
- ✓ Auto-save: Draft profiles saved to database automatically
- ✓ Database confirmed: Vendor profiles with both "draft" and "complete" statuses

**Database Tables Verified**
- ✓ `sessions` - PostgreSQL session storage for authentication
- ✓ `users` - User accounts with role-based access (buyer/vendor/admin)
- ✓ `vendors` - Unified vendor profiles supporting all vendor types

### Production Database Setup Requirements

When deploying to production, ensure the following:

1. **Database Migration**: Run all Drizzle migrations against the production database to create the required schema (23 tables including users, sessions, vendors, products, orders, etc.)

2. **Environment Variables**: Configure production environment with:
   - `DATABASE_URL` - Production PostgreSQL connection string
   - `SESSION_SECRET` - Secure random string for session encryption
   - `REPL_ID` - Production Replit project ID
   - `REPLIT_DOMAINS` - Production domain(s) for OIDC callbacks
   - Stripe keys, object storage credentials, etc.

3. **Session Table**: Verify the `sessions` table exists and is accessible for Replit Auth session storage

4. **Post-Deployment Smoke Test**: Test the complete user journey:
   - Buyer signup → authentication → homepage access
   - Vendor signup → authentication → onboarding (3 steps) → profile completion → dashboard access
   - Verify user and vendor records are created in production database

5. **Monitoring**: Track onboarding completion rates and session health in production for ongoing maintenance