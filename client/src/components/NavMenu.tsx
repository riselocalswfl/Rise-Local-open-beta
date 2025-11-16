import { Menu, Home, ShoppingBag, Store, UtensilsCrossed, Calendar, ShoppingCart, Heart, LayoutDashboard, UserCircle, MessageSquare, LogOut } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useNavMenu } from "@/contexts/NavMenuContext";
import { useQuery } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const publicNavigationItems = [
  { name: "Home", href: "/", icon: Home },
  { name: "Shop", href: "/products", icon: ShoppingBag },
  { name: "Dine", href: "/eat-local", icon: UtensilsCrossed },
  { name: "Events", href: "/events", icon: Calendar },
  { name: "All Vendors", href: "/vendors", icon: Store },
  { name: "Cart", href: "/cart", icon: ShoppingCart },
  { name: "Join the Movement", href: "/join", icon: Heart },
];

const buyerNavigationItems = [
  { name: "Home", href: "/", icon: Home },
  { name: "Shop", href: "/products", icon: ShoppingBag },
  { name: "Dine", href: "/eat-local", icon: UtensilsCrossed },
  { name: "Events", href: "/events", icon: Calendar },
  { name: "All Vendors", href: "/vendors", icon: Store },
  { name: "Cart", href: "/cart", icon: ShoppingCart },
  { name: "Messages", href: "/messages", icon: MessageSquare },
  { name: "My Account", href: "/profile", icon: UserCircle },
];

const vendorNavigationItems = [
  { name: "Home", href: "/", icon: Home },
  { name: "Shop", href: "/products", icon: ShoppingBag },
  { name: "Dine", href: "/eat-local", icon: UtensilsCrossed },
  { name: "Events", href: "/events", icon: Calendar },
  { name: "All Vendors", href: "/vendors", icon: Store },
  { name: "Messages", href: "/messages", icon: MessageSquare },
  { name: "Manage Business", href: "/dashboard", icon: LayoutDashboard },
];

const restaurantNavigationItems = [
  { name: "Home", href: "/", icon: Home },
  { name: "Shop", href: "/products", icon: ShoppingBag },
  { name: "Dine", href: "/eat-local", icon: UtensilsCrossed },
  { name: "Events", href: "/events", icon: Calendar },
  { name: "All Vendors", href: "/vendors", icon: Store },
  { name: "Messages", href: "/messages", icon: MessageSquare },
  { name: "Manage Business", href: "/dashboard", icon: LayoutDashboard },
];

export default function NavMenu() {
  const { open, setOpen } = useNavMenu();
  const [location] = useLocation();
  const { user, isAuthenticated } = useAuth();

  // Fetch unread message count
  const { data: unreadCount = 0 } = useQuery<number>({
    queryKey: ["/api/messages/unread/count"],
    enabled: isAuthenticated,
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  const handleNavigate = (href: string) => {
    setOpen(false);
  };

  const handleLogout = () => {
    setOpen(false);
    window.location.href = "/api/logout";
  };

  // Determine which navigation items to show based on user role
  let navigationItems = publicNavigationItems;
  if (user) {
    if (user.role === "buyer") {
      navigationItems = buyerNavigationItems;
    } else if (user.role === "vendor") {
      navigationItems = vendorNavigationItems;
    } else if (user.role === "restaurant") {
      navigationItems = restaurantNavigationItems;
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          size="icon"
          variant="default"
          className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg"
          data-testid="button-nav-menu"
        >
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-72 bg-white">
        <SheetHeader>
          <SheetTitle className="text-left font-playfair text-2xl text-foreground">Navigation</SheetTitle>
          <SheetDescription className="text-left text-muted-foreground">
            Browse Rise Local marketplace
          </SheetDescription>
        </SheetHeader>
        <nav className="mt-8">
          <ul className="space-y-2">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.href;
              
              return (
                <li key={item.href}>
                  <Link href={item.href}>
                    <div
                      onClick={() => handleNavigate(item.href)}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-md transition-colors cursor-pointer bg-primary text-primary-foreground hover-elevate active-elevate-2"
                      data-testid={`link-nav-${item.name.toLowerCase().replace(/ /g, "-")}`}
                    >
                      <Icon className="h-5 w-5" strokeWidth={1.75} />
                      <span className="font-medium flex-1">{item.name}</span>
                      {item.name === "Messages" && unreadCount > 0 && (
                        <Badge 
                          variant="secondary" 
                          className="min-w-6 h-6 flex items-center justify-center px-2"
                          data-testid="badge-unread-count"
                        >
                          {unreadCount}
                        </Badge>
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
            
            {isAuthenticated && (
              <>
                <li className="pt-4 border-t border-border">
                  <div
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-md transition-colors cursor-pointer bg-primary text-primary-foreground hover-elevate active-elevate-2"
                    data-testid="button-logout"
                  >
                    <LogOut className="h-5 w-5" strokeWidth={1.75} />
                    <span className="font-medium flex-1">Log Out</span>
                  </div>
                </li>
              </>
            )}
          </ul>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
