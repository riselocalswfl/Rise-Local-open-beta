# Rise Local - Fort Myers Marketplace & Community

## Overview
Rise Local is a full-stack web application designed to connect local vendors, artisans, and farmers with buyers in Fort Myers, Florida. It features a marketplace for products and a community hub for events, aiming to foster sustainability, local commerce, and community engagement. The platform supports local businesses with a counterculture yet polished brand aesthetic, running entirely on Replit, and includes features like product filtering, event management with RSVP and attendance tracking, and a loyalty system.

## Recent Changes
- **November 15, 2025**: Updated navigation terminology for cleaner branding:
  - **Shop Local** → **Shop**: Updated Header, NavMenu, HomeHero, Products page
  - **Eat Local** → **Dine**: Updated Header, NavMenu, EatLocal page, RestaurantSignup, VendorSignup
  - **Live Local** → **Services**: Updated Header, NavMenu, LiveLocal page
  - All navigation links, page titles, and hero sections now use the new concise terminology
  - Maintains all existing functionality while providing a cleaner, more professional navigation experience

- **November 14, 2025**: Integrated Live Local service provider system:
  - **Schema**: Updated user role support to include 'restaurant' and 'service_provider' roles
  - **Service Provider Signup**: Created ServiceProviderSignup.tsx with 3-step signup flow (Business Details, Service Details, Contact & Payment)
  - **Routing**: Added /service-provider-dashboard and /join/service-provider routes
  - **Dashboard Integration**: Updated BusinessDashboard to query and route service providers correctly
  - **Authentication**: Extended auth flow in replitAuth.ts to:
    - Accept service_provider as intended_role parameter
    - Auto-create service provider profile on first login with all required schema fields
    - Redirect service providers to /service-provider-dashboard after login
  - **Header**: Added "Service Provider" option to login dialog with Wrench icon
  - Service providers can now sign up, log in, access dashboard, manage services, and receive booking requests
  - Full integration complete - ready for end-to-end testing

- **November 14, 2025**: Completed vendor-managed fulfillment system backend foundation:
  - **Database Schema**: Completed migration of orders table for multi-vendor fulfillment
    - Added `userId` and `vendorId` columns with foreign key constraints and NOT NULL enforcement
    - Renamed `shippingMethod` to `fulfillmentType` (text: "Pickup", "Delivery", "Ship")
    - Added `fulfillmentDetails` JSONB column for method-specific buyer selections
    - Deleted legacy test orders and applied all constraints successfully
  - **TypeScript Types**: Created discriminated union types for order fulfillment
    - `PickupDetails`: Contains pickup location ID, name, address, optional time slot
    - `DeliveryDetails`: Contains delivery address, city, zip, optional instructions
    - `ShippingDetails`: Contains shipping address, city, state, zip, optional carrier
    - `FulfillmentDetails`: Discriminated union on `type` field for type-safe handling
    - Updated `insertOrderSchema` to include fulfillmentDetails with proper validation
  - **Storage Layer**: Implemented production-ready multi-vendor order creation
    - Added `getOrdersByUser()` and `getOrdersByVendor()` query methods
    - Implemented `createOrdersBatch()` with database transaction for atomicity
    - Proper itemsJson snapshot (simplified cart data) separate from orderItems table
    - Derives `fulfillmentType` from `fulfillmentDetails.type` automatically
    - Handles price conversion from cents to decimal format for orderItems
  - **Vendor Fulfillment Configuration**: FulfillmentEditor component integrated into VendorDashboard
    - Vendors can enable/disable Pickup, Delivery, and Shipping methods
    - Pickup: Multiple locations with addresses, schedules, and instructions
    - Delivery: Radius in miles, base fee, minimum order, lead time
    - Shipping: Flat or calculated pricing, carrier selection, instructions
    - Backend PATCH route validates with fulfillmentOptionsSchema and derives serviceOptions
  - **Public Display**: VendorProfile page shows detailed fulfillment options to buyers
    - Pickup locations with addresses and availability schedules
    - Delivery radius, fees, and minimum order requirements
    - Shipping carriers and pricing information
  - **Next Steps**: Implement POST /api/orders/batch route with Zod validation and fulfillment verification, then build grouped checkout UI with per-vendor fulfillment selection

- **November 14, 2025**: Fixed dialog visibility in Vendor Dashboard create forms:
  - Updated Add Product, Add Event, and Add FAQ dialogs with explicit white backgrounds (`bg-white`) and dark text (`text-[#222]`)
  - Ensured all dialog titles have dark, legible text styling
  - All create form dialogs now match the visibility standards of preview modals for consistent user experience
  - Vendors can now clearly read all form fields and labels when creating new products, events, and FAQs

- **November 11, 2025**: Implemented multi-select payment preferences for vendors:
  - **Database**: Migrated from single `paymentPreference` varchar to `paymentPreferences` text array
  - **Vendor Signup**: Added multi-select checkboxes for standard payment methods (Direct, Venmo, Zelle, CashApp, PayPal, Cash) plus TagInput for custom options
  - **Vendor Dashboard**: Replaced single dropdown with checkbox grid and custom TagInput, allowing vendors to select multiple payment methods
  - **ProfilePreview**: Enhanced display to show all selected payment methods as badges in "Accepted Payment Methods" section
  - **Vendor Autonomy**: Vendors can now freely choose multiple standard payment options AND add unlimited custom payment methods (e.g., "Bitcoin", "Stripe", "Square")
  - **Backend**: Seamless array handling via existing insertVendorSchema validation
  - All changes tested with e2e Playwright tests confirming multi-select functionality and custom payment method additions work correctly

