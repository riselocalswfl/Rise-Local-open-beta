import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, MapPin, Tag, Store, Users, Heart } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import BrandLogo from "@/components/BrandLogo";

import heroImage from "@assets/stock_images/local_shops_market_c_c3817e27.jpg";
import communityImage from "@assets/stock_images/local_shops_market_c_4cc5dfe8.jpg";
import shopperImage from "@assets/stock_images/person_shopping_mobi_a241f16c.jpg";
import businessOwnerImage from "@assets/stock_images/small_business_owner_7d76c2b3.jpg";
import storefrontImage from "@assets/stock_images/small_business_owner_67c4fdd8.jpg";

interface WelcomeSlide {
  id: number;
  title: string;
  content: string | string[];
  image: string;
  emphasis?: string;
}

const slides: WelcomeSlide[] = [
  {
    id: 1,
    title: "What is Rise Local?",
    content: "Rise Local connects local people with local businesses through exclusive deals, visibility, and shared values.",
    image: communityImage,
    emphasis: "Your neighborhood, your businesses, your deals.",
  },
  {
    id: 2,
    title: "For Locals & Shoppers",
    content: [
      "Discover nearby local businesses",
      "Unlock exclusive local deals",
      "Support businesses that align with your values",
    ],
    image: shopperImage,
    emphasis: "No big corporations. No clutter. Hyper-local focus.",
  },
  {
    id: 3,
    title: "For Local Businesses",
    content: [
      "Create a business profile",
      "Post deals to attract local customers",
      "Get discovered by people who want to shop local",
    ],
    image: businessOwnerImage,
    emphasis: "Simple setup. No complex systems. Community support.",
  },
  {
    id: 4,
    title: "Built to Support Local",
    content: [
      "Consumers browse & unlock deals",
      "Businesses gain exposure and foot traffic",
      "Rise Local stays focused on local-first commerce",
    ],
    image: storefrontImage,
    emphasis: "Deals-based marketplace. Community over corporations.",
  },
];

