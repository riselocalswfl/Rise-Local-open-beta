import { useState } from "react";
import { Link } from "wouter";
import { Compass, ChevronDown, ChevronRight } from "lucide-react";
import DiscoverDealCard, { DiscoverDeal } from "@/components/DiscoverDealCard";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

const CATEGORIES = [
  { id: "all", label: "All" },
  { id: "meals", label: "Meals" },
  { id: "bread", label: "Bread & pastries" },
  { id: "groceries", label: "Groceries" },
  { id: "drinks", label: "Drinks" },
  { id: "treats", label: "Treats" },
];

const MOCK_TOP_PICKS: DiscoverDeal[] = [
  {
    id: 1,
    title: "Fresh Baked Croissants",
    vendorName: "Fort Myers Bakery",
    imageUrl: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400&h=400&fit=crop",
    originalPrice: 12.99,
    discountedPrice: 4.99,
    distance: "0.3 mi",
    category: "bread",
  },
  {
    id: 2,
    title: "Surprise Bag - Cafe",
    vendorName: "Downtown Coffee Co",
    imageUrl: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&h=400&fit=crop",
    originalPrice: 15.00,
    discountedPrice: 5.99,
    distance: "0.5 mi",
    category: "meals",
  },
  {
    id: 3,
    title: "Artisan Sourdough Loaf",
    vendorName: "River District Breads",
    imageUrl: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=400&fit=crop",
    originalPrice: 8.99,
    discountedPrice: 3.49,
    distance: "0.8 mi",
    category: "bread",
  },
  {
    id: 4,
    title: "Farm Fresh Produce Box",
    vendorName: "SWFL Farmers Market",
    imageUrl: "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=400&h=400&fit=crop",
    originalPrice: 25.00,
    discountedPrice: 12.99,
    distance: "1.2 mi",
    category: "groceries",
  },
  {
    id: 5,
    title: "Gourmet Pizza Slice Combo",
    vendorName: "Bella Naples Pizzeria",
    imageUrl: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&h=400&fit=crop",
    originalPrice: 14.99,
    discountedPrice: 6.99,
    distance: "0.4 mi",
    category: "meals",
  },
];

const MOCK_PICKUP_NOW: DiscoverDeal[] = [
  {
    id: 6,
    title: "Lunch Special Box",
    vendorName: "Garden Fresh Deli",
    imageUrl: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=400&fit=crop",
    originalPrice: 16.99,
    discountedPrice: 6.99,
    distance: "0.2 mi",
    pickupTime: "11am-2pm",
    category: "meals",
  },
  {
    id: 7,
    title: "End of Day Pastries",
    vendorName: "Sweet Sunrise Bakery",
    imageUrl: "https://images.unsplash.com/photo-1517433670267-08bbd4be890f?w=400&h=400&fit=crop",
    originalPrice: 18.00,
    discountedPrice: 5.99,
    distance: "0.6 mi",
    pickupTime: "4pm-6pm",
    category: "bread",
  },
  {
    id: 8,
    title: "Smoothie & Snack Pack",
    vendorName: "Juice Junction",
    imageUrl: "https://images.unsplash.com/photo-1502741224143-90386d7f8c82?w=400&h=400&fit=crop",
    originalPrice: 12.00,
    discountedPrice: 4.99,
    distance: "0.3 mi",
    pickupTime: "2pm-5pm",
    category: "drinks",
  },
  {
    id: 9,
    title: "Sushi Platter Surprise",
    vendorName: "Ocean Roll Sushi",
    imageUrl: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=400&h=400&fit=crop",
    originalPrice: 28.00,
    discountedPrice: 11.99,
    distance: "0.9 mi",
    pickupTime: "8pm-9pm",
    category: "meals",
  },
  {
    id: 10,
    title: "Cookie Assortment Box",
    vendorName: "Cookie Corner",
    imageUrl: "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=400&h=400&fit=crop",
    originalPrice: 15.00,
    discountedPrice: 5.99,
    distance: "0.4 mi",
    pickupTime: "3pm-6pm",
    category: "treats",
  },
];

