import { Link, useLocation } from "wouter";
import { ArrowLeft, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DetailHeaderProps {
  title?: string;
  showBack?: boolean;
  backHref?: string;
}

export default function DetailHeader({ 
  title, 
  showBack = true, 
  backHref 
}: DetailHeaderProps) {
  const [, setLocation] = useLocation();

  const handleBack = () => {
    if (backHref) {
      setLocation(backHref);
    } else if (window.history.length > 1) {
      window.history.back();
    } else {
      setLocation("/");
    }
  };

  return (
    <header 
      className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border"
      data-testid="detail-header"
    >
      <div className="flex items-center justify-between h-14 px-4">
        <div className="flex items-center gap-2">
          {showBack && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBack}
              aria-label="Go back"
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          {title && (
            <h1 className="font-heading text-xl font-bold uppercase truncate" data-testid="text-page-title">
              {title}
            </h1>
          )}
        </div>
        
        <Link href="/">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Go to home"
            data-testid="button-home"
          >
            <Home className="h-5 w-5" />
          </Button>
        </Link>
      </div>
    </header>
  );
}
