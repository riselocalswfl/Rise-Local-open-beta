import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import FilterBar from "@/components/FilterBar";
import EventCard from "@/components/EventCard";
import { Skeleton } from "@/components/ui/skeleton";
import { getEventsWithOrganizers } from "@/lib/api";

export default function Events() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<string>("newest");

  const { data: events, isLoading } = useQuery({
    queryKey: ["/api/events-with-organizers"],
    queryFn: getEventsWithOrganizers,
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
        <h1 className="text-3xl font-semibold mb-8" data-testid="heading-community-events">
          Community Events
        </h1>
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
