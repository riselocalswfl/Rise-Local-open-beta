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

      {activeTab === "my" ? <MyEvents /> : <Events />}
    </div>
  );
}
