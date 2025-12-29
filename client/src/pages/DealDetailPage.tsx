import { useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { MapPin, Tag, Lock, Store, ChevronRight, MessageSquare, Ticket, Info, Heart, RefreshCw, ExternalLink, Phone, Mail, Globe } from "lucide-react";
import { SiInstagram, SiFacebook, SiTiktok, SiYoutube, SiX } from "react-icons/si";
import DetailHeader from "@/components/layout/DetailHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import RedeemDealModal from "@/components/RedeemDealModal";
import type { Deal, Vendor } from "@shared/schema";
import placeholderImage from "@assets/stock_images/local_store_shopping_d3918e51.jpg";

function getSavingsLabel(discountType?: string | null, discountValue?: number | null): string | null {
  if (!discountType || discountValue === undefined || discountValue === null) {
    return null;
  }
  const type = discountType.toLowerCase();
  if (type === "percent" && discountValue > 0) {
    return `Save ${Math.round(discountValue)}%`;
  }
  if (type === "dollar" && discountValue > 0) {
    return `Save $${Math.round(discountValue)}`;
  }
  if (type === "bogo") {
    return "BOGO";
  }
  if (type === "free_item") {
    return "Free";
  }
  return null;
}

export default function DealDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [redeemModalOpen, setRedeemModalOpen] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);

  const { data: deal, isLoading: dealLoading } = useQuery<Deal>({
    queryKey: ["/api/deals", id],
    queryFn: async () => {
      const res = await fetch(`/api/deals/${id}`);
      if (!res.ok) throw new Error("Failed to fetch deal");
      return res.json();
    },
    enabled: !!id,
  });

  const { data: vendorData } = useQuery<{ vendor: Vendor; deals: any[] }>({
    queryKey: ["/api/vendors", deal?.vendorId],
    queryFn: async () => {
      const res = await fetch(`/api/vendors/${deal?.vendorId}`);
      if (!res.ok) throw new Error("Failed to fetch vendor");
      return res.json();
    },
    enabled: !!deal?.vendorId,
  });
  
  const vendor = vendorData?.vendor;

  const { data: favoriteData } = useQuery<{ isFavorite: boolean }>({
    queryKey: ["/api/favorites", id],
    queryFn: async () => {
      const res = await fetch(`/api/favorites/${id}`);
      if (!res.ok) return { isFavorite: false };
      return res.json();
    },
    enabled: !!id,
  });

  const toggleFavorite = useMutation({
    mutationFn: async () => {
      if (favoriteData?.isFavorite) {
        await apiRequest("DELETE", `/api/favorites/${id}`);
      } else {
        await apiRequest("POST", `/api/favorites/${id}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/favorites", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
      queryClient.invalidateQueries({ queryKey: ["/api/favorites/ids"] });
      toast({
        title: favoriteData?.isFavorite ? "Removed from favorites" : "Added to favorites",
        description: favoriteData?.isFavorite 
          ? "This deal has been removed from your saved deals."
          : "This deal has been saved to your favorites.",
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

  const startConversation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/b2c/conversations/start", {
        vendorId: deal?.vendorId,
        dealId: id,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to start conversation");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setLocation(`/messages/${data.conversationId}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Unable to start conversation",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const dealTypeLabels: Record<string, string> = {
    bogo: "Buy One Get One",
    percent: "Percentage Off",
    addon: "Free Add-on",
  };

  const getFrequencyLabel = (frequency?: string | null, customDays?: number | null): string | null => {
    switch (frequency) {
      case "once": return "One time only";
      case "weekly": return "1x per week";
      case "monthly": return "1x per month";
      case "custom": return customDays ? `1x per ${customDays} days` : null;
      case "unlimited": return null;
      default: return null;
    }
  };

  if (dealLoading) {
    return (
      <div className="min-h-screen bg-background">
        <DetailHeader title="Loading..." />
        <div className="max-w-3xl mx-auto px-4 py-8">
          <Skeleton className="h-8 w-32 mb-6" />
          <Skeleton className="h-64 rounded-lg" />
        </div>
      </div>
    );
  }

  if (!deal) {
    return (
      <div className="min-h-screen bg-background">
        <DetailHeader title="Deal Not Found" />
        <div className="max-w-3xl mx-auto px-4 py-16 text-center">
          <h2 className="text-2xl font-bold mb-4">Deal Not Found</h2>
          <p className="text-muted-foreground mb-6">
            This deal may have expired or been removed.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button variant="outline" onClick={() => setLocation("/")} data-testid="button-back-to-home">
              Back to Home
            </Button>
            <Button onClick={() => setLocation("/discover")} data-testid="button-back-to-deals">
              Back to Deals
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Build image fallback chain
  const imageFallbackChain = [
    deal.imageUrl,
    vendor?.bannerUrl,
    vendor?.logoUrl,
    placeholderImage,
  ].filter((url): url is string => Boolean(url));
  
  const currentImage = imageFallbackChain[imageIndex] || placeholderImage;
  
  const handleImageError = () => {
    if (imageIndex < imageFallbackChain.length - 1) {
      setImageIndex(prev => prev + 1);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <DetailHeader title={deal.title} backHref="/discover" />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">

        <Card className="overflow-hidden">
          <div className="relative w-full aspect-[16/9] overflow-hidden">
            <img
              src={currentImage}
              alt={deal.title}
              className="w-full h-full object-cover"
              onError={handleImageError}
              data-testid="img-deal-hero"
            />
            {getSavingsLabel(deal.discountType, deal.discountValue) && (
              <div className="absolute bottom-3 left-3">
                <Badge 
                  variant="outline" 
                  className="text-sm px-3 py-1 bg-background/90 backdrop-blur-sm border-primary/20 text-foreground font-semibold"
                >
                  {getSavingsLabel(deal.discountType, deal.discountValue)}
                </Badge>
              </div>
            )}
            {(deal.isPassLocked || deal.tier === "premium" || deal.tier === "member") && (
              <div className="absolute top-3 left-3">
                <Badge variant="default" className="text-xs px-2 py-0.5 bg-primary">
                  Member Only
                </Badge>
              </div>
            )}
          </div>

          {/* Centered redemption button under photo */}
          <div className="px-4 py-4 flex justify-center">
            <Button
              size="lg"
              className="w-full max-w-sm"
              onClick={() => setRedeemModalOpen(true)}
              data-testid="button-redeem-deal"
            >
              <span className="flex items-center gap-2 uppercase font-semibold tracking-wide">
                <Ticket className="w-4 h-4" />
                Redeem Now
              </span>
            </Button>
          </div>
          
          <CardHeader className="pb-4 pt-0">
            <div className="flex items-start gap-4">
              <Avatar className="h-16 w-16 border">
                <AvatarImage src={vendor?.logoUrl || ""} alt={vendor?.businessName || "Business"} />
                <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
                  {(vendor?.businessName || "V")[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Store className="w-3 h-3" />
                  {vendor?.businessName || "Local Business"}
                </p>
                <CardTitle className="text-2xl md:text-3xl">{deal.title}</CardTitle>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => toggleFavorite.mutate()}
                disabled={toggleFavorite.isPending}
                data-testid="button-toggle-favorite"
              >
                <Heart 
                  className={`w-6 h-6 transition-colors ${
                    favoriteData?.isFavorite 
                      ? "fill-red-500 text-red-500" 
                      : "text-muted-foreground"
                  }`} 
                />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <p className="text-lg text-muted-foreground">{deal.description}</p>

            <div className="flex flex-wrap gap-2">
              {deal.category && (
                <Badge variant="secondary" className="text-sm">
                  <Tag className="w-3 h-3 mr-1" />
                  {deal.category}
                </Badge>
              )}
              {deal.city && (
                <Badge variant="outline" className="text-sm">
                  <MapPin className="w-3 h-3 mr-1" />
                  {deal.city}
                </Badge>
              )}
              <Badge variant="default" className="text-sm">
                {dealTypeLabels[deal.dealType] || deal.dealType}
              </Badge>
              {deal.tier === "premium" && (
                <Badge className="text-sm bg-amber-500 hover:bg-amber-600">
                  <Lock className="w-3 h-3 mr-1" />
                  Premium
                </Badge>
              )}
              {getFrequencyLabel(deal.redemptionFrequency, deal.customRedemptionDays) && (
                <Badge variant="outline" className="text-sm" data-testid="badge-redemption-frequency">
                  <RefreshCw className="w-3 h-3 mr-1" />
                  {getFrequencyLabel(deal.redemptionFrequency, deal.customRedemptionDays)}
                </Badge>
              )}
            </div>

            {vendor && (
              <div className="bg-muted/50 rounded-lg p-4 space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">About {vendor.businessName}</h4>
                  <p className="text-sm text-muted-foreground">
                    {vendor.bio || vendor.tagline || "A local Southwest Florida business."}
                  </p>
                </div>

                {/* Location */}
                {(vendor.address || vendor.city) && (
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-muted-foreground">
                      {vendor.address && <p>{vendor.address}</p>}
                      <p>{[vendor.city, vendor.state || "FL"].filter(Boolean).join(", ")} {vendor.zipCode}</p>
                    </div>
                  </div>
                )}

                {/* Contact Methods */}
                <div className="space-y-2">
                  <h5 className="text-sm font-medium">Contact</h5>
                  <div className="flex flex-wrap gap-2">
                    {vendor.phone && (
                      <a href={`tel:${vendor.phone}`} data-testid="link-vendor-phone">
                        <Button size="sm" variant="outline" className="gap-2">
                          <Phone className="w-4 h-4" />
                          Call
                        </Button>
                      </a>
                    )}
                    {vendor.contactEmail && (
                      <a href={`mailto:${vendor.contactEmail}`} data-testid="link-vendor-email">
                        <Button size="sm" variant="outline" className="gap-2">
                          <Mail className="w-4 h-4" />
                          Email
                        </Button>
                      </a>
                    )}
                    {vendor.website && (
                      <a
                        href={vendor.website.startsWith('http') ? vendor.website : `https://${vendor.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        data-testid="link-vendor-website"
                      >
                        <Button size="sm" variant="outline" className="gap-2">
                          <Globe className="w-4 h-4" />
                          Website
                        </Button>
                      </a>
                    )}
                  </div>
                </div>

                {/* Social Media Links */}
                {(vendor.instagram || vendor.facebook || vendor.tiktok || vendor.youtube || vendor.twitter) && (
                  <div className="space-y-2">
                    <h5 className="text-sm font-medium">Follow</h5>
                    <div className="flex flex-wrap gap-2">
                      {vendor.instagram && (
                        <a
                          href={vendor.instagram.startsWith('http') ? vendor.instagram : `https://instagram.com/${vendor.instagram.replace('@', '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          data-testid="link-vendor-instagram"
                          aria-label={`Follow ${vendor.businessName} on Instagram`}
                        >
                          <Button size="icon" variant="outline" aria-label="Instagram">
                            <SiInstagram className="w-4 h-4" />
                          </Button>
                        </a>
                      )}
                      {vendor.facebook && (
                        <a
                          href={vendor.facebook.startsWith('http') ? vendor.facebook : `https://facebook.com/${vendor.facebook}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          data-testid="link-vendor-facebook"
                          aria-label={`Follow ${vendor.businessName} on Facebook`}
                        >
                          <Button size="icon" variant="outline" aria-label="Facebook">
                            <SiFacebook className="w-4 h-4" />
                          </Button>
                        </a>
                      )}
                      {vendor.tiktok && (
                        <a
                          href={vendor.tiktok.startsWith('http') ? vendor.tiktok : `https://tiktok.com/@${vendor.tiktok.replace('@', '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          data-testid="link-vendor-tiktok"
                          aria-label={`Follow ${vendor.businessName} on TikTok`}
                        >
                          <Button size="icon" variant="outline" aria-label="TikTok">
                            <SiTiktok className="w-4 h-4" />
                          </Button>
                        </a>
                      )}
                      {vendor.youtube && (
                        <a
                          href={vendor.youtube.startsWith('http') ? vendor.youtube : `https://youtube.com/${vendor.youtube}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          data-testid="link-vendor-youtube"
                          aria-label={`Subscribe to ${vendor.businessName} on YouTube`}
                        >
                          <Button size="icon" variant="outline" aria-label="YouTube">
                            <SiYoutube className="w-4 h-4" />
                          </Button>
                        </a>
                      )}
                      {vendor.twitter && (
                        <a
                          href={vendor.twitter.startsWith('http') ? vendor.twitter : `https://x.com/${vendor.twitter.replace('@', '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          data-testid="link-vendor-twitter"
                          aria-label={`Follow ${vendor.businessName} on X`}
                        >
                          <Button size="icon" variant="outline" aria-label="X (Twitter)">
                            <SiX className="w-4 h-4" />
                          </Button>
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* View Full Profile Link */}
                <Link href={`/businesses/${vendor.id}`} data-testid="link-vendor-profile">
                  <Button variant="outline" size="sm" className="w-full mt-2 gap-2">
                    <Store className="w-4 h-4" />
                    View Full Business Profile
                    <ChevronRight className="w-4 h-4 ml-auto" />
                  </Button>
                </Link>
              </div>
            )}

            <Button
              size="lg"
              variant="outline"
              className="w-full"
              onClick={() => startConversation.mutate()}
              disabled={startConversation.isPending || !deal?.vendorId}
              data-testid="button-message-business"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              {startConversation.isPending ? "Starting..." : "Ask a Question"}
            </Button>

            <div className="bg-primary/5 rounded-lg p-4 flex items-start gap-3">
              <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-primary">How it works</p>
                <p className="text-muted-foreground mt-1">
                  Tap "Redeem Now" and show your confirmation to the business. Simple as that!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <RedeemDealModal
        deal={deal}
        vendor={vendor}
        open={redeemModalOpen}
        onOpenChange={setRedeemModalOpen}
      />
    </div>
  );
}
