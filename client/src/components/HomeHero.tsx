import { Link } from "wouter";
import { BrandButton } from "@/components/ui/BrandButton";
import { BrandCard, BrandCardBody } from "@/components/ui/BrandCard";
import fortMyersImg from "@assets/generated_images/Fort_Myers_local_market_hero_09220f3f.png";
import logoImg from "@assets/Support Local Business Emblem (1)_1760548313502.png";

export default function HomeHero() {
  return (
    <BrandCard className="overflow-hidden">
      <div className="grid md:grid-cols-2 gap-0">
        <BrandCardBody className="relative flex flex-col justify-center py-12 md:py-16">
          <img src={logoImg} alt="Rise Local" className="absolute top-4 right-2 h-28 w-auto" />
          <h2 className="font-heading text-3xl md:text-4xl text-text mb-6 font-bold">What's Rise Local?</h2>
          <p className="text-base md:text-lg text-text/80 leading-relaxed mb-6 font-medium">
            Rise Local is your one-stop-shop for all things local in SWFL. Whether it's events, restaurants, goods, or services, we're here to make choosing local the easiest choice every time.
          </p>
          <div className="flex flex-col items-center gap-4">
            <div className="flex gap-3">
              <Link href="/vendors">
                <BrandButton data-testid="button-meet-vendors">
                  Meet Vendors
                </BrandButton>
              </Link>
              <Link href="/join" data-testid="link-join">
                <BrandButton data-testid="button-join">
                  Join the Movement
                </BrandButton>
              </Link>
            </div>
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
