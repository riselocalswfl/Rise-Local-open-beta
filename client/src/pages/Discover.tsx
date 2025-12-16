import { useState } from "react";
import { Link } from "wouter";
import { Compass, ChevronDown, ChevronRight, Lock } from "lucide-react";
import RiseLocalDealCard, { RiseLocalDeal, DealType } from "@/components/RiseLocalDealCard";
import MembershipBanner from "@/components/MembershipBanner";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

const FILTER_CHIPS = [
  { id: "all", label: "All Deals" },
  { id: "memberOnly", label: "Member-Only", icon: Lock },
  { id: "free", label: "Free Deals" },
  { id: "bogo", label: "BOGO" },
  { id: "value", label: "$5+ Value" },
  { id: "new", label: "New this week" },
  { id: "near", label: "Near me" },
];

const MOCK_MEMBER_EXCLUSIVES: RiseLocalDeal[] = [
  {
    id: 1,
    title: "BOGO Iced Latte",
    vendorName: "Downtown Coffee Co",
    vendorCategory: "Cafe",
    imageUrl: "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400&h=300&fit=crop",
    savings: 8,
    distance: "0.3 mi",
    redemptionWindow: "Redeem today",
    dealType: "bogo",
    memberOnly: true,
  },
  {
    id: 2,
    title: "50% Off Any Entree",
    vendorName: "Bella Naples Pizzeria",
    vendorCategory: "Italian",
    imageUrl: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&h=300&fit=crop",
    savings: 12,
    distance: "0.5 mi",
    redemptionWindow: "Redeem today",
    dealType: "value",
    memberOnly: true,
  },
  {
    id: 3,
    title: "Free Dessert with Meal",
    vendorName: "River District Bistro",
    vendorCategory: "American",
    imageUrl: "https://images.unsplash.com/photo-1551024506-0bccd828d307?w=400&h=300&fit=crop",
    savings: 9,
    distance: "0.8 mi",
    redemptionWindow: "Valid all week",
    dealType: "memberOnly",
    memberOnly: true,
  },
  {
    id: 4,
    title: "BOGO Craft Beer",
    vendorName: "Fort Myers Brewing",
    vendorCategory: "Brewery",
    imageUrl: "https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=400&h=300&fit=crop",
    savings: 7,
    distance: "1.2 mi",
    redemptionWindow: "Happy hour only",
    dealType: "bogo",
    memberOnly: true,
  },
  {
    id: 5,
    title: "20% Off Haircut",
    vendorName: "Style Studio SWFL",
    vendorCategory: "Salon",
    imageUrl: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&h=300&fit=crop",
    savings: 15,
    distance: "0.4 mi",
    redemptionWindow: "Book today",
    dealType: "value",
    memberOnly: true,
  },
];

const MOCK_BEST_VALUE: RiseLocalDeal[] = [
  {
    id: 6,
    title: "Family Pizza Night Bundle",
    vendorName: "Joe's NY Pizza",
    vendorCategory: "Pizza",
    imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&h=300&fit=crop",
    savings: 18,
    distance: "0.6 mi",
    redemptionWindow: "Redeem today",
    dealType: "value",
    memberOnly: false,
  },
  {
    id: 7,
    title: "Oil Change Special",
    vendorName: "SWFL Auto Care",
    vendorCategory: "Auto",
    imageUrl: "https://images.unsplash.com/photo-1487754180451-c456f719a1fc?w=400&h=300&fit=crop",
    savings: 25,
    distance: "1.5 mi",
    redemptionWindow: "Valid this month",
    dealType: "value",
    memberOnly: true,
  },
  {
    id: 8,
    title: "Sunset Kayak Tour",
    vendorName: "Gulf Coast Adventures",
    vendorCategory: "Tours",
    imageUrl: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400&h=300&fit=crop",
    savings: 20,
    distance: "2.1 mi",
    redemptionWindow: "Book ahead",
    dealType: "value",
    memberOnly: false,
  },
  {
    id: 9,
    title: "Spa Day Package",
    vendorName: "Zen Wellness Spa",
    vendorCategory: "Spa",
    imageUrl: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400&h=300&fit=crop",
    savings: 35,
    distance: "0.9 mi",
    redemptionWindow: "Limited availability",
    dealType: "value",
    memberOnly: true,
  },
];

const MOCK_NEW_SPOTS: RiseLocalDeal[] = [
  {
    id: 10,
    title: "Grand Opening Special",
    vendorName: "Sunrise Smoothie Bar",
    vendorCategory: "Juice",
    imageUrl: "https://images.unsplash.com/photo-1502741224143-90386d7f8c82?w=400&h=300&fit=crop",
    savings: 6,
    distance: "0.2 mi",
    redemptionWindow: "This week only",
    dealType: "new",
    memberOnly: false,
    isNew: true,
  },
  {
    id: 11,
    title: "Free Appetizer",
    vendorName: "Taco Loco",
    vendorCategory: "Mexican",
    imageUrl: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400&h=300&fit=crop",
    savings: 8,
    distance: "0.7 mi",
    redemptionWindow: "Redeem today",
    dealType: "new",
    memberOnly: true,
    isNew: true,
  },
  {
    id: 12,
    title: "BOGO Yoga Class",
    vendorName: "Flow Yoga Studio",
    vendorCategory: "Fitness",
    imageUrl: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&h=300&fit=crop",
    savings: 15,
    distance: "0.4 mi",
    redemptionWindow: "New member offer",
    dealType: "new",
    memberOnly: false,
    isNew: true,
  },
  {
    id: 13,
    title: "25% Off First Visit",
    vendorName: "The Barber Shop",
    vendorCategory: "Grooming",
    imageUrl: "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=400&h=300&fit=crop",
    savings: 10,
    distance: "0.5 mi",
    redemptionWindow: "First timers",
    dealType: "new",
    memberOnly: true,
    isNew: true,
  },
];

