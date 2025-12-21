import { Heart, Tag, MapPin, Store, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Deal } from "@shared/schema";

interface FavoriteDeal extends Deal {
  vendorName: string | null;
  vendorLogoUrl: string | null;
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
          <div className="space-y-4">
            {favorites.map((deal) => (
              <Card key={deal.id} className="overflow-hidden" data-testid={`card-favorite-deal-${deal.id}`}>
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    <Avatar className="h-14 w-14 border shrink-0">
                      <AvatarImage src={deal.vendorLogoUrl || ""} alt={deal.vendorName || "Business"} />
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {(deal.vendorName || "V")[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
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
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                        {deal.description}
                      </p>
                      
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {deal.category && (
                          <Badge variant="secondary" className="text-xs">
                            <Tag className="w-2.5 h-2.5 mr-1" />
                            {deal.category}
                          </Badge>
                        )}
                        {deal.city && (
                          <Badge variant="outline" className="text-xs">
                            <MapPin className="w-2.5 h-2.5 mr-1" />
                            {deal.city}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <Button
                      size="icon"
                      variant="ghost"
                      className="shrink-0 text-muted-foreground hover:text-red-500"
                      onClick={() => removeFavorite.mutate(deal.id)}
                      disabled={removeFavorite.isPending}
                      data-testid={`button-remove-favorite-${deal.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
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
