import { Link } from "wouter";
import logoImg from "@assets/Support Local Business Emblem (1)_1760548313502.png";

interface BrandLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export default function BrandLogo({ className = "", size = "md" }: BrandLogoProps) {
  const sizeClasses = {
    sm: "h-12",
    md: "h-16",
    lg: "h-24"
  };

  return (
    <Link href="/discover" data-testid="link-home">
      <div className={`inline-flex items-center cursor-pointer ${className}`}>
        <img 
          src={logoImg} 
          alt="Rise Local" 
          className={`${sizeClasses[size]} w-auto`}
        />
      </div>
    </Link>
  );
}
