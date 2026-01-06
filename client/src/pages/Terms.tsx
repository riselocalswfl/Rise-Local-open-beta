import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AppShell from "@/components/layout/AppShell";

export default function Terms() {
  return (
    <AppShell hideTabs>
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-40 bg-background border-b border-border">
          <div className="flex items-center gap-3 px-4 h-14">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => window.history.back()}
              data-testid="button-back"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="font-semibold text-foreground">Terms of Service</h1>
          </div>
        </header>

        <div className="p-4 max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Terms of Service</CardTitle>
              <p className="text-sm text-muted-foreground">Last updated: January 2025</p>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none space-y-6">
              <section>
                <h3 className="text-lg font-semibold mb-2">Acceptance of Terms</h3>
                <p className="text-muted-foreground">
                  By accessing or using Rise Local, you agree to be bound by these Terms of Service 
                  and our Privacy Policy. If you do not agree to these terms, please do not use our services.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-2">Rise Local Pass</h3>
                <p className="text-muted-foreground">
                  The Rise Local Pass is a subscription service that provides access to exclusive deals 
                  from participating local businesses. Subscription fees are billed in advance on a 
                  monthly or annual basis. You may cancel your subscription at any time through your 
                  account settings or by contacting support.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-2">Deal Redemption</h3>
                <p className="text-muted-foreground">
                  Deals are subject to availability and may have specific terms, expiration dates, or 
                  usage limits. Rise Local is not responsible for the quality or fulfillment of goods 
                  or services provided by participating businesses.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-2">User Accounts</h3>
                <p className="text-muted-foreground">
                  You are responsible for maintaining the confidentiality of your account credentials 
                  and for all activities that occur under your account. You must be at least 18 years 
                  old to create an account.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-2">Prohibited Conduct</h3>
                <p className="text-muted-foreground">
                  You agree not to misuse deals, create multiple accounts to circumvent limitations, 
                  or engage in any fraudulent activity. We reserve the right to suspend or terminate 
                  accounts that violate these terms.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-2">Changes to Terms</h3>
                <p className="text-muted-foreground">
                  We may modify these terms at any time. Continued use of Rise Local after changes 
                  constitutes acceptance of the modified terms.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-2">Contact</h3>
                <p className="text-muted-foreground">
                  For questions about these Terms of Service, contact us at:
                </p>
                <p className="text-muted-foreground">
                  Email: <a href="mailto:support@riselocal.com" className="text-primary hover:underline">support@riselocal.com</a>
                </p>
              </section>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
