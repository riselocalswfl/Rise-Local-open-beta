import { useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Link } from "wouter";
import DetailHeader from "@/components/layout/DetailHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { BadgeCheck, MapPin, Phone, Mail, Globe, Clock, MessageSquare, Tag, Lock, Percent, DollarSign, Gift, Leaf } from "lucide-react";
import { SiInstagram, SiFacebook, SiTiktok, SiYoutube } from "react-icons/si";
import { Twitter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import type { Vendor, Product, VendorDeal } from "@shared/schema";
import placeholderImage from "@assets/stock_images/local_store_shopping_d3918e51.jpg";

interface ProfileDealCardProps {
  deal: VendorDeal & { imageUrl?: string | null };
  vendor: VendorWithDetails;
  isMember?: boolean;
}

function ProfileDealCard({ deal, vendor, isMember = false }: ProfileDealCardProps) {
  const [, setLocation] = useLocation();
  const isLocked = deal.isPassLocked && !isMember;
  
  const imageFallbackChain = [
    deal.imageUrl ?? undefined,
    vendor.bannerUrl,
    vendor.logoUrl,
    placeholderImage,
  ].filter((url): url is string => Boolean(url));
  
  const [imageIndex, setImageIndex] = useState(0);
  const currentImage = imageFallbackChain[imageIndex] || placeholderImage;
  
  const handleImageError = useCallback(() => {
    if (imageIndex < imageFallbackChain.length - 1) {
      setImageIndex(prev => prev + 1);
    }
  }, [imageIndex, imageFallbackChain.length]);
  
  const handleUnlockClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLocation("/membership");
  }, [setLocation]);
  
  const savings = deal.savingsAmount || 0;
  
  const cardContent = (
    <div 
      className="rounded-lg overflow-hidden bg-card border hover-elevate active-elevate-2 cursor-pointer"
      data-testid={`deal-${deal.id}`}
    >
      <div className="relative w-full aspect-[16/9] overflow-hidden">
        <img
          src={currentImage}
          alt={deal.title}
          className={`w-full h-full object-cover ${isLocked ? 'blur-[3px]' : ''}`}
          onError={handleImageError}
          data-testid={`img-deal-${deal.id}`}
        />
        {savings > 0 && (
          <div className="absolute bottom-2 left-2">
            <Badge 
              variant="outline" 
              className="text-xs px-2 py-0.5 bg-background/90 backdrop-blur-sm border-primary/20 text-foreground font-semibold"
            >
              Save ${savings}
            </Badge>
          </div>
        )}
        {isLocked && (
          <div className="absolute inset-0 bg-background/40 flex items-center justify-center">
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
          </div>
        )}
      </div>
      <div className="p-3">
        <h4 className="text-deal-title truncate" data-testid={`deal-title-${deal.id}`}>
          {deal.title}
        </h4>
        <p className="text-meta text-muted-foreground line-clamp-2 mt-1" data-testid={`deal-description-${deal.id}`}>
          {deal.description}
        </p>
      </div>
    </div>
  );
  
  if (isLocked) {
    return cardContent;
  }
  
  return (
    <Link href={`/deals/${deal.id}`}>
      {cardContent}
    </Link>
  );
}

interface VendorWithDetails extends Omit<Vendor, 'contactEmail' | 'contactPhone'> {
  products?: Product[];
  contactPhone?: string | null;
  contactEmail?: string | null;
}

