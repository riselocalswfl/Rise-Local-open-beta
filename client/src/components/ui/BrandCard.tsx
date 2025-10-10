import { cn } from "@/lib/cn";

export function BrandCard({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("rounded-2xl bg-white shadow-soft", className)} {...props} />
  );
}

export function BrandCardBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-4 md:p-6", className)} {...props} />;
}
