import { useLocation } from "wouter";
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
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useCallback, useState } from "react";
import placeholderImage from "@assets/stock_images/local_store_shopping_d3918e51.jpg";

export type DealType = "memberOnly" | "standard" | "bogo" | "value" | "new";

export interface RiseLocalDeal {
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
  city?: string;
  redemptionWindow?: string;
  dealType: DealType;
  memberOnly: boolean;
  isNew?: boolean;
  isFictitious?: boolean;
  redemptionFrequency?: "weekly" | "monthly" | "unlimited";
}

interface RiseLocalDealCardProps {
  deal: RiseLocalDeal;
  isMember?: boolean;
}

export default function RiseLocalDealCard({ deal, isMember = false }: RiseLocalDealCardProps) {
  const [, setLocation] = useLocation();
  const isLocked = deal.memberOnly && !isMember;

  // Build fallback chain: deal image -> vendor banner -> vendor logo -> placeholder
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

  const handleCardClick = useCallback(() => {
    if (!isLocked) {
      setLocation(`/deals/${deal.id}`);
    }
  }, [isLocked, deal.id, setLocation]);

  const handleUnlockClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setLocation("/membership");
  }, [setLocation]);

  return (
    <div
      className="flex-shrink-0 w-[180px] cursor-pointer group relative"
      data-testid={`card-deal-${deal.id}`}
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') handleCardClick(); }}
    >
        <div className="relative rounded-xl overflow-hidden bg-muted aspect-square mb-2">
          <img
            src={currentImage}
            alt={deal.title}
            className={`w-full h-full object-cover object-center transition-transform duration-300 ${
              isLocked ? "blur-[2px]" : "group-hover:scale-105"
            }`}
            onError={handleImageError}
            data-testid={`img-deal-${deal.id}`}
          />
          
          {/* Top badges */}
          <div className="absolute top-2 left-2 flex flex-wrap gap-1">
            {deal.memberOnly && (
              <Badge 
                variant="default" 
                className="text-[10px] px-1.5 py-0.5 bg-primary"
                data-testid={`badge-member-only-${deal.id}`}
              >
                Member Only
              </Badge>
            )}
          </div>

          {/* Sample Deal badge for fictitious deals */}
          {deal.isFictitious && (
            <div className="absolute top-2 right-2">
              <Badge 
                variant="outline" 
                className="text-[9px] px-1.5 py-0.5 bg-amber-100 border-amber-300 text-amber-700"
                data-testid={`badge-sample-${deal.id}`}
              >
                Sample
              </Badge>
            </div>
          )}

          {/* Savings pill - only show when not locked */}
          {!isLocked && (
            <div className="absolute bottom-2 left-2">
              <Badge 
                variant="outline" 
                className="text-[10px] px-1.5 py-0.5 bg-background/90 backdrop-blur-sm border-primary/20 text-foreground"
                data-testid={`badge-savings-${deal.id}`}
              >
                Save ${deal.savings}
              </Badge>
            </div>
          )}

          {/* Locked overlay */}
          {isLocked && (
            <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex flex-col items-center justify-between py-3 px-3">
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
              <Badge 
                variant="outline" 
                className="text-[10px] px-1.5 py-0.5 bg-background/90 backdrop-blur-sm border-primary/20 text-foreground"
                data-testid={`badge-savings-locked-${deal.id}`}
              >
                Save ${deal.savings}
              </Badge>
            </div>
          )}
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <Avatar className="w-5 h-5 flex-shrink-0" data-testid={`avatar-vendor-${deal.id}`}>
              <AvatarImage src={deal.vendorLogoUrl} alt={deal.vendorName} />
              <AvatarFallback className="text-[8px] bg-primary/10 text-primary font-semibold">
                {deal.vendorName?.charAt(0)?.toUpperCase() || "B"}
              </AvatarFallback>
            </Avatar>
            <h3 className="text-business-name line-clamp-1 text-foreground">
              {deal.vendorName}
            </h3>
            {deal.vendorCategory && (
              <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">
                {deal.vendorCategory}
              </Badge>
            )}
          </div>
          <p className="text-meta text-muted-foreground line-clamp-2">
            {deal.title}
          </p>
          
          <div className="flex items-center gap-2 text-meta text-muted-foreground flex-wrap">
            <span className="flex items-center gap-0.5">
              <MapPin className="w-3 h-3" />
              {deal.city || deal.distance}
            </span>
            {deal.redemptionWindow && (
              <span className="flex items-center gap-0.5">
                <Clock className="w-3 h-3" />
                {deal.redemptionWindow}
              </span>
            )}
            {getFrequencyLabel(deal.redemptionFrequency) && (
              <span className="flex items-center gap-0.5" data-testid={`text-frequency-${deal.id}`}>
                <RefreshCw className="w-3 h-3" />
                {getFrequencyLabel(deal.redemptionFrequency)}
              </span>
            )}
          </div>
        </div>
    </div>
  );
}
