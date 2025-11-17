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
- **Authentication**: Replit Auth via OpenID Connect (OIDC) manages authentication, with sessions stored in PostgreSQL. Role-based access (buyer, vendor, restaurant, service_provider) includes automatic profile generation and route protection.
- **Vendor Architecture**: Three distinct vendor types use separate tables: `vendors` (shop vendors with products), `restaurants` (dine vendors with menuItems), and `serviceProviders` (service vendors with services). Each table includes a categories array field. The `vendors` table includes a `vendorType` field (default "shop") for explicit tracking. All three tables include a `profileStatus` field ("draft" | "complete") to support auto-save during onboarding.
- **Vendor Profiles**: A unified `VendorProfile` component renders modular sections (`MasterProfile`, `ShopProfileSection`, `DineProfileSection`, `ServiceProfileSection`) based on the vendor owner's role.
- **Vendor Onboarding**: Three distinct 4-step onboarding flows (`/onboarding/shop`, `/onboarding/dine`, `/onboarding/services`) are tailored for each business type. The generic `/onboarding` route redirects to `/join` to ensure users always go through the proper vendor type selection flow. Auth callbacks redirect to type-specific onboarding pages based on selected vendor type. All onboarding submissions include `credentials: "include"` for proper session cookie handling. Services and Dine onboarding automatically include default fulfillment methods to satisfy backend validation.
- **Auto-Save System**: All vendor onboarding flows (Shop, Dine, Services) implement auto-save with 2-second debounced triggers. Draft profiles are created automatically on the first field change. Data persists to the database immediately and is retrieved on page reload. A "Saving..." / "Saved" indicator provides user feedback. **CRITICAL ROUTING FIX**: Draft endpoints (`/api/vendors/draft`, `/api/restaurants/draft`, `/api/service-providers/draft`) must be defined BEFORE parameterized routes (`/api/vendors/:id`, etc.) in `server/routes.ts` to prevent Express from treating "draft" as an :id parameter. Route order: (1) GET/POST `/draft`, (2) PATCH `/:id`, (3) POST `/:id/complete`, (4) GET `/:id`.
- **Vendor Dashboard**: Organized into cards for Business Info, Location & Contact, Business Hours, Business Values, Payment Methods, Fulfillment Methods, Profile Photo/Logo, and Cover Banner, with support for custom fulfillment options.
- **Category System**: Shop vendors and service providers have completely separate category lists. Shop categories (Food & Farm, Artisan Goods, Wellness & Lifestyle, Local Favorites) appear only in shop vendor onboarding and product creation. Service categories (Personal & Wellness Services, Home & Property Services, Event & Creative Services, Professional Services, Pet Services) appear only in service provider onboarding. This ensures proper categorization and prevents cross-contamination between vendor types.
- **Product Filtering**: Products can only be categorized using categories pre-selected by the vendor on their profile, using a hierarchical category selection system. Products support multi-category selection.
- **Service Provider Filtering**: Service providers are filtered to show only profiles with `profileStatus = "complete"` to ensure consistency across /services and /vendors pages. The `/api/services` endpoint supports optional `?category=X` parameter for simple string matching against the categories array. Client-side filtering uses hierarchical CategoryFilter component with categoriesMatch helper for better user experience.
- **Shopping Cart**: A React Context-based system with localStorage persistence, handling product variants, and calculating totals (subtotal + 7% FL sales tax).
- **Direct Messaging**: Users and vendors can send direct messages with real-time updates and read status tracking.
- **Stripe Connect Integration**: The platform supports Stripe Connect for vendor payouts. Payments (subtotal + 7% FL sales tax) are collected by the platform, and the full amount is automatically transferred to the vendor's connected account via webhooks. The platform's revenue comes solely from an $89/month vendor membership fee, with no transaction fees. A "Coming Soon" pre-launch mode is implemented for Stripe.
- **Checkout Flow**: The checkout process handles Stripe payment intent creation and order mutation, storing order details in `sessionStorage` for confirmation. The system enforces no buyer fees, only product price plus 7% FL sales tax.
- **Customer Profile Management**: Users can view and edit their profile information at `/profile`. The page displays read-only email (managed by Replit Auth) and editable fields for first name, last name, and phone number. The secure PATCH `/api/users/me` endpoint implements field whitelisting (firstName, lastName, phone only) to prevent privilege escalation and protect sensitive fields like role, username, and authentication data.

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