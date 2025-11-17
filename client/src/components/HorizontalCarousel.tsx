import { ReactNode, useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HorizontalCarouselProps {
  children: ReactNode[];
  className?: string;
}

export default function HorizontalCarousel({ children, className = "" }: HorizontalCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    slidesToScroll: 1,
    containScroll: "trimSnaps",
  });

  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
  }, [emblaApi, onSelect]);

  return (
    <div className={`relative ${className}`}>
      {/* Previous Button */}
      {canScrollPrev && (
        <Button
          variant="outline"
          size="icon"
          onClick={scrollPrev}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-background/95 backdrop-blur-sm shadow-lg border-2"
          data-testid="button-carousel-prev"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
      )}

      {/* Carousel */}
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex gap-6">
          {children.map((child, index) => (
            <div
              key={index}
              className="flex-none"
              style={{ flex: "0 0 auto" }}
            >
              {child}
            </div>
          ))}
        </div>
      </div>

      {/* Next Button */}
      {canScrollNext && (
        <Button
          variant="outline"
          size="icon"
          onClick={scrollNext}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-background/95 backdrop-blur-sm shadow-lg border-2"
          data-testid="button-carousel-next"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      )}
    </div>
  );
}
