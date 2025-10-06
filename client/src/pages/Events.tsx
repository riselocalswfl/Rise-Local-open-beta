import Header from "@/components/Header";
import FilterBar from "@/components/FilterBar";
import EventCard from "@/components/EventCard";

export default function Events() {
  // todo: remove mock functionality
  const events = [
    {
      id: "e1",
      title: "Kombucha Brewing Workshop",
      dateTime: "2025-10-15T14:00:00",
      location: "Community Center, Fort Myers",
      category: "Workshop",
      description: "Learn the art of brewing kombucha from scratch. We'll cover fermentation techniques, flavor combinations, and health benefits.",
      ticketsAvailable: 15,
      rsvpCount: 28,
      organizerName: "Tropical Kombucha Co.",
    },
    {
      id: "e2",
      title: "Fort Myers Farmers Market",
      dateTime: "2025-10-12T08:00:00",
      location: "Downtown Fort Myers",
      category: "Market",
      description: "Weekly farmers market featuring 30+ local vendors. Fresh produce, baked goods, artisan crafts, and more.",
      ticketsAvailable: 0,
      rsvpCount: 450,
      organizerName: "Fort Myers Community",
    },
    {
      id: "e3",
      title: "Urban Gardening 101",
      dateTime: "2025-10-20T10:00:00",
      location: "Green Thumb Gardens",
      category: "Workshop",
      description: "Start your own urban garden! Learn about container gardening, composting, and sustainable practices.",
      ticketsAvailable: 20,
      rsvpCount: 12,
      organizerName: "Green Thumb Gardens",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <FilterBar type="events" />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-semibold mb-8">Community Events</h1>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {events.map((event) => (
            <EventCard key={event.id} {...event} />
          ))}
        </div>
      </main>
    </div>
  );
}
