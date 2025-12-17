import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { BadgeCheck, MapPin, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import type { UnifiedVendorListing } from "@shared/schema";

export default function Businesses() {
  const [searchQuery, setSearchQuery] = useState("");
  
  const { data: vendors, isLoading, error } = useQuery<UnifiedVendorListing[]>({
    queryKey: ["/api/vendors"],
  });

  const filteredVendors = vendors?.filter((vendor) =>
    vendor.businessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    vendor.bio?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    vendor.city?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getVendorTypeBadge = (type: "shop" | "dine" | "service") => {
    const badges = {
      shop: { label: "Shop", variant: "default" as const },
      dine: { label: "Dine", variant: "secondary" as const },
      service: { label: "Service", variant: "outline" as const },
    };
    return badges[type];
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background border-b border-border px-4 py-3">
        <h1 className="text-xl font-semibold mb-3" data-testid="heading-businesses">
          Local Businesses
        </h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search businesses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-businesses"
          />
        </div>
      </header>
      
      <main className="px-4 py-4">
        <div className="space-y-3">
          {error ? (
            <div className="text-center py-12">
              <p className="text-destructive mb-2">Failed to load businesses</p>
              <p className="text-sm text-muted-foreground">{(error as Error).message}</p>
            </div>
          ) : isLoading ? (
            <>
              <Skeleton className="h-24 rounded-lg" />
              <Skeleton className="h-24 rounded-lg" />
              <Skeleton className="h-24 rounded-lg" />
            </>
          ) : filteredVendors && filteredVendors.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {searchQuery ? "No businesses match your search." : "No businesses listed yet."}
              </p>
            </div>
          ) : (
            filteredVendors?.map((vendor) => {
              const typeBadge = getVendorTypeBadge(vendor.vendorType);
              
              return (
                <Link key={vendor.id} href={`/businesses/${vendor.id}`}>
                  <Card className="hover-elevate active-elevate-2" data-testid={`card-business-${vendor.id}`}>
                    <CardContent className="p-4">
                      <div className="flex gap-3">
                        <Avatar className="h-14 w-14 flex-shrink-0">
                          <AvatarImage src={vendor.logoUrl} alt={vendor.businessName} />
                          <AvatarFallback>{vendor.businessName.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h3 className="font-semibold" data-testid={`text-business-name-${vendor.id}`}>
                                {vendor.businessName}
                              </h3>
                              {vendor.isVerified && (
                                <BadgeCheck className="h-4 w-4 text-primary" data-testid={`icon-verified-${vendor.id}`} />
                              )}
                            </div>
                            <Badge variant={typeBadge.variant} className="text-xs" data-testid={`badge-type-${vendor.id}`}>
                              {typeBadge.label}
                            </Badge>
                          </div>
                          {vendor.tagline && (
                            <p className="text-sm text-muted-foreground mb-1 line-clamp-1" data-testid={`text-tagline-${vendor.id}`}>
                              {vendor.tagline}
                            </p>
                          )}
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            <span data-testid={`text-city-${vendor.id}`}>{vendor.city}, FL</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}
