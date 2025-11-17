import { Link } from "wouter";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Briefcase, Star } from "lucide-react";
import type { ServiceProvider } from "@shared/schema";

interface ServiceProviderCardProps {
  provider: ServiceProvider;
}

export default function ServiceProviderCard({ provider }: ServiceProviderCardProps) {
  return (
    <Card className="overflow-hidden hover-elevate" data-testid={`service-card-${provider.id}`}>
      {provider.heroImageUrl && (
        <div className="relative h-48 overflow-hidden">
          <img
            src={provider.heroImageUrl}
            alt={provider.businessName}
            className="w-full h-full object-cover"
            data-testid={`img-service-${provider.id}`}
          />
        </div>
      )}
      
      <CardHeader className="gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg truncate" data-testid={`text-service-name-${provider.id}`}>
              {provider.businessName}
            </h3>
            {provider.tagline && (
              <p className="text-sm text-muted-foreground line-clamp-1" data-testid={`text-tagline-${provider.id}`}>
                {provider.tagline}
              </p>
            )}
          </div>
          {provider.isVerified && (
            <Badge variant="default" className="shrink-0" data-testid={`badge-verified-${provider.id}`}>
              Verified
            </Badge>
          )}
        </div>
        
        <div className="flex flex-wrap gap-2">
          {provider.categories && provider.categories.length > 0 && (
            provider.categories.slice(0, 2).map((category, i) => (
              <Badge key={i} variant="outline" className="gap-1" data-testid={`badge-category-${provider.id}-${i}`}>
                <Briefcase className="w-3 h-3" />
                {category}
              </Badge>
            ))
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {provider.bio && (
          <p className="text-sm line-clamp-3" data-testid={`text-bio-${provider.id}`}>
            {provider.bio}
          </p>
        )}

        {provider.serviceAreas && provider.serviceAreas.length > 0 && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4" />
            <span>Serves: {provider.serviceAreas.slice(0, 2).join(", ")}</span>
            {provider.serviceAreas.length > 2 && <span>+{provider.serviceAreas.length - 2} more</span>}
          </div>
        )}

        {provider.badges && provider.badges.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {provider.badges.slice(0, 3).map((badge, i) => (
              <Badge key={i} variant="secondary" className="text-xs">
                {badge}
              </Badge>
            ))}
            {provider.badges.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{provider.badges.length - 3} more
              </Badge>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter>
        <Link href={`/services/${provider.id}`} className="w-full">
          <Button className="w-full" variant="default" data-testid={`button-view-service-${provider.id}`}>
            View Services
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
