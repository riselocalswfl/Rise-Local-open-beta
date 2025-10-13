import { Search, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useEffect } from "react";

interface FilterBarProps {
  type: "products" | "vendors" | "events";
  onSearch?: (query: string) => void;
  onCategoryChange?: (category: string) => void;
  onSortChange?: (sort: string) => void;
  selectedCategory?: string;
}

export default function FilterBar({ type, onSearch, onCategoryChange, onSortChange, selectedCategory: externalCategory }: FilterBarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>(externalCategory || "all");
  
  useEffect(() => {
    if (externalCategory) {
      setSelectedCategory(externalCategory);
    }
  }, [externalCategory]);

  const categories = {
    products: ["All", "Bakery", "Beverages", "Plants", "Organic", "Artisan"],
    vendors: ["All", "Food", "Beverages", "Home & Garden", "Crafts"],
    events: ["All", "Workshop", "Market", "Festival", "Community"],
  };

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    onSearch?.(value);
  };

  const handleCategoryToggle = (category: string) => {
    const categoryValue = category.toLowerCase();
    const newCategory = selectedCategory === categoryValue ? "all" : categoryValue;
    setSelectedCategory(newCategory);
    onCategoryChange?.(newCategory);
  };

  return (
    <div className="bg-background border-b py-4 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={1.75} />
            <Input
              type="search"
              placeholder={`Search ${type}...`}
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10 rounded-lg"
              data-testid={`input-filter-search-${type}`}
            />
          </div>
          <Select onValueChange={onSortChange} defaultValue="newest">
            <SelectTrigger className="w-full sm:w-[180px] rounded-pill" data-testid="select-sort">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="popular">Most Popular</SelectItem>
              {type === "products" && <SelectItem value="price-low">Price: Low to High</SelectItem>}
              {type === "products" && <SelectItem value="price-high">Price: High to Low</SelectItem>}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          <SlidersHorizontal className="w-4 h-4 text-muted-foreground flex-shrink-0" strokeWidth={1.75} />
          {categories[type].map((category) => (
            <Badge
              key={category}
              variant={selectedCategory === category.toLowerCase() ? "default" : "outline"}
              className="cursor-pointer whitespace-nowrap hover-elevate rounded-pill"
              onClick={() => handleCategoryToggle(category.toLowerCase())}
              data-testid={`badge-category-${category.toLowerCase()}`}
            >
              {category}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}
