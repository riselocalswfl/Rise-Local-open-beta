import { Link } from "wouter";
import { BrandCard, BrandCardBody } from "@/components/ui/BrandCard";
import fortMyersImg from "@assets/generated_images/Fort_Myers_local_market_hero_09220f3f.png";
import logoImg from "@assets/Support Local Business Emblem (1)_1760548313502.png";

export default function HomeHero() {
  return (
    <BrandCard className="overflow-hidden">
      <div className="grid md:grid-cols-2 gap-0">
        {/* Text Content */}
        <BrandCardBody className="relative flex flex-col justify-center py-8 px-6 md:py-16 md:px-8">
          {/* Logo - responsive positioning */}
          <img 
            src={logoImg} 
            alt="Rise Local" 
            className="absolute top-4 right-4 h-20 w-auto md:h-28 md:top-4 md:right-4 opacity-90" 
          />
          
          {/* Heading */}
          <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl text-text mb-4 md:mb-6 font-bold leading-tight">
            What's Rise Local?
          </h2>
          
          {/* Description */}
          <p className="text-base sm:text-lg lg:text-xl text-text/80 leading-relaxed mb-6 md:mb-8 font-medium max-w-xl">
            Rise Local is your one-stop-shop for all things local in SWFL. This app is here to connect you to events, restaurants, goods, and services, which makes supporting local the easiest choice.
          </p>
          
          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
            <Link 
              href="/auth" 
              data-testid="start-selling-cta"
              className="w-full sm:w-auto bg-secondary hover:bg-secondary/90 text-white px-6 py-3 rounded-md font-medium transition no-underline text-center"
            >
              Start Selling on Rise Local
            </Link>
            <Link 
              href="/businesses"
              className="w-full sm:w-auto inline-flex items-center justify-center rounded-md transition bg-primary text-white hover:bg-primary/90 py-3 px-6 no-underline font-medium shadow-sm" 
              data-testid="link-discover-businesses"
            >
              Discover Local Businesses
            </Link>
          </div>
        </BrandCardBody>
        
        {/* Hero Image */}
        <div className="relative h-[250px] sm:h-[300px] md:h-auto md:min-h-[400px] order-first md:order-last">
          <img
            src={fortMyersImg}
            alt="Fort Myers local market"
            className="absolute inset-0 h-full w-full object-cover"
          />
        </div>
      </div>
    </BrandCard>
  );
}
