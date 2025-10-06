import EventCard from '../EventCard';

export default function EventCardExample() {
  return (
    <div className="p-6 max-w-2xl">
      <EventCard
        id="e1"
        title="Kombucha Brewing Workshop"
        dateTime="2025-10-15T14:00:00"
        location="Community Center, Fort Myers"
        category="Workshop"
        description="Learn the art of brewing kombucha from scratch. We'll cover fermentation techniques, flavor combinations, and health benefits."
        ticketsAvailable={15}
        rsvpCount={28}
        organizerName="Tropical Kombucha Co."
      />
    </div>
  );
}
