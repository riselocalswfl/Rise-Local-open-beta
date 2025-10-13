import { Leaf } from "lucide-react";

export default function BrandLogo({ size = 22 }: { size?: number }) {
  return (
    <div className="inline-flex items-center gap-2">
      <div className="h-9 w-9 rounded-full border border-primary/30 bg-white grid place-items-center shadow-soft">
        <Leaf size={size} className="text-primary" />
      </div>
      <div className="leading-tight">
        <div className="font-heading text-xl text-text">Local Choice</div>
        <div className="text-xs text-text/60 -mt-0.5">Shop your values</div>
      </div>
    </div>
  );
}
