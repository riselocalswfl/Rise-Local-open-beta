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

### Backend
- **Framework**: Express.js with TypeScript.
- **API Design**: Adheres to RESTful principles, uses `/api` prefix, processes JSON data, and includes error handling middleware.

### Data Storage
- **Database**: PostgreSQL, accessed via Neon's serverless driver.
- **ORM**: Drizzle ORM provides type-safe queries and schema management, with `drizzle-kit` for migrations.
- **Schema**: Key entities include Users, Vendors, Products, Events, EventRsvps, Orders, VendorReviews, VendorFAQs, Spotlight, and Messages. UUIDs are used for primary keys, JSONB for flexible data storage, and array columns for multi-value fields (e.g., categories, payment preferences). Zod schemas are generated from Drizzle tables for data validation.

### Authentication and Authorization
- **Authentication**: Implemented using Replit Auth via OpenID Connect (OIDC).
- **Session Management**: Sessions are managed and stored in PostgreSQL.
- **Roles**: Supports 'Buyer', 'Vendor', and 'Restaurant' roles, with role-based redirects and automatic profile generation upon first login.
- **Route Protection**: The `isAuthenticated` middleware protects sensitive routes.

### Key Business Logic
- **Pricing Model**: Vendors pay a $150/month membership fee, buyers incur a 3% fee, and there are no per-transaction vendor fees.
- **Platform Focus**: Exclusively serves local Fort Myers vendors and products.
- **Loyalty System**: Users earn 10 points for each completed order.
- **Fulfillment**: Supports various fulfillment methods including pickup, local delivery, and shipping, configurable by vendors.
- **Fort Myers Spotlight**: A feature for highlighting specific content or businesses.
- **Shopping Cart**: A React Context-based system with localStorage persistence, handling product variants, and automatically calculating totals (subtotal, 7% FL sales tax, 3% buyer fee).
- **Direct Messaging**: Users can send direct messages to vendors and vice versa. Real-time updates via polling (5s for threads, 10s for unread counts), with read status tracking. Messages page includes vendor search to start new conversations - searches across business name, bio, tagline, categories, and values.

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