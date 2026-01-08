import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  MapPin, Clock, Phone, Mail, Globe, Instagram, Facebook,
  Award, Image as ImageIcon,
  Users, DollarSign, Utensils
} from "lucide-react";
import type { Vendor } from "@shared/schema";

export default function RestaurantProfile() {
  const [, params] = useRoute("/restaurant/:id");
  const vendorId = params?.id;

  const { data: vendor, isLoading: vendorLoading } = useQuery<Vendor>({
    queryKey: [`/api/vendors/${vendorId}`],
    enabled: !!vendorId,
  });

  if (vendorLoading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading restaurant profile...</p>
        </div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">Restaurant not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const restaurantDetails = (vendor.restaurantDetails as any) || {};
  const heroImage = vendor.heroImageUrl || vendor.bannerUrl;
  const certifications = (vendor.certifications as any) || [];
  const hours = (vendor.hours as any) || {};

  return (
    <div className="min-h-screen bg-bg">
      {heroImage && (
        <div className="relative h-80 bg-gray-900">
          <img 
            src={heroImage} 
            alt={vendor.businessName}
            className="w-full h-full object-cover opacity-80"
            data-testid="img-restaurant-hero"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-6 mb-8">
          {vendor.logoUrl && (
            <img 
              src={vendor.logoUrl}
              alt={`${vendor.businessName} logo`}
              className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg"
              data-testid="img-restaurant-logo"
            />
          )}
          
          <div className="flex-1">
            <h1 className="text-4xl font-bold mb-2" data-testid="text-restaurant-name">
              {vendor.businessName}
            </h1>
            {vendor.tagline && (
              <p className="text-lg text-muted-foreground mb-4" data-testid="text-restaurant-tagline">
                {vendor.tagline}
              </p>
            )}
            
            <div className="flex flex-wrap gap-2 mb-4">
              {restaurantDetails.cuisineType && (
                <Badge variant="outline" className="gap-1" data-testid="badge-cuisine">
                  <Utensils className="w-3 h-3" />
                  {restaurantDetails.cuisineType}
                </Badge>
              )}
              {restaurantDetails.priceRange && (
                <Badge variant="outline" className="gap-1" data-testid="badge-price">
                  <DollarSign className="w-3 h-3" />
                  {restaurantDetails.priceRange}
                </Badge>
              )}
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              {vendor.isVerified && (
                <Badge variant="default" className="gap-1" data-testid="badge-verified">
                  <Award className="w-3 h-3" />
                  Verified
                </Badge>
              )}
              {vendor.badges && vendor.badges.map((badge, i) => (
                <Badge key={i} variant="secondary" data-testid={`badge-${i}`}>{badge}</Badge>
              ))}
            </div>

            {restaurantDetails.dietaryOptions && restaurantDetails.dietaryOptions.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {restaurantDetails.dietaryOptions.map((option: string, i: number) => (
                  <Badge key={i} variant="outline" data-testid={`dietary-${i}`}>
                    {option}
                  </Badge>
                ))}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {restaurantDetails.reservationsUrl && (
                <Button variant="default" asChild data-testid="button-reserve">
                  <a href={restaurantDetails.reservationsUrl} target="_blank" rel="noopener noreferrer">
                    Make Reservation
                  </a>
                </Button>
              )}
              <Button variant="outline" data-testid="button-follow">Follow</Button>
            </div>
            
            {restaurantDetails.reservationsUrl && (
              <p className="text-xs text-muted-foreground mt-3 max-w-md" data-testid="text-reservation-disclaimer">
                Reservations are completed through the restaurant's official booking system. Rise Local helps you discover deals and reserve easily, but table availability is managed by the restaurant.
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card data-testid="card-about">
              <CardHeader>
                <CardTitle>About {vendor.businessName}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-foreground whitespace-pre-line">{vendor.bio}</p>
              </CardContent>
            </Card>

            {vendor.gallery && vendor.gallery.length > 0 && (
              <Card data-testid="card-gallery">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ImageIcon className="w-5 h-5" />
                    Gallery
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {vendor.gallery.map((imageUrl, i) => (
                      <img 
                        key={i}
                        src={imageUrl}
                        alt={`Gallery image ${i + 1}`}
                        className="w-full h-48 object-cover rounded-md"
                        data-testid={`img-gallery-${i}`}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            <Card data-testid="card-quick-info">
              <CardHeader>
                <CardTitle>Quick Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {hours && Object.keys(hours).length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2 text-sm font-medium">
                      <Clock className="w-4 h-4" />
                      Hours
                    </div>
                    <div className="text-sm space-y-1">
                      {Object.entries(hours).map(([day, time]) => {
                        const timeObj = time as { open: string; close: string };
                        const displayTime = timeObj.open === "Closed" && timeObj.close === "Closed"
                          ? "Closed"
                          : `${timeObj.open} - ${timeObj.close}`;
                        return (
                          <div key={day} className="flex justify-between">
                            <span className="text-muted-foreground capitalize">{day}:</span>
                            <span>{displayTime}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {restaurantDetails.seatingCapacity && (
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="w-4 h-4" />
                    <span>Seats {restaurantDetails.seatingCapacity}</span>
                  </div>
                )}

                {restaurantDetails.reservationsRequired && (
                  <div className="text-sm">
                    <Badge variant="outline">Reservations Required</Badge>
                  </div>
                )}

                {vendor.contactEmail && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <a href={`mailto:${vendor.contactEmail}`} className="hover:underline" data-testid="link-email">
                      {vendor.contactEmail}
                    </a>
                  </div>
                )}
                
                {vendor.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <a href={`tel:${vendor.phone}`} className="hover:underline" data-testid="link-phone">
                      {vendor.phone}
                    </a>
                  </div>
                )}

                {vendor.address && (
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <div>
                      <div>{vendor.address}</div>
                      <div>{vendor.city}, {vendor.state} {vendor.zipCode}</div>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  {vendor.website && (
                    <Button variant="outline" size="icon" asChild data-testid="button-website">
                      <a href={vendor.website} target="_blank" rel="noopener noreferrer">
                        <Globe className="w-4 h-4" />
                      </a>
                    </Button>
                  )}
                  {vendor.instagram && (
                    <Button variant="outline" size="icon" asChild data-testid="button-instagram">
                      <a href={`https://instagram.com/${vendor.instagram}`} target="_blank" rel="noopener noreferrer">
                        <Instagram className="w-4 h-4" />
                      </a>
                    </Button>
                  )}
                  {vendor.facebook && (
                    <Button variant="outline" size="icon" asChild data-testid="button-facebook">
                      <a href={vendor.facebook} target="_blank" rel="noopener noreferrer">
                        <Facebook className="w-4 h-4" />
                      </a>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {certifications.length > 0 && (
              <Card data-testid="card-certifications">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="w-5 h-5" />
                    Certifications
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {certifications.map((cert: any, i: number) => (
                      <div key={i} className="text-sm" data-testid={`certification-${i}`}>
                        <div className="font-medium">{cert.name}</div>
                        {cert.issuedOn && (
                          <div className="text-muted-foreground text-xs">
                            Issued: {new Date(cert.issuedOn).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
