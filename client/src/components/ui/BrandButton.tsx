import { cn } from "@/lib/cn";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
};

export function BrandButton({
  className,
  variant = "primary",
  size = "md",
  ...props
}: Props) {
  const base =
    "inline-flex items-center justify-center rounded-2xl transition-transform duration-brand shadow-soft hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60";
  const v = {
    primary: "bg-primary text-white hover:bg-primary/90",
    secondary: "bg-secondary text-text hover:bg-secondary/90",
    ghost: "bg-transparent text-text hover:bg-black/5",
  }[variant];
  const s = {
    sm: "h-9 px-3 text-sm",
    md: "h-11 px-4",
    lg: "h-12 px-6 text-lg",
  }[size];
  return <button className={cn(base, v, s, className)} {...props} />;
}
