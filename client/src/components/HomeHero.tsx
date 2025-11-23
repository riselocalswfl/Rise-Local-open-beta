import { Link } from "wouter";
import { BrandCard, BrandCardBody } from "@/components/ui/BrandCard";
import fortMyersImg from "@assets/generated_images/Fort_Myers_local_market_hero_09220f3f.png";
import logoImg from "@assets/Support Local Business Emblem (1)_1760548313502.png";

export default function HomeHero() {
  return (
    <BrandCard className="overflow-hidden">
      <div className="grid md:grid-cols-2 gap-0">
        <BrandCardBody className="relative flex flex-col justify-center py-12 md:py-16">
          <img src={logoImg} alt="Rise Local" className="absolute top-4 right-2 h-28 w-auto" />
          <h2 className="font-heading text-2xl md:text-4xl text-text mb-6 font-bold">What's Rise Local?</h2>
          <p className="text-base md:text-lg text-text/80 leading-relaxed mb-6 font-medium">
            Rise Local is your one-stop-shop for all things local in SWFL. This app is here to connect you to events, restaurants, goods, and services, which makes supporting local the easiest choice.
          </p>
          <div className="flex justify-center mb-6">
            <Link 
              href="/join" 
              data-testid="start-selling-cta"
              className="bg-secondary hover:bg-secondary/90 text-white px-8 py-3 rounded-md font-medium transition no-underline"
            >
              Start Selling on Rise Local
            </Link>
          </div>
          <div className="w-full max-w-md mx-auto">
            <Link 
              href="/vendors"
              className="w-full min-h-[56px] inline-flex items-center justify-center rounded-2xl transition-transform duration-brand shadow-soft hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 bg-primary text-white hover:bg-primary/90 py-4 px-8 no-underline" 
              data-testid="link-discover-businesses"
            >
              <span className="text-lg font-semibold">Discover our local businesses</span>
            </Link>
          </div>
        </BrandCardBody>
        <div className="relative h-[300px] md:h-auto">
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
