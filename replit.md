# Rise Local - Fort Myers Marketplace & Community

## Overview
Rise Local is a full-stack web application connecting local vendors, artisans, and farmers with buyers in Fort Myers, Florida. It features a marketplace for products and a community hub for events, promoting sustainability, local commerce, and community engagement. The platform aims to support local businesses with a counterculture yet polished brand aesthetic, running entirely on Replit.

## Recent Changes

### October 2025 - Event RSVP Functionality (Complete)

**Implemented Features:**
- Full RSVP system for events with toggle functionality
- Users can RSVP to events and un-RSVP with single click
- Different button states showing RSVP status
- Prevents duplicate RSVPs per user per event
- RSVP count updates in real-time
- Persistence across page refreshes

**Database Changes:**
- Created `eventRsvps` table to track user-event relationships
- Unique constraint on (userId, eventId) prevents duplicates
- Foreign keys to users and events tables
- createdAt timestamp for RSVP records

**Backend Implementation:**
- POST /api/events/:id/rsvp - Toggle RSVP (create if not exists, delete if exists)
- GET /api/events/rsvps/me - Fetch current user's RSVPs
- Both endpoints require authentication
- Atomic counter updates (increment on RSVP, decrement on un-RSVP)
- Storage methods: createEventRsvp, deleteEventRsvp, getUserEventRsvp, getUserRsvps

**Frontend Implementation:**
- EventCard component fetches user's RSVPs on mount (if authenticated)
- Checks if current event is RSVPed
- Button states:
  - Unauthenticated: "RSVP" (redirects to login)
  - Not RSVPed: "RSVP" button with clay background
  - RSVPed: "Going" button with check icon and wheat background
- Optimistic updates for instant UI feedback
- Cache invalidation to refresh data after mutations
- Disabled when no tickets, event passed, or mutation pending

**Testing:**
- End-to-end tests pass successfully
- RSVP toggle verified working
- Persistence confirmed across page refreshes
- Multiple events can be RSVPed simultaneously

### October 2025 - Products Page Sorting (Complete)

**Implemented Features:**
- Full sorting functionality on Products page with 4 options:
  - **Newest First** - Default database order (no sorting applied)
  - **Price: Low to High** - Sorts products by price ascending
  - **Price: High to Low** - Sorts products by price descending
  - **Most Popular** - Sorts by inventory level (lower stock = more sold = more popular)

**Technical Implementation:**
- Added sortOrder state to Products component
- Connected FilterBar onSortChange handler to update sort state
- Sorting applied after filtering but before rendering
- Price strings parsed to numbers for accurate comparison
- Array.sort() with switch statement for different sort types
- Sorting creates new array (no cache mutation)

**Type Corrections:**
- Fixed ProductWithVendor usage (price is string, inventory instead of stock)
- Correctly parse price strings when passing to ProductCard
- Use inventory field instead of stock for product data

**Testing:**
- All 4 sorting options verified working correctly
- Products reorder immediately on sort selection
- Sorting persists across category/value filters
- No performance issues with current dataset size

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Frameworks**: React 18, TypeScript, Vite.
- **UI/UX**: Radix UI for accessible primitives, shadcn/ui for components ("new-york" preset), Tailwind CSS for styling.
- **Design Tokens**: Forest green primary color, specific brand colors (Wheat, Clay, Ink, Paper), Playfair Display/Work Sans/JetBrains Mono fonts, 14px border radius, custom shadow system.
- **State Management**: TanStack Query for server state, React hooks for local UI state, React Context with localStorage for shopping cart.
- **Routing**: Wouter.

### Backend
- **Framework**: Express.js with TypeScript.
- **API Design**: RESTful with `/api` prefix, JSON format, error handling middleware.
- **Development**: Vite middleware for HMR, custom Vite plugins for Replit.

### Data Storage
- **Database**: PostgreSQL via Neon serverless driver.
- **ORM**: Drizzle ORM for type-safe queries and schema management, drizzle-kit for migrations.
- **Schema**: Users, Vendors, Products, Events, EventRsvps, Orders, VendorReviews, VendorFAQs, Spotlight. Utilizes `gen_random_uuid()` for primary keys, JSONB for flexible data, and array columns for multi-value fields. Zod schemas generated from Drizzle tables for validation.

### Authentication and Authorization
- **Authentication**: Replit Auth via OpenID Connect (OIDC).
- **Session Management**: PostgreSQL-backed sessions (planned via `connect-pg-simple`).
- **Roles**: Buyer, Vendor, Restaurant with role-based redirects and profile auto-generation on first login.
- **API Endpoints**: `/api/login`, `/api/callback`, `/api/logout`, `/api/auth/user`, `/api/auth/my-vendor`, `/api/auth/my-restaurant`.
- **Route Protection**: `isAuthenticated` middleware.

### Key Business Logic
- **Pricing Model**: $150/month vendor membership, 3% buyer fee, no per-transaction vendor fees.
- **Payment Methods**: Vendors specify accepted payment methods (platform does not process payments).
- **Platform Focus**: Exclusively local Fort Myers vendors and products, emphasizing community connections.
- **Loyalty System**: Users earn 10 points per completed order.
- **Fulfillment**: Pickup and delivery options.
- **Fort Myers Spotlight**: Featured content system.
- **Shopping Cart**: React Context-based with localStorage persistence, supports variants, auto-calculates totals (subtotal, 7% FL sales tax, 3% buyer fee), mini-cart and full cart pages.

### Application Routes
- **Public**: `/`, `/products`, `/vendors`, `/vendor/:id`, `/events`, `/spotlight`, `/login`, `/signup`.
- **User**: `/cart`, `/checkout`.
- **Vendor**: `/dashboard`.
- **Admin**: `/admin` (planned).

## External Dependencies

### UI Component Libraries
- `@radix-ui/*` (17+ packages)
- `cmdk`
- `embla-carousel-react`
- `lucide-react`

### Form Management
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
- Google Fonts CDN (Playfair Display, Work Sans, JetBrains Mono)

### Image Assets
- Generated images from `attached_assets/generated_images/`