import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UtensilsCrossed } from "lucide-react";
import type { MenuItem } from "@shared/schema";

interface DineProfileSectionProps {
  menuItems: MenuItem[];
  isLoading?: boolean;
}

export function DineProfileSection({ menuItems, isLoading }: DineProfileSectionProps) {
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

  if (menuItems.length === 0) {
    return null;
  }

  // Group menu items by category
  const itemsByCategory = menuItems.reduce((acc, item) => {
    const category = item.category || "Other";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {} as Record<string, MenuItem[]>);

  return (
    <div className="space-y-8">
      {/* Menu */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UtensilsCrossed className="w-5 h-5" />
            Menu
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {Object.entries(itemsByCategory).map(([category, items]) => (
              <div key={category}>
                <h3 className="text-lg font-semibold mb-3 border-b pb-2">{category}</h3>
                <div className="space-y-4">
                  {items.map((item) => (
                    <div 
                      key={item.id} 
                      className="flex justify-between items-start gap-4"
                      data-testid={`menu-item-${item.id}`}
                    >
                      <div className="flex-1">
                        <div className="flex items-start gap-3">
                          {item.imageUrl && (
                            <img 
                              src={item.imageUrl}
                              alt={item.name}
                              className="w-20 h-20 object-cover rounded"
                            />
                          )}
                          <div className="flex-1">
                            <h4 className="font-semibold">{item.name}</h4>
                            {item.description && (
                              <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                            )}
                            {item.dietaryTags && item.dietaryTags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {item.dietaryTags.map((tag, i) => (
                                  <Badge key={i} variant="outline" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">
                          ${((item.priceCents || 0) / 100).toFixed(2)}
                        </div>
                        {item.isAvailable === false && (
                          <Badge variant="secondary" className="mt-1 text-xs">
                            Unavailable
                          </Badge>
                        )}
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
