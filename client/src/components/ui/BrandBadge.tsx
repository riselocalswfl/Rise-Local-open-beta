import { cn } from "@/lib/cn";

export function BrandBadge({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-xl border border-primary/25 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary",
        className
      )}
      {...props}
    />
  );
}

export function BrandBadgeSecondary({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-xl border border-black/10 bg-black/5 px-2.5 py-1 text-xs text-text/75",
        className
      )}
      {...props}
    />
  );
}
