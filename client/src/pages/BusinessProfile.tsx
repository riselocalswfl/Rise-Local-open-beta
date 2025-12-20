import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Link } from "wouter";
import DetailHeader from "@/components/layout/DetailHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { BadgeCheck, MapPin, Phone, Mail, Globe, Clock, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Vendor, Product } from "@shared/schema";

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

  const { data: vendorData, isLoading } = useQuery<{ vendor: VendorWithDetails | null; deals: any[]; isHidden?: boolean; message?: string }>({
    queryKey: ["/api/vendors", vendorId],
    queryFn: async () => {
      const res = await fetch(`/api/vendors/${vendorId}`);
      if (!res.ok) throw new Error("Failed to fetch vendor");
      return res.json();
    },
    enabled: !!vendorId,
  });
  
  const vendor = vendorData?.vendor;
  const isHidden = vendorData?.isHidden;
  const hiddenMessage = vendorData?.message;

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
            <h2 className="text-lg font-semibold mb-2" data-testid="text-business-unavailable">Business Temporarily Unavailable</h2>
            <p className="text-muted-foreground mb-6" data-testid="text-unavailable-message">
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

  return (
    <div className="min-h-screen bg-background">
      <DetailHeader title={vendor.businessName || "Business Profile"} />
      
      <main className="px-4 py-4 space-y-4">
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
                      <h1 className="text-xl font-semibold" data-testid="text-business-name">
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
                  <p className="text-sm text-muted-foreground italic" data-testid="text-tagline">
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
              <CardTitle className="text-lg">About</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground" data-testid="text-bio">
                {vendor.bio}
              </p>
            </CardContent>
          </Card>
        )}

        <Card data-testid="card-contact">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Contact & Location</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {vendor.city && (
              <div className="flex items-center gap-3 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span data-testid="text-location">{vendor.city}, FL</span>
              </div>
            )}
            {vendor.contactPhone && (
              <div className="flex items-center gap-3 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
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
              <div className="flex items-center gap-3 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
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
              <div className="flex items-center gap-3 text-sm">
                <Globe className="h-4 w-4 text-muted-foreground" />
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
              <CardTitle className="text-lg">Products & Services</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {products.slice(0, 4).map((product) => (
                  <div 
                    key={product.id} 
                    className="p-3 bg-muted/50 rounded-lg"
                    data-testid={`product-${product.id}`}
                  >
                    <p className="font-medium text-sm truncate">{product.name}</p>
                    <p className="text-sm text-muted-foreground">
                      ${(product.priceCents / 100).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
              {products.length > 4 && (
                <p className="text-sm text-muted-foreground text-center mt-3">
                  +{products.length - 4} more items
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
