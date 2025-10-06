# Local Exchange MVP - Design Guidelines

## Design Approach: Marketplace-Optimized System

**Selected Approach**: Material Design-inspired system with community warmth
**Justification**: Local Exchange is utility-focused with clear commerce goals - users need efficient browsing, clear product information, and straightforward transactions. The platform balances marketplace functionality with community features, requiring trust-building visual design without visual overload.

**Key Design Principles**:
- Clarity over decoration - every element serves a purpose
- Trust through consistency - predictable patterns across all flows
- Community warmth - approachable color palette and friendly spacing
- Mobile-first responsiveness - seamless experience across devices

---

## Core Design Elements

### A. Color Palette

**Light Mode (Default)**:
- Primary: 142 71% 45% (forest green - local/sustainable feel)
- Primary hover: 142 71% 38%
- Background: 0 0% 100% (white)
- Surface: 0 0% 98% (off-white cards)
- Border: 0 0% 90%
- Text primary: 0 0% 13%
- Text secondary: 0 0% 45%
- Accent (CTAs): 24 85% 55% (warm orange - calls to action)
- Success: 142 76% 36% (green for verified badges)
- Info: 210 100% 56% (blue for spotlight/featured)

**Dark Mode**:
- Primary: 142 60% 55%
- Primary hover: 142 60% 62%
- Background: 0 0% 7%
- Surface: 0 0% 12%
- Border: 0 0% 20%
- Text primary: 0 0% 95%
- Text secondary: 0 0% 65%
- Accent: 24 75% 60%

### B. Typography

**Font Stack**: 
- Headings: 'Inter', system-ui, sans-serif (via Google Fonts CDN)
- Body: 'Inter', system-ui, sans-serif
- Mono (for prices/data): 'JetBrains Mono', monospace

**Scale**:
- Hero/Landing: text-5xl md:text-6xl font-bold
- Page Titles: text-3xl md:text-4xl font-semibold
- Section Headers: text-2xl font-semibold
- Card Titles: text-lg font-medium
- Body: text-base leading-relaxed
- Small/Meta: text-sm text-secondary
- Price Display: text-xl md:text-2xl font-semibold font-mono

### C. Layout System

**Spacing Primitives**: Use Tailwind units of **2, 4, 6, 8, 12, 16** for consistency
- Component padding: p-4 (mobile), p-6 (desktop)
- Section spacing: py-12 md:py-16
- Card gaps: gap-4 md:gap-6
- Tight spacing: space-y-2 (form fields, list items)
- Generous spacing: space-y-8 (major sections)

**Grid Patterns**:
- Product/Vendor Cards: grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6
- Event Listings: grid-cols-1 lg:grid-cols-2 gap-8
- Container: max-w-7xl mx-auto px-4
- Narrow content: max-w-3xl mx-auto (forms, articles)

### D. Component Library

**Navigation**:
- Sticky header with logo, search bar, and user menu
- Bottom border on scroll (border-b)
- Mobile: hamburger menu with slide-out drawer
- Role badges: small pills next to user name (Vendor/Admin)

**Cards**:
- Product Card: image (aspect-ratio-square), title, vendor link, price, stock indicator, quick-add button
- Vendor Card: avatar/logo, name, verified badge, category tags, city, follower count
- Event Card: date badge overlay, title, location, category tag, RSVP count, ticket availability

**Forms & Inputs**:
- Rounded borders (rounded-lg), consistent padding (p-3)
- Label above input: text-sm font-medium mb-2
- Error states: red border + error message below
- All inputs maintain dark mode styling (bg-surface, text-primary)

**Filters & Search**:
- Filter bar: sticky below header on scroll
- Category chips: pill-shaped, toggleable (active state with primary bg)
- Sort dropdown: right-aligned
- Search: prominent with icon, placeholder text, instant results

**CTAs & Buttons**:
- Primary: bg-primary text-white hover:bg-primary-hover rounded-lg px-6 py-3
- Secondary: border border-primary text-primary hover:bg-primary/10
- Ghost: text-primary hover:bg-surface
- Icon buttons: p-2 rounded-full hover:bg-surface

**Data Display**:
- Order cards: timeline-style status indicator, items list, total with fee breakdown
- Loyalty balance: prominent number display with point icon, history table below
- Admin metrics: stat cards in 4-column grid (count, label, trend indicator)

**Badges & Labels**:
- Verified vendor: green checkmark badge (top-right on cards)
- Stock status: colored dots (green=in stock, yellow=low, red=out)
- Event status: colored pills (upcoming/ongoing/past)
- Featured/Spotlight: blue ribbon or corner flag

**Fort Myers Spotlight**:
- Hero banner on homepage: full-width, gradient overlay on image, featured content preview
- Dedicated page: masonry grid of featured vendors/events/articles
- Spotlight card: distinctive blue border, "Featured" badge

### E. Animations

**Minimal Motion Philosophy**:
- Card hover: subtle lift (translate-y-[-2px]) + shadow increase
- Button hover: scale-[1.02] on desktop only
- Page transitions: simple fade-in
- Loading states: subtle pulse on skeleton screens
- No scroll animations, no complex transitions

---

## Images Strategy

**Hero Section** (Homepage):
- Large hero image showcasing Fort Myers local market scene
- Gradient overlay (from transparent to black at 60% opacity) for text readability
- Search bar overlaid on bottom third of hero
- Height: h-[60vh] md:h-[70vh]

**Product Images**:
- Square aspect ratio (aspect-square)
- Placeholder for missing images: generate solid color with first letter of product name
- Vendor logo/avatar: circular, fallback to initials

**Event Images**:
- 16:9 aspect ratio for event headers
- Location map preview as secondary image

**Vendor Profile**:
- Cover photo: wide banner (aspect-[3/1])
- Profile photo: circular overlay on cover

**Spotlight Content**:
- Featured images in masonry layout
- Variable aspect ratios for visual interest

---

## Page-Specific Layouts

**Homepage**: Hero with search → Categories grid → Fort Myers Spotlight section → Featured vendors → Upcoming events

**Marketplace** (/products): Filter bar → 3-column product grid → Pagination

**Vendor Profile**: Cover + avatar → Bio → Category tags → Product grid → Reviews section

**Event Listing**: Filter sidebar (desktop) → 2-column event cards → Map view toggle

**Cart/Checkout**: 2-column layout (items left, summary right on desktop, stacked mobile) → Fee breakdown clear and prominent

**Admin Dashboard**: Metric cards row → Pending verifications table → Spotlight management → Charts (simple bar/line)

All layouts responsive with mobile-first approach, collapsing multi-column to single-column below md breakpoint.