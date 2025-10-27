import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Users, CheckCircle2 } from "lucide-react";
import { format, isPast, isToday, isTomorrow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";

type EventWithRelations = {
  id: string;
  title: string;
  description: string;
  dateTime: string;
  location: string;
  ticketsAvailable: number | null;
  rsvpCount: number;
  vendorId: string | null;
  restaurantId: string | null;
  relations: {
    rsvped: boolean;
    rsvpStatus: "GOING" | "INTERESTED" | "NOT_GOING" | null;
    attended: boolean;
  };
};

type MyStats = {
  totalRsvped: number;
  goingCount: number;
  interestedCount: number;
  notGoingCount: number;
  attendedCount: number;
};

function formatEventDate(dateTime: string) {
  const date = new Date(dateTime);
  if (isToday(date)) return "Today";
  if (isTomorrow(date)) return "Tomorrow";
  return format(date, "EEEE, MMMM d");
}

function formatEventTime(dateTime: string) {
  return format(new Date(dateTime), "h:mm a");
}

function EventCard({ event }: { event: EventWithRelations }) {
  const eventDate = new Date(event.dateTime);
  const isEventPast = isPast(eventDate);

  return (
    <Card className="hover-elevate" data-testid={`card-event-${event.id}`}>
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-3">
        <div className="flex-1">
          <CardTitle className="text-lg" data-testid={`text-event-title-${event.id}`}>
            {event.title}
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2 mt-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span data-testid={`text-event-date-${event.id}`}>
                {formatEventDate(event.dateTime)}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span data-testid={`text-event-time-${event.id}`}>
                {formatEventTime(event.dateTime)}
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-1">
          {event.relations.rsvped && event.relations.rsvpStatus && (
            <Badge 
              variant={event.relations.rsvpStatus === "GOING" ? "default" : "secondary"}
              data-testid={`badge-rsvp-${event.id}`}
            >
              {event.relations.rsvpStatus === "GOING" && "Going"}
              {event.relations.rsvpStatus === "INTERESTED" && "Interested"}
              {event.relations.rsvpStatus === "NOT_GOING" && "Not Going"}
            </Badge>
          )}
          {event.relations.attended && (
            <Badge variant="default" className="bg-green-600" data-testid={`badge-attended-${event.id}`}>
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Attended
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {event.description && (
          <p className="text-sm text-muted-foreground line-clamp-2" data-testid={`text-event-description-${event.id}`}>
            {event.description}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          {event.location && (
            <div className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              <span data-testid={`text-event-location-${event.id}`}>{event.location}</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span data-testid={`text-event-rsvp-count-${event.id}`}>{event.rsvpCount} going</span>
          </div>
        </div>
        {isEventPast && (
          <Badge variant="outline" className="text-muted-foreground">
            Past Event
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}

function EventSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-1/2 mt-2" />
      </CardHeader>
      <CardContent className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </CardContent>
    </Card>
  );
}

export default function MyEvents() {
  const { user, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<"all" | "rsvped" | "attended">("all");
  const [rsvpStatusFilter, setRsvpStatusFilter] = useState<string>("all");

  // Fetch stats
  const { data: stats } = useQuery<MyStats>({
    queryKey: ["/api/my-stats"],
    enabled: !!user,
  });

  // Fetch events based on active tab and filters
  const { data: events, isLoading: eventsLoading } = useQuery<EventWithRelations[]>({
    queryKey: ["/api/my-events", activeTab, rsvpStatusFilter],
    enabled: !!user,
    queryFn: async () => {
      const params = new URLSearchParams({ type: activeTab });
      if (activeTab === "rsvped" && rsvpStatusFilter !== "all") {
        params.append("rsvpStatus", rsvpStatusFilter);
      }
      const response = await fetch(`/api/my-events?${params}`);
      if (!response.ok) throw new Error("Failed to fetch events");
      return response.json();
    },
  });

  if (authLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="space-y-4">
          <EventSkeleton />
          <EventSkeleton />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Please{" "}
              <Link href="/login" className="text-primary hover:underline" data-testid="link-login">
                log in
              </Link>{" "}
              to view your events.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4" data-testid="page-my-events">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2" data-testid="heading-my-events">
          My Events
        </h1>
        
        {stats && (
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground" data-testid="stats-bar">
            <span data-testid="stat-rsvped">
              RSVP'd: <strong>{stats.totalRsvped}</strong>
            </span>
            {stats.totalRsvped > 0 && (
              <>
                <span data-testid="stat-going">
                  Going: <strong>{stats.goingCount}</strong>
                </span>
                <span data-testid="stat-interested">
                  Interested: <strong>{stats.interestedCount}</strong>
                </span>
              </>
            )}
            <span data-testid="stat-attended">
              Attended: <strong>{stats.attendedCount}</strong>
            </span>
          </div>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <TabsList data-testid="tabs-list">
            <TabsTrigger value="all" data-testid="tab-all">
              All
            </TabsTrigger>
            <TabsTrigger value="rsvped" data-testid="tab-rsvped">
              RSVP'd
            </TabsTrigger>
            <TabsTrigger value="attended" data-testid="tab-attended">
              Attended
            </TabsTrigger>
          </TabsList>

          {activeTab === "rsvped" && (
            <Select value={rsvpStatusFilter} onValueChange={setRsvpStatusFilter}>
              <SelectTrigger className="w-[180px]" data-testid="select-rsvp-status">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="GOING">Going</SelectItem>
                <SelectItem value="INTERESTED">Interested</SelectItem>
                <SelectItem value="NOT_GOING">Not Going</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        <TabsContent value="all" className="mt-0">
          {eventsLoading ? (
            <div className="space-y-4">
              <EventSkeleton />
              <EventSkeleton />
              <EventSkeleton />
            </div>
          ) : events && events.length > 0 ? (
            <div className="grid gap-4" data-testid="events-list-all">
              {events.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground" data-testid="empty-state-all">
                  You haven't RSVP'd to or attended any events yet.{" "}
                  <Link href="/events" className="text-primary hover:underline" data-testid="link-browse-events">
                    Browse events
                  </Link>
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="rsvped" className="mt-0">
          {eventsLoading ? (
            <div className="space-y-4">
              <EventSkeleton />
              <EventSkeleton />
              <EventSkeleton />
            </div>
          ) : events && events.length > 0 ? (
            <div className="grid gap-4" data-testid="events-list-rsvped">
              {events.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground" data-testid="empty-state-rsvped">
                  You haven't RSVP'd to any events yet.{" "}
                  <Link href="/events" className="text-primary hover:underline" data-testid="link-browse-events-rsvped">
                    Browse events
                  </Link>
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="attended" className="mt-0">
          {eventsLoading ? (
            <div className="space-y-4">
              <EventSkeleton />
              <EventSkeleton />
              <EventSkeleton />
            </div>
          ) : events && events.length > 0 ? (
            <div className="grid gap-4" data-testid="events-list-attended">
              {events.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground" data-testid="empty-state-attended">
                  You haven't attended any events yet.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
