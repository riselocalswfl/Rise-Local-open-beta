import { Link } from "wouter";
import { BrandButton } from "@/components/ui/BrandButton";
import { BrandCard, BrandCardBody } from "@/components/ui/BrandCard";
import fortMyersImg from "@assets/generated_images/Fort_Myers_local_market_hero_09220f3f.png";
import logoImg from "@assets/Support Local Business Emblem (1)_1760548313502.png";

export default function HomeHero() {
  return (
    <BrandCard className="overflow-hidden">
      <div className="grid md:grid-cols-2 gap-0">
        <BrandCardBody className="flex flex-col justify-center py-12 md:py-16">
          <div className="flex items-center gap-4 mb-3">
            <h2 className="font-heading text-3xl md:text-4xl text-text">Why Rise Local?</h2>
            <img src={logoImg} alt="Rise Local" className="h-12 w-auto" />
          </div>
          <p className="text-xl md:text-2xl text-primary font-medium mb-4">
            Because local should come first.
          </p>
          <p className="text-base md:text-lg text-text/80 leading-relaxed mb-6">
            When you shop local, you're not just buying products — you're investing in your neighbors, your town, and the heartbeat of your community.
            Rise Local is where your purchases make a difference — right here at home.
          </p>
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
