import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { CategoryNode } from "@shared/categories";

interface CategoryFilterProps {
  categories: CategoryNode[];
  selectedCategories: string[];
  onChange: (categories: string[]) => void;
  title?: string;
}

export function CategoryFilter({
  categories,
  selectedCategories,
  onChange,
  title = "Categories",
}: CategoryFilterProps) {
  const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set());

  const toggleParent = (parentName: string) => {
    setExpandedParents((prev) => {
      const next = new Set(prev);
      if (next.has(parentName)) {
        next.delete(parentName);
      } else {
        next.add(parentName);
      }
      return next;
    });
  };

  const toggleCategory = (categoryName: string) => {
    if (selectedCategories.includes(categoryName)) {
      onChange(selectedCategories.filter((c) => c !== categoryName));
    } else {
      onChange([...selectedCategories, categoryName]);
    }
  };

  const isParentSelected = (group: CategoryNode): boolean => {
    return selectedCategories.includes(group.parent);
  };

  const isChildSelected = (childName: string): boolean => {
    return selectedCategories.includes(childName);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {categories.map((group) => (
          <div key={group.parent} className="space-y-1">
            {/* Parent Category */}
            <div className="flex items-start gap-2">
              <Checkbox
                id={`filter-${group.parent}`}
                checked={isParentSelected(group)}
                onCheckedChange={() => toggleCategory(group.parent)}
                data-testid={`checkbox-filter-${group.parent.toLowerCase().replace(/\s+/g, "-")}`}
              />
              <div className="flex-1 flex items-center justify-between">
                <label
                  htmlFor={`filter-${group.parent}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  {group.parent}
                </label>
                {group.children && group.children.length > 0 && (
                  <button
                    type="button"
                    onClick={() => toggleParent(group.parent)}
                    className="p-1 hover-elevate rounded-md"
                    data-testid={`button-toggle-${group.parent.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    {expandedParents.has(group.parent) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Child Categories */}
            {group.children && expandedParents.has(group.parent) && (
              <div className="ml-6 space-y-1 mt-1">
                {group.children.map((child) => (
                  <div key={child} className="flex items-center gap-2">
                    <Checkbox
                      id={`filter-${child}`}
                      checked={isChildSelected(child)}
                      onCheckedChange={() => toggleCategory(child)}
                      data-testid={`checkbox-filter-${child.toLowerCase().replace(/\s+/g, "-")}`}
                    />
                    <label
                      htmlFor={`filter-${child}`}
                      className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {child}
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {selectedCategories.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-sm text-primary hover:underline mt-4"
            data-testid="button-clear-filters"
          >
            Clear all filters
          </button>
        )}
      </CardContent>
    </Card>
  );
}
