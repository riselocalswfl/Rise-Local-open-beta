import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Filter } from "lucide-react";

type Props = {
  allValues: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  buttonClassName?: string;
};

export default function ValuesFilterDialog({ allValues, selected, onChange, buttonClassName }: Props) {
  const [open, setOpen] = useState(false);
  const [localSel, setLocalSel] = useState<string[]>(selected);

  useEffect(() => { 
    setLocalSel(selected); 
  }, [selected, open]);

  const toggle = (val: string) => {
    setLocalSel(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]);
  };

  const apply = () => {
    onChange(localSel);
    setOpen(false);
  };

  const clear = () => setLocalSel([]);

  const selCount = selected.length;

  if (allValues.length === 0) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          className={buttonClassName}
          data-testid="button-filter-values"
        >
          <Filter className="w-4 h-4 mr-2" strokeWidth={1.75} />
          Filter by Values
          {selCount > 0 && (
            <Badge variant="secondary" className="ml-2 px-2 py-0.5 text-xs">
              {selCount}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Filter by Values</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[60vh] overflow-auto pr-1">
          {allValues.map(v => (
            <label 
              key={v} 
              className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 cursor-pointer"
            >
              <Checkbox
                checked={localSel.includes(v)}
                onCheckedChange={() => toggle(v)}
                aria-label={v}
                data-testid={`checkbox-value-${v}`}
              />
              <span className="text-sm">{v}</span>
            </label>
          ))}
        </div>

        <DialogFooter className="justify-between sm:justify-end gap-2">
          <Button 
            type="button" 
            variant="ghost" 
            onClick={clear}
            data-testid="button-clear-filters"
          >
            Clear
          </Button>
          <div className="flex gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setOpen(false)}
              data-testid="button-cancel-filters"
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              onClick={apply}
              data-testid="button-apply-filters"
            >
              Apply
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
