import { Link, useLocation } from "wouter";
import { Compass, Grid3X3, Heart, User, Store } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function BottomTabs() {
  const [location] = useLocation();
  const { user } = useAuth();
  
  const isVendor = user?.role === "vendor" || user?.role === "restaurant" || user?.role === "service_provider";
  const profileHref = isVendor ? "/dashboard" : "/profile";

  const tabs = [
    { name: "Discover", href: "/discover", icon: Compass },
    { name: "Browse", href: "/browse", icon: Grid3X3 },
    { name: "Businesses", href: "/businesses", icon: Store },
    { name: "Favorites", href: "/favorites", icon: Heart },
    { name: "Account", href: profileHref, icon: User },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      data-testid="bottom-tabs"
    >
      <div className="flex items-center justify-around h-16">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = location === tab.href || 
            (tab.href === "/discover" && (location === "/" || location === "/deals")) ||
            (tab.href === "/businesses" && location.startsWith("/businesses")) ||
            (tab.href === profileHref && (location.startsWith("/dashboard") || location === "/profile"));
          
          return (
            <Link key={tab.name} href={tab.href}>
              <button
                className={`flex flex-col items-center justify-center gap-1 px-3 py-2 min-w-[64px] transition-colors ${
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                aria-label={tab.name}
                aria-current={isActive ? "page" : undefined}
                data-testid={`tab-${tab.name.toLowerCase()}`}
              >
                <Icon className={`h-5 w-5 ${isActive ? "stroke-[2.5]" : ""}`} />
                <span className={`text-xs ${isActive ? "font-medium" : ""}`}>
                  {tab.name}
                </span>
              </button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
