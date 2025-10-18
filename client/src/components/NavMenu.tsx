import { Menu, Home, ShoppingBag, Store, UtensilsCrossed, Calendar, ShoppingCart, Heart, LayoutDashboard } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const navigationItems = [
  { name: "Home", href: "/", icon: Home },
  { name: "Shop Local", href: "/products", icon: ShoppingBag },
  { name: "Eat Local", href: "/eat-local", icon: UtensilsCrossed },
  { name: "Events", href: "/events", icon: Calendar },
  { name: "Vendors", href: "/vendors", icon: Store },
  { name: "Cart", href: "/cart", icon: ShoppingCart },
  { name: "Manage Business", href: "/dashboard", icon: LayoutDashboard },
  { name: "Join the Movement", href: "/join", icon: Heart },
];

export default function NavMenu() {
  const [open, setOpen] = useState(false);
  const [location] = useLocation();

  const handleNavigate = (href: string) => {
    setOpen(false);
  };

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
                      <span className="font-medium">{item.name}</span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