export default function BusinessProfile() {
  const [, params] = useRoute("/businesses/:id");
  const vendorId = params?.id;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const isPassMember = user?.isPassMember === true && 
    (!user?.passExpiresAt || new Date(user.passExpiresAt) > new Date());

  const startConversation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/b2c/conversations/start", {
        vendorId,
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

  const { data: vendorData, isLoading } = useQuery<{ vendor: VendorWithDetails | null; deals: VendorDeal[]; isHidden?: boolean; message?: string }>({
    queryKey: ["/api/vendors", vendorId],
    queryFn: async () => {
      const res = await fetch(`/api/vendors/${vendorId}`);
      if (!res.ok) throw new Error("Failed to fetch vendor");
      return res.json();
    },
    enabled: !!vendorId,
  });
  
  const vendor = vendorData?.vendor;
  const deals = vendorData?.deals || [];
  const isHidden = vendorData?.isHidden;
  const hiddenMessage = vendorData?.message;
  
  // Get deal type icon
  const getDealTypeIcon = (dealType: string) => {
    switch (dealType) {
      case "percent_off": return Percent;
      case "amount_off": return DollarSign;
      case "bogo": return Gift;
      case "free_item": return Gift;
      default: return Tag;
    }
  };

  const { data: products } = useQuery<Product[]>({
    queryKey: [`/api/vendors/${vendorId}/products`],
    enabled: !!vendorId,
  });

  const getVendorTypeBadge = (type: string) => {
    const badges: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
      shop: { label: "Shop", variant: "default" },
      dine: { label: "Dine", variant: "secondary" },
      service: { label: "Service", variant: "outline" },
    };
    return badges[type] || badges.shop;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <DetailHeader title="Loading..." />
        <div className="px-4 py-4 space-y-4">
          <Skeleton className="h-32 rounded-lg" />
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-48 rounded-lg" />
        </div>
      </div>
    );
  }

  // Handle hidden vendor profile
  if (isHidden) {
    return (
      <div className="min-h-screen bg-background">
        <DetailHeader title="Business Unavailable" />
        <div className="px-4 py-8 text-center">
          <div className="max-w-md mx-auto">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
              <Clock className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="text-section-header mb-2" data-testid="text-business-unavailable">Business Temporarily Unavailable</h2>
            <p className="text-body text-muted-foreground mb-6" data-testid="text-unavailable-message">
              {hiddenMessage || "This business is currently not accepting visitors."}
            </p>
            <Link href="/discover">
              <Button data-testid="button-back-to-discover">Explore Other Businesses</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="min-h-screen bg-background">
        <DetailHeader title="Not Found" />
        <div className="px-4 py-8 text-center">
          <p className="text-muted-foreground mb-4">This business could not be found.</p>
          <Link href="/businesses">
            <Button data-testid="button-back-to-businesses">Back to Businesses</Button>
          </Link>
        </div>
      </div>
    );
  }

  const typeBadge = getVendorTypeBadge(vendor.vendorType || "shop");

  // Helper to extract hours - supports both legacy format and new HoursData format
  const getHoursSchedule = (): Record<string, string> => {
    if (!vendor.hours || typeof vendor.hours !== 'object') return {};
    const hours = vendor.hours as any;
    // New HoursData format has { byAppointment, schedule }
    if ('schedule' in hours && typeof hours.schedule === 'object') {
      return hours.schedule as Record<string, string>;
    }
    // Legacy format is just Record<string, string>
    return hours as Record<string, string>;
  };

  const hoursSchedule = getHoursSchedule();
  const isByAppointment = vendor.hours && typeof vendor.hours === 'object' && 
    'byAppointment' in (vendor.hours as any) && (vendor.hours as any).byAppointment;

  // Helper to check if hours are set
  const hasHours = isByAppointment || Object.values(hoursSchedule).some(v => v && typeof v === 'string' && v.trim());

  // Helper to check if any social links exist
  const hasSocialLinks = vendor.instagram || vendor.facebook || vendor.tiktok || 
    vendor.youtube || vendor.twitter;

  // Helper to normalize social URLs - handles both handles and full URLs
  const getSocialUrl = (platform: string, value: string | null | undefined): string => {
    if (!value) return '';
    const trimmed = value.trim();
    // If already a full URL, return as-is
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }
    // Remove @ prefix if present
    const handle = trimmed.replace(/^@/, '');
    // Build platform URL
    const bases: Record<string, string> = {
      instagram: 'https://instagram.com/',
      facebook: 'https://facebook.com/',
      tiktok: 'https://tiktok.com/@',
      youtube: 'https://youtube.com/@',
      twitter: 'https://twitter.com/',
    };
    return (bases[platform] || '') + handle;
  };

  // Helper to get display name (just the handle)
  const getSocialDisplay = (value: string | null | undefined): string => {
    if (!value) return '';
    const trimmed = value.trim();
    // If full URL, extract the path
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      try {
        const url = new URL(trimmed);
        return url.pathname.replace(/^\/+/, '').replace(/@/g, '');
      } catch {
        return trimmed;
      }
    }
    return trimmed;
  };

  // Helper to format address
  const formatAddress = () => {
    const parts = [];
    if (vendor.address) parts.push(vendor.address);
    if ((vendor as any).addressLine2) parts.push((vendor as any).addressLine2);
    if (vendor.city) {
      const cityLine = vendor.zipCode ? `${vendor.city}, FL ${vendor.zipCode}` : `${vendor.city}, FL`;
      parts.push(cityLine);
    }
    return parts;
  };

  const addressParts = formatAddress();

  return (
    <div className="min-h-screen bg-background">
      <DetailHeader title={vendor.businessName || "Business Profile"} />
      
      <main className="space-y-4">
        {/* Banner Image */}
        {vendor.bannerUrl && (
          <div className="w-full h-32 md:h-48 overflow-hidden" data-testid="banner-image">
            <img 
              src={vendor.bannerUrl} 
              alt={`${vendor.businessName} banner`}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="px-4 space-y-4">
          <Card data-testid="card-business-header">
            <CardContent className="p-4">
              <div className="flex gap-4">
                <Avatar className="h-20 w-20 flex-shrink-0">
                  <AvatarImage src={vendor.logoUrl || undefined} alt={vendor.businessName || "Business"} />
                  <AvatarFallback className="text-lg">
                    {vendor.businessName?.substring(0, 2).toUpperCase() || "BZ"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h1 className="text-page-title" data-testid="text-business-name">
                          {vendor.businessName || "Business"}
                        </h1>
                        {vendor.isVerified && (
                          <BadgeCheck className="h-5 w-5 text-primary" data-testid="icon-verified" />
                        )}
                      </div>
                      <Badge variant={typeBadge.variant} data-testid="badge-vendor-type">
                        {typeBadge.label}
                      </Badge>
                    </div>
                  </div>
                  {vendor.tagline && (
                    <p className="text-body text-muted-foreground italic" data-testid="text-tagline">
                      {vendor.tagline}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

        {vendor.bio && (
          <Card data-testid="card-about">
            <CardHeader className="pb-2">
              <CardTitle className="text-section-header">About</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-body text-muted-foreground" data-testid="text-bio">
                {vendor.bio}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Deals Section */}
        {deals.length > 0 ? (
          <Card data-testid="card-deals">
            <CardHeader className="pb-2">
              <CardTitle className="text-section-header">Deals</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {deals.map((deal) => (
                <ProfileDealCard key={deal.id} deal={deal} vendor={vendor} isMember={isPassMember} />
              ))}
            </CardContent>
          </Card>
        ) : (
          <Card data-testid="card-no-deals">
            <CardContent className="p-6 text-center">
              <Tag className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-body text-muted-foreground">No active deals at this time</p>
            </CardContent>
          </Card>
        )}

        <Card data-testid="card-contact">
          <CardHeader className="pb-2">
            <CardTitle className="text-section-header">Contact & Location</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {addressParts.length > 0 && (
              <div className="flex items-start gap-3 text-body">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div data-testid="text-location">
                  {addressParts.map((line, i) => (
                    <div key={i}>{line}</div>
                  ))}
                </div>
              </div>
            )}
            {vendor.contactPhone && (
              <div className="flex items-center gap-3 text-body">
                <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <a 
                  href={`tel:${vendor.contactPhone}`} 
                  className="text-primary hover:underline"
                  data-testid="link-phone"
                >
                  {vendor.contactPhone}
                </a>
              </div>
            )}
            {vendor.contactEmail && (
              <div className="flex items-center gap-3 text-body">
                <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <a 
                  href={`mailto:${vendor.contactEmail}`} 
                  className="text-primary hover:underline"
                  data-testid="link-email"
                >
                  {vendor.contactEmail}
                </a>
              </div>
            )}
            {vendor.website && (
              <div className="flex items-center gap-3 text-body">
                <Globe className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <a 
                  href={vendor.website} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                  data-testid="link-website"
                >
                  {vendor.website.replace(/^https?:\/\//, "")}
                </a>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Business Hours */}
        {hasHours && (
          <Card data-testid="card-hours">
            <CardHeader className="pb-2">
              <CardTitle className="text-section-header">Hours</CardTitle>
            </CardHeader>
            <CardContent>
              {isByAppointment ? (
                <div className="flex items-center gap-2 text-body" data-testid="text-by-appointment">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>By Appointment Only</span>
                </div>
              ) : (
                <div className="space-y-1.5 text-body">
                  {["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].map((day) => {
                    const value = hoursSchedule[day];
                    if (!value || typeof value !== 'string' || !value.trim()) return null;
                    return (
                      <div key={day} className="flex justify-between gap-4" data-testid={`hours-${day}`}>
                        <span className="capitalize text-muted-foreground">{day}</span>
                        <span>{value}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Social Links */}
        {hasSocialLinks && (
          <Card data-testid="card-social">
            <CardHeader className="pb-2">
              <CardTitle className="text-section-header">Connect</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {vendor.instagram && (
                  <a 
                    href={getSocialUrl('instagram', vendor.instagram)}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/50 hover-elevate text-body"
                    data-testid="link-instagram"
                  >
                    <SiInstagram className="h-4 w-4" />
                    <span>{getSocialDisplay(vendor.instagram)}</span>
                  </a>
                )}
                {vendor.facebook && (
                  <a 
                    href={getSocialUrl('facebook', vendor.facebook)}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/50 hover-elevate text-body"
                    data-testid="link-facebook"
                  >
                    <SiFacebook className="h-4 w-4" />
                    <span>{getSocialDisplay(vendor.facebook)}</span>
                  </a>
                )}
                {vendor.tiktok && (
                  <a 
                    href={getSocialUrl('tiktok', vendor.tiktok)}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/50 hover-elevate text-body"
                    data-testid="link-tiktok"
                  >
                    <SiTiktok className="h-4 w-4" />
                    <span>{getSocialDisplay(vendor.tiktok)}</span>
                  </a>
                )}
                {vendor.youtube && (
                  <a 
                    href={getSocialUrl('youtube', vendor.youtube)}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/50 hover-elevate text-body"
                    data-testid="link-youtube"
                  >
                    <SiYoutube className="h-4 w-4" />
                    <span>{getSocialDisplay(vendor.youtube)}</span>
                  </a>
                )}
                {vendor.twitter && (
                  <a 
                    href={getSocialUrl('twitter', vendor.twitter)}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/50 hover-elevate text-body"
                    data-testid="link-twitter"
                  >
                    <Twitter className="h-4 w-4" />
                    <span>{getSocialDisplay(vendor.twitter)}</span>
                  </a>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Business Values */}
        {((vendor.values && vendor.values.length > 0) || (vendor.showLocalSourcing && vendor.localSourcingPercent)) && (
          <Card data-testid="card-values">
            <CardHeader className="pb-2">
              <CardTitle className="text-section-header">Our Values</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {vendor.values && vendor.values.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {vendor.values.map((value: string, i: number) => (
                    <Badge key={i} variant="secondary" data-testid={`value-tag-${i}`}>
                      {value}
                    </Badge>
                  ))}
                </div>
              )}
              {vendor.showLocalSourcing && vendor.localSourcingPercent && vendor.localSourcingPercent > 0 && (
                <div className="flex items-center gap-2 text-body text-muted-foreground" data-testid="text-local-sourcing">
                  <Leaf className="h-4 w-4 text-primary" />
                  <span>{vendor.localSourcingPercent}% locally sourced</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="flex gap-3">
          <Button 
            variant="outline" 
            className="flex-1" 
            onClick={() => startConversation.mutate()}
            disabled={startConversation.isPending}
            data-testid="button-message"
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            {startConversation.isPending ? "Starting..." : "Message Business"}
          </Button>
        </div>

        {products && products.length > 0 && (
          <Card data-testid="card-products">
            <CardHeader className="pb-2">
              <CardTitle className="text-section-header">Products & Services</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {products.slice(0, 4).map((product) => (
                  <div 
                    key={product.id} 
                    className="p-3 bg-muted/50 rounded-lg"
                    data-testid={`product-${product.id}`}
                  >
                    <p className="text-deal-title truncate">{product.name}</p>
                    <p className="text-body text-muted-foreground">
                      ${(product.priceCents / 100).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
              {products.length > 4 && (
                <p className="text-body text-muted-foreground text-center mt-3">
                  +{products.length - 4} more items
                </p>
              )}
            </CardContent>
          </Card>
        )}
        </div>
      </main>
    </div>
  );
}
