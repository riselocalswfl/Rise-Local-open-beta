# Rise Local - Fort Myers Marketplace & Community

## Overview
Rise Local is a full-stack web application connecting local vendors, artisans, and farmers with buyers in Fort Myers, Florida. It aims to foster local commerce, sustainability, and community engagement. The platform offers a marketplace for products and event management with RSVP and attendance tracking. Key ambitions include facilitating local transactions, providing a robust platform for vendors, and enriching community interaction with a counterculture yet polished brand aesthetic.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX
The frontend uses React 18, TypeScript, and Vite. UI components are built with Radix UI for accessibility and shadcn/ui (new-york preset), styled using Tailwind CSS. The design features a forest green primary color, brand-specific colors (Wheat, Clay, Ink, Paper), and distinct fonts (Playfair Display, Work Sans, JetBrains Mono).

**Homepage Messaging**: The hero section emphasizes the platform's mission: "Rise Local is your one-stop-shop for all things local in SWFL. This app is here to connect you to events, restaurants, goods, and services, which makes supporting local the easiest choice." Section headings use "Shop Goods" for products and "Browse Vendors" for the vendor directory.

### Technical Implementations
- **Frontend State Management**: TanStack Query manages server state, React hooks handle local UI state, and React Context with localStorage persists the shopping cart. Wouter is used for client-side routing.
- **Backend**: Express.js with TypeScript provides a RESTful API with a `/api` prefix and JSON processing.
- **Data Storage**: PostgreSQL, accessed via Neon's serverless driver, uses Drizzle ORM for type-safe queries and schema management (`drizzle-kit` for migrations).
- **Authentication**: Replit Auth via OpenID Connect (OIDC) manages authentication, with sessions stored in PostgreSQL. Role-based access includes: `buyer`, `vendor` (unified role for all business types), and `admin`. Legacy roles `restaurant` and `service_provider` have been consolidated into `vendor`.
- **Unified Vendor Architecture** (November 2025): All vendor types (shop, dine, service) now use a single `vendors` table with polymorphic capabilities. The `vendorType` field ("shop" | "dine" | "service") indicates the vendor's self-selected category, while the `capabilities` JSON field (`{products: boolean, services: boolean, menu: boolean}`) determines which features are enabled. Type-specific data is stored in `restaurantDetails` and `serviceDetails` JSON fields. Products, menu items, and service offerings remain in separate tables (`products`, `menuItems`, `serviceOfferings`) but all reference the unified `vendors` table via `vendorId`. Legacy tables (`restaurants`, `serviceProviders`) are preserved as backup but no longer actively used. Migration tracking fields (`legacySourceTable`, `legacySourceId`) enable data lineage.
- **Vendor Profiles**: Vendors can now create products, services, AND menu items regardless of their vendorType, controlled by their capability flags. Profile management is unified under a single dashboard with sections shown/hidden based on enabled capabilities.
- **Vendor Onboarding** (November 2025): Three tailored 4-step onboarding flows (`/onboarding/shop`, `/onboarding/dine`, `/onboarding/services`) automatically set initial capabilities based on business type: Shop sets `{products: true, services: false, menu: false}`, Dine sets `{products: false, services: false, menu: true}`, Services sets `{products: false, services: true, menu: false}`. The generic `/onboarding` route redirects to `/join` to ensure proper vendor type selection. Auth callbacks redirect to type-specific onboarding pages. All submissions include `credentials: "include"` for session cookie handling. Onboarding flows use legacy draft endpoints (`/api/restaurants/draft`, `/api/service-providers/draft`) for backward compatibility; backend transparently creates unified vendors with proper capabilities.
- **Auto-Save System**: All vendor onboarding flows (Shop, Dine, Services) implement auto-save with 2-second debounced triggers. Draft profiles are created automatically on the first field change. Data persists to the database immediately and is retrieved on page reload. A "Saving..." / "Saved" indicator provides user feedback. **CRITICAL ROUTING FIX**: Draft endpoints (`/api/vendors/draft`, `/api/restaurants/draft`, `/api/service-providers/draft`) must be defined BEFORE parameterized routes (`/api/vendors/:id`, etc.) in `server/routes.ts` to prevent Express from treating "draft" as an :id parameter. Route order: (1) GET/POST `/draft`, (2) PATCH `/:id`, (3) POST `/:id/complete`, (4) GET `/:id`.
- **Unified Vendor Dashboard** (November 2025): Single capability-aware dashboard (`/dashboard`) serves all vendor types (shop, dine, service). Dashboard tabs dynamically show/hide based on vendor capabilities: Products tab (capabilities.products), Services tab (capabilities.services), Menu tab (capabilities.menu). Profile, Orders, Events, FAQs, and Settings tabs always visible. Vendors can toggle capabilities via Settings > Business Features to enable/disable product sales, service offerings, and menu management. Tab visibility and content access are strictly controlled by capability flags, preventing unauthorized feature access. Profile section organized into cards for Business Info, Location & Contact, Business Hours, Business Values, Payment Methods, Fulfillment Methods, Profile Photo/Logo, and Cover Banner.
- **Category System Removed**: Categories have been completely removed from the platform. Vendors, products, restaurants, and service providers no longer have category fields in the database schema. Vendor onboarding flows and dashboard management interfaces do not include category selectors. This simplification aligns with the platform's streamlined browsing experience.
- **Simplified Navigation**: The customer-facing pages (/products, /services, /eat-local, /events) use a simplified navigation approach with no category filters. All items within each tab are displayed in a clean grid layout, allowing customers to browse all available products, services, restaurants, and events without additional filtering complexity.
- **Shopping Cart**: A React Context-based system with localStorage persistence, handling product variants, and calculating totals (subtotal + 7% FL sales tax).
- **Direct Messaging**: Users and vendors can send direct messages with real-time updates and read status tracking.
- **Stripe Connect Integration**: The platform supports Stripe Connect for vendor payouts. Payments (subtotal + 7% FL sales tax) are collected by the platform, and the full amount is automatically transferred to the vendor's connected account via webhooks. The platform's revenue comes solely from an $89/month vendor membership fee, with no transaction fees. A "Coming Soon" pre-launch mode is implemented for Stripe.
- **Checkout Flow**: The checkout process handles Stripe payment intent creation and order mutation, storing order details in `sessionStorage` for confirmation. The system enforces no buyer fees, only product price plus 7% FL sales tax.
- **Customer Profile Management**: Users can view and edit their profile information at `/profile`. The page displays read-only email (managed by Replit Auth) and editable fields for first name, last name, and phone number. The secure PATCH `/api/users/me` endpoint implements field whitelisting (firstName, lastName, phone only) to prevent privilege escalation and protect sensitive fields like role, username, and authentication data.
- **Contact Information Storage**: Vendor contact information (email, phone, website, social media) is stored in individual database columns (`contactEmail`, `phone`, `website`, `instagram`, `facebook`) across all vendor types (vendors, restaurants, serviceProviders). The legacy `contact` JSONB field is deprecated. All onboarding flows and dashboard management use individual columns for better type safety, query performance, and data integrity.

### Feature Specifications
- **Pricing Model**: $89/month membership for vendors; buyers pay product price + 7% FL sales tax. No buyer fees or transaction fees.
- **Geographic Focus**: Exclusively serves local Fort Myers vendors.
- **Fulfillment**: Supports pickup, local delivery, and shipping, configurable by vendors.
- **Fort Myers Spotlight**: A dedicated feature for highlighting local content or businesses.
- **Application Routes**: Includes public routes (`/`, `/products`, `/vendors`, `/events`), user-specific routes (`/cart`, `/checkout`, `/messages`), and vendor-specific routes (`/dashboard`).

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