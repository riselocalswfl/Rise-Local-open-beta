import { Link, useLocation } from "wouter";
import BrandLogo from "@/components/BrandLogo";
import { BrandButton } from "@/components/ui/BrandButton";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { LogIn, LogOut, User, ShoppingBag, Store, Heart, LayoutDashboard, Tag, Briefcase } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useState } from "react";

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

  // Determine navigation items based on user role
  let navigationItems = publicNavigationItems;
  if (user) {
    if (user.role === "buyer") {
      navigationItems = buyerNavigationItems;
    } else if (user.role === "vendor" || user.role === "restaurant" || user.role === "service_provider") {
      navigationItems = vendorNavigationItems;
    }
  }

  return (
    <>
      <header className="sticky top-0 z-40 backdrop-blur bg-bg/95 border-b border-border/50 shadow-sm">
        <nav className="mx-auto max-w-7xl px-4 md:px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/deals" data-testid="link-home">
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

            {/* Mobile Auth - Sign In button only on mobile (nav is in bottom tabs) */}
            <div className="md:hidden">
              {!isAuthenticated && (
                <Dialog open={signInDialogOpen} onOpenChange={setSignInDialogOpen}>
                  <DialogTrigger asChild>
                    <BrandButton size="sm" data-testid="button-sign-in-mobile">
                      <LogIn className="h-4 w-4" />
                    </BrandButton>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md bg-white" data-testid="dialog-sign-in-mobile">
                    <DialogHeader>
                      <DialogTitle className="text-2xl">Shop Local. Support Community. Save Money.</DialogTitle>
                      <DialogDescription>
                        Choose how you'd like to sign in
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-3 py-4">
                      <a href="/api/login?intended_role=buyer" className="block" data-testid="link-login-buyer-mobile">
                        <Button 
                          variant="outline" 
                          className="w-full h-auto flex flex-col items-start p-5 gap-2 hover-elevate"
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
                      <a href="/api/login?intended_role=vendor" className="block" data-testid="link-login-vendor-mobile">
                        <Button 
                          variant="outline" 
                          className="w-full h-auto flex flex-col items-start p-5 gap-2 hover-elevate"
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
          </div>
        </nav>
      </header>
    </>
  );
}
