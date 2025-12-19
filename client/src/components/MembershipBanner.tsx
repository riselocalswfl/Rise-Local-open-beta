import { Link } from "wouter";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MembershipBannerProps {
  isMember?: boolean;
}

export default function MembershipBanner({ isMember = false }: MembershipBannerProps) {
  if (isMember) return null;

  return (
    <div className="mx-4 my-6 p-4 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground text-sm mb-1">
            Rise Local Pass
          </h3>
          <p className="text-xs text-muted-foreground mb-3">
            Exclusive local deals for one low monthly price
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href="/membership">
              <Button size="sm" data-testid="button-join-membership">
                Unlock for $4.99/mo
              </Button>
            </Link>
            <Link href="/membership#benefits">
              <Button variant="ghost" size="sm" data-testid="link-see-benefits">
                See what's included
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
