import { useLocation } from "wouter";
import { MapPin, Clock, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCallback } from "react";

export type DealType = "memberOnly" | "free" | "bogo" | "value" | "new";

export interface RiseLocalDeal {
  id: number;
  title: string;
  vendorId: string;
  vendorName: string;
  vendorCategory?: string;
  imageUrl?: string;
  savings: number;
  distance: string;
  redemptionWindow?: string;
  dealType: DealType;
  memberOnly: boolean;
  isNew?: boolean;
  isFictitious?: boolean;
}

interface RiseLocalDealCardProps {
  deal: RiseLocalDeal;
  isMember?: boolean;
}

export default function RiseLocalDealCard({ deal, isMember = false }: RiseLocalDealCardProps) {
  const [, setLocation] = useLocation();
  const isLocked = deal.memberOnly && !isMember;

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
        <div className="relative rounded-xl overflow-hidden bg-muted aspect-[4/3] mb-2">
          {deal.imageUrl ? (
            <img
              src={deal.imageUrl}
              alt={deal.title}
              className={`w-full h-full object-cover transition-transform duration-300 ${
                isLocked ? "blur-[2px]" : "group-hover:scale-105"
              }`}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/10">
              <span className="text-4xl font-bold text-primary/30">
                {deal.vendorName[0]}
              </span>
            </div>
          )}
          
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

          {/* Savings pill */}
          <div className="absolute bottom-2 left-2">
            <Badge 
              variant="outline" 
              className="text-[10px] px-1.5 py-0.5 bg-background/90 backdrop-blur-sm border-primary/20 text-foreground"
              data-testid={`badge-savings-${deal.id}`}
            >
              Save ${deal.savings}
            </Badge>
          </div>

          {/* Locked overlay */}
          {isLocked && (
            <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex flex-col items-center justify-center p-3">
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
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <h3 className="font-medium text-sm line-clamp-1 text-foreground">
              {deal.vendorName}
            </h3>
            {deal.vendorCategory && (
              <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">
                {deal.vendorCategory}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2">
            {deal.title}
          </p>
          
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-0.5">
              <MapPin className="w-3 h-3" />
              {deal.distance}
            </span>
            {deal.redemptionWindow && (
              <span className="flex items-center gap-0.5">
                <Clock className="w-3 h-3" />
                {deal.redemptionWindow}
              </span>
            )}
          </div>
        </div>
    </div>
  );
}
