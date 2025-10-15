import { Link } from "wouter";
import { BrandButton } from "@/components/ui/BrandButton";
import { BrandCard, BrandCardBody } from "@/components/ui/BrandCard";
import fortMyersImg from "@assets/generated_images/Fort_Myers_local_market_hero_09220f3f.png";

export default function HomeHero() {
  return (
    <BrandCard className="overflow-hidden">
      <div className="relative h-[360px] md:h-[460px]">
        <img
          src={fortMyersImg}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-black/55 via-black/20 to-transparent" />
        <BrandCardBody className="relative h-full flex flex-col justify-end max-w-4xl text-white">
          <span className="inline-flex items-center gap-2 mb-3 text-sm bg-white/15 px-3 py-1 rounded-xl backdrop-blur w-fit">
            Fort Myers Spotlight
          </span>
          <h1 className="font-heading text-4xl md:text-5xl leading-tight">
            Discover Fort Myers' Local Treasures
          </h1>
          <p className="mt-3 max-w-2xl text-white/90">
            Locally made. Mindfully traded. Support artisans, farmers, and makers
            bringing sustainable products to your neighborhood.
          </p>
          <div className="mt-6 flex gap-3">
            <Link href="/spotlight">
              <BrandButton data-testid="button-explore-spotlight">
                Explore Spotlight
              </BrandButton>
            </Link>
            <Link href="/vendors">
              <BrandButton data-testid="button-meet-makers">
                Meet Local Makers
              </BrandButton>
            </Link>
          </div>
        </BrandCardBody>
      </div>
    </BrandCard>
  );
}
