import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Wrench, Briefcase, Calendar, Star, Plus, Trash2, Edit, CheckCircle, XCircle, Clock } from "lucide-react";
import type { ServiceProvider, ServiceOffering, ServiceBooking } from "@shared/schema";
import { insertServiceProviderSchema, insertServiceOfferingSchema } from "@shared/schema";
import { z } from "zod";
import { format } from "date-fns";

// Form schemas
const serviceOfferingFormSchema = z.object({
  offeringName: z.string().min(1, "Service name is required"),
  description: z.string().optional(),
  pricingModel: z.enum(["fixed", "hourly", "quote"]),
  fixedPrice: z.number().min(0).optional(), // In dollars for the form
  hourlyRate: z.number().min(0).optional(), // In dollars for the form
  durationMinutes: z.number().int().min(0).optional(),
});

export default function ServiceProviderDashboard() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("profile");
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceOffering | null>(null);

  // Fetch the authenticated user's service provider profile
  const { data: provider, isLoading: providerLoading } = useQuery<ServiceProvider>({
    queryKey: ["/api/auth/my-service-provider"],
  });

  const { data: services = [] } = useQuery<ServiceOffering[]>({
    queryKey: ["/api/service-offerings", provider?.id],
    enabled: !!provider?.id,
  });

  const { data: bookings = [] } = useQuery<ServiceBooking[]>({
    queryKey: ["/api/service-bookings/provider", provider?.id],
    enabled: !!provider?.id,
  });

  // Profile form
  const profileForm = useForm({
    resolver: zodResolver(insertServiceProviderSchema.partial().omit({ ownerId: true })),
    defaultValues: {
      businessName: provider?.businessName || "",
      category: provider?.category || "Home Services",
      bio: provider?.bio || "",
      tagline: provider?.tagline || "",
      city: provider?.city || "Fort Myers",
      zipCode: provider?.zipCode || "",
      contactEmail: provider?.contactEmail || "",
      contactPhone: provider?.contactPhone || "",
      website: provider?.website || "",
      instagram: provider?.instagram || "",
      facebook: provider?.facebook || "",
      heroImageUrl: provider?.heroImageUrl || "",
      logoUrl: provider?.logoUrl || "",
      certifications: provider?.certifications || [],
      availabilityWindows: provider?.availabilityWindows || {},
    },
  });

  useEffect(() => {
    if (provider) {
      profileForm.reset({
        businessName: provider.businessName,
        category: provider.category,
        bio: provider.bio || "",
        tagline: provider.tagline || "",
        city: provider.city,
        zipCode: provider.zipCode || "",
        contactEmail: provider.contactEmail || "",
        contactPhone: provider.contactPhone || "",
        website: provider.website || "",
        instagram: provider.instagram || "",
        facebook: provider.facebook || "",
        heroImageUrl: provider.heroImageUrl || "",
        logoUrl: provider.logoUrl || "",
        certifications: provider.certifications || [],
        availabilityWindows: provider.availabilityWindows || {},
      });
    }
  }, [provider]);

  // Service offering form
  const serviceForm = useForm({
    resolver: zodResolver(serviceOfferingFormSchema),
    defaultValues: {
      offeringName: "",
      description: "",
      pricingModel: "fixed" as const,
      fixedPrice: 0,
      hourlyRate: 0,
      durationMinutes: 60,
    },
  });

  // Profile update mutation
  const updateProviderMutation = useMutation({
    mutationFn: async (data: Partial<ServiceProvider>) => {
      if (!provider?.id) throw new Error("No provider ID");
      const providerId = provider.id;
      const result = await apiRequest("PATCH", `/api/services/${providerId}`, data);
      return { result, providerId };
    },
    onSuccess: async ({ providerId }) => {
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/my-service-provider"] });
      await queryClient.refetchQueries({ queryKey: ["/api/services", providerId] });
      toast({ title: "Profile updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update profile", variant: "destructive" });
    },
  });

  // Service offering mutations
  const createServiceMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!provider?.id) throw new Error("No provider ID");
      // Convert dollars to cents
      const apiData = {
        ...data,
        serviceProviderId: provider.id,
        fixedPriceCents: data.pricingModel === "fixed" && data.fixedPrice ? Math.round(data.fixedPrice * 100) : undefined,
        hourlyRateCents: data.pricingModel === "hourly" && data.hourlyRate ? Math.round(data.hourlyRate * 100) : undefined,
      };
      delete apiData.fixedPrice;
      delete apiData.hourlyRate;
      return await apiRequest("POST", "/api/service-offerings", apiData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-offerings", provider?.id] });
      setServiceDialogOpen(false);
      serviceForm.reset();
      toast({ title: "Service created successfully" });
    },
  });

  const deleteServiceMutation = useMutation({
    mutationFn: async (serviceId: string) => {
      return await apiRequest("DELETE", `/api/service-offerings/${serviceId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-offerings", provider?.id] });
      toast({ title: "Service deleted successfully" });
    },
  });

  // Booking status update mutation
  const updateBookingMutation = useMutation({
    mutationFn: async ({ bookingId, status }: { bookingId: string; status: string }) => {
      return await apiRequest("PATCH", `/api/service-bookings/${bookingId}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-bookings/provider", provider?.id] });
      toast({ title: "Booking status updated" });
    },
  });

  const handleProfileSubmit = (data: any) => {
    updateProviderMutation.mutate(data);
  };

  const handleServiceSubmit = (data: any) => {
    createServiceMutation.mutate(data);
  };

  if (providerLoading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <p className="text-text/60">Loading dashboard...</p>
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Service Provider Profile Not Found</CardTitle>
            <CardDescription>
              You need to create a service provider profile first.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => window.location.href = "/join/service-provider"} data-testid="button-create-profile">
              Create Profile
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-text mb-2" data-testid="text-dashboard-title">
            Service Provider Dashboard
          </h1>
          <p className="text-text/60" data-testid="text-business-name">
            {provider.businessName}
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="profile" data-testid="tab-profile">
              <Briefcase className="h-4 w-4 mr-2" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="services" data-testid="tab-services">
              <Wrench className="h-4 w-4 mr-2" />
              Services
            </TabsTrigger>
            <TabsTrigger value="bookings" data-testid="tab-bookings">
              <Calendar className="h-4 w-4 mr-2" />
              Bookings
            </TabsTrigger>
            <TabsTrigger value="reviews" data-testid="tab-reviews">
              <Star className="h-4 w-4 mr-2" />
              Reviews
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Form {...profileForm}>
              <form onSubmit={profileForm.handleSubmit(handleProfileSubmit)} className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Business Information</CardTitle>
                    <CardDescription>Update your service provider profile details</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={profileForm.control}
                      name="businessName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Business Name</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-business-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={profileForm.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Service Category</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-service-type">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Home Services">Home Services</SelectItem>
                              <SelectItem value="Property Care">Property Care</SelectItem>
                              <SelectItem value="Recreation">Recreation</SelectItem>
                              <SelectItem value="Education">Education</SelectItem>
                              <SelectItem value="Wellness">Wellness</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={profileForm.control}
                      name="tagline"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tagline</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Your unique value proposition" data-testid="input-tagline" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={profileForm.control}
                      name="bio"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Business Bio</FormLabel>
                          <FormControl>
                            <Textarea {...field} rows={4} data-testid="input-bio" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={profileForm.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>City</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-city" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={profileForm.control}
                        name="zipCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Zip Code</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-zip" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={profileForm.control}
                      name="contactEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Email</FormLabel>
                          <FormControl>
                            <Input {...field} type="email" data-testid="input-email" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={profileForm.control}
                      name="contactPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Phone</FormLabel>
                          <FormControl>
                            <Input {...field} type="tel" data-testid="input-phone" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Separator />

                    <div className="grid grid-cols-3 gap-4">
                      <FormField
                        control={profileForm.control}
                        name="website"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Website</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="https://" data-testid="input-website" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={profileForm.control}
                        name="instagram"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Instagram</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="@username" data-testid="input-instagram" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={profileForm.control}
                        name="facebook"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Facebook</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="page-name" data-testid="input-facebook" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Button type="submit" disabled={updateProviderMutation.isPending} data-testid="button-save-profile">
                  {updateProviderMutation.isPending ? "Saving..." : "Save Profile"}
                </Button>
              </form>
            </Form>
          </TabsContent>

          {/* Services Tab */}
          <TabsContent value="services">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Service Offerings</CardTitle>
                    <CardDescription>Manage the services you provide</CardDescription>
                  </div>
                  <Dialog open={serviceDialogOpen} onOpenChange={setServiceDialogOpen}>
                    <DialogTrigger asChild>
                      <Button data-testid="button-add-service">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Service
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-white text-[#222]" data-testid="dialog-add-service">
                      <DialogHeader>
                        <DialogTitle className="text-[#222]">Add Service Offering</DialogTitle>
                      </DialogHeader>
                      <Form {...serviceForm}>
                        <form onSubmit={serviceForm.handleSubmit(handleServiceSubmit)} className="space-y-4">
                          <FormField
                            control={serviceForm.control}
                            name="offeringName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Service Name</FormLabel>
                                <FormControl>
                                  <Input {...field} data-testid="input-service-name" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={serviceForm.control}
                            name="description"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Description</FormLabel>
                                <FormControl>
                                  <Textarea {...field} rows={3} data-testid="input-service-description" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={serviceForm.control}
                            name="pricingModel"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Pricing Model</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger data-testid="select-pricing-model">
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="fixed">Fixed Price</SelectItem>
                                    <SelectItem value="hourly">Hourly Rate</SelectItem>
                                    <SelectItem value="quote">Custom Quote</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          {serviceForm.watch("pricingModel") === "fixed" && (
                            <FormField
                              control={serviceForm.control}
                              name="fixedPrice"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Fixed Price ($)</FormLabel>
                                  <FormControl>
                                    <Input 
                                      {...field} 
                                      type="number" 
                                      step="0.01" 
                                      min="0"
                                      onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                                      data-testid="input-fixed-price"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          )}

                          {serviceForm.watch("pricingModel") === "hourly" && (
                            <FormField
                              control={serviceForm.control}
                              name="hourlyRate"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Hourly Rate ($)</FormLabel>
                                  <FormControl>
                                    <Input 
                                      {...field} 
                                      type="number" 
                                      step="0.01" 
                                      min="0"
                                      onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                                      data-testid="input-hourly-rate"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          )}

                          <FormField
                            control={serviceForm.control}
                            name="durationMinutes"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Estimated Duration (minutes)</FormLabel>
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    type="number" 
                                    min="0"
                                    onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                                    data-testid="input-duration"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <Button type="submit" disabled={createServiceMutation.isPending} data-testid="button-submit-service">
                            {createServiceMutation.isPending ? "Creating..." : "Create Service"}
                          </Button>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {services.length === 0 ? (
                  <p className="text-text/60 text-center py-8" data-testid="text-no-services">
                    No services added yet. Create your first service offering!
                  </p>
                ) : (
                  <div className="space-y-4">
                    {services.map((service) => (
                      <Card key={service.id} data-testid={`card-service-${service.id}`}>
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-lg" data-testid={`text-service-name-${service.id}`}>
                                {service.offeringName}
                              </CardTitle>
                              {service.description && (
                                <CardDescription data-testid={`text-service-description-${service.id}`}>
                                  {service.description}
                                </CardDescription>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteServiceMutation.mutate(service.id)}
                              data-testid={`button-delete-service-${service.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="flex gap-2 flex-wrap">
                            <Badge data-testid={`badge-pricing-${service.id}`}>
                              {service.pricingModel === "fixed" && `$${(service.fixedPriceCents! / 100).toFixed(2)}`}
                              {service.pricingModel === "hourly" && `$${(service.hourlyRateCents! / 100).toFixed(2)}/hr`}
                              {service.pricingModel === "quote" && "Custom Quote"}
                            </Badge>
                            {service.durationMinutes && (
                              <Badge variant="outline" data-testid={`badge-duration-${service.id}`}>
                                {service.durationMinutes} min
                              </Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Bookings Tab */}
          <TabsContent value="bookings">
            <Card>
              <CardHeader>
                <CardTitle>Booking Requests</CardTitle>
                <CardDescription>Manage customer booking requests</CardDescription>
              </CardHeader>
              <CardContent>
                {bookings.length === 0 ? (
                  <p className="text-text/60 text-center py-8" data-testid="text-no-bookings">
                    No booking requests yet
                  </p>
                ) : (
                  <div className="space-y-4">
                    {bookings.map((booking) => (
                      <Card key={booking.id} data-testid={`card-booking-${booking.id}`}>
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-lg" data-testid={`text-booking-customer-${booking.id}`}>
                                {booking.customerName}
                              </CardTitle>
                              <CardDescription data-testid={`text-booking-date-${booking.id}`}>
                                {format(new Date(booking.preferredDate), "PPP")}
                              </CardDescription>
                            </div>
                            <Badge 
                              variant={
                                booking.status === "pending" ? "secondary" :
                                booking.status === "confirmed" ? "default" :
                                "outline"
                              }
                              data-testid={`badge-status-${booking.id}`}
                            >
                              {booking.status}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div>
                            <p className="text-sm text-text/60">Contact:</p>
                            <p className="text-sm" data-testid={`text-booking-email-${booking.id}`}>{booking.customerEmail}</p>
                            <p className="text-sm" data-testid={`text-booking-phone-${booking.id}`}>{booking.customerPhone}</p>
                          </div>
                          {booking.message && (
                            <div>
                              <p className="text-sm text-text/60">Message:</p>
                              <p className="text-sm" data-testid={`text-booking-message-${booking.id}`}>{booking.message}</p>
                            </div>
                          )}
                          {booking.status === "pending" && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => updateBookingMutation.mutate({ bookingId: booking.id, status: "confirmed" })}
                                disabled={updateBookingMutation.isPending}
                                data-testid={`button-confirm-${booking.id}`}
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Confirm
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateBookingMutation.mutate({ bookingId: booking.id, status: "cancelled" })}
                                disabled={updateBookingMutation.isPending}
                                data-testid={`button-decline-${booking.id}`}
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Decline
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reviews Tab */}
          <TabsContent value="reviews">
            <Card>
              <CardHeader>
                <CardTitle>Customer Reviews</CardTitle>
                <CardDescription>
                  Average Rating: {provider.averageRating ? (provider.averageRating / 100).toFixed(1) : "N/A"} / 5.0
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-text/60 text-center py-8" data-testid="text-reviews-coming-soon">
                  Reviews feature coming soon
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
