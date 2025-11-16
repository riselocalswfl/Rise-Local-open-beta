# Rise Local - Fort Myers Marketplace & Community

## Overview
Rise Local is a full-stack web application designed to connect local vendors, artisans, and farmers with buyers in Fort Myers, Florida. It aims to foster sustainability, local commerce, and community engagement by providing a marketplace for products and a community hub for events. The platform supports local businesses with a counterculture yet polished brand aesthetic and includes features like product filtering, event management with RSVP and attendance tracking, and a loyalty system. Key ambitions include facilitating local transactions, offering a robust platform for vendors, and enriching community interaction.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Frameworks**: React 18, TypeScript, Vite.
- **UI/UX**: Radix UI for accessibility primitives, shadcn/ui for components (utilizing the "new-york" preset), and Tailwind CSS for styling. The design incorporates a forest green primary color, brand-specific colors (Wheat, Clay, Ink, Paper), and distinct font families (Playfair Display, Work Sans, JetBrains Mono).
- **State Management**: TanStack Query manages server state, React hooks handle local UI state, and React Context with localStorage persists the shopping cart.
- **Routing**: Wouter is used for client-side routing.
- **TanStack Query Pattern**: The default fetcher expects queryKey to be a complete URL string (not an array of segments). Always use template literals for dynamic URLs:
  - ✅ Correct: `queryKey: [\`/api/vendors/${vendorId}\`]`
  - ✅ Correct: `queryKey: [\`/api/products?vendorId=${vendorId}\`]`
  - ❌ Wrong: `queryKey: ["/api/vendors", vendorId]` (produces `/api/vendors` instead of `/api/vendors/${vendorId}`)
  - ❌ Wrong: `queryKey: ["/api/products", { vendorId }]` (produces `/api/products/[object Object]`)

### Backend
- **Framework**: Express.js with TypeScript.
- **API Design**: Adheres to RESTful principles, uses `/api` prefix, processes JSON data, and includes error handling middleware.

### Data Storage
- **Database**: PostgreSQL, accessed via Neon's serverless driver.
- **ORM**: Drizzle ORM provides type-safe queries and schema management, with `drizzle-kit` for migrations.
- **Schema**: Key entities include Users, Vendors, Products, Events, EventRsvps, Orders, VendorReviews, VendorFAQs, Spotlight, Messages, MenuItems, and Services. UUIDs are used for primary keys, JSONB for flexible data storage, and array columns for multi-value fields (e.g., categories, payment preferences). Zod schemas are generated from Drizzle tables for data validation.
- **Unified Vendor Architecture**: All vendor types (shops, restaurants, service providers) use the `vendors` table as the canonical source. The `menuItems` table (for restaurants) and `services` table (for service providers) link to vendors via `vendorId`. The `menuItems` table supports both legacy `restaurantId` and new `vendorId` for backward compatibility.

### Authentication and Authorization
- **Authentication**: Implemented using Replit Auth via OpenID Connect (OIDC).
- **Session Management**: Sessions are managed and stored in PostgreSQL.
- **Roles**: Supports 'buyer', 'vendor', 'restaurant', and 'service_provider' roles, with role-based redirects and automatic profile generation upon first login.
- **Route Protection**: The `isAuthenticated` middleware protects sensitive routes.

### Vendor Profile Architecture (November 2025)
- **Unified Profile System**: All vendor types use the same `VendorProfile` component with conditional rendering based on the vendor owner's role.
- **Modular Components**:
  - `MasterProfile`: Contains shared sections for all vendor types (hero, header, about, reviews, FAQs, gallery, contact, hours, location, certifications)
  - `ShopProfileSection`: Displays products and events for shop vendors (role="vendor")
  - `DineProfileSection`: Displays menu items for restaurant vendors (role="restaurant")
  - `ServiceProfileSection`: Displays services for service providers (role="service_provider")
