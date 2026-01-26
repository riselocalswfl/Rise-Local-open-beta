import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import BrandLogo from "@/components/BrandLogo";
import AuthModal from "@/components/AuthModal";
import { useAuth } from "@/hooks/useAuth";
import heroImage from "@assets/ChatGPT_Image_Dec_17,_2025,_03_54_36_PM_1766004883576.png";

export default function Auth() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  
  const [mode, setMode] = useState<string | null>(null);
  
  useEffect(() => {
    const updateMode = () => {
      const params = new URLSearchParams(window.location.search);
      setMode(params.get("mode"));
    };
    
    updateMode();
    window.addEventListener("popstate", updateMode);
    return () => window.removeEventListener("popstate", updateMode);
  }, []);

  const navigateTo = (newMode: string | null) => {
    if (newMode) {
      window.history.pushState({}, "", `/auth?mode=${newMode}`);
    } else {
      window.history.pushState({}, "", "/auth");
    }
    setMode(newMode);
  };

  useEffect(() => {
    if (!isLoading && user) {
      setLocation("/start");
    }
  }, [user, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (mode === "login" || mode === "signup") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
        <header className="px-4 py-3 flex items-center gap-4">
          <button
            onClick={() => navigateTo(null)}
            className="text-muted-foreground hover:text-foreground"
            data-testid="button-back-to-hero"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <BrandLogo size="sm" />
        </header>
        
        <main className="px-4 pb-8 pt-4">
          <AuthModal 
            defaultView={mode === "signup" ? "account-type" : "login"}
            onNavigate={setLocation}
          />
        </main>

        <footer className="px-4 pb-6">
          <div className="flex justify-center gap-4">
            <Link href="/privacy">
              <span className="text-xs text-muted-foreground hover:text-foreground underline" data-testid="link-privacy">
                Privacy Policy
              </span>
            </Link>
            <Link href="/terms">
              <span className="text-xs text-muted-foreground hover:text-foreground underline" data-testid="link-terms">
                Terms of Service
              </span>
            </Link>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div 
        className="relative flex-1 flex flex-col"
        style={{
          backgroundImage: `url(${heroImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/70" />
        
        <header className="relative z-10 px-4 py-3">
          <BrandLogo size="sm" />
        </header>

        <main className="relative z-10 flex-1 flex flex-col justify-end px-6 pb-12 pt-8">
          <div className="max-w-md mx-auto w-full text-center space-y-6">
            <div className="space-y-2">
              <h1 
                className="text-3xl md:text-4xl font-bold text-white leading-tight drop-shadow-lg"
                data-testid="heading-auth-hero"
              >
                Shop local. Sell local.
              </h1>
              <p className="text-lg text-white/90 drop-shadow" data-testid="text-auth-subheadline">
                Deals from SWFL businesses
              </p>
            </div>

            <div className="space-y-3 pt-4">
              <Button 
                size="lg"
                className="w-full h-14 text-lg font-semibold bg-white text-foreground hover:bg-white/90"
                onClick={() => navigateTo("signup")}
                data-testid="button-get-started"
              >
                Get Started
              </Button>
              
              <Button 
                size="lg"
                variant="outline"
                className="w-full h-14 text-lg font-semibold border-2 border-white text-white bg-white/10 backdrop-blur-sm hover:bg-white/20"
                onClick={() => navigateTo("login")}
                data-testid="button-sign-in"
              >
                Sign In
              </Button>
            </div>

            <div className="flex justify-center gap-4 pt-4">
              <Link href="/privacy">
                <span className="text-xs text-white/60 hover:text-white/90 underline" data-testid="link-privacy">
                  Privacy Policy
                </span>
              </Link>
              <Link href="/terms">
                <span className="text-xs text-white/60 hover:text-white/90 underline" data-testid="link-terms">
                  Terms of Service
                </span>
              </Link>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