const ALL_DEALS = [...MOCK_MEMBER_EXCLUSIVES, ...MOCK_BEST_VALUE, ...MOCK_NEW_SPOTS];

export default function Discover() {
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [userMembershipStatus] = useState(false);

  const filterDeals = (deals: RiseLocalDeal[], filter: string): RiseLocalDeal[] => {
    if (filter === "all") return deals;
    if (filter === "memberOnly") return deals.filter((d) => d.memberOnly);
    if (filter === "free") return deals.filter((d) => !d.memberOnly);
    if (filter === "bogo") return deals.filter((d) => d.dealType === "bogo");
    if (filter === "value") return deals.filter((d) => d.savings >= 5);
    if (filter === "new") return deals.filter((d) => d.isNew);
    if (filter === "near") return deals.filter((d) => parseFloat(d.distance) <= 0.5);
    return deals;
  };

  const memberExclusives = filterDeals(MOCK_MEMBER_EXCLUSIVES, selectedFilter);
  const bestValue = filterDeals(MOCK_BEST_VALUE, selectedFilter);
  const newSpots = filterDeals(MOCK_NEW_SPOTS, selectedFilter);

  const getFilterUrl = (filter: string) => `/browse?filter=${filter}`;

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
            <button className="text-xs text-primary ml-1" data-testid="link-change-location">
              Change
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

      {/* Filter Chips */}
      <div className="border-b border-border bg-background">
        <ScrollArea className="w-full">
          <div className="flex gap-2 px-4 py-3">
            {FILTER_CHIPS.map((chip) => {
              const Icon = chip.icon;
              return (
                <button
                  key={chip.id}
                  onClick={() => setSelectedFilter(chip.id)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    selectedFilter === chip.id
                      ? "bg-foreground text-background"
                      : "bg-muted text-foreground border border-border hover:bg-muted/80"
                  }`}
                  data-testid={`pill-filter-${chip.id}`}
                >
                  {Icon && <Icon className="w-3 h-3" />}
                  {chip.label}
                </button>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" className="invisible" />
        </ScrollArea>
      </div>

      {/* Member Exclusives Section */}
      <section className="pt-4">
        <div className="flex items-center justify-between px-4 mb-3">
          <h2 className="text-base font-semibold text-foreground" data-testid="heading-member-exclusives">
            Member Exclusives Near You
          </h2>
          <Link href={getFilterUrl("memberOnly")}>
            <button
              className="flex items-center gap-1 text-sm text-primary font-medium"
              data-testid="link-see-all-member-exclusives"
            >
              See all
              <ChevronRight className="w-4 h-4" />
            </button>
          </Link>
        </div>
        
        {memberExclusives.length > 0 ? (
          <ScrollArea className="w-full">
            <div className="flex gap-4 px-4 pb-4">
              {memberExclusives.map((deal) => (
                <RiseLocalDealCard key={deal.id} deal={deal} isMember={userMembershipStatus} />
              ))}
            </div>
            <ScrollBar orientation="horizontal" className="invisible" />
          </ScrollArea>
        ) : (
          <div className="px-4 py-8 text-center text-muted-foreground text-sm">
            No deals match this filter. Try "All Deals".
          </div>
        )}
      </section>

      {/* Membership Banner */}
      <MembershipBanner isMember={userMembershipStatus} />

      {/* Best Value Section */}
      <section className="pt-3">
        <div className="flex items-center justify-between px-4 mb-3">
          <h2 className="text-base font-semibold text-foreground" data-testid="heading-best-value">
            Best Value Right Now ($5+ savings)
          </h2>
          <Link href={getFilterUrl("value")}>
            <button
              className="flex items-center gap-1 text-sm text-primary font-medium"
              data-testid="link-see-all-best-value"
            >
              See all
              <ChevronRight className="w-4 h-4" />
            </button>
          </Link>
        </div>

        {bestValue.length > 0 ? (
          <ScrollArea className="w-full">
            <div className="flex gap-4 px-4 pb-4">
              {bestValue.map((deal) => (
                <RiseLocalDealCard key={deal.id} deal={deal} isMember={userMembershipStatus} />
              ))}
            </div>
            <ScrollBar orientation="horizontal" className="invisible" />
          </ScrollArea>
        ) : (
          <div className="px-4 py-8 text-center text-muted-foreground text-sm">
            No deals match this filter. Try "All Deals".
          </div>
        )}
      </section>

      {/* New Local Spots Section */}
      <section className="pt-4">
        <div className="flex items-center justify-between px-4 mb-3">
          <h2 className="text-base font-semibold text-foreground" data-testid="heading-new-spots">
            New Local Spots Added
          </h2>
          <Link href={getFilterUrl("new")}>
            <button
              className="flex items-center gap-1 text-sm text-primary font-medium"
              data-testid="link-see-all-new-spots"
            >
              See all
              <ChevronRight className="w-4 h-4" />
            </button>
          </Link>
        </div>

        {newSpots.length > 0 ? (
          <ScrollArea className="w-full">
            <div className="flex gap-4 px-4 pb-4">
              {newSpots.map((deal) => (
                <RiseLocalDealCard key={deal.id} deal={deal} isMember={userMembershipStatus} />
              ))}
            </div>
            <ScrollBar orientation="horizontal" className="invisible" />
          </ScrollArea>
        ) : (
          <div className="px-4 py-8 text-center text-muted-foreground text-sm">
            No deals match this filter. Try "All Deals".
          </div>
        )}
      </section>

      {/* Additional spacing for bottom nav */}
      <div className="h-4" />
    </div>
  );
}