- **Role Determination**: Vendor type is determined by fetching the vendor owner's user data via `/api/users/:ownerId` and checking their `role` field
- **API Routes**: `/api/vendors/:id/menu` (restaurants), `/api/vendors/:id/services` (service providers), `/api/products?vendorId=X` (shops), `/api/users/:id` (user data for role determination)

### Vendor Dashboard Organization (November 2025)
- **Card Structure**: Dashboard organized into dedicated cards for clear separation of concerns:
  - **Business Info**: Business name (required), owner/contact name (required with validation), hierarchical categories, tagline, and bio
  - **Location & Contact**: City, zip code, contact email, phone number (stored in vendor.contact JSONB), website, Instagram, Facebook
  - **Business Hours**: 7-day week editor with controlled inputs using local state to prevent data loss when editing multiple days
  - **Business Values**: Local sourcing slider and value tags (e.g., organic, sustainable, fair-trade)
  - **Payment Methods** (separate card): Standard payment checkboxes (Direct, Venmo, Zelle, CashApp, PayPal, Cash) and custom payment methods input
  - **Fulfillment Methods**: Pickup, delivery, shipping options with custom methods support
  - **Profile Photo/Logo & Cover Banner**: Square logo upload and landscape banner/cover photo upload sections
- **Required Fields**: Business name and owner/contact name are marked as required; contact name has client-side validation preventing empty submissions
- **Custom Fulfillment**: Vendors can add custom fulfillment options (e.g., "Farmers Market Booth", "Curbside Pickup")
- **Complete Vendor Onboarding Checklist**: All required fields are collected: business name, vendor category, owner/contact name, email, phone, address/area, bio, logo, cover banner, payment methods, and business hours

### Product Category Filtering (November 2025)
- **Dynamic Category Selection**: Products can only be categorized using categories the vendor has selected on their profile
- **Filter Logic**:
  - If vendor selected parent category → product form shows all its children
  - If vendor selected specific children → product form shows only those children
  - Category group only shown if vendor selected at least one child from it
- **Implementation**: `filterVendorCategories()` helper function filters SHOP_CATEGORIES based on `vendor.categories` array
- **State Management**: HierarchicalCategorySelector integrated with React Hook Form using FormField for proper state synchronization
- **Database**: Products table has `categories` array field storing selected category strings
- **Note**: Products support multi-category selection; categories stored as text array in PostgreSQL

### Key Business Logic
- **Pricing Model**: Vendors pay an $89/month membership fee for platform access. Buyers pay product price plus 7% FL sales tax only (no buyer fees). Platform revenue comes exclusively from vendor membership fees, not transaction fees.
- **Platform Focus**: Exclusively serves local Fort Myers vendors and products.
- **Loyalty System**: Users earn 10 points for each completed order.
- **Fulfillment**: Supports various fulfillment methods including pickup, local delivery, and shipping, configurable by vendors.
- **Fort Myers Spotlight**: A feature for highlighting specific content or businesses.
- **Shopping Cart**: A React Context-based system with localStorage persistence, handling product variants, and automatically calculating totals (subtotal + 7% FL sales tax).
- **Direct Messaging**: Users can send direct messages to vendors and vice versa. Real-time updates via polling (5s for threads, 10s for unread counts), with read status tracking. Messages page includes vendor search to start new conversations - searches across business name, bio, tagline, categories, and values.

### Stripe Connect Payment Flow (November 2025)
- **Pre-Launch "Coming Soon" Mode**: Platform optimized for vendors without Stripe Connect (until business bank accounts available)
  - All Stripe-related UI shows "Coming Next Week" badges and positive messaging
  - Emphasizes working payment methods: Venmo, CashApp, Zelle, PayPal, Direct, Cash
  - No pressure or urgency around connecting Stripe
