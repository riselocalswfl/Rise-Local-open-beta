import { Button } from "@/components/ui/button";
import { Save, Eye, Loader2, Check } from "lucide-react";
import { Link } from "wouter";

interface StickyActionBarProps {
  vendorId: string;
  isDirty: boolean;
  isSaving: boolean;
  showSaved: boolean;
  onSave: () => void;
}

export function StickyActionBar({ vendorId, isDirty, isSaving, showSaved, onSave }: StickyActionBarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-3 md:hidden z-50 safe-area-inset-bottom">
      <div className="flex gap-3 max-w-lg mx-auto">
        <Link href={`/businesses/${vendorId}`} className="flex-1">
          <Button variant="outline" className="w-full" data-testid="button-preview-profile">
            <Eye className="w-4 h-4 mr-2" />
            Preview
          </Button>
        </Link>
        <Button 
          className="flex-1" 
          onClick={onSave}
          disabled={!isDirty && !showSaved}
          data-testid="button-save-changes"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : showSaved ? (
            <>
              <Check className="w-4 h-4 mr-2" />
              Saved
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
