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
import type { Restaurant, MenuItem, Event, RestaurantReview, RestaurantFAQ } from "@shared/schema";

export default function RestaurantProfile() {
  const [, params] = useRoute("/restaurant/:id");
  const restaurantId = params?.id;

  const { data: restaurant, isLoading: restaurantLoading } = useQuery<Restaurant>({
    queryKey: ["/api/restaurants", restaurantId],
    enabled: !!restaurantId,
  });

  const { data: menuItems = [], isLoading: menuLoading } = useQuery<MenuItem[]>({
    queryKey: ["/api/restaurants", restaurantId, "menu-items"],
    enabled: !!restaurantId,
  });

  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ["/api/restaurants", restaurantId, "events"],
    enabled: !!restaurantId,
  });

  const { data: reviews = [] } = useQuery<RestaurantReview[]>({
    queryKey: ["/api/restaurants", restaurantId, "reviews"],
    enabled: !!restaurantId,
  });

  const { data: faqs = [] } = useQuery<RestaurantFAQ[]>({
    queryKey: ["/api/restaurants", restaurantId, "faqs"],
    enabled: !!restaurantId,
  });

  if (restaurantLoading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading restaurant profile...</p>
        </div>
      </div>
    );
  }

  if (!restaurant) {
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

  const heroImage = restaurant.heroImageUrl;
  const certifications = (restaurant.certifications as any) || [];
  const policies = (restaurant.policies as any) || {};
  const hours = (restaurant.hours as any) || {};

  const averageRating = reviews.length > 0 
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length 
    : 0;


  return (
    <div className="min-h-screen bg-bg">
      {/* Hero Section */}
      {heroImage && (
        <div className="relative h-80 bg-gray-900">
          <img 
            src={heroImage} 
            alt={restaurant.restaurantName}
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
          {restaurant.logoUrl && (
            <img 
              src={restaurant.logoUrl}
              alt={`${restaurant.restaurantName} logo`}
              className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg"
              data-testid="img-restaurant-logo"
            />
          )}
          
          <div className="flex-1">
            <h1 className="text-4xl font-bold mb-2" data-testid="text-restaurant-name">
              {restaurant.restaurantName}
            </h1>
            {restaurant.tagline && (
              <p className="text-lg text-muted-foreground mb-4" data-testid="text-restaurant-tagline">
                {restaurant.tagline}
              </p>
            )}
            
            {/* Cuisine & Price Range */}
            <div className="flex flex-wrap gap-2 mb-4">
              {restaurant.cuisineType && (
                <Badge variant="outline" className="gap-1" data-testid="badge-cuisine">
                  <Utensils className="w-3 h-3" />
                  {restaurant.cuisineType}
                </Badge>
              )}
              {restaurant.priceRange && (
                <Badge variant="outline" className="gap-1" data-testid="badge-price">
                  <DollarSign className="w-3 h-3" />
                  {restaurant.priceRange}
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
              {restaurant.isVerified && (
                <Badge variant="default" className="gap-1" data-testid="badge-verified">
                  <Award className="w-3 h-3" />
                  Verified
                </Badge>
              )}
              {restaurant.badges && restaurant.badges.map((badge, i) => (
                <Badge key={i} variant="secondary" data-testid={`badge-${i}`}>{badge}</Badge>
              ))}
            </div>

            {/* Dietary Options */}
            {restaurant.dietaryOptions && restaurant.dietaryOptions.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {restaurant.dietaryOptions.map((option, i) => (
                  <Badge key={i} variant="outline" data-testid={`dietary-${i}`}>
                    {option}
                  </Badge>
                ))}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
              {restaurant.reservationsUrl && (
                <Button variant="default" asChild data-testid="button-reserve">
                  <a href={restaurant.reservationsUrl} target="_blank" rel="noopener noreferrer">
                    Make Reservation
                  </a>
                </Button>
              )}
              <Button variant="outline" data-testid="button-follow">Follow</Button>
              <Button variant="outline" data-testid="button-view-menu">View Menu</Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* About Section */}
            <Card data-testid="card-about">
              <CardHeader>
                <CardTitle>About {restaurant.restaurantName}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-foreground whitespace-pre-line">{restaurant.bio}</p>
              </CardContent>
            </Card>

            {/* Menu Section */}
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
                            {new Date(review.createdAt).toLocaleDateString()}
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
            {restaurant.gallery && restaurant.gallery.length > 0 && (
              <Card data-testid="card-gallery">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ImageIcon className="w-5 h-5" />
                    Gallery
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {restaurant.gallery.map((imageUrl, i) => (
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
                {restaurant.seatingCapacity && (
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="w-4 h-4" />
                    <span>Seats {restaurant.seatingCapacity}</span>
                  </div>
                )}

                {/* Reservations */}
                {restaurant.reservationsRequired && (
                  <div className="text-sm">
                    <Badge variant="outline">Reservations Required</Badge>
                  </div>
                )}

                {/* Contact */}
                {restaurant.contactEmail && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <a href={`mailto:${restaurant.contactEmail}`} className="hover:underline" data-testid="link-email">
                      {restaurant.contactEmail}
                    </a>
                  </div>
                )}
                
                {restaurant.contactPhone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <a href={`tel:${restaurant.contactPhone}`} className="hover:underline" data-testid="link-phone">
                      {restaurant.contactPhone}
                    </a>
                  </div>
                )}

                {/* Address */}
                {restaurant.address && (
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <div>
                      <div>{restaurant.address}</div>
                      <div>{restaurant.city}, {restaurant.state} {restaurant.zipCode}</div>
                    </div>
                  </div>
                )}

                {/* Social Links */}
                <div className="flex gap-2 pt-2">
                  {restaurant.website && (
                    <Button variant="outline" size="icon" asChild data-testid="button-website">
                      <a href={restaurant.website} target="_blank" rel="noopener noreferrer">
                        <Globe className="w-4 h-4" />
                      </a>
                    </Button>
                  )}
                  {restaurant.instagram && (
                    <Button variant="outline" size="icon" asChild data-testid="button-instagram">
                      <a href={`https://instagram.com/${restaurant.instagram}`} target="_blank" rel="noopener noreferrer">
                        <Instagram className="w-4 h-4" />
                      </a>
                    </Button>
                  )}
                  {restaurant.facebook && (
                    <Button variant="outline" size="icon" asChild data-testid="button-facebook">
                      <a href={restaurant.facebook} target="_blank" rel="noopener noreferrer">
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
