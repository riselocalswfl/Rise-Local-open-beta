import { useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import AppShell from "@/components/layout/AppShell";

interface FaqItem {
  question: string;
  answer: string;
}

interface FaqSection {
  title: string;
  items: FaqItem[];
}

const FAQ_SECTIONS: FaqSection[] = [
  {
    title: "Deals & Redemption",
    items: [
      {
        question: "Are deals ever limited to \"first X users\" or \"while supplies last\"?",
        answer: "Yes. Any limits or availability restrictions will always be clearly stated on the deal."
      },
      {
        question: "What happens if a deal isn't honored?",
        answer: "If a deal is not honored due to misuse or error on the business side, members are guaranteed a refund for their Rise Local Pass."
      },
      {
        question: "Can I use screenshots to redeem a deal?",
        answer: "No. Deals must be redeemed live in the Rise Local app. Screenshots are not accepted."
      }
    ]
  },
  {
    title: "Membership Rules",
    items: [
      {
        question: "Is the Rise Local Pass tied to one account or device?",
        answer: "Your membership is tied to one account, but you can access it on any device by logging in."
      },
      {
        question: "Can businesses restrict deals to in-store only or exclude online use?",
        answer: "Yes. Any restrictions (such as in-store only, online only, or service-specific limits) will be clearly stated on the deal."
      },
      {
        question: "Do restaurant deals apply to dine-in or takeout?",
        answer: "It depends on the deal. Any dine-in or takeout restrictions will be clearly listed."
      }
    ]
  },
  {
    title: "Billing & Plans",
    items: [
      {
        question: "How am I billed?",
        answer: "All billing is handled securely through Stripe."
      },
      {
        question: "What membership plans are available?",
        answer: "Monthly: $4.99/month. Annual: $44.91/year (25% off the monthly price)."
      },
      {
        question: "Is there a discounted annual plan for locals or students?",
        answer: "Yes. Anyone who attended high school in Lee, Charlotte, or Collier County is eligible for 50% off the annual membership with valid documentation."
      }
    ]
  },
  {
    title: "Deals & Availability",
    items: [
      {
        question: "Do deals ever change or disappear?",
        answer: "Yes. Deals may rotate, expire, or change based on business participation."
      },
      {
        question: "Why do deals fluctuate?",
        answer: "Deal availability may fluctuate as new businesses are added and offers are refreshed over time."
      }
    ]
  },
  {
    title: "Trust & Transparency",
    items: [
      {
        question: "Who controls the deals?",
        answer: "Each business controls its own deal terms, availability, and redemption rules."
      },
      {
        question: "Does Rise Local take a cut of my purchase?",
        answer: "No. Businesses keep 100% of your purchase."
      }
    ]
  }
];

function AccordionItem({ 
  item, 
  isOpen, 
  onToggle,
  id 
}: { 
  item: FaqItem; 
  isOpen: boolean; 
  onToggle: () => void;
  id: string;
}) {
  return (
    <div className="border-b border-border last:border-b-0">
      <button
        className="w-full flex items-center justify-between py-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-sm"
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggle();
          }
        }}
        aria-expanded={isOpen}
        aria-controls={`${id}-content`}
        data-testid={`accordion-trigger-${id}`}
      >
        <span className="text-foreground text-sm font-medium pr-4">{item.question}</span>
        <ChevronDown 
          className={`w-5 h-5 text-muted-foreground flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      <div
        id={`${id}-content`}
        role="region"
        aria-labelledby={`${id}-trigger`}
        className={`overflow-hidden transition-all duration-200 ${isOpen ? 'max-h-96 pb-4' : 'max-h-0'}`}
      >
        <p className="text-muted-foreground text-sm leading-relaxed">{item.answer}</p>
      </div>
    </div>
  );
}

function FaqSectionCard({ section, sectionIndex }: { section: FaqSection; sectionIndex: number }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const handleToggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">{section.title}</CardTitle>
      </CardHeader>
      <Separator />
      <CardContent className="pt-2 pb-0">
        {section.items.map((item, itemIndex) => (
          <AccordionItem
            key={itemIndex}
            item={item}
            isOpen={openIndex === itemIndex}
            onToggle={() => handleToggle(itemIndex)}
            id={`faq-${sectionIndex}-${itemIndex}`}
          />
        ))}
      </CardContent>
    </Card>
  );
}

export default function MembershipFaq() {
  return (
    <AppShell hideTabs>
      <div className="min-h-screen bg-background pb-20">
        <header className="sticky top-0 z-40 bg-background border-b border-border">
          <div className="flex items-center gap-3 px-4 h-14">
            <Link href="/membership">
              <button className="p-2 -ml-2" data-testid="button-back-faq">
                <ArrowLeft className="w-5 h-5 text-foreground" />
              </button>
            </Link>
            <h1 className="font-semibold text-foreground">Rise Local Pass FAQ</h1>
          </div>
        </header>

        <div className="p-4 max-w-[680px] mx-auto">
          <div className="text-center py-6 mb-2">
            <h2 className="text-xl font-bold text-foreground mb-2" data-testid="heading-faq">
              Rise Local Pass FAQ
            </h2>
            <p className="text-muted-foreground text-sm">
              Quick answers about membership, deals, and redemption.
            </p>
          </div>

          {FAQ_SECTIONS.map((section, sectionIndex) => (
            <FaqSectionCard 
              key={sectionIndex} 
              section={section} 
              sectionIndex={sectionIndex}
            />
          ))}
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border">
          <div className="max-w-[680px] mx-auto">
            <Link href="/membership">
              <Button className="w-full" size="lg" data-testid="button-view-pass-options">
                View Pass Options
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
