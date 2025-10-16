import { Link } from "wouter";
import { BrandButton } from "@/components/ui/BrandButton";
import { BrandCard, BrandCardBody } from "@/components/ui/BrandCard";
import farmersMarketImg from "@assets/stock_images/farmers_market_golde_c7adf4e7.jpg";

export default function HomeHero() {
  return (
    <BrandCard className="overflow-hidden">
      <div className="grid md:grid-cols-2 gap-0">
        <BrandCardBody className="flex flex-col justify-center py-12 md:py-16">
          <h2 className="font-heading text-3xl md:text-4xl text-text mb-3">Why Rise Local?</h2>
          <p className="text-xl md:text-2xl text-primary font-medium mb-4">
            Because local should come first.
          </p>
          <p className="text-base md:text-lg text-text/80 leading-relaxed mb-6">
            When you shop local, you're not just buying products — you're investing in your neighbors, your town, and the heartbeat of your community.
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
            src={farmersMarketImg}
            alt="Local farmers market community"
            className="absolute inset-0 h-full w-full object-cover"
          />
        </div>
      </div>
    </BrandCard>
  );
}
