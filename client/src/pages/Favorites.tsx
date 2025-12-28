import { useState, useCallback } from "react";
import { Heart, MapPin, Store, Trash2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Deal } from "@shared/schema";
import placeholderImage from "@assets/stock_images/local_store_shopping_d3918e51.jpg";

interface FavoriteDeal extends Deal {
  vendorName: string | null;
  vendorLogoUrl: string | null;
  vendorBannerUrl?: string | null;
}

interface FavoriteCardProps {
  deal: FavoriteDeal;
  onRemove: (id: string) => void;
  isRemoving: boolean;
}

function getSavingsLabel(savings: number, discountType?: string | null, discountValue?: number | null): string {
  if (discountType === "PERCENT" && discountValue && discountValue > 0) {
    return `Save ${Math.round(discountValue)}%`;
  }
  return `Save $${savings}`;
}

function FavoriteCard({ deal, onRemove, isRemoving }: FavoriteCardProps) {
  const imageFallbackChain = [
    deal.imageUrl,
    deal.vendorBannerUrl,
    deal.vendorLogoUrl,
    placeholderImage,
  ].filter((url): url is string => Boolean(url));
  
  const [imageIndex, setImageIndex] = useState(0);
  const currentImage = imageFallbackChain[imageIndex] || placeholderImage;
  
  const handleImageError = useCallback(() => {
    if (imageIndex < imageFallbackChain.length - 1) {
      setImageIndex(prev => prev + 1);
    }
  }, [imageIndex, imageFallbackChain.length]);
  
  const savings = deal.savingsAmount || 0;
  
  return (
    <Card className="overflow-hidden" data-testid={`card-favorite-deal-${deal.id}`}>
      <Link href={`/deals/${deal.id}`}>
        <div className="relative w-full aspect-[16/9] overflow-hidden">
          <img
            src={currentImage}
            alt={deal.title}
            className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
            onError={handleImageError}
            data-testid={`img-favorite-deal-${deal.id}`}
          />
          {savings > 0 && (
            <div className="absolute bottom-2 left-2">
              <Badge 
                variant="outline" 
                className="text-xs px-2 py-0.5 bg-background/90 backdrop-blur-sm border-primary/20 text-foreground font-semibold"
              >
                {getSavingsLabel(savings, deal.discountType, deal.discountValue)}
              </Badge>
            </div>
          )}
          {deal.isPassLocked && (
            <div className="absolute top-2 left-2">
              <Badge variant="default" className="text-[10px] px-1.5 py-0.5 bg-primary">
                Member Only
              </Badge>
            </div>
          )}
        </div>
      </Link>
      <CardContent className="p-3">
        <div className="flex gap-3">
          <div className="flex-1 min-w-0">
            <Link href={`/deals/${deal.id}`}>
              <h3 className="font-semibold text-foreground hover:text-primary transition-colors line-clamp-1" data-testid={`link-deal-${deal.id}`}>
                {deal.title}
              </h3>
            </Link>
            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
              <Store className="w-3 h-3" />
              {deal.vendorName || "Local Business"}
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
              {deal.city && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {deal.city}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Redeem today
              </span>
            </div>
          </div>

          <Button
            size="icon"
            variant="ghost"
            className="shrink-0 text-muted-foreground hover:text-red-500"
            onClick={() => onRemove(deal.id)}
            disabled={isRemoving}
            data-testid={`button-remove-favorite-${deal.id}`}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Favorites() {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();

  const { data: favorites, isLoading } = useQuery<FavoriteDeal[]>({
    queryKey: ["/api/favorites"],
    enabled: isAuthenticated,
  });

  const removeFavorite = useMutation({
    mutationFn: async (dealId: string) => {
      await apiRequest("DELETE", `/api/favorites/${dealId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
      toast({
        title: "Removed from favorites",
        description: "This deal has been removed from your saved deals.",
      });
    },
    onError: () => {
      toast({
        title: "Something went wrong",
        description: "Please try again later.",
        variant: "destructive",
      });
    },
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-40 bg-background border-b border-border">
          <div className="px-4 h-14 flex items-center">
            <h1 className="text-xl font-semibold text-foreground" data-testid="heading-favorites">
              Favorites
            </h1>
          </div>
        </header>
        <div className="p-4">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Heart className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-medium text-foreground mb-2">
              Sign in to save favorites
            </h2>
            <p className="text-sm text-muted-foreground max-w-xs mb-6">
              Create an account to save your favorite deals and vendors.
            </p>
            <Link href="/auth">
              <Button data-testid="button-sign-in">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background border-b border-border">
        <div className="px-4 h-14 flex items-center">
          <h1 className="text-xl font-semibold text-foreground" data-testid="heading-favorites">
            Favorites
          </h1>
        </div>
      </header>

      <div className="p-4">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : favorites && favorites.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {favorites.map((deal) => (
              <FavoriteCard 
                key={deal.id} 
                deal={deal} 
                onRemove={(id) => removeFavorite.mutate(id)}
                isRemoving={removeFavorite.isPending}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Heart className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-medium text-foreground mb-2">
              No favorites yet
            </h2>
            <p className="text-sm text-muted-foreground max-w-xs mb-6">
              Save your favorite deals here for quick access. Tap the heart icon on any deal to add it to your favorites.
            </p>
            <Link href="/discover">
              <Button data-testid="button-discover-deals">
                Discover Deals
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
