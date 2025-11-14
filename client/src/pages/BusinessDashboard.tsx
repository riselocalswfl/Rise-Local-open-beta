import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Vendor, Restaurant, ServiceProvider } from "@shared/schema";
import VendorDashboard from "./VendorDashboard";
import RestaurantDashboard from "./RestaurantDashboard";
import ServiceProviderDashboard from "./ServiceProviderDashboard";

export default function BusinessDashboard() {
  const [, setLocation] = useLocation();

  const { data: vendor, isLoading: vendorLoading } = useQuery<Vendor>({
    queryKey: ["/api/auth/my-vendor"],
    retry: false,
  });

  const { data: restaurant, isLoading: restaurantLoading } = useQuery<Restaurant>({
    queryKey: ["/api/auth/my-restaurant"],
    retry: false,
  });

  const { data: serviceProvider, isLoading: serviceProviderLoading } = useQuery<ServiceProvider>({
    queryKey: ["/api/auth/my-service-provider"],
    retry: false,
  });

  if (vendorLoading || restaurantLoading || serviceProviderLoading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading your business...</p>
        </div>
      </div>
    );
  }

  if (vendor) {
    return <VendorDashboard />;
  }

  if (restaurant) {
    return <RestaurantDashboard />;
  }

  if (serviceProvider) {
    return <ServiceProviderDashboard />;
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>No Business Profile Found</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            You don't have a business profile yet. Sign up as a vendor, restaurant, or service provider to create your profile.
          </p>
          <div className="space-y-2">
            <button
              onClick={() => setLocation("/join")}
              className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover-elevate active-elevate-2"
              data-testid="button-join"
            >
              Create Business Profile
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
