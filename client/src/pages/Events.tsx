import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import FilterBar from "@/components/FilterBar";
import EventCard from "@/components/EventCard";
import { Skeleton } from "@/components/ui/skeleton";
import { getEventsWithOrganizers } from "@/lib/api";

export default function Events() {
  const { data: events, isLoading } = useQuery({
    queryKey: ["/api/events-with-organizers"],
    queryFn: getEventsWithOrganizers,
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="h-16" aria-hidden="true" />
      <FilterBar type="events" />
      <div className="h-[200px]" aria-hidden="true" />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-semibold mb-8" data-testid="heading-community-events">Community Events</h1>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {isLoading ? (
            <>
              <Skeleton className="h-48" />
              <Skeleton className="h-48" />
              <Skeleton className="h-48" />
            </>
          ) : (
            events?.map((event) => (
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
    </div>
  );
}
