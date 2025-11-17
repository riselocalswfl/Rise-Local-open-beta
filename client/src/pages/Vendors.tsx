import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import Header from "@/components/Header";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { BadgeCheck } from "lucide-react";
import type { UnifiedVendorListing } from "@shared/schema";

export default function Vendors() {
  const { data: vendors, isLoading} = useQuery<UnifiedVendorListing[]>({
    queryKey: ["/api/vendors"],
  });

  const getVendorTypeBadge = (type: "shop" | "dine" | "service") => {
    const badges = {
      shop: { label: "Shop", variant: "default" as const },
      dine: { label: "Dine", variant: "secondary" as const },
      service: { label: "Service", variant: "outline" as const },
    };
    return badges[type];
  };

  const getVendorLink = (vendor: UnifiedVendorListing) => {
    if (vendor.vendorType === "shop") return `/vendor/${vendor.id}`;
    if (vendor.vendorType === "dine") return `/restaurant/${vendor.id}`;
    return `/services/${vendor.id}`;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-semibold mb-8" data-testid="heading-local-vendors">Local Vendors</h1>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {isLoading ? (
            <>
              <Skeleton className="h-40" />
              <Skeleton className="h-40" />
              <Skeleton className="h-40" />
            </>
          ) : vendors && vendors.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <p className="text-muted-foreground">No vendors currently listed. Check back soon!</p>
            </div>
          ) : (
            vendors?.map((vendor) => {
              const typeBadge = getVendorTypeBadge(vendor.vendorType);
              const vendorLink = getVendorLink(vendor);
              
              return (
                <Link key={vendor.id} href={vendorLink}>
                  <Card className="hover-elevate active-elevate-2" data-testid={`card-vendor-${vendor.id}`}>
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                        <Avatar className="h-16 w-16 flex-shrink-0">
                          <AvatarImage src={vendor.logoUrl} alt={vendor.businessName} />
                          <AvatarFallback>{vendor.businessName.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold text-lg" data-testid={`text-vendor-name-${vendor.id}`}>
                                {vendor.businessName}
                              </h3>
                              {vendor.isVerified && (
                                <BadgeCheck className="h-5 w-5 text-primary" data-testid={`icon-verified-${vendor.id}`} />
                              )}
                            </div>
                            <Badge variant={typeBadge.variant} data-testid={`badge-type-${vendor.id}`}>
                              {typeBadge.label}
                            </Badge>
                          </div>
                          {vendor.tagline && (
                            <p className="text-sm text-muted-foreground mb-2" data-testid={`text-tagline-${vendor.id}`}>
                              {vendor.tagline}
                            </p>
                          )}
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-2" data-testid={`text-bio-${vendor.id}`}>
                            {vendor.bio}
                          </p>
                          <div className="flex flex-wrap gap-2 items-center text-sm text-muted-foreground">
                            <span data-testid={`text-city-${vendor.id}`}>{vendor.city}, FL</span>
                            {vendor.categories && vendor.categories.length > 0 && (
                              <>
                                <span>•</span>
                                <span data-testid={`text-categories-${vendor.id}`}>
                                  {vendor.categories.slice(0, 2).join(", ")}
                                  {vendor.categories.length > 2 && ` +${vendor.categories.length - 2}`}
                                </span>
                              </>
                            )}
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
