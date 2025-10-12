import { Link } from "wouter";
import { BrandBadge } from "@/components/ui/BrandBadge";
import { VALUE_META, type ValueTag } from "@/../../shared/values";
import { motion } from "framer-motion";
import { 
  Sprout, 
  ShieldCheck, 
  Wheat, 
  Handshake, 
  Users, 
  Medal, 
  Circle,
  Leaf,
  Scissors,
  Recycle,
  Package
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const ICONS: Record<ValueTag, LucideIcon> = {
  organic: Sprout,
  nonGMO: ShieldCheck,
  regenerative: Wheat,
  fairTrade: Handshake,
  womanOwned: Users,
  veteranOwned: Medal,
  glutenFree: Circle,
  vegan: Leaf,
  artisan: Scissors,
  lowWaste: Recycle,
  plasticFree: Package,
};

export default function ValuesShowcase({ limit = 8 }: { limit?: number }) {
  const all = (Object.keys(VALUE_META) as ValueTag[]).slice(0, limit);
  return (
    <section className="mx-auto max-w-7xl px-4 md:px-6 mt-10">
      <div className="mb-4">
        <h2 className="font-heading text-3xl text-text">Shop by Values</h2>
        <p className="text-text/70">
          Support local businesses that share your principles.
        </p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {all.map((tag, i) => {
          const Icon = ICONS[tag] || Circle;
          return (
            <motion.div
              key={tag}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <Link href={`/vendors?values=${tag}`} data-testid={`link-value-${tag}`}>
                <div className="group rounded-2xl bg-white shadow-soft p-4 hover:-translate-y-0.5 transition duration-brand border border-black/5">
                  <Icon className="w-8 h-8 text-primary" strokeWidth={1.75} />
                  <div className="mt-2 font-medium">{VALUE_META[tag].label}</div>
                  <div className="mt-1 text-sm text-text/70 line-clamp-2">
                    {VALUE_META[tag].description}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <BrandBadge className="group-hover:bg-primary group-hover:text-white">
                      Vendors
                    </BrandBadge>
                    <BrandBadge className="group-hover:bg-primary group-hover:text-white">
                      Products
                    </BrandBadge>
                  </div>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
