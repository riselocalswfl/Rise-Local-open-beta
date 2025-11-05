import { Link, useLocation } from "wouter";
import BrandLogo from "@/components/BrandLogo";
import { BrandButton } from "@/components/ui/BrandButton";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { LogIn, LogOut, User, ShoppingBag, Store, Utensils } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useState } from "react";
import MiniCart from "@/components/MiniCart";

export default function Header() {
  const [location] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const [signInDialogOpen, setSignInDialogOpen] = useState(false);

  return (
    <header className="backdrop-blur bg-bg/70 border-b border-black/5">
      <nav className="mx-auto max-w-7xl px-4 md:px-6 h-16 flex items-center justify-between">
        <Link href="/" data-testid="link-home">
          <BrandLogo className="mt-5" />
        </Link>
        <div className="hidden md:flex items-center gap-6 text-base font-semibold">
          <Link
            href="/"
            className={`text-text/80 hover:text-text transition ${
              location === "/" ? "text-text font-bold" : ""
            }`}
            data-testid="link-nav-home"
          >
            Home
          </Link>
          <Link
            href="/products"
            className={`text-text/80 hover:text-text transition ${
              location === "/products" ? "text-text font-bold" : ""
            }`}
            data-testid="link-products"
          >
            Shop Local
          </Link>
          <Link
            href="/eat-local"
            className={`text-text/80 hover:text-text transition ${
              location === "/eat-local" ? "text-text font-bold" : ""
            }`}
            data-testid="link-eat-local"
          >
            Eat Local
          </Link>
          <Link
            href="/events"
            className={`text-text/80 hover:text-text transition ${
              location === "/events" ? "text-text font-bold" : ""
            }`}
            data-testid="link-events"
          >
            Events
          </Link>
          <Link
            href="/vendors"
            className={`text-text/80 hover:text-text transition ${
              location === "/vendors" ? "text-text font-bold" : ""
            }`}
            data-testid="link-vendors"
          >
            Vendors
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <MiniCart />
          {isAuthenticated ? (
            <>
              {user?.role === "buyer" && (
                <Link href="/profile" data-testid="link-header-profile">
                  <Button variant="ghost" size="sm" data-testid="button-profile">
                    <User className="h-4 w-4 mr-2" />
                    My Account
                  </Button>
                </Link>
              )}
              {(user?.role === "vendor" || user?.role === "restaurant") && (
                <Link href="/dashboard" data-testid="link-header-dashboard">
                  <Button variant="ghost" size="sm" data-testid="button-dashboard">
                    <User className="h-4 w-4 mr-2" />
                    Dashboard
                  </Button>
                </Link>
              )}
              <a href="/api/logout" data-testid="link-logout">
                <BrandButton size="sm" data-testid="button-logout">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </BrandButton>
              </a>
            </>
          ) : (
            <>
              <Dialog open={signInDialogOpen} onOpenChange={setSignInDialogOpen}>
                <DialogTrigger asChild>
                  <BrandButton size="sm" data-testid="button-sign-in">
                    <LogIn className="h-4 w-4 mr-2" />
                    Sign In
                  </BrandButton>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md bg-white" data-testid="dialog-sign-in">
                  <DialogHeader>
                    <DialogTitle className="text-2xl">Welcome to Rise Local</DialogTitle>
                    <DialogDescription>
                      Choose how you'd like to sign in
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-3 py-4">
                    <a 
                      href="/api/login?intended_role=buyer" 
                      className="block"
                      data-testid="link-login-buyer"
                    >
                      <Button 
                        variant="outline" 
                        className="w-full h-auto flex flex-col items-start p-5 gap-2 hover-elevate"
                        data-testid="button-login-buyer"
                      >
                        <div className="flex items-center gap-3">
                          <ShoppingBag className="h-5 w-5 text-primary" />
                          <span className="text-base font-semibold">Customer</span>
                        </div>
                        <p className="text-xs text-muted-foreground text-left">
                          Shop local products, support vendors, and earn rewards
                        </p>
                      </Button>
                    </a>
                    <a 
                      href="/api/login?intended_role=vendor" 
                      className="block"
                      data-testid="link-login-vendor"
                    >
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
                          Manage your vendor profile, products, and events
                        </p>
                      </Button>
                    </a>
                    <a 
                      href="/api/login?intended_role=restaurant" 
                      className="block"
                      data-testid="link-login-restaurant"
                    >
                      <Button 
                        variant="outline" 
                        className="w-full h-auto flex flex-col items-start p-5 gap-2 hover-elevate"
                        data-testid="button-login-restaurant"
                      >
                        <div className="flex items-center gap-3">
                          <Utensils className="h-5 w-5 text-primary" />
                          <span className="text-base font-semibold">Restaurant</span>
                        </div>
                        <p className="text-xs text-muted-foreground text-left">
                          Manage your restaurant profile, menu, and dining events
                        </p>
                      </Button>
                    </a>
                  </div>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
