import { useMemo, useState } from "react";
import { X, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useValueFilters, type MatchMode } from "@/hooks/useValueFilters";
import { VALUE_META, ALL_VALUE_TAGS, type ValueTag } from "@/../../shared/values";

interface ValueFilterBarProps {
  valueCounts: Record<ValueTag, { vendors: number; products: number }>;
  context: "vendors" | "products";
}

export default function ValueFilterBar({ valueCounts, context }: ValueFilterBarProps) {
  const {
    selected,
    setSelected,
    matchMode,
    setMatchMode,
    includeVendorValuesForProducts,
    setIncludeVendorValuesForProducts,
    clear,
  } = useValueFilters();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [popoverOpen, setPopoverOpen] = useState(false);
  
  const topValues = useMemo(() => {
    const sorted = ALL_VALUE_TAGS
      .map(tag => ({
        tag,
        count: context === "vendors" ? valueCounts[tag].vendors : valueCounts[tag].products
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
    return sorted;
  }, [valueCounts, context]);
  
  const filteredValues = useMemo(() => {
    if (!searchQuery) return ALL_VALUE_TAGS;
    const query = searchQuery.toLowerCase();
    return ALL_VALUE_TAGS.filter(tag => {
      const meta = VALUE_META[tag];
      return meta.label.toLowerCase().includes(query) || 
             meta.description.toLowerCase().includes(query);
    });
  }, [searchQuery]);
  
  const toggleValue = (tag: ValueTag) => {
    if (selected.includes(tag)) {
      setSelected(selected.filter(t => t !== tag));
    } else {
      setSelected([...selected, tag]);
    }
  };
  
  const getCount = (tag: ValueTag) => {
    return context === "vendors" ? valueCounts[tag].vendors : valueCounts[tag].products;
  };
  
  const hasActiveFilters = selected.length > 0;
  
  return (
    <div className="flex items-center gap-2 p-4 bg-card rounded-lg border flex-wrap">
      <div className="flex items-center gap-2 flex-1 flex-wrap">
        {topValues.map(({ tag, count }) => (
          <Button
            key={tag}
            variant={selected.includes(tag) ? "default" : "outline"}
            size="sm"
            onClick={() => toggleValue(tag)}
            className="rounded-pill"
            aria-pressed={selected.includes(tag)}
            data-testid={`chip-value-${tag}`}
          >
            {VALUE_META[tag].label} · {count}
          </Button>
        ))}
        
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              className="rounded-pill"
              data-testid="button-all-values"
            >
              All Values
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="start">
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
                <Input
                  placeholder="Search values..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                  data-testid="input-search-values"
                />
              </div>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {filteredValues.map(tag => {
                  const count = getCount(tag);
                  const isSelected = selected.includes(tag);
                  return (
                    <button
                      key={tag}
                      onClick={() => toggleValue(tag)}
                      className="w-full flex items-center justify-between p-2 rounded-md hover-elevate active-elevate-2 text-left"
                      aria-pressed={isSelected}
                      data-testid={`option-value-${tag}`}
                    >
                      <div className="flex-1">
                        <div className="font-medium text-sm">{VALUE_META[tag].label}</div>
                        <div className="text-xs text-muted-foreground">{VALUE_META[tag].description}</div>
                      </div>
                      <Badge variant={isSelected ? "default" : "outline"} className="ml-2 rounded-pill">
                        {count}
                      </Badge>
                    </button>
                  );
                })}
                {filteredValues.length === 0 && (
                  <div className="text-center text-sm text-muted-foreground py-4">
                    No values found
                  </div>
                )}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
      
      <div className="flex items-center gap-2">
        <div className="flex items-center rounded-pill border bg-background">
          <Button
            variant={matchMode === "any" ? "default" : "ghost"}
            size="sm"
            onClick={() => setMatchMode("any")}
            className="rounded-l-pill rounded-r-none"
            data-testid="button-match-any"
          >
            Any
          </Button>
          <Button
            variant={matchMode === "all" ? "default" : "ghost"}
            size="sm"
            onClick={() => setMatchMode("all")}
            className="rounded-r-pill rounded-l-none"
            data-testid="button-match-all"
          >
            All
          </Button>
        </div>
        
        {context === "products" && (
          <div className="flex items-center gap-2 px-2">
            <Checkbox
              id="include-vendor-values"
              checked={includeVendorValuesForProducts}
              onCheckedChange={(checked) => setIncludeVendorValuesForProducts(checked as boolean)}
              data-testid="checkbox-include-vendor-values"
            />
            <Label 
              htmlFor="include-vendor-values" 
              className="text-sm cursor-pointer"
            >
              Include vendor values
            </Label>
          </div>
        )}
        
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clear}
            className="rounded-pill"
            data-testid="button-clear-filters"
          >
            <X className="w-4 h-4 mr-1" strokeWidth={1.75} />
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}
