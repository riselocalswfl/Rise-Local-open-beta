import logoImg from "@assets/ChatGPT Image Oct 13, 2025, 09_50_24 PM_1760406630036.png";

export default function BrandLogo({ className = "" }: { className?: string }) {
  return (
    <div className={`inline-flex items-center ${className}`}>
      <img 
        src={logoImg} 
        alt="SHOP SMALL" 
        className="h-12 w-auto"
      />
    </div>
  );
}
