import { Link, useLocation } from "wouter";
import { ShoppingCart, User, Menu, Search, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";

export default function Header() {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    setDarkMode(isDark);
  }, []);

  const toggleDarkMode = () => {
    document.documentElement.classList.toggle('dark');
    setDarkMode(!darkMode);
  };

  const isActive = (path: string) => location === path;

  // todo: remove mock functionality
  const cartItemCount = 3;
  const userRole = "buyer"; // or "vendor" or "admin"

  return (
    <header className="sticky top-0 z-50 bg-background border-b">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 hover-elevate rounded-md px-2 py-1" data-testid="link-home">
            <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">LE</span>
            </div>
            <span className="font-semibold text-lg hidden sm:inline">Local Exchange</span>
          </Link>

          {/* Desktop Search */}
          <div className="hidden md:flex flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search products, vendors, events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search"
              />
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-2">
            <Button
              variant={isActive("/products") ? "secondary" : "ghost"}
              asChild
              size="sm"
            >
              <Link href="/products" data-testid="link-products">Products</Link>
            </Button>
            <Button
              variant={isActive("/vendors") ? "secondary" : "ghost"}
              asChild
              size="sm"
            >
              <Link href="/vendors" data-testid="link-vendors">Vendors</Link>
            </Button>
            <Button
              variant={isActive("/events") ? "secondary" : "ghost"}
              asChild
              size="sm"
            >
              <Link href="/events" data-testid="link-events">Events</Link>
            </Button>
            <Button
              variant={isActive("/spotlight") ? "secondary" : "ghost"}
              asChild
              size="sm"
            >
              <Link href="/spotlight" data-testid="link-spotlight">Spotlight</Link>
            </Button>
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleDarkMode}
              data-testid="button-theme-toggle"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>

            <Button variant="ghost" size="icon" asChild className="relative">
              <Link href="/cart" data-testid="link-cart">
                <ShoppingCart className="w-4 h-4" />
                {cartItemCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center p-0 text-xs">
                    {cartItemCount}
                  </Badge>
                )}
              </Link>
            </Button>

            <Button variant="ghost" size="icon" asChild>
              <Link href="/login" data-testid="link-login">
                <User className="w-4 h-4" />
              </Link>
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              data-testid="button-mobile-menu"
            >
              <Menu className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Mobile Search */}
        <div className="md:hidden pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
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
