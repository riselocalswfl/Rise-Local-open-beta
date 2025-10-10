import { Link } from "wouter";
import * as LucideIcons from "lucide-react";
import Header from "@/components/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { VALUE_META, ALL_VALUE_TAGS, type ValueTag } from "@/../../shared/values";

export default function Values() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold mb-4" data-testid="heading-shop-by-values">
            Shop by Your Values
          </h1>
          <p className="text-muted-foreground max-w-3xl">
            Filter vendors and products that align with what you care about. Whether you're looking for 
            organic produce, locally-sourced goods, or businesses that share your values, we make it easy 
            to shop with purpose.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ALL_VALUE_TAGS.map((tag) => {
            const meta = VALUE_META[tag];
            const IconComponent = (LucideIcons as any)[meta.icon] || LucideIcons.Tag;
            
            return (
              <Card key={tag} className="le-card">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div 
                      className="p-3 rounded-lg flex-shrink-0" 
                      style={{ background: 'rgba(91, 140, 90, 0.1)' }}
                    >
                      <IconComponent 
                        className="w-6 h-6" 
                        style={{ color: 'var(--le-green)' }} 
                        strokeWidth={1.75} 
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 
                        className="font-semibold mb-2" 
                        data-testid={`text-value-${tag}`}
                      >
                        {meta.label}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        {meta.description}
                      </p>
                      <div className="flex gap-2 flex-wrap">
                        <Link href={`/vendors?values=${tag}`}>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="rounded-pill"
                            data-testid={`button-browse-vendors-${tag}`}
                          >
                            Browse Vendors
                          </Button>
                        </Link>
                        <Link href={`/products?values=${tag}`}>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="rounded-pill"
                            data-testid={`button-browse-products-${tag}`}
                          >
                            Browse Products
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
}
