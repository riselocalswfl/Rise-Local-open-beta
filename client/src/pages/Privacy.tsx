import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AppShell from "@/components/layout/AppShell";

export default function Privacy() {
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
            <h1 className="font-semibold text-foreground">Privacy Policy</h1>
          </div>
        </header>

        <div className="p-4 max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Privacy Policy</CardTitle>
              <p className="text-sm text-muted-foreground">Last updated: January 2025</p>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none space-y-6">
              <section>
                <h3 className="text-lg font-semibold mb-2">Information We Collect</h3>
                <p className="text-muted-foreground">
                  Rise Local collects information you provide directly to us, such as when you create 
                  an account, make a purchase, redeem a deal, or contact us for support. This includes 
                  your name, email address, phone number, and transaction history.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-2">How We Use Your Information</h3>
                <p className="text-muted-foreground">
                  We use the information we collect to provide, maintain, and improve our services, 
                  process transactions, send you notifications about deals and offers, and respond 
                  to your requests and inquiries.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-2">Information Sharing</h3>
                <p className="text-muted-foreground">
                  We do not sell your personal information. We may share information with vendors 
                  when you redeem deals, with service providers who assist in our operations, and 
                  when required by law.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-2">Data Security</h3>
                <p className="text-muted-foreground">
                  We implement appropriate security measures to protect your personal information. 
                  However, no method of transmission over the internet is 100% secure.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-2">Your Rights</h3>
                <p className="text-muted-foreground">
                  You may access, update, or delete your account information at any time. To request 
                  deletion of your account, please contact us at support@riselocal.com.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-2">Contact Us</h3>
                <p className="text-muted-foreground">
                  If you have questions about this Privacy Policy, please contact us at:
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
