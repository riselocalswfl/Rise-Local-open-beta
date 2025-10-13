import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";

interface MobileCategoryNavProps {
  categories: string[];
  baseUrl: string;
  title: string;
}

export default function MobileCategoryNav({ categories, baseUrl, title }: MobileCategoryNavProps) {
  return (
    <div className="md:hidden bg-card border rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        <Link href={baseUrl} data-testid={`link-view-all-${title.toLowerCase()}`}>
          <button className="text-xs text-primary hover:text-primary/80 flex items-center gap-1">
            View All
            <ArrowRight className="w-3 h-3" strokeWidth={1.75} />
          </button>
        </Link>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {categories.map((category) => (
          <Link
            key={category}
            href={`${baseUrl}?category=${category.toLowerCase()}`}
            data-testid={`link-category-${category.toLowerCase()}`}
          >
            <Badge
              variant="outline"
              className="cursor-pointer whitespace-nowrap hover-elevate rounded-pill text-xs"
            >
              {category}
            </Badge>
          </Link>
        ))}
      </div>
    </div>
  );
}
