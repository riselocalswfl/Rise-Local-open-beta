import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import { Skeleton } from "@/components/ui/skeleton";
import { Wrench } from "lucide-react";
import ServiceOfferingCard from "@/components/ServiceOfferingCard";

interface ServiceOfferingWithProvider {
  id: string;
  vendorId: string;
  offeringName: string;
  description: string;
  durationMinutes: number | null;
  pricingModel: string;
  fixedPriceCents: number | null;
  hourlyRateCents: number | null;
  startingAtCents: number | null;
  tags: string[];
  isFeatured: boolean;
  provider: {
    id: string;
    businessName: string;
    logoUrl: string | null;
    city: string;
    isVerified: boolean;
  } | null;
}

export default function Services() {
  const { data: offerings = [], isLoading } = useQuery<ServiceOfferingWithProvider[]>({
    queryKey: ["/api/services"],
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="h-16" aria-hidden="true" />
      
      {/* Hero Section */}
      <div className="bg-primary/5 border-b">
        <div className="max-w-5xl mx-auto px-4 py-12">
          <div className="flex items-center gap-3 mb-4">
            <Wrench className="w-10 h-10 text-primary" strokeWidth={1.75} />
            <h1 className="text-4xl font-semibold text-text" data-testid="heading-services">
              Services
            </h1>
          </div>
          <p className="text-lg text-text/70 max-w-3xl">
            Browse local services in Fort Myers. From home repairs to wellness coaching, find the perfect service for your needs from verified local professionals.
          </p>
        </div>
      </div>

      {/* Service Offerings List */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            <Skeleton className="h-96" />
            <Skeleton className="h-96" />
            <Skeleton className="h-96" />
          </div>
        ) : offerings.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              No services currently listed. Check back soon!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6" data-testid="service-grid">
            {offerings.map((offering) => (
              <ServiceOfferingCard key={offering.id} offering={offering} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
