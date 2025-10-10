import * as React from "react";
import { cn } from "@/lib/cn";

export const BrandCard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("rounded-2xl bg-white shadow-soft", className)}
      {...props}
    />
  );
});

BrandCard.displayName = "BrandCard";

export const BrandCardBody = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return <div ref={ref} className={cn("p-4 md:p-6", className)} {...props} />;
});

BrandCardBody.displayName = "BrandCardBody";
