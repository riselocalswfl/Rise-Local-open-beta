import { Link } from "wouter";
import { ArrowRight, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import heroImage from "@assets/generated_images/Fort_Myers_local_market_hero_09220f3f.png";

interface SpotlightBannerProps {
  title: string;
  body: string;
  city: string;
}

export default function SpotlightBanner({ title, body, city }: SpotlightBannerProps) {
  return (
    <div className="relative h-[60vh] md:h-[70vh] overflow-hidden rounded-lg">
      <img
        src={heroImage}
        alt="Fort Myers Local Market"
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent" />
      
      <div className="relative h-full flex flex-col justify-end p-6 md:p-12">
        <div className="max-w-3xl">
          <div className="le-badge mb-4">
            <Star className="w-3 h-3" strokeWidth={1.75} />
            {city} Spotlight
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-[54px] font-serif font-bold text-white mb-4 leading-tight" data-testid="text-spotlight-title">
            {title}
          </h1>
          <p className="text-lg text-white/90 mb-6 line-clamp-3 leading-relaxed">
            {body}
          </p>
          <Button asChild size="lg" variant="outline" className="rounded-pill bg-background/10 backdrop-blur-sm border-white/20 text-white hover:bg-background/20">
            <Link href="/spotlight" data-testid="link-explore-spotlight">
              Explore Spotlight
              <ArrowRight className="w-4 h-4 ml-2" strokeWidth={1.75} />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
