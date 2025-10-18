import { Link, useLocation } from "wouter";
import BrandLogo from "@/components/BrandLogo";
import { BrandButton } from "@/components/ui/BrandButton";

export default function Header() {
  const [location] = useLocation();

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
          <Link href="/join" data-testid="link-join">
            <BrandButton size="sm" data-testid="button-join">
              Join the Movement
            </BrandButton>
          </Link>
        </div>
      </nav>
    </header>
  );
}
