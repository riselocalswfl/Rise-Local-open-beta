import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  MapPin, Clock, Phone, Mail, Globe, Instagram, Facebook,
  Star, Calendar, Utensils, Award, HelpCircle, Image as ImageIcon,
  Users, DollarSign
} from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import type { Vendor, MenuItem, Event, VendorReview, VendorFAQ } from "@shared/schema";

export default function RestaurantProfile() {
  const [, params] = useRoute("/restaurant/:id");
  const vendorId = params?.id;

  // Use unified vendor endpoint
  const { data: vendor, isLoading: vendorLoading } = useQuery<Vendor>({
    queryKey: [`/api/vendors/${vendorId}`],
    enabled: !!vendorId,
  });

  // Extract capabilities for conditional fetching
  const capabilities = vendor?.capabilities as { products?: boolean; services?: boolean; menu?: boolean } | undefined;

  // Only fetch menu if vendor has menu capability
  const { data: menuItems = [], isLoading: menuLoading } = useQuery<MenuItem[]>({
    queryKey: [`/api/vendors/${vendorId}/menu`],
    enabled: !!vendorId && !!capabilities?.menu,
  });

  const { data: events = [] } = useQuery<Event[]>({
    queryKey: [`/api/vendors/${vendorId}/events`],
    enabled: !!vendorId,
  });

  const { data: reviews = [] } = useQuery<VendorReview[]>({
    queryKey: [`/api/vendors/${vendorId}/reviews`],
    enabled: !!vendorId,
  });

  const { data: faqs = [] } = useQuery<VendorFAQ[]>({
    queryKey: [`/api/vendors/${vendorId}/faqs`],
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

  // Extract restaurant-specific data from unified vendor
  const restaurantDetails = (vendor.restaurantDetails as any) || {};
  const heroImage = vendor.heroImageUrl || vendor.bannerUrl;
  const certifications = (vendor.certifications as any) || [];
  const policies = restaurantDetails.policies || {};
  const hours = (vendor.hours as any) || {};

  const averageRating = reviews.length > 0 
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length 
    : 0;

  const menuByCategory = menuItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, MenuItem[]>);

  const categories = ["Appetizers", "Entrees", "Desserts", "Drinks", "Specials"];
  const orderedCategories = categories.filter(cat => menuByCategory[cat]?.length > 0);
  const otherCategories = Object.keys(menuByCategory).filter(cat => !categories.includes(cat));
  const allCategories = [...orderedCategories, ...otherCategories];

  return (
    <div className="min-h-screen bg-bg">
      {/* Hero Section */}
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

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Restaurant Header */}
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
            
            {/* Cuisine & Price Range */}
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
              {reviews.length > 0 && (
                <Badge variant="outline" className="gap-1" data-testid="badge-rating">
                  <Star className="w-3 h-3" />
                  {averageRating.toFixed(1)} ({reviews.length} reviews)
                </Badge>
              )}
            </div>

            {/* Badges */}
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

            {/* Dietary Options */}
            {restaurantDetails.dietaryOptions && restaurantDetails.dietaryOptions.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {restaurantDetails.dietaryOptions.map((option: string, i: number) => (
                  <Badge key={i} variant="outline" data-testid={`dietary-${i}`}>
                    {option}
                  </Badge>
                ))}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
              {restaurantDetails.reservationsUrl && (
                <Button variant="default" asChild data-testid="button-reserve">
                  <a href={restaurantDetails.reservationsUrl} target="_blank" rel="noopener noreferrer">
                    Make Reservation
                  </a>
                </Button>
              )}
              <Button variant="outline" data-testid="button-follow">Follow</Button>
              {capabilities?.menu && (
                <Button variant="outline" data-testid="button-view-menu">View Menu</Button>
              )}
            </div>
            
            {/* Reservation disclaimer */}
            {restaurantDetails.reservationsUrl && (
              <p className="text-xs text-muted-foreground mt-3 max-w-md" data-testid="text-reservation-disclaimer">
                Reservations are completed through the restaurant's official booking system. Rise Local helps you discover deals and reserve easily, but table availability is managed by the restaurant.
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* About Section */}
            <Card data-testid="card-about">
              <CardHeader>
                <CardTitle>About {vendor.businessName}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-foreground whitespace-pre-line">{vendor.bio}</p>
              </CardContent>
            </Card>

            {/* Menu Section - Only show if vendor has menu capability */}
            {capabilities?.menu && (
              <Card data-testid="card-menu">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Utensils className="w-5 h-5" />
                    Menu
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {menuLoading ? (
                    <p className="text-muted-foreground">Loading menu...</p>
                  ) : menuItems.length === 0 ? (
                    <p className="text-muted-foreground">No menu items available yet</p>
                  ) : (
                    <Accordion type="single" collapsible className="w-full">
                      {allCategories.map((category, idx) => (
                        <AccordionItem key={category} value={category}>
                          <AccordionTrigger data-testid={`accordion-menu-category-${idx}`}>
                            {category}
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-4">
                              {menuByCategory[category].map((item) => (
                                <div key={item.id} className="border-b pb-4 last:border-0" data-testid={`menu-item-${item.id}`}>
                                  <div className="flex justify-between items-start mb-2">
                                    <div className="flex-1">
                                      <h4 className="font-medium" data-testid={`text-menu-name-${item.id}`}>
                                        {item.name}
                                      </h4>
                                      {item.description && (
                                        <p className="text-sm text-muted-foreground mt-1">
                                          {item.description}
                                        </p>
                                      )}
                                      {item.dietaryTags && item.dietaryTags.length > 0 && (
                                        <div className="flex gap-1 mt-2 flex-wrap">
                                          {item.dietaryTags.map((tag, i) => (
                                            <Badge key={i} variant="outline" className="text-xs">
                                              {tag}
                                            </Badge>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                    <span className="font-semibold text-primary ml-4" data-testid={`text-menu-price-${item.id}`}>
                                      ${(item.priceCents / 100).toFixed(2)}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Events Section */}
            {events.length > 0 && (
              <Card data-testid="card-events">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Upcoming Events
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {events.map((event) => (
                      <div key={event.id} className="border-b pb-4 last:border-0" data-testid={`event-${event.id}`}>
                        <h4 className="font-medium mb-1" data-testid={`text-event-title-${event.id}`}>
                          {event.title}
                        </h4>
                        <p className="text-sm text-muted-foreground mb-2">
                          {new Date(event.dateTime).toLocaleDateString()} at {new Date(event.dateTime).toLocaleTimeString()}
                        </p>
                        <p className="text-sm">{event.description}</p>
                        {event.location && (
                          <p className="text-sm text-muted-foreground mt-1">
                            <MapPin className="w-3 h-3 inline mr-1" />
                            {event.location}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Reviews Section */}
            {reviews.length > 0 && (
              <Card data-testid="card-reviews">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="w-5 h-5" />
                    Customer Reviews ({reviews.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {reviews.map((review) => (
                      <div key={review.id} className="border-b pb-4 last:border-0" data-testid={`review-${review.id}`}>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex">
                            {[...Array(5)].map((_, i) => (
                              <Star 
                                key={i}
                                className={`w-4 h-4 ${i < review.rating ? 'fill-primary text-primary' : 'text-gray-300'}`}
                              />
                            ))}
                          </div>
                          <span className="font-medium">{review.authorName}</span>
                          <span className="text-sm text-muted-foreground">
                            {review.createdAt ? new Date(review.createdAt).toLocaleDateString() : 'Recently'}
                          </span>
                        </div>
                        <p className="text-sm">{review.comment}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* FAQ Section */}
            {faqs.length > 0 && (
              <Card data-testid="card-faq">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <HelpCircle className="w-5 h-5" />
                    Frequently Asked Questions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    {faqs.map((faq, idx) => (
                      <AccordionItem key={faq.id} value={faq.id}>
                        <AccordionTrigger data-testid={`accordion-faq-${idx}`}>
                          {faq.question}
                        </AccordionTrigger>
                        <AccordionContent>
                          <p className="text-sm">{faq.answer}</p>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            )}

            {/* Gallery Section */}
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

          {/* Right Column - Quick Info */}
          <div className="space-y-6">
            {/* Contact & Hours Card */}
            <Card data-testid="card-quick-info">
              <CardHeader>
                <CardTitle>Quick Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Hours */}
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

                {/* Seating Capacity */}
                {restaurantDetails.seatingCapacity && (
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="w-4 h-4" />
                    <span>Seats {restaurantDetails.seatingCapacity}</span>
                  </div>
                )}

                {/* Reservations */}
                {restaurantDetails.reservationsRequired && (
                  <div className="text-sm">
                    <Badge variant="outline">Reservations Required</Badge>
                  </div>
                )}

                {/* Contact */}
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

                {/* Address */}
                {vendor.address && (
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <div>
                      <div>{vendor.address}</div>
                      <div>{vendor.city}, {vendor.state} {vendor.zipCode}</div>
                    </div>
                  </div>
                )}

                {/* Social Links */}
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

            {/* Certifications */}
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
