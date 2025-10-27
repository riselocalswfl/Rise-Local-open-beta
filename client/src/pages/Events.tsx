import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import FilterBar from "@/components/FilterBar";
import ValuesFilterDialog from "@/components/filters/ValuesFilterDialog";
import EventCard from "@/components/EventCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getEventsWithOrganizers } from "@/lib/api";
import type { Vendor, Restaurant } from "@shared/schema";
import { X } from "lucide-react";

export default function Events() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedValues, setSelectedValues] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState<string>("newest");

  const { data: events, isLoading } = useQuery({
    queryKey: ["/api/events-with-organizers"],
    queryFn: getEventsWithOrganizers,
  });

  const { data: vendors } = useQuery<Vendor[]>({
    queryKey: ["/api/vendors"],
  });

  const { data: restaurants } = useQuery<Restaurant[]>({
    queryKey: ["/api/restaurants"],
  });

  // Get all unique values from vendors and restaurants
  const { data: allValues = [] } = useQuery<string[]>({
    queryKey: ["/api/values/unique"],
  });

  // Filter events by category and search query
  let filteredEvents = events;

  if (selectedCategory !== "all") {
    filteredEvents = filteredEvents?.filter(
      (e) => e.category?.toLowerCase() === selectedCategory
    );
  }

  if (searchQuery) {
    filteredEvents = filteredEvents?.filter((e) => {
      const query = searchQuery.toLowerCase();
      return (
        e.title?.toLowerCase().includes(query) ||
        e.description?.toLowerCase().includes(query) ||
        e.location?.toLowerCase().includes(query) ||
        e.organizerName?.toLowerCase().includes(query)
      );
    });
  }

  // Filter by organizer values (vendors/restaurants)
  if (selectedValues.length > 0 && (vendors || restaurants)) {
    filteredEvents = filteredEvents?.filter(e => {
      // Check if event is organized by a vendor
      const vendor = vendors?.find(v => v.id === e.vendorId);
      if (vendor) {
        const vendorValues = vendor.values || [];
        return selectedValues.some(sv => vendorValues.includes(sv));
      }
      // Check if event is organized by a restaurant
      const restaurant = restaurants?.find(r => r.id === e.restaurantId);
      if (restaurant) {
        const restaurantValues = restaurant.values || [];
        return selectedValues.some(sv => restaurantValues.includes(sv));
      }
      return false;
    });
  }

  // Sort events
  if (filteredEvents) {
    filteredEvents = [...filteredEvents].sort((a, b) => {
      if (sortOrder === "newest") {
        return new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime();
      } else if (sortOrder === "popular") {
        return (b.rsvpCount || 0) - (a.rsvpCount || 0);
      }
      return 0;
    });
  }

  return (
    <>
      <FilterBar
        type="events"
        onSearch={setSearchQuery}
        onCategoryChange={setSelectedCategory}
        onSortChange={setSortOrder}
        selectedCategory={selectedCategory}
        searchQuery={searchQuery}
        sortOrder={sortOrder}
      />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <h1 className="text-3xl font-semibold" data-testid="heading-community-events">
            Community Events
          </h1>
          {allValues.length > 0 && (
            <ValuesFilterDialog
              allValues={allValues}
              selected={selectedValues}
              onChange={setSelectedValues}
            />
          )}
        </div>

        {selectedValues.length > 0 && (
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">Active filters:</span>
            {selectedValues.map(v => (
              <Badge 
                key={v} 
                variant="outline" 
                role="button"
                tabIndex={0}
                className="cursor-pointer hover-elevate active-elevate-2 pr-1 border-primary text-primary"
                onClick={() => {
                  const next = selectedValues.filter(x => x !== v);
                  setSelectedValues(next);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    const next = selectedValues.filter(x => x !== v);
                    setSelectedValues(next);
                  }
                }}
                data-testid={`badge-active-filter-${v}`}
              >
                {v}
                <X className="w-3 h-3 ml-1.5" strokeWidth={2} />
              </Badge>
            ))}
            <Button 
              variant="ghost" 
              className="px-2 h-auto py-0.5 text-sm" 
              onClick={() => setSelectedValues([])}
              data-testid="button-clear-all-filters"
            >
              Clear all
            </Button>
          </div>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {isLoading ? (
            <>
              <Skeleton className="h-48" />
              <Skeleton className="h-48" />
              <Skeleton className="h-48" />
            </>
          ) : filteredEvents && filteredEvents.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <p className="text-muted-foreground">
                No events found matching your filters
              </p>
            </div>
          ) : (
            filteredEvents?.map((event) => (
              <EventCard
                key={event.id}
                id={event.id}
                title={event.title}
                dateTime={event.dateTime.toString()}
                location={event.location}
                category={event.category}
                description={event.description}
                ticketsAvailable={event.ticketsAvailable}
                rsvpCount={event.rsvpCount}
                organizerName={event.organizerName}
              />
            ))
          )}
        </div>
      </main>
    </>
  );
}
