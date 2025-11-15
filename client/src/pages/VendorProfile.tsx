import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import type { Vendor, Product, Event, VendorReview, VendorFAQ, User, MenuItem, Service } from "@shared/schema";
import { MasterProfile } from "@/components/vendor-profile/MasterProfile";
import { ShopProfileSection } from "@/components/vendor-profile/ShopProfileSection";
import { DineProfileSection } from "@/components/vendor-profile/DineProfileSection";
import { ServiceProfileSection } from "@/components/vendor-profile/ServiceProfileSection";

export default function VendorProfile() {
  const [, params] = useRoute("/vendor/:id");
  const vendorId = params?.id;

  const { data: vendor, isLoading: vendorLoading } = useQuery<Vendor>({
    queryKey: ["/api/vendors", vendorId],
    enabled: !!vendorId,
  });

  const { data: vendorOwner } = useQuery<User>({
    queryKey: ["/api/users", vendor?.ownerId],
    enabled: !!vendor?.ownerId,
  });

  const { data: products = [], isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["/api/products", { vendorId }],
    enabled: !!vendorId && vendorOwner?.role === "vendor",
  });

  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ["/api/vendors", vendorId, "events"],
    enabled: !!vendorId && vendorOwner?.role === "vendor",
  });

  const { data: menuItems = [], isLoading: menuItemsLoading } = useQuery<MenuItem[]>({
    queryKey: ["/api/vendors", vendorId, "menu"],
    enabled: !!vendorId && vendorOwner?.role === "restaurant",
  });

  const { data: services = [], isLoading: servicesLoading } = useQuery<Service[]>({
    queryKey: ["/api/vendors", vendorId, "services"],
    enabled: !!vendorId && vendorOwner?.role === "service_provider",
  });

  const { data: reviews = [] } = useQuery<VendorReview[]>({
    queryKey: ["/api/vendors", vendorId, "reviews"],
    enabled: !!vendorId,
  });

  const { data: faqs = [] } = useQuery<VendorFAQ[]>({
    queryKey: ["/api/vendors", vendorId, "faqs"],
    enabled: !!vendorId,
  });

  if (vendorLoading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading vendor profile...</p>
        </div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">Vendor not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Determine which category-specific section to render based on vendor owner's role
  const renderCategorySection = () => {
    if (!vendorOwner) return null;

    switch (vendorOwner.role) {
      case "vendor":
        return <ShopProfileSection products={products} events={events} isLoading={productsLoading} />;
      case "restaurant":
        return <DineProfileSection menuItems={menuItems} isLoading={menuItemsLoading} />;
      case "service_provider":
        return <ServiceProfileSection services={services} isLoading={servicesLoading} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-bg">
      <MasterProfile vendor={vendor} reviews={reviews} faqs={faqs}>
        {renderCategorySection()}
      </MasterProfile>
    </div>
  );
}
