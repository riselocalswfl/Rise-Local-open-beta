import { Link } from "wouter";
import { Calendar, MapPin, Users, Ticket } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

interface EventCardProps {
  id: string;
  title: string;
  dateTime: string;
  location: string;
  category: string;
  description: string;
  ticketsAvailable: number;
  rsvpCount?: number;
  organizerName: string;
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
}: EventCardProps) {
  const eventDate = new Date(dateTime);
  const isUpcoming = eventDate > new Date();

  const handleRSVP = (e: React.MouseEvent) => {
    e.preventDefault();
    console.log(`RSVP to event: ${title}`);
  };

  return (
    <Card className="hover-elevate">
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
                    <Calendar className="w-4 h-4" />
                    <span>{format(eventDate, "MMM d, yyyy 'at' h:mm a")}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    <span>{location}</span>
                  </div>
                </div>
              </div>
              <Badge variant={isUpcoming ? "default" : "secondary"} className="flex-shrink-0">
                {category}
              </Badge>
            </div>

            <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{rsvpCount} going</span>
                </div>
                <div className="flex items-center gap-1">
                  <Ticket className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{ticketsAvailable} spots left</span>
                </div>
              </div>
              <Button
                size="sm"
                onClick={handleRSVP}
                disabled={ticketsAvailable === 0 || !isUpcoming}
                data-testid={`button-rsvp-${id}`}
              >
                RSVP
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
