import { useState, KeyboardEvent } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  maxTags?: number;
  testId?: string;
}

export function TagInput({ 
  tags, 
  onChange, 
  placeholder = "Add a tag...",
  maxTags = 10,
  testId = "input-tags"
}: TagInputProps) {
  const [inputValue, setInputValue] = useState("");

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim()) {
      e.preventDefault();
      addTag(inputValue.trim());
    }
  };

  const addTag = (tag: string) => {
    const normalizedTag = tag.toLowerCase().trim();
    
    if (!normalizedTag) return;
    if (tags.length >= maxTags) return;
    if (tags.some(t => t.toLowerCase() === normalizedTag)) return;
    
    onChange([...tags, normalizedTag]);
    setInputValue("");
  };

  const removeTag = (tagToRemove: string) => {
    onChange(tags.filter(tag => tag !== tagToRemove));
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          data-testid={testId}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={tags.length >= maxTags}
        />
        <Button
          type="button"
          variant="outline"
          size="default"
          onClick={() => addTag(inputValue.trim())}
          disabled={!inputValue.trim() || tags.length >= maxTags}
          data-testid="button-add-tag"
        >
          Add
        </Button>
      </div>
      
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Badge 
              key={tag} 
              variant="secondary"
              className="gap-1 pl-3 pr-1"
              data-testid={`badge-tag-${tag}`}
            >
              {tag}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-4 w-4 p-0 hover:bg-transparent"
                onClick={() => removeTag(tag)}
                data-testid={`button-remove-tag-${tag}`}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>
      )}
      
      {tags.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {tags.length}/{maxTags} tags
        </p>
      )}
    </div>
  );
}
