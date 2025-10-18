import { Badge } from "@/components/ui/badge";
import { Tag } from "lucide-react";
import { VALUE_META, type ValueTag } from "@/../../shared/values";

interface ValueFilterProps {
  availableValues: ValueTag[];
  selectedValues: ValueTag[];
  onValueToggle: (value: ValueTag) => void;
}

export default function ValueFilter({ 
  availableValues, 
  selectedValues, 
  onValueToggle 
}: ValueFilterProps) {
  if (availableValues.length === 0) {
    return null;
  }

  return (
    <div className="bg-muted/30 rounded-md p-4">
      <div className="flex items-center gap-2 mb-3">
        <Tag className="w-4 h-4 text-muted-foreground" strokeWidth={1.75} />
        <h3 className="text-sm font-semibold">Filter by Values</h3>
      </div>
      <div className="flex flex-wrap gap-2">
        {availableValues.map((value) => {
          const isSelected = selectedValues.includes(value);
          const meta = VALUE_META[value];
          
          return (
            <Badge
              key={value}
              variant={isSelected ? "default" : "outline"}
              className="cursor-pointer hover-elevate active-elevate-2 rounded-pill"
              onClick={() => onValueToggle(value)}
              data-testid={`badge-filter-value-${value}`}
              title={meta?.description || value}
            >
              {meta?.label || value}
            </Badge>
          );
        })}
      </div>
    </div>
  );
}
