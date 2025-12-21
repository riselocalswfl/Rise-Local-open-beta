const PLACEHOLDER_IMAGE = "/assets/deal-placeholder.jpg";

export interface DealImageSources {
  dealImageUrl?: string | null;
  vendorBannerUrl?: string | null;
  vendorLogoUrl?: string | null;
}

export function resolveDealImage(sources: DealImageSources): string {
  return (
    sources.dealImageUrl ||
    sources.vendorBannerUrl ||
    sources.vendorLogoUrl ||
    PLACEHOLDER_IMAGE
  );
}

export function getImageFallbackChain(sources: DealImageSources): string[] {
  const chain: string[] = [];
  if (sources.dealImageUrl) chain.push(sources.dealImageUrl);
  if (sources.vendorBannerUrl) chain.push(sources.vendorBannerUrl);
  if (sources.vendorLogoUrl) chain.push(sources.vendorLogoUrl);
  chain.push(PLACEHOLDER_IMAGE);
  return chain;
}
