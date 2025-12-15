# Rise Local - Fort Myers Marketplace & Community

## Overview
Rise Local is a full-stack web application connecting local vendors, artisans, and farmers with buyers in Fort Myers, Florida. Its core purpose is to stimulate local commerce, promote sustainability, and enhance community engagement. The platform offers a marketplace for local products, services, and event management with RSVP and attendance tracking capabilities. It aims to provide a robust platform for vendors and enrich community interaction while maintaining a counterculture yet polished brand aesthetic. The business vision is to be the one-stop-shop for all things local in SWFL, making supporting local businesses easy.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX
The frontend is built with React 18, TypeScript, and Vite, utilizing Radix UI and shadcn/ui (new-york preset) for components, styled with Tailwind CSS. The design features a forest green primary color, brand-specific colors (Wheat, Clay, Ink, Paper), and distinct fonts (Playfair Display, Work Sans, JetBrains Mono). The homepage hero section emphasizes the mission: "Rise Local is your one-stop-shop for all things local in SWFL. This app is here to connect you to events, restaurants, goods, and services, which makes supporting local the easiest choice."

### Technical Implementations
- **Frontend State Management**: TanStack Query manages server state, React hooks handle local UI state, and React Context with localStorage persists the shopping cart. Wouter is used for client-side routing.
- **Backend**: Express.js with TypeScript provides a RESTful API.
- **Data Storage**: PostgreSQL, accessed via Neon's serverless driver, uses Drizzle ORM for type-safe queries and schema management.
- **Authentication**: Replit Auth via OIDC with sessions stored in PostgreSQL. Role-based access includes `buyer`, `vendor`, and `admin`. The marketplace is fully browsable without authentication; a non-intrusive `SignupBanner` encourages account creation for account-specific actions.
- **Unified Vendor Architecture**: All vendor types (shop, dine, service) use a single `vendors` table with a `vendorType` field and a `capabilities` JSON field, enabling polymorphic behavior. Products, menu items, and service offerings link to this unified `vendors` table.
- **Simplified Authentication & Onboarding**: Streamlined signup routes users based on `intended_role` query parameter to a universal `/onboarding` flow, guiding all vendor types through business profile creation with self-selection of `vendorType` and auto-setting of initial capabilities. An auto-save system creates draft profiles.
- **3-Step User Onboarding Flow**: New users follow a minimal 3-screen onboarding: (1) `/auth` - minimal auth page with no footer, (2) `/welcome` - welcome message with Continue button (has footer), (3) `/deals` - main app home (has footer). Onboarding completion is tracked via `onboardingComplete` field in users table. Returning users skip `/welcome` and go directly to `/deals`.
- **Unified Vendor Dashboard**: A single capability-aware `/dashboard` serves all vendor types, dynamically showing/hiding tabs based on vendor capabilities.
- **Category System Removal**: Categories have been removed from the database schema and all user interfaces to simplify browsing.
- **Customer-Facing Vendor Pages**: Profiles (`/vendor/:id`) use a unified endpoint and implement capability-based rendering.
- **Shopping Cart**: React Context-based system with localStorage persistence, supporting product variants and 7% FL sales tax calculation.
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

### Feature Specifications
- **Pricing Model**: $89/month membership for vendors; buyers pay product price + 7% FL sales tax, no additional buyer or transaction fees.
- **Geographic Focus**: Exclusively serves local Fort Myers vendors.
- **Fulfillment**: Supports pickup, local delivery, and shipping options configurable by vendors.
- **Fort Myers Spotlight**: Dedicated feature for highlighting local content or businesses.
- **Application Routes**:
  - **Public Routes**: `/`, `/auth`, `/products`, `/vendors`, `/vendor/:id`, `/services`, `/eat-local`, `/live-local`, `/events`, `/events/:id`, `/spotlight`, `/cart`.
  - **Protected Routes**: `/checkout`, `/orders`, `/order-confirmation`, `/profile`, `/messages`, `/dashboard`, `/onboarding`, `/events/my`, `/admin`, `/welcome`.
  - **Auth Route Consolidation**: Single unified auth page at `/auth` handles both login and signup. Legacy routes (`/join`, `/login`, `/signup`, `/sign-in`, `/sign-up`, `/register`) redirect to `/auth`.
  - **Signup Encouragement**: Dismissible `SignupBanner` on public pages for unauthenticated users, with localStorage-based dismissal persistence and SSR-safe browser guards. Authentication flow for "Sign Up Free" and protected actions redirects to `/auth`.

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