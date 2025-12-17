import { Link } from "wouter";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Briefcase, CheckCircle } from "lucide-react";
import type { Vendor } from "@shared/schema";

interface ServiceVendorCardProps {
  vendor: Vendor;
}

export default function ServiceVendorCard({ vendor }: ServiceVendorCardProps) {
  // Extract service areas from serviceDetails JSON
  const serviceDetails = vendor.serviceDetails as any;
  const serviceAreas = serviceDetails?.serviceAreas || [];
  
  return (
    <Link href={`/businesses/${vendor.id}`}>
      <Card 
        className="overflow-hidden hover-elevate cursor-pointer h-full flex flex-col" 
        data-testid={`service-vendor-card-${vendor.id}`}
      >
        {/* Vendor Image */}
        {vendor.heroImageUrl && (
          <div className="relative h-48 overflow-hidden">
            <img
              src={vendor.heroImageUrl}
              alt={vendor.businessName}
              className="w-full h-full object-cover"
              data-testid={`img-service-vendor-${vendor.id}`}
            />
          </div>
        )}
        
        <CardContent className="p-6 flex-1 flex flex-col gap-3">
          {/* Business Name & Verification */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 
                className="font-semibold text-lg truncate" 
                data-testid={`text-service-vendor-name-${vendor.id}`}
              >
                {vendor.businessName}
              </h3>
              {vendor.tagline && (
                <p 
                  className="text-sm text-muted-foreground line-clamp-1 mt-1" 
                  data-testid={`text-tagline-${vendor.id}`}
                >
                  {vendor.tagline}
                </p>
              )}
            </div>
            {vendor.isVerified && (
              <Badge variant="default" className="shrink-0 flex items-center gap-1" data-testid={`badge-verified-${vendor.id}`}>
                <CheckCircle className="w-3 h-3" />
                Verified
              </Badge>
            )}
          </div>
          
          {/* Bio */}
          {vendor.bio && (
            <p 
              className="text-sm text-muted-foreground line-clamp-3" 
              data-testid={`text-bio-${vendor.id}`}
            >
              {vendor.bio}
            </p>
          )}

          {/* Location & Service Areas */}
          <div className="space-y-2">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span>{vendor.city}, {vendor.state}</span>
            </div>
            
            {serviceAreas.length > 0 && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Briefcase className="w-4 h-4" />
                <span>Serves: {serviceAreas.slice(0, 2).join(", ")}</span>
                {serviceAreas.length > 2 && <span>+{serviceAreas.length - 2} more</span>}
              </div>
            )}
          </div>

          {/* Badges */}
          {vendor.badges && vendor.badges.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {vendor.badges.slice(0, 3).map((badge, i) => (
                <Badge 
                  key={i} 
                  variant="secondary" 
                  className="text-xs"
                  data-testid={`badge-${vendor.id}-${i}`}
                >
                  {badge}
                </Badge>
              ))}
              {vendor.badges.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{vendor.badges.length - 3}
                </Badge>
              )}
            </div>
          )}
        </CardContent>

        <CardFooter className="p-6 pt-0">
          <Button 
            className="w-full" 
            variant="default" 
            data-testid={`button-view-service-vendor-${vendor.id}`}
          >
            View Profile
          </Button>
        </CardFooter>
      </Card>
    </Link>
  );
}
