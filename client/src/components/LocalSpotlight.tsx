import { useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sparkles, MapPin, ChevronRight } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface SpotlightDeal {
  id: string;
  title: string;
  description: string;
  dealType: string;
  tier: string;
}

interface SpotlightVendor {
  id: string;
  businessName: string;
  displayName: string | null;
  tagline: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  heroImageUrl: string | null;
  city: string;
  vendorType: string;
}

interface SpotlightData {
  placementId: string;
  vendor: SpotlightVendor;
  deals: SpotlightDeal[];
}

export default function LocalSpotlight() {
  const [, navigate] = useLocation();
  const hasTrackedImpression = useRef(false);
  
  const { data: spotlight, isLoading } = useQuery<SpotlightData | null>({
    queryKey: ["/api/placements/discover-spotlight"],
  });

  const impressionMutation = useMutation({
    mutationFn: async (placementId: string) => {
      const sessionId = sessionStorage.getItem("spotlight_session") || crypto.randomUUID();
      sessionStorage.setItem("spotlight_session", sessionId);
      
      return apiRequest("POST", `/api/placements/${placementId}/impression`, { sessionId });
    },
  });

  const clickMutation = useMutation({
    mutationFn: async (placementId: string) => {
      return apiRequest("POST", `/api/placements/${placementId}/click`);
    },
  });

  useEffect(() => {
    if (spotlight && !hasTrackedImpression.current) {
      const sessionKey = `spotlight_imp_${spotlight.placementId}`;
      if (!sessionStorage.getItem(sessionKey)) {
        impressionMutation.mutate(spotlight.placementId);
        sessionStorage.setItem(sessionKey, "1");
      }
      hasTrackedImpression.current = true;
    }
  }, [spotlight]);

  const handleCardClick = () => {
    if (spotlight) {
      clickMutation.mutate(spotlight.placementId);
      navigate(`/businesses/${spotlight.vendor.id}`);
    }
  };

  if (isLoading || !spotlight) {
    return null;
  }

  const vendor = spotlight.vendor;
  const vendorName = vendor.displayName || vendor.businessName;
  const bannerImage = vendor.heroImageUrl || vendor.bannerUrl;

  return (
    <section className="px-4 pt-6 pb-2" data-testid="section-local-spotlight">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-amber-500" />
        <h2 className="text-lg font-semibold text-foreground" data-testid="heading-local-spotlight">
          Local Spotlight
        </h2>
      </div>

      <Card 
        className="overflow-hidden cursor-pointer hover-elevate transition-transform"
        onClick={handleCardClick}
        data-testid={`card-spotlight-${vendor.id}`}
      >
        {bannerImage && (
          <div className="relative h-32 w-full">
            <img
              src={bannerImage}
              alt={vendorName}
              className="w-full h-full object-cover"
              data-testid="img-spotlight-banner"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <Badge 
              variant="secondary" 
              className="absolute top-2 right-2 bg-amber-100 text-amber-800 text-xs"
              data-testid="badge-sponsored"
            >
              Sponsored
            </Badge>
          </div>
        )}

        <div className="p-4">
          <div className="flex items-start gap-3">
            <Avatar className="w-12 h-12 border-2 border-background shadow-sm">
              <AvatarImage src={vendor.logoUrl || undefined} alt={vendorName} />
              <AvatarFallback className="bg-primary text-primary-foreground font-bold">
                {vendorName.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground truncate" data-testid="text-spotlight-vendor-name">
                {vendorName}
              </h3>
              {vendor.tagline && (
                <p className="text-sm text-muted-foreground truncate" data-testid="text-spotlight-tagline">
                  {vendor.tagline}
                </p>
              )}
              <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                <MapPin className="w-3 h-3" />
                <span>{vendor.city}</span>
              </div>
            </div>
          </div>

          {spotlight.deals.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Featured Deals
              </p>
              {spotlight.deals.map((deal) => (
                <div 
                  key={deal.id} 
                  className="flex items-center justify-between p-2 bg-muted/50 rounded-md"
                  data-testid={`deal-spotlight-${deal.id}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {deal.title}
                    </p>
                  </div>
                  <Badge 
                    variant="outline" 
                    className="ml-2 text-xs shrink-0"
                  >
                    {deal.dealType === "bogo" ? "BOGO" : 
                     deal.dealType === "percent" ? "% Off" : 
                     deal.dealType === "addon" ? "Free Add-on" : deal.dealType}
                  </Badge>
                </div>
              ))}
            </div>
          )}

          <Button 
            variant="default" 
            className="w-full mt-4" 
            size="sm"
            data-testid="button-view-business"
          >
            View Business
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </Card>
    </section>
  );
}
