import { useLocation } from "wouter";
import { Search, Filter, Grid3X3 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function Browse() {
  const [location] = useLocation();
  const searchParams = new URLSearchParams(location.split("?")[1] || "");
  const section = searchParams.get("section");

  const getTitle = () => {
    switch (section) {
      case "top-picks":
        return "Top picks near you";
      case "pickup-now":
        return "Pick up now";
      default:
        return "Browse All Deals";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background border-b border-border">
        <div className="px-4 py-3">
          <h1 className="text-xl font-semibold text-foreground mb-3" data-testid="heading-browse">
            {getTitle()}
          </h1>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search deals..."
                className="pl-9"
                data-testid="input-search-browse"
              />
            </div>
            <Button variant="outline" size="icon" data-testid="button-filter">
              <Filter className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="p-4">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Grid3X3 className="w-12 h-12 text-muted-foreground mb-4" />
          <h2 className="text-lg font-medium text-foreground mb-2">
            Browse Coming Soon
          </h2>
          <p className="text-sm text-muted-foreground max-w-xs">
            Full browsing experience with filters and search will be available here.
          </p>
        </div>
      </div>
    </div>
  );
}
