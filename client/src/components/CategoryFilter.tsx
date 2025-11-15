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

  const isParentSelected = (parent: CategoryNode): boolean => {
    return selectedCategories.includes(parent.name);
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
        {categories.map((parent) => (
          <div key={parent.name} className="space-y-1">
            {/* Parent Category */}
            <div className="flex items-start gap-2">
              <Checkbox
                id={`filter-${parent.name}`}
                checked={isParentSelected(parent)}
                onCheckedChange={() => toggleCategory(parent.name)}
                data-testid={`checkbox-filter-${parent.name.toLowerCase().replace(/\s+/g, "-")}`}
              />
              <div className="flex-1 flex items-center justify-between">
                <label
                  htmlFor={`filter-${parent.name}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  {parent.name}
                </label>
                {parent.children && parent.children.length > 0 && (
                  <button
                    type="button"
                    onClick={() => toggleParent(parent.name)}
                    className="p-1 hover-elevate rounded-md"
                    data-testid={`button-toggle-${parent.name.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    {expandedParents.has(parent.name) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Child Categories */}
            {parent.children && expandedParents.has(parent.name) && (
              <div className="ml-6 space-y-1 mt-1">
                {parent.children.map((child) => (
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
