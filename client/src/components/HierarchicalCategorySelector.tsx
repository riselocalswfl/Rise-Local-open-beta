import { useState } from "react";
import { ChevronDown, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import type { CategoryGroup } from "@shared/categories";

interface HierarchicalCategorySelectorProps {
  categories: CategoryGroup[];
  selectedCategories: string[];
  onChange: (categories: string[]) => void;
  label?: string;
  required?: boolean;
}

export function HierarchicalCategorySelector({
  categories,
  selectedCategories,
  onChange,
  label = "Categories",
  required = false,
}: HierarchicalCategorySelectorProps) {
  const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set());

  const toggleParent = (parent: string) => {
    const newExpanded = new Set(expandedParents);
    if (newExpanded.has(parent)) {
      newExpanded.delete(parent);
    } else {
      newExpanded.add(parent);
    }
    setExpandedParents(newExpanded);
  };

  const toggleCategory = (category: string) => {
    const newCategories = selectedCategories.includes(category)
      ? selectedCategories.filter((c) => c !== category)
      : [...selectedCategories, category];
    onChange(newCategories);
  };

  const removeCategory = (category: string) => {
    onChange(selectedCategories.filter((c) => c !== category));
  };

  const isParentSelected = (group: CategoryGroup): boolean => {
    return group.children.some((child) => selectedCategories.includes(child));
  };

  const getSelectedChildCount = (group: CategoryGroup): number => {
    return group.children.filter((child) => selectedCategories.includes(child)).length;
  };

  return (
    <div className="space-y-3" data-testid="hierarchical-category-selector">
      <Label>
        {label} {required && <span className="text-red-500">*</span>}
      </Label>

      {/* Selected Categories Badges */}
      {selectedCategories.length > 0 && (
        <div className="flex flex-wrap gap-2 p-3 bg-muted/30 rounded-md" data-testid="selected-categories">
          {selectedCategories.map((category) => (
            <Badge
              key={category}
              variant="secondary"
              className="gap-1 pr-1"
              data-testid={`badge-category-${category.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
            >
              {category}
              <button
                type="button"
                onClick={() => removeCategory(category)}
                className="ml-1 hover:bg-muted-foreground/20 rounded-sm p-0.5"
                data-testid={`button-remove-category-${category.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Category Tree */}
      <div className="border rounded-md divide-y">
        {categories.map((group) => (
          <div key={group.parent} className="p-3">
            {/* Parent Category Header */}
            <button
              type="button"
              onClick={() => toggleParent(group.parent)}
              className="flex items-center justify-between w-full text-left hover-elevate active-elevate-2 p-2 rounded-md"
              data-testid={`button-toggle-parent-${group.parent.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
            >
              <div className="flex items-center gap-2">
                {expandedParents.has(group.parent) ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="font-medium">{group.parent}</span>
                {isParentSelected(group) && (
                  <Badge variant="secondary" className="text-xs">
                    {getSelectedChildCount(group)} selected
                  </Badge>
                )}
              </div>
            </button>

            {/* Child Categories */}
            {expandedParents.has(group.parent) && (
              <div className="ml-6 mt-2 space-y-2">
                {group.children.map((child) => (
                  <div
                    key={child}
                    className="flex items-center space-x-2"
                    data-testid={`category-option-${child.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                  >
                    <Checkbox
                      id={`category-${child}`}
                      checked={selectedCategories.includes(child)}
                      onCheckedChange={() => toggleCategory(child)}
                      data-testid={`checkbox-category-${child.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                    />
                    <Label
                      htmlFor={`category-${child}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {child}
                    </Label>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Helper Text */}
      <p className="text-sm text-muted-foreground">
        Select all categories that apply. Click parent categories to expand and view options.
      </p>
    </div>
  );
}
