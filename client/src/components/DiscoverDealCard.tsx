import { useState, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { MapPin, Clock, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
      <div className={`relative w-full aspect-[16/9] overflow-hidden ${isLocked ? 'blur-[2px]' : ''}`}>
        <img
          src={currentImage}
          alt={deal.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={handleImageError}
          data-testid={`img-deal-${deal.id}`}
        />
        {deal.savings > 0 && (
          <div className="absolute bottom-2 left-2">
            <Badge 
              variant="outline" 
              className="text-xs px-2 py-0.5 bg-background/90 backdrop-blur-sm border-primary/20 text-foreground font-semibold"
              data-testid={`badge-savings-${deal.id}`}
            >
              Save ${deal.savings}
            </Badge>
          </div>
        )}
        {deal.memberOnly && (
          <div className="absolute top-2 left-2">
            <Badge variant="default" className="text-[10px] px-1.5 py-0.5 bg-primary">
              Member Only
            </Badge>
          </div>
        )}
        {deal.isFictitious && (
          <div className="absolute top-2 right-2">
            <Badge 
              variant="outline" 
              className="text-[9px] px-1.5 py-0.5 bg-amber-100 border-amber-300 text-amber-700"
            >
              Sample
            </Badge>
          </div>
        )}
      </div>
      
      <CardContent className={`p-3 ${isLocked ? 'blur-[2px]' : ''}`}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-semibold text-foreground truncate" data-testid={`deal-vendor-${deal.id}`}>
            {deal.vendorName}
          </span>
          {deal.vendorCategory && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 flex-shrink-0">
              {deal.vendorCategory}
            </Badge>
          )}
        </div>
        <h3 className="text-sm text-muted-foreground line-clamp-2 mb-2" data-testid={`deal-title-${deal.id}`}>
          {deal.title}
        </h3>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {deal.distance}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Redeem today
          </span>
        </div>
      </CardContent>
      
      {isLocked && (
        <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex flex-col items-center justify-center p-4 z-10">
          <Lock className="w-6 h-6 text-primary mb-2" />
          <p className="text-xs text-center text-foreground font-medium mb-2">
            Unlock with Rise Local Pass
          </p>
          <Button 
            size="sm" 
            className="text-xs h-7" 
            onClick={handleUnlockClick}
            data-testid={`button-unlock-${deal.id}`}
          >
            Join Now
          </Button>
        </div>
      )}
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
