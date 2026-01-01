import { Link } from "wouter";
import { Lock, MapPin, Tag } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { Deal, Vendor } from "@shared/schema";
import { isMemberOnlyDeal } from "@shared/dealAccess";

interface DealCardProps {
  deal: Deal;
  vendor?: Vendor;
  isPremiumUser?: boolean;
  distanceMiles?: number;
}

export default function DealCard({ deal, vendor, isPremiumUser = false, distanceMiles }: DealCardProps) {
  const isMemberOnly = isMemberOnlyDeal(deal);
  const isLocked = isMemberOnly && !isPremiumUser;

  const dealTypeLabels: Record<string, string> = {
    bogo: "Buy One Get One",
    percent: "% Off",
    addon: "Free Add-on",
  };

  const cardContent = (
    <Card
      className={`group overflow-hidden transition-all hover:shadow-lg ${
        isLocked ? "relative" : ""
      }`}
      data-testid={`card-deal-${deal.id}`}
    >
      {isLocked && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/60 backdrop-blur-sm p-4">
          <Lock className="w-6 h-6 text-primary mb-2" />
          <p className="text-xs text-center text-foreground font-medium mb-2">
            Unlock with Rise Local Pass
          </p>
          <Button 
            size="sm" 
            className="text-xs h-7" 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              window.location.href = "/membership";
            }}
            data-testid={`button-unlock-${deal.id}`}
          >
            Join Now
          </Button>
        </div>
      )}

      {/* Deal image */}
      {deal.imageUrl && (
        <div className={`relative w-full aspect-[16/9] overflow-hidden ${isLocked ? "blur-sm" : ""}`}>
          <img
            src={deal.imageUrl}
            alt={deal.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            data-testid={`img-deal-${deal.id}`}
          />
        </div>
      )}

      <CardContent className={`p-4 ${isLocked ? "blur-sm" : ""}`}>
        <div className="flex items-start gap-3 mb-3">
          <Avatar className="h-12 w-12 border">
            <AvatarImage src={vendor?.logoUrl || ""} alt={vendor?.businessName || "Business"} />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {(vendor?.businessName || "V")[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-muted-foreground truncate">
              {vendor?.businessName || "Local Business"}
            </p>
            <h3 className="font-semibold text-lg leading-tight line-clamp-2">
              {deal.title}
            </h3>
          </div>
        </div>

        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
          {isLocked ? "Join Rise Local Pass to unlock this exclusive member deal" : deal.description}
        </p>

        <div className="flex flex-wrap gap-2">
          {deal.category && (
            <Badge variant="secondary" className="text-xs">
              <Tag className="w-3 h-3 mr-1" />
              {deal.category}
            </Badge>
          )}
          {distanceMiles !== undefined ? (
            <Badge variant="outline" className="text-xs">
              <MapPin className="w-3 h-3 mr-1" />
              {distanceMiles} mi away
            </Badge>
          ) : deal.city && (
            <Badge variant="outline" className="text-xs">
              <MapPin className="w-3 h-3 mr-1" />
              {deal.city}
            </Badge>
          )}
          <Badge
            variant={deal.dealType === "bogo" ? "default" : "secondary"}
            className="text-xs"
          >
            {dealTypeLabels[deal.dealType] || deal.dealType}
          </Badge>
          {isMemberOnly && (
            <Badge className="text-xs bg-primary">
              Member Only
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );

  // All deals are clickable - even locked ones navigate to detail page
  // where users can see full details but redemption/codes are locked
  return (
    <Link href={`/deals/${deal.id}`} data-testid={`link-deal-${deal.id}`}>
      {cardContent}
    </Link>
  );
}
