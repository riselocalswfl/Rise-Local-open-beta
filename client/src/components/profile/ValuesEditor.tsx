import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { TagInput } from "@/components/TagInput";
import { Badge } from "@/components/ui/badge";
import { Leaf } from "lucide-react";

interface ValuesEditorProps {
  showLocalSourcing: boolean;
  localSourcingPercent: number;
  values: string[];
  onShowLocalSourcingChange: (show: boolean) => void;
  onLocalSourcingPercentChange: (percent: number) => void;
  onValuesChange: (values: string[]) => void;
  disabled?: boolean;
}

export function ValuesEditor({
  showLocalSourcing,
  localSourcingPercent,
  values,
  onShowLocalSourcingChange,
  onLocalSourcingPercentChange,
  onValuesChange,
  disabled,
}: ValuesEditorProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div className="flex-1">
            <Label htmlFor="showLocalSourcing" className="text-sm font-medium">Show local sourcing</Label>
            <p className="text-xs text-muted-foreground">Display percentage on public profile</p>
          </div>
          <Switch
            id="showLocalSourcing"
            checked={showLocalSourcing}
            onCheckedChange={onShowLocalSourcingChange}
            disabled={disabled}
            data-testid="switch-show-local-sourcing"
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm">Local sourcing</Label>
            <span className="text-sm font-medium text-primary">{localSourcingPercent}%</span>
          </div>
          <Slider
            min={0}
            max={100}
            step={5}
            value={[localSourcingPercent]}
            onValueChange={([val]) => onLocalSourcingPercentChange(val)}
            disabled={disabled}
            data-testid="slider-local-sourcing"
          />
          <p className="text-xs text-muted-foreground">
            Percentage of products/ingredients sourced locally
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <Label className="text-sm">Value tags</Label>
        <TagInput
          tags={values}
          onChange={onValuesChange}
          placeholder="Add tags (e.g., organic, sustainable)"
        />
        <p className="text-xs text-muted-foreground">
          Press Enter to add a tag. These appear on your public profile.
        </p>
      </div>
    </div>
  );
}

interface ValuesDisplayProps {
  showLocalSourcing: boolean;
  localSourcingPercent: number;
  values: string[];
}

export function ValuesDisplay({ showLocalSourcing, localSourcingPercent, values }: ValuesDisplayProps) {
  const hasContent = (showLocalSourcing && localSourcingPercent > 0) || values.length > 0;
  
  if (!hasContent) return null;

  return (
    <div className="space-y-3">
      {showLocalSourcing && localSourcingPercent > 0 && (
        <div className="flex items-center gap-2 text-sm">
          <Leaf className="w-4 h-4 text-primary" />
          <span>{localSourcingPercent}% locally sourced</span>
        </div>
      )}
      
      {values.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {values.map((tag, i) => (
            <Badge key={i} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
