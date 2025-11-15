import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  MapPin, Clock, Phone, Mail, Globe, Instagram,
  Star, Package, Award, HelpCircle, Image as ImageIcon, MessageSquare
} from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import type { Vendor, VendorReview, VendorFAQ, FulfillmentOptions } from "@shared/schema";

interface MasterProfileProps {
  vendor: Vendor;
  reviews: VendorReview[];
  faqs: VendorFAQ[];
  children?: React.ReactNode;
}

export function MasterProfile({ vendor, reviews, faqs, children }: MasterProfileProps) {
  const heroImage = vendor.heroImageUrl || vendor.bannerUrl;
  const certifications = (vendor.certifications as any) || [];
  const fulfillmentOptions = (vendor.fulfillmentOptions as FulfillmentOptions) || {};
  const contact = (vendor.contact as any) || {};
  const hours = (vendor.hours as any) || {};

  return (
    <>
      {/* Hero Section */}
      {heroImage && (
        <div className="relative h-80 bg-gray-900">
          <img 
            src={heroImage} 
            alt={vendor.businessName}
            className="w-full h-full object-cover opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Vendor Header */}
        <div className="flex flex-col md:flex-row gap-6 mb-8">
          {vendor.logoUrl && (
            <img 
              src={vendor.logoUrl}
              alt={`${vendor.businessName} logo`}
              className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg"
              data-testid="img-vendor-logo"
            />
          )}
          
          <div className="flex-1">
            <h1 className="text-4xl font-bold mb-2" data-testid="text-vendor-name">{vendor.businessName}</h1>
            {vendor.tagline && (
              <p className="text-lg text-muted-foreground mb-4" data-testid="text-vendor-tagline">
                {vendor.tagline}
              </p>
            )}
            
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

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
              <Button variant="default" data-testid="button-follow">Follow</Button>
              {vendor.ownerId && (
                <Link href={`/messages/${vendor.ownerId}`}>
                  <Button variant="outline" data-testid="button-message">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Message
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Quick Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Local Sourcing</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-local-sourcing">
                {vendor.localSourcingPercent || 0}%
              </div>
              <p className="text-xs text-muted-foreground">Products sourced locally</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Payment Methods</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm" data-testid="text-payment-methods">
                {vendor.paymentMethod || "Contact vendor"}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Fulfillment Options</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm space-y-2">
                {fulfillmentOptions.pickup?.enabled && (
                  <div data-testid="fulfillment-pickup" className="flex items-start gap-2">
                    <Package className="w-4 h-4 mt-0.5 text-primary" />
                    <div className="flex-1">
                      <div className="font-medium">Pickup</div>
                      {fulfillmentOptions.pickup.locations && fulfillmentOptions.pickup.locations.length > 0 && (
                        <div className="text-xs text-muted-foreground space-y-1 mt-1">
                          {fulfillmentOptions.pickup.locations.map((location, i) => (
                            <div key={location.id || i}>
                              <div className="font-medium text-foreground">{location.name}</div>
                              <div>{location.address}</div>
                              {location.days && location.days.length > 0 && (
                                <div>{location.days.join(", ")} {location.timeWindow && `• ${location.timeWindow}`}</div>
                              )}
                              {location.instructions && (
                                <div className="italic">{location.instructions}</div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {fulfillmentOptions.delivery?.enabled && (
                  <div data-testid="fulfillment-delivery" className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 mt-0.5 text-primary" />
                    <div className="flex-1">
                      <div className="font-medium">Delivery</div>
                      <div className="text-xs text-muted-foreground">
                        {fulfillmentOptions.delivery.radiusMiles && `${fulfillmentOptions.delivery.radiusMiles} mile radius`}
                        {fulfillmentOptions.delivery.baseFeeCents && ` • $${(fulfillmentOptions.delivery.baseFeeCents / 100).toFixed(2)} fee`}
                        {fulfillmentOptions.delivery.minOrderCents && ` • $${(fulfillmentOptions.delivery.minOrderCents / 100).toFixed(2)} min`}
                      </div>
                    </div>
                  </div>
                )}
                {fulfillmentOptions.shipping?.enabled && (
                  <div data-testid="fulfillment-shipping" className="flex items-start gap-2">
                    <Package className="w-4 h-4 mt-0.5 text-primary" />
                    <div className="flex-1">
                      <div className="font-medium">Shipping</div>
                      <div className="text-xs text-muted-foreground">
                        {fulfillmentOptions.shipping.flatFeeCents && `$${(fulfillmentOptions.shipping.flatFeeCents / 100).toFixed(2)} flat fee`}
                        {fulfillmentOptions.shipping.carriers && fulfillmentOptions.shipping.carriers.length > 0 && ` • ${fulfillmentOptions.shipping.carriers.join(", ")}`}
                      </div>
                    </div>
                  </div>
                )}
                {!fulfillmentOptions.pickup?.enabled && !fulfillmentOptions.delivery?.enabled && !fulfillmentOptions.shipping?.enabled && (
                  <div className="text-muted-foreground text-xs">Contact vendor for fulfillment details</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* About */}
            <Card>
              <CardHeader>
                <CardTitle>About</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none" data-testid="text-bio">
                  {vendor.bio}
                </div>
              </CardContent>
            </Card>

            {/* Category-specific sections */}
            {children}

            {/* Reviews */}
            {reviews.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="w-5 h-5" />
                    Reviews
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
                                className={`w-4 h-4 ${i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
                              />
                            ))}
                          </div>
                          <span className="font-semibold">{review.authorName}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{review.comment}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* FAQ */}
            {faqs.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <HelpCircle className="w-5 h-5" />
                    Frequently Asked Questions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible>
                    {faqs.map((faq, index) => (
                      <AccordionItem key={faq.id} value={`item-${index}`} data-testid={`faq-${faq.id}`}>
                        <AccordionTrigger>{faq.question}</AccordionTrigger>
                        <AccordionContent>{faq.answer}</AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            )}

            {/* Gallery */}
            {vendor.gallery && vendor.gallery.length > 0 && (
              <Card>
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
                        className="w-full h-40 object-cover rounded-md"
                        data-testid={`img-gallery-${i}`}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Contact Info */}
            <Card>
              <CardHeader>
                <CardTitle>Contact</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {contact.email && (
                  <a href={`mailto:${contact.email}`} className="flex items-center gap-2 text-sm hover:text-primary" data-testid="link-email">
                    <Mail className="w-4 h-4" />
                    {contact.email}
                  </a>
                )}
                {contact.phone && (
                  <a href={`tel:${contact.phone}`} className="flex items-center gap-2 text-sm hover:text-primary" data-testid="link-phone">
                    <Phone className="w-4 h-4" />
                    {contact.phone}
                  </a>
                )}
                {vendor.website && (
                  <a href={vendor.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm hover:text-primary" data-testid="link-website">
                    <Globe className="w-4 h-4" />
                    Website
                  </a>
                )}
                {vendor.instagram && (
                  <a href={`https://instagram.com/${vendor.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm hover:text-primary" data-testid="link-instagram">
                    <Instagram className="w-4 h-4" />
                    @{vendor.instagram.replace('@', '')}
                  </a>
                )}
              </CardContent>
            </Card>

            {/* Hours */}
            {Object.keys(hours).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Hours
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  {Object.entries(hours).map(([day, time]) => (
                    <div key={day} className="flex justify-between text-sm" data-testid={`hours-${day}`}>
                      <span className="capitalize">{day}</span>
                      <span className="text-muted-foreground">{time as string}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Location */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Location
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm" data-testid="text-location">
                  {vendor.city}, {vendor.state} {vendor.zipCode}
                </p>
                {vendor.address && (
                  <p className="text-sm text-muted-foreground mt-1">{vendor.address}</p>
                )}
              </CardContent>
            </Card>

            {/* Certifications */}
            {certifications.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="w-4 h-4" />
                    Certifications
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {certifications.map((cert: any, i: number) => (
                    <div key={i} className="text-sm" data-testid={`cert-${i}`}>
                      <div className="font-semibold">{cert.name}</div>
                      <div className="text-muted-foreground text-xs">{cert.type}</div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
