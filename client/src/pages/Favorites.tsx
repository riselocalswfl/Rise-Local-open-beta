import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";

export default function Favorites() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background border-b border-border">
        <div className="px-4 h-14 flex items-center">
          <h1 className="text-xl font-semibold text-foreground" data-testid="heading-favorites">
            Favorites
          </h1>
        </div>
      </header>

      {/* Content */}
      <div className="p-4">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Heart className="w-8 h-8 text-muted-foreground" />
          </div>
          
          {isAuthenticated ? (
            <>
              <h2 className="text-lg font-medium text-foreground mb-2">
                No favorites yet
              </h2>
              <p className="text-sm text-muted-foreground max-w-xs mb-6">
                Save your favorite deals and vendors here for quick access.
              </p>
              <Link href="/discover">
                <Button data-testid="button-discover-deals">
                  Discover Deals
                </Button>
              </Link>
            </>
          ) : (
            <>
              <h2 className="text-lg font-medium text-foreground mb-2">
                Sign in to save favorites
              </h2>
              <p className="text-sm text-muted-foreground max-w-xs mb-6">
                Create an account to save your favorite deals and vendors.
              </p>
              <Link href="/auth">
                <Button data-testid="button-sign-in">
                  Sign In
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
