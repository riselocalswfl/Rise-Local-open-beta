import { Link, useLocation } from "wouter";
import BrandLogo from "@/components/BrandLogo";
import { BrandButton } from "@/components/ui/BrandButton";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { LogIn, LogOut, User } from "lucide-react";

export default function Header() {
  const [location] = useLocation();
  const { user, isAuthenticated } = useAuth();

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
          <Link
            href="/cart"
            className={`text-text/80 hover:text-text transition ${
              location === "/cart" ? "text-text font-bold" : ""
            }`}
            data-testid="link-cart"
          >
            Cart
          </Link>
        </div>
        <div className="flex items-center gap-3">
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
              <a href="/api/login" data-testid="link-login">
                <BrandButton size="sm" data-testid="button-sign-in">
                  <LogIn className="h-4 w-4 mr-2" />
                  Sign In
                </BrandButton>
              </a>
              <Link href="/join" data-testid="link-join">
                <Button variant="outline" size="sm" data-testid="button-join">
                  Join
                </Button>
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
