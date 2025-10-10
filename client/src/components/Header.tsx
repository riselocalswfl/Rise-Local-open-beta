import { Link, useLocation } from "wouter";
import { ShoppingCart, User, Menu, Search, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import ThemeToggle from "./ThemeToggle";

export default function Header() {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const isActive = (path: string) => location === path;

  // todo: remove mock functionality
  const cartItemCount = 3;
  const loyaltyPoints = 150;

  return (
    <header className="sticky top-0 z-50 bg-background border-b">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2" data-testid="link-home">
            <div className="rounded-pill px-3 py-1.5 flex items-center gap-2" style={{ background: 'var(--le-green)' }}>
              <span className="text-white font-bold text-sm">LE</span>
            </div>
            <span className="font-semibold text-lg hidden sm:inline">Local Exchange</span>
          </Link>

          {/* Desktop Search */}
          <div className="hidden md:flex flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={1.75} />
              <Input
                type="search"
                placeholder="Search products, vendors, events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 rounded-lg shadow-sm"
                data-testid="input-search"
              />
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-2">
            <Link href="/products" data-testid="link-products">
              <Button
                variant="ghost"
                size="sm"
                className={`rounded-pill ${isActive("/products") ? "border-b-2 border-[var(--le-clay)] rounded-b-none" : ""}`}
              >
                Products
              </Button>
            </Link>
            <Link href="/vendors" data-testid="link-vendors">
              <Button
                variant="ghost"
                size="sm"
                className={`rounded-pill ${isActive("/vendors") ? "border-b-2 border-[var(--le-clay)] rounded-b-none" : ""}`}
              >
                Vendors
              </Button>
            </Link>
            <Link href="/events" data-testid="link-events">
              <Button
                variant="ghost"
                size="sm"
                className={`rounded-pill ${isActive("/events") ? "border-b-2 border-[var(--le-clay)] rounded-b-none" : ""}`}
              >
                Events
              </Button>
            </Link>
            <Link href="/values" data-testid="link-values">
              <Button
                variant="ghost"
                size="sm"
                className={`rounded-pill ${isActive("/values") ? "border-b-2 border-[var(--le-clay)] rounded-b-none" : ""}`}
              >
                Values
              </Button>
            </Link>
            <Link href="/spotlight" data-testid="link-spotlight">
              <Button
                variant="ghost"
                size="sm"
                className={`rounded-pill ${isActive("/spotlight") ? "border-b-2 border-[var(--le-clay)] rounded-b-none" : ""}`}
              >
                Spotlight
              </Button>
            </Link>
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            {/* Loyalty Points Indicator */}
            <div 
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-pill cursor-pointer hover-elevate"
              style={{ background: 'rgba(91, 140, 90, 0.10)', border: '1px solid var(--le-green)' }}
              title="Shop Local Points"
            >
              <Award className="w-3.5 h-3.5" style={{ color: 'var(--le-green)' }} strokeWidth={1.75} />
              <span className="text-sm font-semibold" style={{ color: 'var(--le-green)' }}>{loyaltyPoints}</span>
            </div>

            <ThemeToggle />

            <Button variant="ghost" size="icon" asChild className="relative rounded-pill">
              <Link href="/cart" data-testid="link-cart">
                <ShoppingCart className="w-4 h-4" strokeWidth={1.75} />
                {cartItemCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center p-0 text-xs rounded-pill" style={{ background: 'var(--le-clay)' }}>
                    {cartItemCount}
                  </Badge>
                )}
              </Link>
            </Button>

            <Button variant="ghost" size="icon" asChild className="rounded-pill">
              <Link href="/login" data-testid="link-login">
                <User className="w-4 h-4" strokeWidth={1.75} />
              </Link>
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="md:hidden rounded-pill"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              data-testid="button-mobile-menu"
            >
              <Menu className="w-4 h-4" strokeWidth={1.75} />
            </Button>
          </div>
        </div>

        {/* Mobile Search */}
        <div className="md:hidden pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={1.75} />
            <Input
              type="search"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 rounded-lg shadow-sm"
              data-testid="input-search-mobile"
            />
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <nav className="md:hidden border-t py-4 space-y-2">
            <Button variant={isActive("/products") ? "secondary" : "ghost"} asChild className="w-full justify-start">
              <Link href="/products">Products</Link>
            </Button>
            <Button variant={isActive("/vendors") ? "secondary" : "ghost"} asChild className="w-full justify-start">
              <Link href="/vendors">Vendors</Link>
            </Button>
            <Button variant={isActive("/events") ? "secondary" : "ghost"} asChild className="w-full justify-start">
              <Link href="/events">Events</Link>
            </Button>
            <Button variant={isActive("/spotlight") ? "secondary" : "ghost"} asChild className="w-full justify-start">
              <Link href="/spotlight">Spotlight</Link>
            </Button>
          </nav>
        )}
      </div>
    </header>
  );
}
