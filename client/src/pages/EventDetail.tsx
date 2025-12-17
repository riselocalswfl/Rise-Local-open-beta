import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Calendar, MapPin, Users, Ticket } from "lucide-react";
import DetailHeader from "@/components/layout/DetailHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import type { Event, Vendor } from "@shared/schema";

export default function EventDetail() {
  const { id } = useParams();

  const { data: event, isLoading: eventLoading } = useQuery<Event>({
    queryKey: ["/api/events", id],
    queryFn: async () => {
      const response = await fetch(`/api/events/${id}`);
      if (!response.ok) throw new Error("Event not found");
      return response.json();
    },
  });

  const { data: vendor, isLoading: vendorLoading } = useQuery<Vendor>({
    queryKey: ["/api/vendors", event?.organizerId],
    queryFn: async () => {
      const response = await fetch(`/api/vendors/${event?.organizerId}`);
      if (!response.ok) throw new Error("Vendor not found");
      return response.json();
    },
    enabled: !!event?.organizerId,
  });

  const isLoading = eventLoading || vendorLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <DetailHeader title="Loading..." />
        <main className="max-w-4xl mx-auto px-4 py-8">
          <Skeleton className="h-8 w-32 mb-6" />
          <Skeleton className="h-12 w-3/4 mb-4" />
          <Skeleton className="h-64 mb-6" />
          <Skeleton className="h-32" />
        </main>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-background">
        <DetailHeader title="Event Not Found" />
        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Event Not Found</h1>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/">
                <Button variant="outline" data-testid="button-back-to-home">Back to Home</Button>
              </Link>
              <Link href="/events">
                <Button variant="default" data-testid="button-back-to-events">Back to Events</Button>
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const eventDate = new Date(event.dateTime);
  const isUpcoming = eventDate > new Date();

  const handleRSVP = () => {
    console.log(`RSVP to event: ${event.title}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <DetailHeader title={event.title} backHref="/events" />
      <main className="max-w-4xl mx-auto px-4 py-8">

        <div className="space-y-6">
          <div>
            <div className="flex items-start justify-between gap-4 mb-4">
              <h1 className="text-4xl font-playfair font-bold" data-testid="text-event-title">
                {event.title}
              </h1>
              <Badge className="whitespace-nowrap" data-testid="badge-category">
                {event.category}
              </Badge>
            </div>

            {vendor && (
              <p className="text-sm text-muted-foreground mb-6" data-testid="text-organizer">
                Organized by <Link href={`/businesses/${vendor.id}`} className="text-primary hover:underline">{vendor.businessName}</Link>
              </p>
            )}
          </div>

          <Card>
            <CardContent className="p-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-muted-foreground" strokeWidth={1.75} />
                    <div>
                      <p className="font-medium">Date & Time</p>
                      <p className="text-sm text-muted-foreground" data-testid="text-date-time">
                        {format(eventDate, "EEEE, MMMM d, yyyy")}
                        <br />
                        {format(eventDate, "h:mm a")}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-muted-foreground" strokeWidth={1.75} />
                    <div>
                      <p className="font-medium">Location</p>
                      <p className="text-sm text-muted-foreground" data-testid="text-location">
                        {event.location}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Ticket className="w-5 h-5 text-muted-foreground" strokeWidth={1.75} />
                    <div>
                      <p className="font-medium">Availability</p>
                      <p className="text-sm text-muted-foreground" data-testid="text-tickets">
                        {event.ticketsAvailable} spots remaining
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-muted-foreground" strokeWidth={1.75} />
                    <div>
                      <p className="font-medium">RSVPs</p>
                      <p className="text-sm text-muted-foreground" data-testid="text-rsvp-count">
                        {event.rsvpCount} people going
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t">
                <Button
                  onClick={handleRSVP}
                  disabled={event.ticketsAvailable === 0 || !isUpcoming}
                  className="w-full md:w-auto"
                  data-testid="button-rsvp"
                >
                  {event.ticketsAvailable === 0 ? "Sold Out" : isUpcoming ? "RSVP Now" : "Event Passed"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h2 className="text-2xl font-semibold mb-4">About This Event</h2>
              <p className="text-muted-foreground whitespace-pre-line" data-testid="text-description">
                {event.description}
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
