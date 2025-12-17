import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import type { Vendor, Product, Event, VendorReview, VendorFAQ, User, MenuItem, Service } from "@shared/schema";
import { MasterProfile } from "@/components/vendor-profile/MasterProfile";
import { ShopProfileSection } from "@/components/vendor-profile/ShopProfileSection";
import { DineProfileSection } from "@/components/vendor-profile/DineProfileSection";
import { ServiceProfileSection } from "@/components/vendor-profile/ServiceProfileSection";
import DetailHeader from "@/components/layout/DetailHeader";

export default function VendorProfile() {
  const [, params] = useRoute("/vendor/:id");
  const vendorId = params?.id;

  const { data: vendor, isLoading: vendorLoading } = useQuery<Vendor>({
    queryKey: [`/api/vendors/${vendorId}`],
    enabled: !!vendorId,
  });

  // Fetch data based on vendor capabilities (unified vendor system)
  const capabilities = vendor?.capabilities as { products?: boolean; services?: boolean; menu?: boolean } | undefined;

  const { data: products = [], isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: [`/api/products?vendorId=${vendorId}`],
    enabled: !!vendorId && !!capabilities?.products,
  });

  const { data: events = [] } = useQuery<Event[]>({
    queryKey: [`/api/vendors/${vendorId}/events`],
    enabled: !!vendorId,
  });

  const { data: menuItems = [], isLoading: menuItemsLoading } = useQuery<MenuItem[]>({
    queryKey: [`/api/vendors/${vendorId}/menu`],
    enabled: !!vendorId && !!capabilities?.menu,
  });

  const { data: services = [], isLoading: servicesLoading } = useQuery<Service[]>({
    queryKey: [`/api/vendors/${vendorId}/services`],
    enabled: !!vendorId && !!capabilities?.services,
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
      <div className="min-h-screen bg-bg">
        <DetailHeader title="Loading..." />
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading vendor profile...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="min-h-screen bg-bg">
        <DetailHeader title="Vendor Not Found" />
        <div className="flex items-center justify-center py-16">
          <Card className="max-w-md">
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground mb-4">Vendor not found</p>
              <a href="/" className="inline-flex items-center gap-2 text-primary hover:underline" data-testid="link-back-to-home">
                Back to Home
              </a>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Determine which sections to render based on vendor capabilities
  const renderCategorySections = () => {
    if (!vendor) return null;

    const sections = [];

    // Show products section if vendor has products capability
    if (capabilities?.products) {
      sections.push(
        <ShopProfileSection 
          key="products" 
          products={products} 
          events={events} 
          isLoading={productsLoading} 
        />
      );
    }

    // Show menu section if vendor has menu capability
    if (capabilities?.menu) {
      sections.push(
        <DineProfileSection 
          key="menu" 
          menuItems={menuItems} 
          isLoading={menuItemsLoading} 
        />
      );
    }

    // Show services section if vendor has services capability
    if (capabilities?.services) {
      sections.push(
        <ServiceProfileSection 
          key="services" 
          services={services} 
          isLoading={servicesLoading} 
        />
      );
    }

    return sections.length > 0 ? sections : null;
  };

  return (
    <div className="min-h-screen bg-bg">
      <DetailHeader title={vendor.businessName} backHref="/businesses" />
      <MasterProfile vendor={vendor} reviews={reviews} faqs={faqs}>
        {renderCategorySections()}
      </MasterProfile>
    </div>
  );
}
