import { useLocation, Link } from "wouter";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Header from "@/components/Header";
import Events from "@/pages/Events";
import MyEvents from "@/pages/MyEvents";

export default function EventsLayout() {
  const [location] = useLocation();
  const activeTab = location === "/events/my" ? "my" : "browse";

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
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                  data-testid="tab-browse-events"
                >
                  Browse Events
                </TabsTrigger>
              </Link>
              <Link href="/events/my">
                <TabsTrigger
                  value="my"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                  data-testid="tab-my-events"
                >
                  My Events
                </TabsTrigger>
              </Link>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {activeTab === "my" ? <MyEvents /> : <Events />}
    </div>
  );
}
