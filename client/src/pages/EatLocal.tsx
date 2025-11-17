import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Leaf, Filter } from "lucide-react";
import RestaurantCard from "@/components/RestaurantCard";
import { CategoryFilter } from "@/components/CategoryFilter";
import type { Restaurant } from "@shared/schema";
import { DINE_CATEGORIES, categoriesMatch } from "@shared/categories";

export default function EatLocal() {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  
  const { data: restaurants = [], isLoading } = useQuery<Restaurant[]>({
    queryKey: ["/api/restaurants"],
  });

  // Filter by hierarchical categories
  let filteredRestaurants = restaurants;
  if (selectedCategories.length > 0) {
    filteredRestaurants = filteredRestaurants.filter(restaurant => {
      if (!restaurant.categories) return false;
      return categoriesMatch(restaurant.categories, selectedCategories, DINE_CATEGORIES);
    });
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="h-16" aria-hidden="true" />
      
      {/* Hero Section */}
      <div className="bg-primary/5 border-b">
        <div className="max-w-5xl mx-auto px-4 py-12">
          <div className="flex items-center gap-3 mb-4">
            <Leaf className="w-10 h-10 text-primary" strokeWidth={1.75} />
            <h1 className="text-4xl font-semibold text-text" data-testid="heading-eat-local">
              Dine
            </h1>
          </div>
          <p className="text-lg text-text/70 max-w-3xl">
            Discover Fort Myers restaurants partnering with local farms and makers. Every meal supports our farming community and brings you the freshest, locally-sourced ingredients.
          </p>
        </div>
      </div>

      {/* Restaurant List */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Mobile Filter Button */}
        <div className="lg:hidden mb-4">
          <Sheet open={mobileFilterOpen} onOpenChange={setMobileFilterOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="w-full" data-testid="button-mobile-filter">
                <Filter className="h-4 w-4 mr-2" />
                Filter by Category
                {selectedCategories.length > 0 && (
                  <span className="ml-2 bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs">
                    {selectedCategories.length}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Restaurant Categories</SheetTitle>
              </SheetHeader>
              <div className="mt-4">
                <CategoryFilter
                  categories={DINE_CATEGORIES}
                  selectedCategories={selectedCategories}
                  onChange={setSelectedCategories}
                  title=""
                />
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <div className="flex gap-6">
          {/* Sidebar with CategoryFilter (Desktop) */}
          <aside className="w-64 flex-shrink-0 hidden lg:block">
            <CategoryFilter
              categories={DINE_CATEGORIES}
              selectedCategories={selectedCategories}
              onChange={setSelectedCategories}
              title="Restaurant Categories"
            />
          </aside>

          {/* Main Content */}
          <div className="flex-1">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                <Skeleton className="h-96" />
                <Skeleton className="h-96" />
                <Skeleton className="h-96" />
              </div>
            ) : filteredRestaurants.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  {selectedCategories.length > 0 
                    ? "No restaurants found matching your filters. Try adjusting your category selections."
                    : "No restaurants currently listed. Check back soon!"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6" data-testid="restaurant-grid">
                {filteredRestaurants.map((restaurant) => (
                  <RestaurantCard key={restaurant.id} restaurant={restaurant} />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
