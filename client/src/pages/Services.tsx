import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import { Skeleton } from "@/components/ui/skeleton";
import { Wrench } from "lucide-react";
import ServiceProviderCard from "@/components/ServiceProviderCard";
import type { ServiceProvider } from "@shared/schema";

export default function Services() {
  const { data: providers = [], isLoading } = useQuery<ServiceProvider[]>({
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
            Find trusted local service providers in Fort Myers. From home repairs to wellness coaching, connect with verified professionals who serve our community.
          </p>
        </div>
      </div>

      {/* Service Provider List */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            <Skeleton className="h-96" />
            <Skeleton className="h-96" />
            <Skeleton className="h-96" />
          </div>
        ) : providers.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              No service providers currently listed. Check back soon!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6" data-testid="service-grid">
            {providers.map((provider) => (
              <ServiceProviderCard key={provider.id} provider={provider} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
