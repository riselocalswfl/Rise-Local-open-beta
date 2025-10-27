# Rise Local - Fort Myers Marketplace & Community

## Overview
Rise Local is a full-stack web application designed to connect local vendors, artisans, and farmers with buyers in Fort Myers, Florida. It features a marketplace for products and a community hub for events, aiming to foster sustainability, local commerce, and community engagement. The platform supports local businesses with a counterculture yet polished brand aesthetic, running entirely on Replit, and includes features like product filtering, event management with RSVP and attendance tracking, and a loyalty system.

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