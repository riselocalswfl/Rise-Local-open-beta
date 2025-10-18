# Rise Local - Fort Myers Marketplace & Community

## Overview

Rise Local is a local marketplace and community platform focused on Fort Myers, Florida. It connects local vendors, artisans, and farmers with buyers through a two-pillar system: a marketplace for browsing and purchasing products, and a community hub for events and social features. The platform emphasizes sustainability, local commerce, and community engagement with a counterculture yet polished brand aesthetic.

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
- Shopping cart: React Context (CartContext) with localStorage persistence
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
- **Users** - Authentication with id, username, password, role, loyalty points
- **Vendors** - Comprehensive business profiles with contact info, categories, payment methods, certifications, badges, policies, hours, gallery images, hero images
- **Products** - Product catalog with pricing (cents-based), stock, categories, images, plus sourcing fields (value tags, source farm, harvest date, lead time, inventory status)
- **Events** - Community events organized by vendors with RSVP tracking
- **Orders** - Order management with cart data stored as JSON, contact info, fulfillment method, and pricing breakdown
- **VendorReviews** - Customer reviews for vendors with ratings and comments
- **VendorFAQs** - Vendor-managed frequently asked questions
- **Spotlight** - Featured content system for Fort Myers
- Uses PostgreSQL's `gen_random_uuid()` for primary keys
- JSONB columns for flexible data (hours, certifications, policies, address)
- Array columns for multi-value fields (categories, badges, payment methods, gallery)
- Zod schemas generated from Drizzle tables for runtime validation

**Session Management:**
- Planned: connect-pg-simple for PostgreSQL-backed sessions (package installed but not yet configured)
- JWT-based authentication intended for production

**In-Memory Storage:**
- Temporary MemStorage implementation for development
- Provides CRUD interface abstraction that can be swapped for database implementation
- Currently stores users in a Map structure

### Authentication and Authorization

**Authentication System:**
- Replit Auth via OpenID Connect (OIDC) integration
- PostgreSQL-backed sessions via connect-pg-simple
- Three user roles: buyer (customer), vendor, restaurant
- Role-based redirects after authentication

**Authentication Flow:**
1. User clicks "Sign In" → Modal dialog shows three role options:
   - Customer: For shoppers and buyers
   - Vendor: For business owners managing vendor profiles
   - Restaurant: For restaurant owners managing restaurant profiles
2. User selects role → Redirected to /api/login?intended_role={role}
3. System stores intended role in session, initiates OIDC flow
4. After successful authentication:
   - New users: Role is assigned and persisted to database
   - Vendor/Restaurant first login: Auto-creates business profile with default data
   - Existing users: Existing role is respected (no accidental reassignment)
5. User is redirected based on role:
   - buyer → /profile (customer profile with orders, loyalty rewards)
   - vendor → /dashboard (vendor dashboard with products, events, FAQs)
   - restaurant → /dashboard (restaurant dashboard with menu, events, FAQs)

**Auto-Generated Profile Defaults:**
- Vendors: Business name from user's name, "Other" category, home-based location, pickup service
- Restaurants: Restaurant name from user's name, "American" cuisine, dine-in service, Fort Myers location

**API Endpoints:**
- /api/login - Initiates authentication with optional intended_role parameter
- /api/callback - OIDC callback, assigns/reads role, redirects appropriately
- /api/logout - Logs out user and redirects to OIDC logout
- /api/auth/user - Returns authenticated user info
- /api/auth/my-vendor - Returns vendor profile for authenticated vendor
- /api/auth/my-restaurant - Returns restaurant profile for authenticated restaurant

**Route Protection:**
- isAuthenticated middleware protects authenticated routes
- Token refresh handled automatically when access token expires

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

**Shopping Cart System:**
- React Context-based cart (CartContext) with localStorage persistence
- Supports product variants and custom options for flexible product configurations
- Cart operations: addItem, removeItem, updateQty, clearCart, cartTotals
- Automatic calculation of subtotal, tax (7% FL sales tax), buyer fee (3%), and grand total
- MiniCart drawer component for quick cart preview from header
- Full cart page (/cart) with quantity controls and detailed order summary
- Cart badge in header shows real-time item count
- Persists across page reloads and browser sessions
- Normalized variant/option matching ensures products with different variants are treated as separate line items

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
- `/vendor/:id` - Comprehensive vendor profile page with hero, products, events, reviews, FAQs, gallery
- `/events` - Community events calendar
- `/spotlight` - Fort Myers spotlight detailed view
- `/login` - Authentication
- `/signup` - User registration

**User Routes:**
- `/cart` - Shopping cart
- `/checkout` - Order completion with fulfillment selection

**Vendor Routes:**
- `/dashboard` - Vendor dashboard with tabs for profile editing, product management, event management, FAQ management

**Admin Routes:**
- `/admin` - Dashboard for vendor verification, platform stats

### Data Entities

All core entities are now implemented in the database:
- **User** - Authentication, role-based access (buyer/vendor/admin), loyalty points balance
- **Vendor** - Owner reference, business name, bio, categories (array), payment methods (array), business values (array), city, verification status, follower count
- **Product** - Vendor association, name, priceCents (integer), stock, category, description, imageUrl. Uses cents-based pricing for precision.
- **Event** - Organizer (vendor) reference, title, description, date/time, location, category, ticket availability, RSVP count
- **Order** - Contact info (email, name, phone), status, shippingMethod, addressJson, itemsJson (cart stored as JSON), subtotalCents, taxCents, feesCents, totalCents, paymentId, createdAt. All amounts in cents for precision.
- **OrderItem** - Legacy table (items now stored as JSON in Order.itemsJson)
- **Spotlight** - Featured content for Fort Myers with title, body, city, active status

### Example Data

**Sunshine Grove Farm** (Vendor):
- Comprehensive example vendor created via seed script
- 15-acre family farm specializing in certified organic vegetables, herbs, and seasonal fruits
- Features showcase the full vendor profile system:
  - **Profile**: Tagline, detailed bio, contact information (Maria Martinez)
  - **Badges**: Certified Organic, Woman-Owned, Carbon Neutral, Living Wage Employer
  - **Certifications**: USDA Organic (2016), Certified Naturally Grown (2015)
  - **Products**: 4 products with sourcing details (Heirloom Tomato Mix, Baby Lettuce Mix, Fresh Basil, Rainbow Carrots)
  - **Events**: 3 community events (Farm Tour & Tasting, Seed Saving Workshop, Harvest Festival)
  - **Reviews**: 4 customer reviews with 4-5 star ratings
  - **FAQs**: 5 frequently asked questions about CSA, pesticides, farm visits, delivery, and storage
  - **Gallery**: 6 farm photos
  - **Hours**: Monday-Saturday with varying hours
  - **Fulfillment**: Pickup and Delivery options
  - **Policies**: Returns, delivery, pickup, and cancellation policies
- Vendor ID: 5b89e710-b90d-49a7-92d0-4d39d88bbfc4
- Access via: `/vendor/5b89e710-b90d-49a7-92d0-4d39d88bbfc4` or `/dashboard`

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
- `npx tsx server/seed.ts` - Seed database with example products (requires existing vendors)

**Environment Requirements:**
- `DATABASE_URL` - PostgreSQL connection string (validated at build time)
- `NODE_ENV` - "development" or "production"
- Replit-specific environment variables for plugins