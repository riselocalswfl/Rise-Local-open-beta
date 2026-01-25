import { Menu, Home, Store, UtensilsCrossed, Wrench, Calendar, Heart, UserCircle, MessageSquare, LogOut, Shield } from "lucide-react";
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
  { name: "Discover", href: "/discover", icon: Home },
  { name: "Dine", href: "/eat-local", icon: UtensilsCrossed },
  { name: "Services", href: "/services", icon: Wrench },
  { name: "Events", href: "/events", icon: Calendar },
  { name: "Businesses", href: "/businesses", icon: Store },
  { name: "Create a Rise Local account", href: "/auth", icon: Heart },
];

const buyerNavigationItems = [
  { name: "Discover", href: "/discover", icon: Home },
  { name: "Dine", href: "/eat-local", icon: UtensilsCrossed },
  { name: "Services", href: "/services", icon: Wrench },
  { name: "Events", href: "/events", icon: Calendar },
  { name: "Businesses", href: "/businesses", icon: Store },
  { name: "Messages", href: "/messages", icon: MessageSquare },
  { name: "My Account", href: "/profile", icon: UserCircle },
];

const vendorNavigationItems = [
  { name: "Discover", href: "/discover", icon: Home },
  { name: "Dine", href: "/eat-local", icon: UtensilsCrossed },
  { name: "Services", href: "/services", icon: Wrench },
  { name: "Events", href: "/events", icon: Calendar },
  { name: "Businesses", href: "/businesses", icon: Store },
  { name: "Messages", href: "/messages", icon: MessageSquare },
  { name: "Dashboard", href: "/dashboard", icon: UserCircle },
];

const restaurantNavigationItems = [
  { name: "Discover", href: "/discover", icon: Home },
  { name: "Dine", href: "/eat-local", icon: UtensilsCrossed },
  { name: "Services", href: "/services", icon: Wrench },
  { name: "Events", href: "/events", icon: Calendar },
  { name: "Businesses", href: "/businesses", icon: Store },
  { name: "Messages", href: "/messages", icon: MessageSquare },
  { name: "Dashboard", href: "/dashboard", icon: UserCircle },
];

export default function NavMenu() {
  const { open, setOpen } = useNavMenu();
  const [location] = useLocation();
  const { user, isAuthenticated } = useAuth();

  // Fetch unread B2C message count
  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ["/api/b2c/unread-count"],
    enabled: isAuthenticated,
    refetchInterval: 10000, // Refresh every 10 seconds
  });
  const unreadCount = unreadData?.count || 0;

  // Fetch unread notification count
  const { data: notificationData } = useQuery<{ count: number }>({
    queryKey: ["/api/notifications/unread-count"],
    enabled: isAuthenticated,
    refetchInterval: 10000, // Refresh every 10 seconds
  });
  const notificationCount = notificationData?.count || 0;

  const handleNavigate = (href: string) => {
    setOpen(false);
  };

  const handleLogout = () => {
    setOpen(false);
    // Clear JWT token from localStorage
    localStorage.removeItem("auth_token");
    // Clear session on server and redirect to auth
    window.location.href = "/api/logout";
  };

  // Determine which navigation items to show based on user role
  // Check both isVendor flag and legacy role for backward compatibility
  const isVendor = user?.isVendor === true || user?.role === "vendor" || user?.role === "restaurant" || user?.role === "service_provider";
  const isAdmin = user?.isAdmin === true || user?.role === "admin";
  
  let navigationItems = publicNavigationItems;
  if (user) {
    if (isVendor) {
      // Vendors (including admin+vendor) see vendor navigation
      navigationItems = vendorNavigationItems;
    } else {
      // All other authenticated users (buyers, admins) see buyer navigation
      // Admins get additional admin link added separately below
      navigationItems = buyerNavigationItems;
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
            Discover local deals
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
                      {item.name === "Messages" && (unreadCount > 0 || notificationCount > 0) && (
                        <Badge 
                          variant="secondary" 
                          className="min-w-6 h-6 flex items-center justify-center px-2"
                          data-testid="badge-unread-count"
                        >
                          {unreadCount + notificationCount}
                        </Badge>
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
            
            {/* Admin link - shown if user has admin access */}
            {isAdmin && (
              <li className="pt-2">
                <Link href="/admin">
                  <div
                    onClick={() => handleNavigate("/admin")}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-md transition-colors cursor-pointer bg-destructive text-destructive-foreground hover-elevate active-elevate-2"
                    data-testid="link-nav-admin"
                  >
                    <Shield className="h-5 w-5" strokeWidth={1.75} />
                    <span className="font-medium flex-1">Admin Dashboard</span>
                  </div>
                </Link>
              </li>
            )}
            
            {/* Vendor dashboard link for admins who are also vendors */}
            {isAdmin && isVendor && (
              <li>
                <Link href="/dashboard">
                  <div
                    onClick={() => handleNavigate("/dashboard")}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-md transition-colors cursor-pointer bg-primary text-primary-foreground hover-elevate active-elevate-2"
                    data-testid="link-nav-vendor-dashboard"
                  >
                    <UserCircle className="h-5 w-5" strokeWidth={1.75} />
                    <span className="font-medium flex-1">Vendor Dashboard</span>
                  </div>
                </Link>
              </li>
            )}
            
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
