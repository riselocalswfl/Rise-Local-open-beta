# Local Choice - Fort Myers Marketplace & Community

## Overview

Local Choice is a local marketplace and community platform focused on Fort Myers, Florida. It connects local vendors, artisans, and farmers with buyers through a two-pillar system: a marketplace for browsing and purchasing products, and a community hub for events and social features. The platform emphasizes sustainability, local commerce, and community engagement with a counterculture yet polished brand aesthetic.

The application is built as a full-stack web application with React frontend and Express backend, designed to run entirely on Replit with minimal setup.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Tooling:**
- React 18 with TypeScript for type safety
- Vite as the build tool and development server
- Wouter for client-side routing (lightweight alternative to React Router)
- TanStack Query (React Query) for server state management and data fetching

**UI Component System:**
- Radix UI primitives for accessible, unstyled components
- shadcn/ui component library with "new-york" style preset
- Tailwind CSS for utility-first styling with custom design tokens
- Custom theme system supporting light/dark modes

**Design Tokens:**
- Primary color: Forest green (#5B8C5A / HSL 105 22% 45%) representing local/sustainable values
- Brand colors: Wheat (#EEDC82), Clay (#E67A4E), Ink (#2D2D2D), Paper (#FAF8F5)
- Typography: Playfair Display for headings, Work Sans for body text, JetBrains Mono for prices/data
- Border radius: 14px for cards, 9999px (pill) for buttons
- Custom shadow system with film grain aesthetic

**State Management Approach:**
- Server state: TanStack Query with custom query client
- Local UI state: React useState/useReducer hooks
- No global state management library (Redux, Zustand, etc.) - keeping it simple
- Toast notifications via shadcn/ui toast system

### Backend Architecture

**Server Framework:**
- Express.js with TypeScript
- HTTP server created via Node's native `http` module
- Middleware-based request/response processing
- Custom request logging middleware

**API Design:**
- RESTful API pattern with `/api` prefix for all routes
- JSON request/response format
- Error handling middleware with status code support
- Currently minimal route implementation (starter template state)

**Development Setup:**
- Vite middleware mode for HMR (Hot Module Replacement) in development
- Custom Vite plugins for Replit integration (cartographer, dev banner, runtime error overlay)
- Separate build processes for client (Vite) and server (esbuild)

### Data Storage Solutions

**Database:**
- PostgreSQL as the primary database (via Neon serverless driver)
- Drizzle ORM for type-safe database queries and schema management
- Schema-first approach with `shared/schema.ts` as source of truth
- Migration management via drizzle-kit

**Current Schema:**
- Users table with id, username, password fields
- Uses PostgreSQL's `gen_random_uuid()` for primary keys
- Zod schemas generated from Drizzle tables for runtime validation

**Session Management:**
- Planned: connect-pg-simple for PostgreSQL-backed sessions (package installed but not yet configured)
- JWT-based authentication intended for production

**In-Memory Storage:**
- Temporary MemStorage implementation for development
- Provides CRUD interface abstraction that can be swapped for database implementation
- Currently stores users in a Map structure

### Authentication and Authorization

**Planned Authentication Flow:**
- Email + password authentication
- JWT token-based sessions
- Three user roles: buyer, vendor, admin
- Vendor onboarding with admin verification workflow

**Current Implementation Status:**
- Login and Signup pages exist with UI mockups
- No actual authentication logic implemented yet
- Mock toast notifications on login/signup
- Routes are not currently protected

### Key Business Logic

**Pricing Model:**
- Vendors pay flat $150/month membership
- 3% buyer fee on transactions
- No per-transaction vendor fees

**Payment Methods:**
- Vendors specify accepted payment methods during signup (Cash, Venmo, PayPal, Credit Card, Zelle, Check)
- Payment methods stored as array field in vendor schema
- Displayed to buyers on vendor/product pages
- Vendors manage their own payment collection (platform does not process payments)

**Platform Focus:**
- "Local" is the core platform principle - ALL vendors and products on Local Exchange are local to Fort Myers by design
- The platform emphasizes supporting local businesses and avoiding major corporations
- Being local is the foundation of the entire platform, not a filter option
- Focus on Fort Myers community connections and anti-corporate messaging
- Vendors and products are displayed with category filtering and search capabilities

**Loyalty System:**
- Users earn 10 points per completed order
- Point balance tracking via LoyaltyPoint entity
- Display of points in UI (LoyaltyDisplay component)

**Fulfillment Options:**
- Pickup and delivery methods supported
- Configurable per vendor and selectable at checkout

**Fort Myers Spotlight:**
- Featured content system highlighting local vendors and events
- City-specific (Fort Myers focus)
- Banner/hero display on home page

### External Dependencies

**UI Component Libraries:**
- @radix-ui/* (17+ packages): Accessible component primitives
- cmdk: Command palette component
- embla-carousel-react: Carousel/slider functionality
- lucide-react: Icon system with 1.75px stroke width preference

**Form Management:**
- react-hook-form: Form state management
- @hookform/resolvers: Zod schema validation integration
- zod: Runtime type validation
- drizzle-zod: Generate Zod schemas from Drizzle tables

**Date Handling:**
- date-fns: Date formatting and manipulation

**Styling:**
- tailwindcss: Utility-first CSS framework
- tailwind-merge: Utility for merging Tailwind classes
- clsx: Conditional className construction
- class-variance-authority: Variant-based component styling

**Database & ORM:**
- @neondatabase/serverless: Neon PostgreSQL serverless driver
- drizzle-orm: TypeScript ORM with type inference
- drizzle-kit: Schema management and migrations

**Development Tools:**
- @replit/vite-plugin-*: Replit-specific Vite integrations
- tsx: TypeScript execution for development server
- esbuild: Fast bundler for production server build

**Fonts:**
- Google Fonts CDN: Playfair Display, Work Sans, JetBrains Mono

**Image Assets:**
- Generated images stored in `attached_assets/generated_images/`
- Fort Myers hero image for spotlight banner

### Application Routes

**Public Routes:**
- `/` - Home page with spotlight banner, featured products/vendors/events
- `/products` - Product listing with filters
- `/vendors` - Vendor directory
- `/events` - Community events calendar
- `/spotlight` - Fort Myers spotlight detailed view
- `/login` - Authentication
- `/signup` - User registration

**User Routes:**
- `/cart` - Shopping cart
- `/checkout` - Order completion with fulfillment selection

**Admin Routes:**
- `/admin` - Dashboard for vendor verification, platform stats

### Data Entities

All core entities are now implemented in the database:
- **User** - Authentication, role-based access (buyer/vendor/admin), loyalty points balance
- **Vendor** - Owner reference, business name, bio, categories (array), payment methods (array), business values (array), city, verification status, follower count
- **Product** - Vendor association, name, price, category, inventory, description
- **Event** - Organizer (vendor) reference, title, description, date/time, location, category, ticket availability, RSVP count
- **Order** - Buyer reference, status, fulfillment method, subtotal, buyer fee, total, created timestamp
- **OrderItem** - Order reference, product reference, quantity, price at purchase
- **Spotlight** - Featured content for Fort Myers with title, body, city, active status

### Build and Deployment

**Development:**
- `npm run dev` - Starts Express server with Vite middleware and HMR
- Runs on port assigned by Replit environment
- TypeScript compiled on-the-fly via tsx

**Production Build:**
- `npm run build` - Builds client (Vite) and server (esbuild)
- Client output: `dist/public/`
- Server output: `dist/index.js`
- `npm start` - Runs production build

**Type Checking:**
- `npm run check` - TypeScript compilation check without emit

**Database:**
- `npm run db:push` - Push schema changes to database via Drizzle

**Environment Requirements:**
- `DATABASE_URL` - PostgreSQL connection string (validated at build time)
- `NODE_ENV` - "development" or "production"
- Replit-specific environment variables for plugins