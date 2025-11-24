# Rise Local - Fort Myers Marketplace & Community

## Overview
Rise Local is a full-stack web application designed to connect local vendors, artisans, and farmers with buyers in Fort Myers, Florida. Its primary purpose is to foster local commerce, sustainability, and community engagement by providing a marketplace for products and event management with RSVP and attendance tracking. The platform aims to facilitate local transactions, offer a robust platform for vendors, and enrich community interaction, all while maintaining a counterculture yet polished brand aesthetic.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX
The frontend is built with React 18, TypeScript, and Vite. UI components leverage Radix UI for accessibility and shadcn/ui (new-york preset), styled using Tailwind CSS. The design incorporates a forest green primary color, brand-specific colors (Wheat, Clay, Ink, Paper), and distinct fonts (Playfair Display, Work Sans, JetBrains Mono). The homepage hero section emphasizes the mission: "Rise Local is your one-stop-shop for all things local in SWFL. This app is here to connect you to events, restaurants, goods, and services, which makes supporting local the easiest choice."

### Technical Implementations
- **Frontend State Management**: TanStack Query manages server state, React hooks handle local UI state, and React Context with localStorage persists the shopping cart. Wouter is used for client-side routing.
- **Backend**: Express.js with TypeScript provides a RESTful API.
- **Data Storage**: PostgreSQL, accessed via Neon's serverless driver, uses Drizzle ORM for type-safe queries and schema management.
- **Authentication**: Replit Auth via OIDC manages authentication, with sessions stored in PostgreSQL. Role-based access includes `buyer`, `vendor`, and `admin`. **All marketplace pages require authentication** - users must create an account (buyer or vendor) to browse products, services, vendors, and events. The `/join` page is the only public page and serves as the landing page for new users.
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
- **Application Routes**: All marketplace routes now require authentication. Public landing page at `/join` with dual signup options (buyer/vendor). Protected marketplace routes include homepage, products, services, vendors, vendor profiles, events, cart. Protected buyer routes include checkout, order confirmation, orders, profile, messages. Protected vendor routes include onboarding and dashboard. Legacy authentication routes redirect to `/join`.

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