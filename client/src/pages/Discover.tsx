import { useState } from "react";
import { Link } from "wouter";
import { Compass, ChevronDown, ChevronRight, Lock } from "lucide-react";
import RiseLocalDealCard, { RiseLocalDeal, DealType } from "@/components/RiseLocalDealCard";
import MembershipBanner from "@/components/MembershipBanner";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import LocalSpotlight from "@/components/LocalSpotlight";

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
    isFictitious: true,
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
    isFictitious: true,
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
    isFictitious: true,
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
    isFictitious: true,
  },
];

const ALL_DEALS = [...MOCK_MEMBER_EXCLUSIVES, ...MOCK_BEST_VALUE, ...MOCK_NEW_SPOTS];

export default function Discover() {
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [userMembershipStatus] = useState(false);
  const { user } = useAuth();

  // Generate user initials from first and last name
  const getUserInitials = () => {
    if (!user) return "?";
    const first = user.firstName?.charAt(0)?.toUpperCase() || "";
    const last = user.lastName?.charAt(0)?.toUpperCase() || "";
    if (first || last) return `${first}${last}`;
    // Fallback to email initial if no name
    return user.email?.charAt(0)?.toUpperCase() || "?";
  };

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
          <Link href="/profile" data-testid="link-user-profile">
            <Avatar className="w-8 h-8 cursor-pointer hover-elevate">
              <AvatarImage src={user?.profileImageUrl || undefined} alt="Profile" />
              <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                {getUserInitials()}
              </AvatarFallback>
            </Avatar>
          </Link>
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

      {/* Local Spotlight - Sponsored Business */}
      <LocalSpotlight />

      {/* Member Exclusives Section */}
      <section className="pt-6">
        <div className="flex items-center justify-between px-4 mb-4">
          <h2 className="text-lg font-semibold text-foreground" data-testid="heading-member-exclusives">
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
      <section className="pt-2">
        <div className="flex items-center justify-between px-4 mb-4">
          <h2 className="text-lg font-semibold text-foreground" data-testid="heading-best-value">
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
      <section className="pt-6">
        <div className="flex items-center justify-between px-4 mb-4">
          <h2 className="text-lg font-semibold text-foreground" data-testid="heading-new-spots">
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
