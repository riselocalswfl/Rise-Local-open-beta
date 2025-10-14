import logoImg from "@assets/ChatGPT Image Oct 13, 2025, 09_56_40 PM_1760407005742.png";

export default function BrandLogo({ className = "" }: { className?: string }) {
  return (
    <div className={`inline-flex items-center ${className}`}>
      <img 
        src={logoImg} 
        alt="SHOP SMALL" 
        className="h-16 w-auto"
      />
    </div>
  );
}
