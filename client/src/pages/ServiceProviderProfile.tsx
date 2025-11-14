import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute } from "wouter";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertServiceBookingSchema } from "@shared/schema";
import type { ServiceProvider, ServiceOffering } from "@shared/schema";
import { z } from "zod";
import { 
  MapPin, Mail, Globe, Calendar, Clock, DollarSign, 
  Award, Star, Phone, Instagram, Facebook 
} from "lucide-react";

const bookingFormSchema = insertServiceBookingSchema.pick({
  serviceProviderId: true,
  offeringId: true,
  requestedDate: true,
  requestedTime: true,
  customerNotes: true,
  customerName: true,
  customerEmail: true,
  customerPhone: true,
}).extend({
  requestedDate: z.coerce.date(),
  requestedTime: z.string().optional(),
  customerNotes: z.string().min(10, "Please provide details about your service needs (min 10 characters)"),
  customerName: z.string().min(2, "Name is required"),
  customerEmail: z.string().email("Valid email is required"),
  customerPhone: z.string().min(10, "Phone number is required"),
});

type BookingFormData = z.infer<typeof bookingFormSchema>;

function ServiceOfferingCard({ 
  offering, 
  providerId,
  onBookNow 
}: { 
  offering: ServiceOffering;
  providerId: string;
  onBookNow: (offering: ServiceOffering) => void;
}) {
  return (
    <Card data-testid={`card-service-offering-${offering.id}`}>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <CardTitle className="text-lg" data-testid="text-offering-name">{offering.offeringName}</CardTitle>
            {offering.description && (
              <CardDescription className="mt-1" data-testid="text-offering-description">
                {offering.description}
              </CardDescription>
            )}
          </div>
          {offering.isActive ? (
            <Badge variant="outline" className="shrink-0 border-primary text-primary" data-testid="badge-active">
              Active
            </Badge>
          ) : (
            <Badge variant="secondary" className="shrink-0" data-testid="badge-inactive">
              Inactive
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium" data-testid="text-offering-pricing">
            {offering.pricingModel === 'hourly' && offering.hourlyRateCents && (
              `$${(offering.hourlyRateCents / 100).toFixed(2)}/hour`
            )}
            {offering.pricingModel === 'fixed' && offering.fixedPriceCents && (
              `$${(offering.fixedPriceCents / 100).toFixed(2)}`
            )}
            {offering.pricingModel === 'quote' && 'Custom Quote'}
          </span>
        </div>

        {offering.durationMinutes && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>{offering.durationMinutes} minutes</span>
          </div>
        )}

        {offering.isActive && (
          <Button 
            onClick={() => onBookNow(offering)} 
            className="w-full"
            data-testid="button-book-service"
          >
            Request Booking
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default function ServiceProviderProfile() {
  const [, params] = useRoute("/service/:id");
  const providerId = params?.id;
  const [selectedOffering, setSelectedOffering] = useState<ServiceOffering | null>(null);
  const [isBookingDialogOpen, setIsBookingDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: providerData, isLoading } = useQuery<ServiceProvider & { offerings: ServiceOffering[] }>({
    queryKey: ["/api/services", providerId],
    enabled: !!providerId,
  });

  const form = useForm<BookingFormData>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      serviceProviderId: providerId || "",
      offeringId: "",
      requestedDate: new Date(),
      requestedTime: "",
      customerNotes: "",
      customerName: "",
      customerEmail: "",
      customerPhone: "",
    },
  });

  const bookingMutation = useMutation({
    mutationFn: async (data: BookingFormData) => {
      return await apiRequest("POST", "/api/service-bookings", data);
    },
    onSuccess: () => {
      toast({
        title: "Booking Request Sent!",
        description: "The service provider will review your request and contact you soon.",
      });
      setIsBookingDialogOpen(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/service-bookings/user"] });
    },
    onError: () => {
      toast({
        title: "Failed to send booking request",
        description: "Please try again or contact the provider directly.",
        variant: "destructive",
      });
    },
  });

  const handleBookNow = (offering: ServiceOffering) => {
    setSelectedOffering(offering);
    form.setValue("offeringId", offering.id);
    setIsBookingDialogOpen(true);
  };

  const onSubmit = (data: BookingFormData) => {
    bookingMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/3" />
            <div className="h-4 bg-muted rounded w-2/3" />
            <div className="h-64 bg-muted rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!providerData) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-5xl mx-auto px-4 py-8 text-center">
          <h1 className="text-2xl font-semibold mb-2">Service Provider Not Found</h1>
          <p className="text-muted-foreground">The service provider you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Provider Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-semibold" data-testid="text-provider-name">
                  {providerData.businessName}
                </h1>
                {providerData.isVerified && (
                  <Badge variant="outline" className="border-primary text-primary" data-testid="badge-verified">
                    <Award className="w-3 h-3 mr-1" />
                    Verified
                  </Badge>
                )}
              </div>
              {providerData.tagline && (
                <p className="text-lg text-muted-foreground" data-testid="text-tagline">
                  {providerData.tagline}
                </p>
              )}
            </div>
            <Badge data-testid="badge-category">{providerData.category}</Badge>
          </div>

          {(providerData.heroImageUrl || providerData.logoUrl) && (
            <div className="aspect-[3/1] rounded-lg overflow-hidden mb-6">
              <img 
                src={providerData.heroImageUrl || providerData.logoUrl || ''} 
                alt={providerData.businessName}
                className="object-cover w-full h-full"
              />
            </div>
          )}

          {/* Contact Info */}
          <div className="flex flex-wrap gap-4 text-sm">
            {providerData.city && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span data-testid="text-city">{providerData.city}, FL</span>
              </div>
            )}
            {providerData.contactEmail && (
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <a href={`mailto:${providerData.contactEmail}`} className="hover:underline" data-testid="link-email">
                  {providerData.contactEmail}
                </a>
              </div>
            )}
            {providerData.contactPhone && (
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <a href={`tel:${providerData.contactPhone}`} className="hover:underline" data-testid="link-phone">
                  {providerData.contactPhone}
                </a>
              </div>
            )}
            {providerData.website && (
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-muted-foreground" />
                <a href={providerData.website} target="_blank" rel="noopener noreferrer" className="hover:underline" data-testid="link-website">
                  Website
                </a>
              </div>
            )}
            {providerData.instagram && (
              <div className="flex items-center gap-2">
                <Instagram className="w-4 h-4 text-muted-foreground" />
                <a href={`https://instagram.com/${providerData.instagram}`} target="_blank" rel="noopener noreferrer" className="hover:underline" data-testid="link-instagram">
                  @{providerData.instagram}
                </a>
              </div>
            )}
            {providerData.facebook && (
              <div className="flex items-center gap-2">
                <Facebook className="w-4 h-4 text-muted-foreground" />
                <a href={`https://facebook.com/${providerData.facebook}`} target="_blank" rel="noopener noreferrer" className="hover:underline" data-testid="link-facebook">
                  Facebook
                </a>
              </div>
            )}
          </div>
        </div>

        <Separator className="my-8" />

        {/* About Section */}
        {providerData.bio && (
          <div className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">About</h2>
            <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap" data-testid="text-bio">
              {providerData.bio}
            </p>
          </div>
        )}

        {/* Badges & Values */}
        {providerData.badges && providerData.badges.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Credentials & Badges</h2>
            <div className="flex flex-wrap gap-2">
              {providerData.badges.map((badge, idx) => (
                <Badge key={idx} variant="secondary" data-testid={`badge-credential-${idx}`}>
                  <Award className="w-3 h-3 mr-1" />
                  {badge}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {providerData.values && providerData.values.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Values & Commitments</h2>
            <div className="flex flex-wrap gap-2">
              {providerData.values.map((value, idx) => (
                <Badge key={idx} variant="outline" className="border-primary text-primary" data-testid={`badge-value-${idx}`}>
                  {value}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Service Offerings */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Services Offered</h2>
          {providerData.offerings && providerData.offerings.length > 0 ? (
            <div className="grid gap-4">
              {providerData.offerings
                .filter(o => o.isActive)
                .map((offering) => (
                  <ServiceOfferingCard
                    key={offering.id}
                    offering={offering}
                    providerId={providerData.id}
                    onBookNow={handleBookNow}
                  />
                ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No active services available at this time.</p>
          )}
        </div>

        {/* Trust Signals */}
        {providerData.completedBookings > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Experience</h2>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-muted-foreground" />
                <span data-testid="text-completed-bookings">
                  {providerData.completedBookings} completed bookings
                </span>
              </div>
              {providerData.averageRating !== null && providerData.averageRating > 0 && (
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 fill-primary text-primary" />
                  <span className="font-medium" data-testid="text-average-rating">
                    {(providerData.averageRating / 100).toFixed(1)} rating
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Booking Dialog */}
      <Dialog open={isBookingDialogOpen} onOpenChange={setIsBookingDialogOpen}>
        <DialogContent className="sm:max-w-md bg-white text-[#222]" data-testid="dialog-booking-request">
          <DialogHeader>
            <DialogTitle className="text-[#222]">Request Booking</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {selectedOffering && (
                <div className="p-3 bg-muted rounded-md">
                  <p className="font-medium">{selectedOffering.offeringName}</p>
                  <p className="text-sm text-muted-foreground">{providerData.businessName}</p>
                </div>
              )}

              <FormField
                control={form.control}
                name="customerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Name</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-customer-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="customerEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Email</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} data-testid="input-customer-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="customerPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Phone</FormLabel>
                    <FormControl>
                      <Input type="tel" {...field} data-testid="input-customer-phone" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="requestedDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preferred Date</FormLabel>
                      <FormControl>
                        <Input 
                          type="date" 
                          value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''} 
                          onChange={(e) => field.onChange(new Date(e.target.value))}
                          data-testid="input-preferred-date" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="requestedTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preferred Time (optional)</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} data-testid="input-preferred-time" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="customerNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service Details</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="Please describe what you need help with..."
                        className="min-h-[100px]"
                        data-testid="input-customer-notes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                className="w-full" 
                disabled={bookingMutation.isPending}
                data-testid="button-submit-booking"
              >
                {bookingMutation.isPending ? "Sending Request..." : "Send Booking Request"}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