export default function Discover() {
  const [selectedCategory, setSelectedCategory] = useState("all");

  const filterDeals = (deals: DiscoverDeal[]) => {
    if (selectedCategory === "all") return deals;
    return deals.filter((deal) => deal.category === selectedCategory);
  };

  const topPicks = filterDeals(MOCK_TOP_PICKS);
  const pickupNow = filterDeals(MOCK_PICKUP_NOW);

  return (
    <div className="min-h-screen bg-background pb-4">
      {/* Location Bar */}
      <header className="sticky top-0 z-40 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-primary" />
            <button
              className="flex items-center gap-1 text-sm font-medium"
              data-testid="button-location"
            >
              <span className="text-foreground">Fort Myers</span>
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
          <div
            className="w-8 h-8 rounded-full bg-primary flex items-center justify-center"
            data-testid="brand-badge"
          >
            <span className="text-primary-foreground text-xs font-bold">RL</span>
          </div>
        </div>
      </header>

      {/* Category Pills */}
      <div className="border-b border-border bg-background">
        <ScrollArea className="w-full">
          <div className="flex gap-2 px-4 py-3">
            {CATEGORIES.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === category.id
                    ? "bg-foreground text-background"
                    : "bg-muted text-foreground border border-border hover:bg-muted/80"
                }`}
                data-testid={`pill-category-${category.id}`}
              >
                {category.label}
              </button>
            ))}
          </div>
          <ScrollBar orientation="horizontal" className="invisible" />
        </ScrollArea>
      </div>

      {/* Top Picks Section */}
      <section className="pt-6">
        <div className="flex items-center justify-between px-4 mb-4">
          <h2 className="text-lg font-semibold text-foreground" data-testid="heading-top-picks">
            Top picks near you
          </h2>
          <Link href="/browse?section=top-picks">
            <button
              className="flex items-center gap-1 text-sm text-primary font-medium"
              data-testid="link-see-all-top-picks"
            >
              See all
              <ChevronRight className="w-4 h-4" />
            </button>
          </Link>
        </div>
        
        {topPicks.length > 0 ? (
          <ScrollArea className="w-full">
            <div className="flex gap-4 px-4 pb-4">
              {topPicks.map((deal) => (
                <DiscoverDealCard key={deal.id} deal={deal} />
              ))}
            </div>
            <ScrollBar orientation="horizontal" className="invisible" />
          </ScrollArea>
        ) : (
          <div className="px-4 py-8 text-center text-muted-foreground text-sm">
            No deals in this category. Try selecting "All".
          </div>
        )}
      </section>

      {/* Pick Up Now Section */}
      <section className="pt-6">
        <div className="flex items-center justify-between px-4 mb-4">
          <h2 className="text-lg font-semibold text-foreground" data-testid="heading-pickup-now">
            Pick up now
          </h2>
          <Link href="/browse?section=pickup-now">
            <button
              className="flex items-center gap-1 text-sm text-primary font-medium"
              data-testid="link-see-all-pickup-now"
            >
              See all
              <ChevronRight className="w-4 h-4" />
            </button>
          </Link>
        </div>

        {pickupNow.length > 0 ? (
          <ScrollArea className="w-full">
            <div className="flex gap-4 px-4 pb-4">
              {pickupNow.map((deal) => (
                <DiscoverDealCard key={deal.id} deal={deal} />
              ))}
            </div>
            <ScrollBar orientation="horizontal" className="invisible" />
          </ScrollArea>
        ) : (
          <div className="px-4 py-8 text-center text-muted-foreground text-sm">
            No deals in this category. Try selecting "All".
          </div>
        )}
      </section>

      {/* Additional spacing for bottom nav */}
      <div className="h-4" />
    </div>
  );
}
