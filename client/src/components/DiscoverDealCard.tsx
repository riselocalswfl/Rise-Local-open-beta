import { useState, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { MapPin, Clock, Lock, RefreshCw } from "lucide-react";

function getFrequencyLabel(frequency?: "weekly" | "monthly" | "unlimited"): string | null {
  switch (frequency) {
    case "weekly": return "1x/week";
    case "monthly": return "1x/month";
    case "unlimited": return null;
    default: return null;
  }
}
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import placeholderImage from "@assets/stock_images/local_store_shopping_d3918e51.jpg";

export interface DiscoverDeal {
  id: string;
  title: string;
  vendorId: string;
  vendorName: string;
  vendorCategory?: string;
  imageUrl?: string;
  vendorBannerUrl?: string;
  vendorLogoUrl?: string;
  savings: number;
  distance: string;
  redemptionWindow?: string;
  memberOnly: boolean;
  isNew?: boolean;
  isFictitious?: boolean;
  city?: string;
  redemptionFrequency?: "weekly" | "monthly" | "unlimited";
}

interface DiscoverDealCardProps {
  deal: DiscoverDeal;
  isMember?: boolean;
}

export default function DiscoverDealCard({ deal, isMember = false }: DiscoverDealCardProps) {
  const [, setLocation] = useLocation();
  const isLocked = deal.memberOnly && !isMember;

  const imageFallbackChain = [
    deal.imageUrl,
    deal.vendorBannerUrl,
    deal.vendorLogoUrl,
    placeholderImage,
  ].filter((url): url is string => Boolean(url));
  
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const currentImage = imageFallbackChain[currentImageIndex] || placeholderImage;

  const handleImageError = useCallback(() => {
    if (currentImageIndex < imageFallbackChain.length - 1) {
      setCurrentImageIndex(prev => prev + 1);
    }
  }, [currentImageIndex, imageFallbackChain.length]);

  const handleUnlockClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLocation("/membership");
  }, [setLocation]);

  const cardContent = (
    <Card 
      className="hover-elevate active-elevate-2 h-full relative overflow-hidden" 
      data-testid={`card-deal-${deal.id}`}
    >
      <div className="relative w-full aspect-[16/9] overflow-hidden">
        <img
          src={currentImage}
          alt={deal.title}
          className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${isLocked ? 'blur-[3px]' : ''}`}
          onError={handleImageError}
          data-testid={`img-deal-${deal.id}`}
        />
        {deal.savings > 0 && !isLocked && (
          <div className="absolute bottom-1.5 left-1.5">
            <Badge 
              variant="outline" 
              className="text-[10px] px-1.5 py-0.5 bg-background/90 backdrop-blur-sm border-primary/20 text-foreground font-semibold"
              data-testid={`badge-savings-${deal.id}`}
            >
              Save ${deal.savings}
            </Badge>
          </div>
        )}
        {deal.isFictitious && (
          <div className="absolute top-1.5 right-1.5">
            <Badge 
              variant="outline" 
              className="text-[8px] px-1 py-0.5 bg-amber-100 border-amber-300 text-amber-700"
            >
              Sample
            </Badge>
          </div>
        )}
        {isLocked && (
          <div className="absolute inset-0 bg-background/40 flex flex-col items-center justify-between py-2">
            <div className="flex items-center gap-1.5 bg-background/90 backdrop-blur-sm rounded-full px-2.5 py-1">
              <Lock className="w-3.5 h-3.5 text-primary" />
              <span className="text-[10px] font-medium text-foreground">Rise Local Pass</span>
              <Button 
                size="sm" 
                className="text-[9px] h-5 px-2 ml-0.5" 
                onClick={handleUnlockClick}
                data-testid={`button-unlock-${deal.id}`}
              >
                Join
              </Button>
            </div>
            {deal.savings > 0 && (
              <Badge 
                variant="outline" 
                className="text-[10px] px-1.5 py-0.5 bg-background/90 backdrop-blur-sm border-primary/20 text-foreground font-semibold"
                data-testid={`badge-savings-locked-${deal.id}`}
              >
                Save ${deal.savings}
              </Badge>
            )}
          </div>
        )}
      </div>
      
      <CardContent className="p-2">
        <div className="flex items-center gap-1.5 mb-0.5">
          <Avatar className="w-5 h-5 flex-shrink-0" data-testid={`avatar-vendor-${deal.id}`}>
            <AvatarImage src={deal.vendorLogoUrl} alt={deal.vendorName} />
            <AvatarFallback className="text-[8px] bg-primary/10 text-primary font-semibold">
              {deal.vendorName?.charAt(0)?.toUpperCase() || "B"}
            </AvatarFallback>
          </Avatar>
          <p className="text-xs font-semibold text-foreground truncate" data-testid={`deal-vendor-${deal.id}`}>
            {deal.vendorName}
          </p>
        </div>
        <h3 className="text-xs text-muted-foreground line-clamp-2 mb-1.5" data-testid={`deal-title-${deal.id}`}>
          {deal.title}
        </h3>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground flex-wrap">
          <span className="flex items-center gap-0.5 max-w-full">
            <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
            <span className="truncate">{deal.city || deal.distance || "SWFL"}</span>
          </span>
          {getFrequencyLabel(deal.redemptionFrequency) && (
            <span className="flex items-center gap-0.5" data-testid={`text-frequency-${deal.id}`}>
              <RefreshCw className="w-2.5 h-2.5 flex-shrink-0" />
              <span>{getFrequencyLabel(deal.redemptionFrequency)}</span>
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
  
  if (isLocked) {
    return cardContent;
  }
  
  return (
    <Link href={`/deals/${deal.id}`} data-testid={`link-deal-${deal.id}`}>
      {cardContent}
    </Link>
  );
}
