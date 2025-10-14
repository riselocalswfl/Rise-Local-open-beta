import { Menu, ShoppingBag, Store, UtensilsCrossed, Calendar } from "lucide-react";
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

const categories = [
  { name: "Products", href: "/products", icon: ShoppingBag },
  { name: "Vendors", href: "/vendors", icon: Store },
  { name: "Eat Local", href: "/eat-local", icon: UtensilsCrossed },
  { name: "Events", href: "/events", icon: Calendar },
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
      <SheetContent side="right" className="w-72">
        <SheetHeader>
          <SheetTitle className="text-left font-playfair text-2xl">Browse Categories</SheetTitle>
          <SheetDescription className="text-left">
            Navigate to different sections of the marketplace
          </SheetDescription>
        </SheetHeader>
        <nav className="mt-8">
          <ul className="space-y-2">
            {categories.map((category) => {
              const Icon = category.icon;
              const isActive = location === category.href;
              
              return (
                <li key={category.href}>
                  <Link href={category.href}>
                    <div
                      onClick={() => handleNavigate(category.href)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-md transition-colors cursor-pointer ${
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "hover-elevate active-elevate-2"
                      }`}
                      data-testid={`link-nav-${category.name.toLowerCase().replace(" ", "-")}`}
                    >
                      <Icon className="h-5 w-5" strokeWidth={1.75} />
                      <span className="font-medium">{category.name}</span>
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