- **November 10, 2025**: Updated Vendor Dashboard preview modal styling for better visibility:
  - Set modal containers to solid white background (#FFFFFF)
  - Updated all text colors to dark gray (#222) for primary text and medium gray (#666) for secondary text
  - Added light box-shadow (shadow-md) and subtle border-radius (rounded-md) for visual separation
  - Applied consistent styling to both ProfilePreview and ProductPreview components
  - Replaced theme-dependent muted colors with explicit gray-scale colors for consistent visibility
  - All changes tested with e2e Playwright tests confirming clear text visibility against white backgrounds

- **November 8, 2025**: Enhanced VendorDashboard Products tab with improved functionality:
  - Updated product schema: Added unitType, status (active/hidden), isFeatured flag, createdAt/updatedAt timestamps
  - Redesigned Add Product Form:
    - Dollar-based pricing input (e.g., $5.99) with automatic conversion to cents on backend
    - Unit type dropdown (per item, per lb, per dozen, per bunch, per pint, per quart, per gallon)
    - Product status toggle (Active/Hidden) to control visibility without deletion
    - Featured product checkbox for promotional highlighting
    - Product tags input using shared TagInput component
    - Preview button to show ProductPreview modal before publishing
    - Cleaned data submission to exclude empty optional fields and prevent validation errors
  - Redesigned Manage Products View:
    - Card-based layout with product images, name, price with unit type, and stock count
    - Low stock indicator (warning badge) when stock < 5 items
    - Featured badge on featured products
    - Inline status toggle on each card for quick visibility changes
    - Edit and delete buttons on each card
    - Empty state with encouraging message when no products exist
  - Added ProductPreview component showing public-facing product display with vendor info
  - All changes tested with e2e Playwright tests confirming product creation, status toggling, and low stock indicators work correctly

- **November 8, 2025**: Redesigned VendorDashboard Profile tab with organized sections:
  - Business Info: Business name, category dropdown (Farm/Artisan/Restaurant/Wellness/Market/Other), tagline, bio (300 char max)
  - Location & Contact: City, zip code, contact email, website, Instagram, Facebook
  - Local Values: Local sourcing % slider (0-100%), value tags, payment preference dropdown (Direct/Venmo/Zelle/CashApp/Other)
  - Visual Identity: Profile image and banner image upload placeholders (URL-based for now)
  - System Info: Auto-generated "Member Since" date, verification status
  - Added "Preview Public Profile" modal with ProfilePreview component showing public vendor view

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Frameworks**: React 18, TypeScript, Vite.
- **UI/UX**: Radix UI for accessible primitives, shadcn/ui for components ("new-york" preset), Tailwind CSS for styling. Custom design tokens include a forest green primary color, specific brand colors (Wheat, Clay, Ink, Paper), and specific font families (Playfair Display, Work Sans, JetBrains Mono).
- **State Management**: TanStack Query for server state, React hooks for local UI state, React Context with localStorage for shopping cart.
- **Routing**: Wouter.

### Backend
- **Framework**: Express.js with TypeScript.
- **API Design**: RESTful with `/api` prefix, JSON format, and error handling middleware.

### Data Storage
- **Database**: PostgreSQL via Neon serverless driver.
- **ORM**: Drizzle ORM for type-safe queries and schema management, with `drizzle-kit` for migrations.
- **Schema**: Includes Users, Vendors, Products, Events, EventRsvps, Orders, VendorReviews, VendorFAQs, and Spotlight. Utilizes `gen_random_uuid()` for primary keys, JSONB for flexible data, and array columns. Zod schemas are generated from Drizzle tables for validation.

### Authentication and Authorization
- **Authentication**: Replit Auth via OpenID Connect (OIDC).
- **Session Management**: PostgreSQL-backed sessions.
- **Roles**: Buyer, Vendor, Restaurant with role-based redirects and profile auto-generation on first login.
- **Route Protection**: `isAuthenticated` middleware.

### Key Business Logic
- **Pricing Model**: $150/month vendor membership, 3% buyer fee, no per-transaction vendor fees.
- **Platform Focus**: Exclusively local Fort Myers vendors and products.
- **Loyalty System**: Users earn 10 points per completed order.
- **Fulfillment**: Supports pickup and delivery options.
- **Fort Myers Spotlight**: A system for featured content.
- **Shopping Cart**: React Context-based with localStorage persistence, supporting product variants, and auto-calculating totals (subtotal, 7% FL sales tax, 3% buyer fee).

### Application Routes
- **Public**: `/`, `/products`, `/vendors`, `/vendor/:id`, `/events`, `/spotlight`, `/login`, `/signup`.
- **User**: `/cart`, `/checkout`, `/events/my`.
- **Vendor**: `/dashboard`.

## External Dependencies

### UI Component Libraries
- `@radix-ui/*`
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
- Google Fonts CDN

### Image Assets
- Generated images from `attached_assets/generated_images/`