import { useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Header from "@/components/Header";
import EventCard from "@/components/EventCard";
import { getEventsWithOrganizers } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

export default function EventsLayout() {
  const [location] = useLocation();
  const activeTab = location === "/events/my" ? "my" : "browse";

  // Fetch all events
  const { data: allEvents, isLoading: eventsLoading } = useQuery({
    queryKey: ["/api/events-with-organizers"],
    queryFn: getEventsWithOrganizers,
  });

  // Fetch user's RSVPs (for "My Events" tab)
  const { data: userRsvps, isLoading: rsvpsLoading } = useQuery<any[]>({
    queryKey: ["/api/events/rsvps/me"],
    enabled: activeTab === "my", // Only fetch when on "My Events" tab
  });

  // Filter events based on active tab
  const displayEvents = activeTab === "my" 
    ? allEvents?.filter(event => userRsvps?.some((rsvp) => rsvp.eventId === event.id))
    : allEvents;

  const isLoading = activeTab === "my" ? (eventsLoading || rsvpsLoading) : eventsLoading;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="border-b bg-background sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4">
          <Tabs value={activeTab} className="w-full">
            <TabsList className="w-full justify-start rounded-none border-b-0 bg-transparent p-0 h-auto">
              <Link href="/events">
                <TabsTrigger
                  value="browse"
                  className="inline-flex items-center justify-center whitespace-nowrap px-3 py-1.5 font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent mt-[5px] mb-[5px] text-[15px]"
                  data-testid="tab-browse-events"
                >
                  Browse Events
                </TabsTrigger>
              </Link>
              <Link href="/events/my">
                <TabsTrigger
                  value="my"
                  className="inline-flex items-center justify-center whitespace-nowrap px-3 py-1.5 font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent mt-[5px] mb-[5px] text-[15px]"
                  data-testid="tab-my-events"
                >
                  My Events
                </TabsTrigger>
              </Link>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        {activeTab === "my" && (
          <div className="mb-6">
            <h1 className="text-3xl font-playfair font-bold mb-2">My Events</h1>
            <p className="text-muted-foreground">Events you've RSVP'd to or are interested in</p>
          </div>
        )}
        
        {activeTab === "browse" && (
          <div className="mb-6">
            <h1 className="text-3xl font-playfair font-bold mb-2">Browse Events</h1>
            <p className="text-muted-foreground">Discover local events in SWFL</p>
          </div>
        )}

        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Skeleton className="h-80 w-full" />
            <Skeleton className="h-80 w-full" />
            <Skeleton className="h-80 w-full" />
          </div>
        ) : displayEvents && displayEvents.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayEvents.map((event) => (
              <EventCard
                key={event.id}
                id={event.id}
                title={event.title}
                dateTime={typeof event.dateTime === 'string' ? event.dateTime : new Date(event.dateTime).toISOString()}
                location={event.location}
                description={event.description || ""}
                organizerName={event.organizerName}
                ticketsAvailable={event.ticketsAvailable || 0}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">
              {activeTab === "my" 
                ? "You haven't RSVP'd to any events yet. Browse events to get started!"
                : "No events found. Check back soon!"}
            </p>
            {activeTab === "my" && (
              <Link href="/events" className="text-primary hover:underline mt-4 inline-block">
                Browse Events
              </Link>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
