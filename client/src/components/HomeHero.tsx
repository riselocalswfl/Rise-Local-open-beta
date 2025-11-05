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
          <h2 className="font-heading text-3xl md:text-4xl text-text mb-3 font-bold">Why Rise Local?</h2>
          <p className="text-xl md:text-2xl text-primary font-bold mb-4">
            Because local should come first.
          </p>
          <p className="text-base md:text-lg text-text/80 leading-relaxed mb-6 font-medium">
            When you shop local, you're not just buying products — you're investing in your neighbors, your town, and the heartbeat of your community.
            Rise Local is where your purchases make a difference — right here at home.
          </p>
          <div className="flex flex-col items-center gap-4">
            <div className="flex gap-3">
              <Link href="/products">
                <BrandButton data-testid="button-shop-local">
                  Shop Local
                </BrandButton>
              </Link>
              <Link href="/vendors">
                <BrandButton data-testid="button-meet-makers">
                  Meet Makers
                </BrandButton>
              </Link>
            </div>
            <Link href="/join" data-testid="link-join">
              <BrandButton data-testid="button-join">
                Join the Movement
              </BrandButton>
            </Link>
          </div>
          <img src={logoImg} alt="Rise Local" className="absolute bottom-1 right-0 h-28 w-auto" />
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
