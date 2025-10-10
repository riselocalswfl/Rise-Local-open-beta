import * as React from "react";
import { cn } from "@/lib/cn";

export const BrandBadge = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement>
>(({ className, ...props }, ref) => {
  return (
    <span
      ref={ref}
      className={cn(
        "inline-flex items-center rounded-xl border border-primary/25 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary",
        className
      )}
      {...props}
    />
  );
});

BrandBadge.displayName = "BrandBadge";

export const BrandBadgeSecondary = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement>
>(({ className, ...props }, ref) => {
  return (
    <span
      ref={ref}
      className={cn(
        "inline-flex items-center rounded-xl border border-black/10 bg-black/5 px-2.5 py-1 text-xs text-text/75",
        className
      )}
      {...props}
    />
  );
});

BrandBadgeSecondary.displayName = "BrandBadgeSecondary";
