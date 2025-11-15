import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Wrench } from "lucide-react";
import type { Service } from "@shared/schema";

interface ServiceProfileSectionProps {
  services: Service[];
  isLoading?: boolean;
}

export function ServiceProfileSection({ services, isLoading }: ServiceProfileSectionProps) {
  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-48 mb-4"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (services.length === 0) {
    return null;
  }

  // Group services by category
  const servicesByCategory = services.reduce((acc, service) => {
    const category = service.category || "Other Services";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(service);
    return acc;
  }, {} as Record<string, Service[]>);

  return (
    <div className="space-y-8">
      {/* Services */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="w-5 h-5" />
            Services Offered
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {Object.entries(servicesByCategory).map(([category, items]) => (
              <div key={category}>
                <h3 className="text-lg font-semibold mb-3 border-b pb-2">{category}</h3>
                <div className="space-y-4">
                  {items.map((service) => (
                    <div 
                      key={service.id} 
                      className="border rounded-lg p-4"
                      data-testid={`service-${service.id}`}
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1">
                          {service.imageUrl && (
                            <img 
                              src={service.imageUrl}
                              alt={service.name}
                              className="w-full h-48 object-cover rounded mb-3"
                            />
                          )}
                          <h4 className="font-semibold text-lg">{service.name}</h4>
                          {service.description && (
                            <p className="text-sm text-muted-foreground mt-2">{service.description}</p>
                          )}
                          
                          <div className="flex flex-wrap gap-3 mt-3 text-sm">
                            {service.durationMinutes && (
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Clock className="w-4 h-4" />
                                <span>{service.durationMinutes} min</span>
                              </div>
                            )}
                            {(service.priceRangeMin || service.priceRangeMax) && (
                              <Badge variant="outline">
                                {service.priceRangeMin && service.priceRangeMax 
                                  ? `$${(service.priceRangeMin / 100).toFixed(0)} - $${(service.priceRangeMax / 100).toFixed(0)}`
                                  : service.priceRangeMin 
                                    ? `From $${(service.priceRangeMin / 100).toFixed(0)}`
                                    : `Up to $${(service.priceRangeMax! / 100).toFixed(0)}`
                                }
                              </Badge>
                            )}
                            {service.pricingModel && (
                              <Badge variant="secondary" className="capitalize">
                                {service.pricingModel.replace(/-/g, ' ')}
                              </Badge>
                            )}
                          </div>

                          {service.isAvailable === false && (
                            <Badge variant="secondary" className="mt-3">
                              Currently Unavailable
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
