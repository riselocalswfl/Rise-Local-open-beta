import { Link } from "wouter";
import { Calendar, MapPin, Users, Ticket, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState } from "react";
import type { EventRsvp } from "@/../../shared/schema";

interface EventCardProps {
  id: string;
  title: string;
  dateTime: string;
  location: string;
  category?: string;
  description: string;
  ticketsAvailable: number;
  rsvpCount?: number;
  organizerName: string;
  valueTags?: string[];
}

export default function EventCard({
  id,
  title,
  dateTime,
  location,
  category,
  description,
  ticketsAvailable,
  rsvpCount = 0,
  organizerName,
  valueTags = [],
}: EventCardProps) {
  const eventDate = new Date(dateTime);
  const isUpcoming = eventDate > new Date();
  const { isAuthenticated } = useAuth();
  const [optimisticRsvpCount, setOptimisticRsvpCount] = useState(rsvpCount);

  // Fetch user's RSVPs if authenticated
  const { data: userRsvps = [] } = useQuery<EventRsvp[]>({
    queryKey: ["/api/events/rsvps/me"],
    enabled: isAuthenticated,
  });

  // Check if user has RSVPed to this event
  const isRsvped = userRsvps.some((rsvp) => rsvp.eventId === id);

  // Mutation to toggle RSVP
  const rsvpMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/events/${id}/rsvp`);
    },
    onMutate: async () => {
      // Optimistic update
      setOptimisticRsvpCount((prev) => (isRsvped ? prev - 1 : prev + 1));
    },
    onSuccess: () => {
      // Invalidate queries to refetch fresh data
      queryClient.invalidateQueries({ queryKey: ["/api/events/rsvps/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
    },
    onError: () => {
      // Revert optimistic update on error
      setOptimisticRsvpCount(rsvpCount);
    },
  });

  const handleRSVP = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      // Redirect to login
      window.location.href = "/login";
      return;
    }
    rsvpMutation.mutate();
  };

  return (
    <Card className="le-card transition-all duration-200">
      <Link href={`/events/${id}`} data-testid={`link-event-${id}`}>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-xl mb-2" data-testid={`text-event-title-${id}`}>
                  {title}
                </h3>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground mb-3">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" strokeWidth={1.75} />
                    <span>{format(eventDate, "MMM d, yyyy 'at' h:mm a")}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" strokeWidth={1.75} />
                    <span>{location}</span>
                  </div>
                </div>
              </div>
              <span className={`le-chip text-xs ${!isUpcoming ? "opacity-50" : ""}`}>
                {category}
              </span>
            </div>

            <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>

            {valueTags && valueTags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {valueTags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs rounded-pill">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4 text-muted-foreground" strokeWidth={1.75} />
                  <span className="text-muted-foreground" data-testid={`text-rsvp-count-${id}`}>
                    {optimisticRsvpCount} going
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Ticket className="w-4 h-4 text-muted-foreground" strokeWidth={1.75} />
                  <span className="text-muted-foreground">{ticketsAvailable} spots left</span>
                </div>
              </div>
              <Button
                size="sm"
                onClick={handleRSVP}
                disabled={ticketsAvailable === 0 || !isUpcoming || rsvpMutation.isPending}
                className="rounded-pill"
                style={{ background: isRsvped ? 'var(--le-wheat)' : 'var(--le-clay)' }}
                data-testid={`button-rsvp-${id}`}
              >
                {rsvpMutation.isPending ? (
                  "..."
                ) : isRsvped ? (
                  <>
                    <Check className="w-4 h-4 mr-1" />
                    Going
                  </>
                ) : (
                  "RSVP"
                )}
              </Button>
            </div>

            <div className="text-xs text-muted-foreground pt-2 border-t">
              Organized by {organizerName}
            </div>
          </div>
        </CardContent>
      </Link>
    </Card>
  );
}
