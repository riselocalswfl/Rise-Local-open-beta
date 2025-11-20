import { Link } from "wouter";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { MapPin, Clock, BadgeCheck } from "lucide-react";

interface ServiceOfferingCardProps {
  offering: {
    id: string;
    vendorId: string;
    offeringName: string;
    description: string;
    durationMinutes: number | null;
    pricingModel: string;
    fixedPriceCents: number | null;
    hourlyRateCents: number | null;
    startingAtCents: number | null;
    tags: string[];
    isFeatured: boolean;
    provider: {
      id: string;
      businessName: string;
      logoUrl: string | null;
      city: string;
      isVerified: boolean;
    } | null;
  };
}

export default function ServiceOfferingCard({ offering }: ServiceOfferingCardProps) {
  const formatPrice = () => {
    if (offering.pricingModel === "quote") {
      return "Request Quote";
    }
    if (offering.pricingModel === "hourly" && offering.hourlyRateCents) {
      return `$${(offering.hourlyRateCents / 100).toFixed(0)}/hr`;
    }
    if (offering.pricingModel === "fixed" && offering.fixedPriceCents) {
      return `$${(offering.fixedPriceCents / 100).toFixed(0)}`;
    }
    if (offering.startingAtCents) {
      return `Starting at $${(offering.startingAtCents / 100).toFixed(0)}`;
    }
    return "Contact for pricing";
  };

  return (
    <Card className="overflow-hidden hover-elevate active-elevate-2" data-testid={`service-offering-card-${offering.id}`}>
      <CardHeader className="gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg mb-1" data-testid={`text-offering-name-${offering.id}`}>
              {offering.offeringName}
            </h3>
            <p className="text-sm text-muted-foreground line-clamp-2" data-testid={`text-description-${offering.id}`}>
              {offering.description}
            </p>
          </div>
          {offering.isFeatured && (
            <Badge variant="default" className="shrink-0" data-testid={`badge-featured-${offering.id}`}>
              Featured
            </Badge>
          )}
        </div>

        {offering.tags && offering.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {offering.tags.slice(0, 3).map((tag, i) => (
              <Badge key={i} variant="outline" className="text-xs" data-testid={`badge-tag-${offering.id}-${i}`}>
                {tag}
              </Badge>
            ))}
            {offering.tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{offering.tags.length - 3}
              </Badge>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-3">
        {offering.provider && (
          <Link href={`/services/${offering.provider.id}`}>
            <div className="flex items-center gap-2 p-2 rounded-md hover-elevate active-elevate-2" data-testid={`link-provider-${offering.id}`}>
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarImage src={offering.provider.logoUrl || undefined} alt={offering.provider.businessName} />
                <AvatarFallback className="text-xs">
                  {offering.provider.businessName.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <p className="text-sm font-medium truncate" data-testid={`text-provider-name-${offering.id}`}>
                    {offering.provider.businessName}
                  </p>
                  {offering.provider.isVerified && (
                    <BadgeCheck className="h-4 w-4 text-primary flex-shrink-0" data-testid={`icon-verified-${offering.id}`} />
                  )}
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span>{offering.provider.city}, FL</span>
                </div>
              </div>
            </div>
          </Link>
        )}

        <div className="flex items-center justify-between pt-2 border-t">
          <div>
            {offering.durationMinutes && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground" data-testid={`text-duration-${offering.id}`}>
                <Clock className="h-4 w-4" />
                <span>{offering.durationMinutes} min</span>
              </div>
            )}
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold" data-testid={`text-price-${offering.id}`}>
              {formatPrice()}
            </p>
          </div>
        </div>
      </CardContent>

      <CardFooter>
        <Link href={`/services/${offering.provider?.id}`} className="w-full">
          <Button variant="outline" className="w-full" data-testid={`button-view-provider-${offering.id}`}>
            View Provider
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
