import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { VALUE_META, VALUE_CATEGORIES, type ValueTag } from "@/../../shared/values";
import { Sprout, Users, Apple, Package } from "lucide-react";

interface ValueTagSelectorProps {
  selectedValues: ValueTag[];
  onChange: (values: ValueTag[]) => void;
  label?: string;
  description?: string;
}

export default function ValueTagSelector({ 
  selectedValues, 
  onChange,
  label = "Business Values",
  description = "Select the values that best represent your business"
}: ValueTagSelectorProps) {
  const handleToggle = (tag: ValueTag) => {
    if (selectedValues.includes(tag)) {
      onChange(selectedValues.filter(v => v !== tag));
    } else {
      onChange([...selectedValues, tag]);
    }
  };

  const categoryIcons = {
    environmental: Sprout,
    social: Users,
    dietary: Apple,
    quality: Package
  };

  const categoryLabels = {
    environmental: "Environmental & Sustainability",
    social: "Social & Identity",
    dietary: "Health & Diet",
    quality: "Craft & Quality"
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-base font-semibold">{label}</Label>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Object.entries(VALUE_CATEGORIES).map(([categoryKey, tags]) => {
          const Icon = categoryIcons[categoryKey as keyof typeof categoryIcons];
          const categoryLabel = categoryLabels[categoryKey as keyof typeof categoryLabels];
          
          return (
            <div key={categoryKey} className="space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b">
                <Icon className="w-4 h-4 text-primary" strokeWidth={1.75} />
                <h3 className="text-sm font-semibold">{categoryLabel}</h3>
              </div>
              
              <div className="space-y-2">
                {tags.map((tag) => (
                  <div key={tag} className="flex items-start gap-2">
                    <Checkbox
                      id={`value-${tag}`}
                      checked={selectedValues.includes(tag)}
                      onCheckedChange={() => handleToggle(tag)}
                      data-testid={`checkbox-value-${tag}`}
                    />
                    <div className="flex-1">
                      <Label 
                        htmlFor={`value-${tag}`}
                        className="text-sm font-medium cursor-pointer"
                      >
                        {VALUE_META[tag].label}
                      </Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {VALUE_META[tag].description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
