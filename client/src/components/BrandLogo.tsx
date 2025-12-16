import { Link } from "wouter";
import logoImg from "@assets/Support Local Business Emblem (1)_1760548313502.png";

interface BrandLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  linkDisabled?: boolean;
}

export default function BrandLogo({ className = "", size = "md", linkDisabled = false }: BrandLogoProps) {
  const sizeClasses = {
    sm: "h-10",
    md: "h-14",
    lg: "h-20"
  };

  const logoElement = (
    <div className={`inline-flex items-center ${className}`}>
      <img 
        src={logoImg} 
        alt="Rise Local" 
        className={`${sizeClasses[size]} w-auto`}
        data-testid="img-brand-logo"
      />
    </div>
  );

  if (linkDisabled) {
    return logoElement;
  }

  return (
    <Link href="/discover" data-testid="link-logo-home">
      {logoElement}
    </Link>
  );
}
