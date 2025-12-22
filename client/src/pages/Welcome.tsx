import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import BrandLogo from "@/components/BrandLogo";
import { Loader2 } from "lucide-react";

import heroImage from "@assets/ChatGPT_Image_Dec_22,_2025,_03_15_42_PM_1766434546127.png";
import fallbackImage from "@assets/stock_images/adult_woman_shopping_9321ca4a.jpg";

interface User {
  id: string;
  role: string;
  onboardingComplete?: boolean;
  welcomeCompleted?: boolean;
}

export default function Welcome() {
  const [, setLocation] = useLocation();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageSrc, setImageSrc] = useState(heroImage);
  const [isNavigating, setIsNavigating] = useState(false);
  const queryClient = useQueryClient();

  const { data: user, isLoading: userLoading } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
  });

  const completeWelcomeMutation = useMutation({
    mutationFn: async (data: { role: string }) => {
      return await apiRequest("POST", "/api/welcome/complete", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
  });

  const navigateBasedOnRole = useCallback(async () => {
    if (!user) {
      setLocation("/auth");
      return;
    }

    setIsNavigating(true);
    const role = user.role;
    
    if (!user.welcomeCompleted) {
      const roleToSend = (role === "vendor" || role === "restaurant" || role === "service_provider") ? "vendor" : "buyer";
      try {
        await completeWelcomeMutation.mutateAsync({ role: roleToSend });
      } catch (error) {
        console.error("Failed to complete welcome:", error);
      }
    }

    if (role === "vendor" || role === "restaurant" || role === "service_provider") {
      setLocation("/dashboard");
    } else {
      setLocation("/discover");
    }
  }, [user, setLocation, completeWelcomeMutation]);

  useEffect(() => {
    if (userLoading) return;

    if (!user) {
      setLocation("/auth");
      return;
    }
  }, [user, userLoading, setLocation]);

  const handleGetStarted = () => {
    navigateBasedOnRole();
  };

  const handleSkip = () => {
    navigateBasedOnRole();
  };

  const handleImageError = () => {
    if (imageSrc !== fallbackImage) {
      setImageSrc(fallbackImage);
    }
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      <img
        src={imageSrc}
        alt=""
        onLoad={handleImageLoad}
        onError={handleImageError}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
          imageLoaded ? "opacity-100" : "opacity-0"
        }`}
      />
      
      <div 
        className="absolute inset-0"
        style={{
          background: "linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.5) 40%, rgba(0,0,0,0.7) 100%)"
        }}
      />
      
      <div className="relative z-10 flex-1 flex flex-col text-white">
        <div className="flex justify-end p-4 pt-[env(safe-area-inset-top,16px)]">
          <button
            onClick={handleSkip}
            className="text-sm text-white/70 hover:text-white transition-colors px-3 py-1"
            data-testid="button-skip"
          >
            Skip
          </button>
        </div>
        
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="mb-8 [&_img]:brightness-0 [&_img]:invert">
            <BrandLogo size="sm" />
          </div>
          
          <h1 
            className="text-3xl md:text-4xl font-bold tracking-tight mb-4"
            data-testid="text-welcome-headline"
          >
            Welcome to Rise Local
          </h1>
          
          <p 
            className="text-lg text-white/90 max-w-sm"
            data-testid="text-welcome-subhead"
          >
            Exclusive local deals, all in one place.
          </p>
        </div>
        
        <div className="px-6 pb-[calc(env(safe-area-inset-bottom,16px)+16px)]">
          <Button
            size="lg"
            onClick={handleGetStarted}
            disabled={isNavigating || completeWelcomeMutation.isPending}
            className="w-full text-base font-semibold uppercase tracking-wide shadow-lg"
            data-testid="button-get-started"
          >
            {isNavigating || completeWelcomeMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              "Get Started"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
