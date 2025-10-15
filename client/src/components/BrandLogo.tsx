import logoImg from "@assets/Support Local Business Emblem (1)_1760548313502.png";

export default function BrandLogo({ className = "" }: { className?: string }) {
  return (
    <div className={`inline-flex items-center ${className}`}>
      <img 
        src={logoImg} 
        alt="Rise Local" 
        className="h-16 w-auto"
      />
    </div>
  );
}