- **Vendor Onboarding**: Step 4 titled "Payment Options" focuses on available methods with Stripe as upcoming feature
  - Shows "Stripe Connect Credit Cards" section with "Coming Next Week" badge
  - Lists current payment methods as "Available Now"
  - Single CTA: "Complete Setup & Go to Dashboard"
  - Dashboard banner: "Stripe Connect Launching Next Week" with "Learn More" button
- **Payment Method Display**: "Credit Card (Through App)" appears as first payment method option in both dashboard and onboarding, with clear Stripe requirement messaging
- **Account Status Tracking**: Database stores `stripeConnectAccountId` and `stripeOnboardingComplete` fields for vendors, restaurants, and service providers
- **Payment Collection**: Buyers pay the full amount (subtotal + 7% FL sales tax) to the platform's Stripe account. No per-transaction buyer fees are charged.
- **Payment Intent Metadata**: Each vendor order includes detailed breakdown: `subtotalCents`, `taxCents`, and `totalCents`
- **Automatic Transfers**: When payment succeeds (via `payment_intent.succeeded` webhook), the platform:
  1. Extracts vendor breakdown from payment intent metadata
  2. Transfers full amount (subtotal + tax) to vendor's connected account
  3. Platform revenue comes from $89/month vendor membership fees, not transaction fees
- **Multi-Vendor Support**: Single checkout supports multiple vendors; each vendor receives their full portion automatically via separate transfers
- **Transfer Formula**: `vendorReceives = subtotal + tax` (full amount transferred to vendor)
- **API Endpoints**:
  - `POST /api/stripe/create-account`: Creates Stripe Connect Express account for vendor
  - `POST /api/stripe/create-onboarding-link`: Generates onboarding URL for bank account setup
  - `GET /api/stripe/account-status`: Checks vendor's Stripe Connect account status
  - `POST /api/stripe/webhook`: Handles account updates and payment processing (account.updated, payment_intent.succeeded)
  - `POST /api/stripe/create-payment-intent`: Creates payment intent with complete vendor breakdown in metadata
- **Dashboard Integration**: StripeConnectCard component in Settings tab shows connection status with appropriate CTAs (connect, complete setup, or connected)
- **UX Enhancements**: Alert banner at top of dashboard when not connected, sessionStorage-based tab navigation from onboarding

### Checkout Flow & API Response Handling (November 2025)
- **Critical Pattern**: All `apiRequest()` calls return raw Response objects that MUST be parsed with `.json()` before accessing data
- **Checkout.tsx Fixes Applied**:
  1. Payment intent creation (line 75-76): Parse response before accessing `clientSecret`
  2. Order mutation (line 200-201): Return parsed JSON to `onSuccess` callback
  3. Stripe payment storage (line 315-318): Parse order response before storing in sessionStorage
- **Order Confirmation Flow**:
  - OrderConfirmation reads from `sessionStorage.getItem("lastOrder")`
  - Expected format: `{masterOrder: {...}, vendorOrders: [...], pointsEarned: number}`
  - masterOrder includes: id, buyerId, buyerName, buyerEmail, totalCents, status
  - Displays Order ID as first 8 characters uppercase: `Order #{masterOrder.id.substring(0, 8).toUpperCase()}`
- **Pre-Launch Checkout Messaging**: Banner at top of checkout page explains credit card payments launching next week, directs buyers to contact vendors for immediate purchases via Venmo/CashApp/etc.
- **Fee Structure Enforcement**: Cart and Checkout display NO buyer fees - only product price + 7% FL sales tax
- **End-to-End Verified**: Complete flow from products → cart → checkout → Stripe payment → order confirmation tested and working

### Application Routes
- **Public**: Includes `/`, `/products`, `/vendors`, `/vendor/:id`, `/events`, `/spotlight`, `/login`, `/signup`.
- **User**: Specific routes for `/cart`, `/checkout`, `/events/my`, `/messages`, `/messages/:userId`.
- **Vendor**: Dedicated `/dashboard` route.

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