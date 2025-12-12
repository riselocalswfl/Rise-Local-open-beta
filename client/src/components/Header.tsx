import { Link, useLocation } from "wouter";
import BrandLogo from "@/components/BrandLogo";
import { BrandButton } from "@/components/ui/BrandButton";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { LogIn, LogOut, User, ShoppingBag, Store, Heart, Menu, X, LayoutDashboard, Tag, Briefcase } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useState } from "react";
import MiniCart from "@/components/MiniCart";

// Navigation items configuration
const publicNavigationItems = [
  { name: "Deals", href: "/deals", icon: Tag },
  { name: "Businesses", href: "/vendors", icon: Store },
  { name: "For Businesses", href: "/onboarding", icon: Briefcase },
];

const buyerNavigationItems = [
  { name: "Deals", href: "/deals", icon: Tag },
  { name: "Businesses", href: "/vendors", icon: Store },
  { name: "My Account", href: "/profile", icon: User },
  { name: "For Businesses", href: "/onboarding", icon: Briefcase },
];

const vendorNavigationItems = [
  { name: "Deals", href: "/deals", icon: Tag },
  { name: "Businesses", href: "/vendors", icon: Store },
  { name: "My Account", href: "/profile", icon: User },
  { name: "For Businesses", href: "/dashboard", icon: LayoutDashboard },
];

export default function Header() {
  const [location, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const [signInDialogOpen, setSignInDialogOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Determine navigation items based on user role
  let navigationItems = publicNavigationItems;
  if (user) {
    if (user.role === "buyer") {
      navigationItems = buyerNavigationItems;
    } else if (user.role === "vendor" || user.role === "restaurant" || user.role === "service_provider") {
      navigationItems = vendorNavigationItems;
    }
  }

  const handleMobileNavClick = (href: string) => {
    setMobileMenuOpen(false);
    setLocation(href);
  };

  return (
    <>
      <header className="sticky top-0 z-40 backdrop-blur bg-bg/95 border-b border-border/50 shadow-sm">
        <nav className="mx-auto max-w-7xl px-4 md:px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" data-testid="link-home">
            <BrandLogo className="mt-5" />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.href;
              
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`gap-2 ${isActive ? "bg-accent text-accent-foreground" : ""}`}
                    data-testid={`link-nav-${item.name.toLowerCase().replace(/ /g, "-")}`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </Button>
                </Link>
              );
            })}
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-2">
            {/* Cart - visible on all sizes */}
            <MiniCart />

            {/* Desktop Auth Actions */}
            <div className="hidden md:flex items-center gap-2">
              {isAuthenticated ? (
                <a href="/api/logout" data-testid="link-logout">
                  <BrandButton size="sm" data-testid="button-logout">
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </BrandButton>
                </a>
              ) : (
                <Dialog open={signInDialogOpen} onOpenChange={setSignInDialogOpen}>
                  <DialogTrigger asChild>
                    <BrandButton size="sm" data-testid="button-sign-in">
                      <LogIn className="h-4 w-4 mr-2" />
                      Sign In
                    </BrandButton>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md bg-white" data-testid="dialog-sign-in">
                    <DialogHeader>
                      <DialogTitle className="text-2xl">Shop Local. Support Community. Save Money.</DialogTitle>
                      <DialogDescription>
                        Choose how you'd like to sign in
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-3 py-4">
                      <a href="/api/login?intended_role=buyer" className="block" data-testid="link-login-buyer">
                        <Button 
                          variant="outline" 
                          className="w-full h-auto flex flex-col items-start p-5 gap-2 hover-elevate"
                          data-testid="button-login-buyer"
                        >
                          <div className="flex items-center gap-3">
                            <ShoppingBag className="h-5 w-5 text-primary" />
                            <span className="text-base font-semibold">Consumer</span>
                          </div>
                          <p className="text-xs text-muted-foreground text-left">
                            Shop local products, support vendors, and earn rewards
                          </p>
                        </Button>
                      </a>
                      <a href="/api/login?intended_role=vendor" className="block" data-testid="link-login-vendor">
                        <Button 
                          variant="outline" 
                          className="w-full h-auto flex flex-col items-start p-5 gap-2 hover-elevate"
                          data-testid="button-login-vendor"
                        >
                          <div className="flex items-center gap-3">
                            <Store className="h-5 w-5 text-primary" />
                            <span className="text-base font-semibold">Vendor</span>
                          </div>
                          <p className="text-xs text-muted-foreground text-left">
                            Sell products, offer services, or run a restaurant
                          </p>
                        </Button>
                      </a>
                      <div className="pt-3 border-t">
                        <Link href="/join">
                          <BrandButton 
                            className="w-full"
                            onClick={() => setSignInDialogOpen(false)}
                            data-testid="button-join-movement"
                          >
                            <Heart className="h-4 w-4 mr-2" />
                            Create a Rise Local account
                          </BrandButton>
                        </Link>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileMenuOpen(true)}
              data-testid="button-mobile-menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </nav>
      </header>

      {/* Mobile Navigation Sheet */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="right" className="w-[300px] sm:w-[350px]">
          <SheetHeader>
            <SheetTitle className="text-left">Navigation</SheetTitle>
            <SheetDescription className="text-left">
              Browse Rise Local marketplace
            </SheetDescription>
          </SheetHeader>
          
          <nav className="mt-8">
            <div className="space-y-1">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = location === item.href;
                
                return (
                  <button
                    key={item.href}
                    onClick={() => handleMobileNavClick(item.href)}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-md transition-colors cursor-pointer ${
                      isActive 
                        ? "bg-primary text-primary-foreground font-medium" 
                        : "hover-elevate text-foreground"
                    }`}
                    data-testid={`mobile-link-${item.name.toLowerCase().replace(/ /g, "-")}`}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    <span className="flex-1 text-base text-left">{item.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Mobile Auth Section */}
            <div className="mt-6 pt-6 border-t space-y-2">
              {isAuthenticated ? (
                <div
                  onClick={() => {
                    setMobileMenuOpen(false);
                    window.location.href = "/api/logout";
                  }}
                  className="flex items-center gap-3 px-4 py-3.5 rounded-md hover-elevate cursor-pointer"
                  data-testid="mobile-button-logout"
                >
                  <LogOut className="h-5 w-5 flex-shrink-0" />
                  <span className="text-base font-medium">Sign Out</span>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => handleMobileNavClick("/join")}
                    className="w-full flex items-center gap-3 px-4 py-3.5 rounded-md bg-primary text-primary-foreground hover-elevate cursor-pointer"
                    data-testid="mobile-button-create-account"
                  >
                    <Heart className="h-5 w-5 flex-shrink-0" />
                    <span className="text-base font-medium text-left">Create Account</span>
                  </button>
                  <div className="grid grid-cols-2 gap-2 px-2">
                    <a href="/api/login?intended_role=buyer" className="block">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        data-testid="mobile-button-login-buyer"
                      >
                        <ShoppingBag className="h-4 w-4 mr-2" />
                        Consumer
                      </Button>
                    </a>
                    <a href="/api/login?intended_role=vendor" className="block">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        data-testid="mobile-button-login-vendor"
                      >
                        <Store className="h-4 w-4 mr-2" />
                        Vendor
                      </Button>
                    </a>
                  </div>
                </>
              )}
            </div>
          </nav>
        </SheetContent>
      </Sheet>
    </>
  );
}