export default function Welcome() {
  const [, setLocation] = useLocation();
  const [currentSlide, setCurrentSlide] = useState(-1); // -1 = hero, 0+ = slides
  const [userIntent, setUserIntent] = useState<"consumer" | "business" | null>(null);
  const queryClient = useQueryClient();

  const completeWelcomeMutation = useMutation({
    mutationFn: async (data: { role: string }) => {
      return await apiRequest("POST", "/api/welcome/complete", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
  });

  const handleGetStarted = (intent: "consumer" | "business") => {
    setUserIntent(intent);
    setCurrentSlide(0);
  };

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const handlePrev = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    } else if (currentSlide === 0) {
      setCurrentSlide(-1); // Back to hero
    }
  };

  const handleComplete = async (role: "buyer" | "vendor") => {
    try {
      await completeWelcomeMutation.mutateAsync({ role });
      if (role === "vendor") {
        setLocation("/onboarding");
      } else {
        setLocation("/discover");
      }
    } catch (error) {
      console.error("Failed to complete welcome:", error);
      // Still navigate even if the API call fails
      if (role === "vendor") {
        setLocation("/onboarding");
      } else {
        setLocation("/discover");
      }
    }
  };

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 300 : -300,
      opacity: 0,
    }),
  };

  // Hero Screen
  if (currentSlide === -1) {
    return (
      <div className="min-h-screen flex flex-col">
        <div className="relative flex-1 flex flex-col">
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${heroImage})` }}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />
          </div>
          
          <div className="relative z-10 flex-1 flex flex-col justify-between p-6 text-white">
            <div className="flex justify-center pt-8 [&_img]:brightness-0 [&_img]:invert">
              <BrandLogo size="lg" />
            </div>
            
            <div className="text-center space-y-4">
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                Welcome to Rise Local
              </h1>
              <p className="text-lg text-white/90 max-w-md mx-auto">
                The easiest way to support local businesses you believe in.
              </p>
            </div>
            
            <div className="space-y-3 pb-8">
              <Button 
                size="lg" 
                className="w-full text-base font-semibold uppercase tracking-wide"
                onClick={() => handleGetStarted("consumer")}
                data-testid="button-get-started"
              >
                Get Started
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                className="w-full text-base border-white/30 text-white hover:bg-white/10 backdrop-blur-sm"
                onClick={() => handleGetStarted("business")}
                data-testid="button-im-a-business"
              >
                I'm a Business
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Final Slide - Call to Action
  if (currentSlide === slides.length) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <div className="flex-1 flex flex-col justify-center items-center p-6 text-center">
          <div className="mb-8">
            <BrandLogo size="md" />
          </div>
          
          <div className="flex items-center gap-2 mb-4">
            <Heart className="w-8 h-8 text-primary" />
            <Users className="w-8 h-8 text-primary" />
            <MapPin className="w-8 h-8 text-primary" />
          </div>
          
          <h1 className="text-2xl md:text-3xl font-bold mb-3">
            Join the Local Movement
          </h1>
          <p className="text-muted-foreground max-w-sm mb-8">
            Start discovering deals and supporting local businesses in your community today.
          </p>
          
          <div className="w-full max-w-sm space-y-3">
            <Button 
              size="lg" 
              className="w-full text-base font-semibold uppercase tracking-wide"
              onClick={() => handleComplete("buyer")}
              disabled={completeWelcomeMutation.isPending}
              data-testid="button-continue-consumer"
            >
              {completeWelcomeMutation.isPending ? "Loading..." : "Continue as a Consumer"}
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="w-full text-base"
              onClick={() => handleComplete("vendor")}
              disabled={completeWelcomeMutation.isPending}
              data-testid="button-continue-business"
            >
              Continue as a Business
            </Button>
          </div>
          
          <button 
            onClick={() => setCurrentSlide(slides.length - 1)}
            className="mt-6 text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
            data-testid="button-back"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>
        </div>
      </div>
    );
  }

  // Carousel Slides
  const slide = slides[currentSlide];
  const isLastSlide = currentSlide === slides.length - 1;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="p-4">
        <button 
          onClick={handlePrev}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          data-testid="button-slide-back"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>
      </div>
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <AnimatePresence mode="wait" custom={1}>
          <motion.div
            key={currentSlide}
            custom={1}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="flex-1 flex flex-col"
          >
            <div className="h-48 md:h-64 overflow-hidden">
              <img 
                src={slide.image} 
                alt={slide.title}
                className="w-full h-full object-cover"
              />
            </div>
            
            <div className="flex-1 p-6 space-y-4">
              <h2 className="text-2xl font-bold text-foreground">
                {slide.title}
              </h2>
              
              {Array.isArray(slide.content) ? (
                <ul className="space-y-2">
                  {slide.content.map((item, index) => (
                    <li key={index} className="flex items-start gap-2 text-muted-foreground">
                      <Tag className="w-4 h-4 mt-1 text-primary flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground text-lg">
                  {slide.content}
                </p>
              )}
              
              {slide.emphasis && (
                <p className="text-sm font-medium text-primary pt-2">
                  {slide.emphasis}
                </p>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
      
      <div className="p-6 space-y-4">
        <div className="flex justify-center gap-2">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentSlide 
                  ? "bg-primary" 
                  : "bg-muted-foreground/30"
              }`}
              data-testid={`dot-slide-${index}`}
            />
          ))}
        </div>
        
        <Button 
          size="lg" 
          className="w-full text-base font-semibold uppercase tracking-wide"
          onClick={isLastSlide ? () => setCurrentSlide(slides.length) : handleNext}
          data-testid="button-next-slide"
        >
          {isLastSlide ? "Get Started" : "Next"}
          {!isLastSlide && <ChevronRight className="w-5 h-5 ml-1" />}
        </Button>
      </div>
    </div>
  );
}
