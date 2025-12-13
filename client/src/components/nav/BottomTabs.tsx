import { Link, useLocation } from "wouter";
import { Tag, Store, UtensilsCrossed, Calendar, User } from "lucide-react";

const tabs = [
  { name: "Deals", href: "/deals", icon: Tag },
  { name: "Businesses", href: "/vendors", icon: Store },
  { name: "Eat Local", href: "/eat-local", icon: UtensilsCrossed },
  { name: "Events", href: "/events", icon: Calendar },
  { name: "Profile", href: "/profile", icon: User },
];

export default function BottomTabs() {
  const [location] = useLocation();

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
            (tab.href === "/deals" && location === "/");
          
          return (
            <Link key={tab.href} href={tab.href}>
              <button
                className={`flex flex-col items-center justify-center gap-1 px-3 py-2 min-w-[64px] transition-colors ${
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                aria-label={tab.name}
                aria-current={isActive ? "page" : undefined}
                data-testid={`tab-${tab.name.toLowerCase().replace(/ /g, "-")}`}
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
