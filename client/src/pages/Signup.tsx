import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

const PAYMENT_OPTIONS = ["Cash", "Venmo", "PayPal", "Credit Card", "Zelle", "Check"];
const CATEGORY_OPTIONS = ["Food & Beverage", "Crafts & Art", "Home & Garden", "Fashion", "Health & Wellness"];

const BUSINESS_VALUES = {
  "Ownership & Identity": [
    "LGBTQ+ Owned/Friendly",
    "Women-Owned",
    "Minority-Owned",
    "Veteran-Owned",
    "Immigrant-Owned",
    "Disability-Owned",
    "Youth-Owned",
    "Senior-Owned",
  ],
  "Environmental & Sustainability": [
    "Eco-Friendly",
    "Zero Waste",
    "Carbon Neutral",
    "Organic",
    "Sustainable Sourcing",
    "Renewable Energy",
    "Plastic-Free",
    "Composting",
    "Water Conservation",
  ],
  "Economic & Labor": [
    "Fair Trade",
    "Living Wage Employer",
    "Local Sourcing",
    "Small Batch Production",
    "Worker-Owned Co-op",
    "Union Shop",
    "Profit-Sharing",
    "Employee Benefits",
  ],
  "Ethical & Animal Welfare": [
    "Cruelty-Free",
    "Vegan",
    "Vegetarian-Friendly",
    "Animal Welfare",
    "No Animal Testing",
    "Ethical Production",
    "Transparency",
  ],
  "Religious & Spiritual": [
    "Faith-Based",
    "Christian Values",
    "Jewish Values",
    "Islamic Values",
    "Buddhist Values",
    "Secular/Non-Religious",
    "Interfaith",
  ],
  "Community & Social": [
    "Community-Focused",
    "Charitable Giving",
    "Education-Focused",
    "Youth Programs",
    "Senior Support",
    "Volunteer-Driven",
    "Social Justice",
    "Equity & Inclusion",
  ],
  "Freedom & Rights": [
    "Free Speech Advocate",
    "Privacy-Focused",
    "Open Source",
    "Anti-Censorship",
    "Individual Liberty",
    "Digital Rights",
    "2nd Amendment",
  ],
  "Health & Wellness": [
    "Holistic Health",
    "Natural Ingredients",
    "GMO-Free",
    "Gluten-Free",
    "Allergen-Friendly",
    "Chemical-Free",
    "Wellness-Focused",
    "Mental Health Advocate",
  ],
  "Political & Governance": [
    "Progressive Values",
    "Conservative Values",
    "Libertarian Values",
    "Non-Partisan",
    "Grassroots Movement",
    "Decentralized",
    "Local Governance",
  ],
};

export default function Signup() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [city, setCity] = useState("");
  const [role, setRole] = useState<"buyer" | "vendor">("buyer");
  
  const [businessName, setBusinessName] = useState("");
  const [bio, setBio] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<string[]>([]);
  const [businessValues, setBusinessValues] = useState<string[]>([]);

  const toggleCategory = (category: string) => {
    setCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const togglePaymentMethod = (method: string) => {
    setPaymentMethods(prev => 
      prev.includes(method) 
        ? prev.filter(m => m !== method)
        : [...prev, method]
    );
  };

  const toggleBusinessValue = (value: string) => {
    setBusinessValues(prev => 
      prev.includes(value) 
        ? prev.filter(v => v !== value)
        : [...prev, value]
    );
  };

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (role === "vendor" && (!businessName || !bio || categories.length === 0 || paymentMethods.length === 0)) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required vendor fields.",
        variant: "destructive",
      });
      return;
    }
    
    // todo: replace with real authentication
    console.log("Signup attempt:", { 
      name, 
      email, 
      password, 
      city, 
      role,
      ...(role === "vendor" && { businessName, bio, categories, paymentMethods, businessValues })
    });
    
    toast({
      title: "Account Created!",
      description: role === "vendor" 
        ? "Your vendor account is pending verification."
        : "Welcome to Local Exchange!",
    });

    setLocation("/");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-primary rounded-md flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xl">LE</span>
            </div>
          </div>
          <CardTitle className="text-2xl text-center">Create Account</CardTitle>
          <CardDescription className="text-center">
            Join the Local Exchange community
          </CardDescription>
          {role === "vendor" && (
            <div className="bg-primary/10 border border-primary/20 rounded-md p-3 mt-4">
              <p className="text-sm text-center font-medium text-primary">
                First 25 vendors join FREE! Help us grow the Fort Myers community.
              </p>
            </div>
          )}
        </CardHeader>
        <form onSubmit={handleSignup}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                data-testid="input-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                data-testid="input-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                data-testid="input-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                placeholder="Fort Myers"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                required
                data-testid="input-city"
              />
            </div>
            <div className="space-y-2">
              <Label>Account Type</Label>
              <RadioGroup value={role} onValueChange={(v) => {
                const newRole = v as "buyer" | "vendor";
                setRole(newRole);
                if (newRole === "buyer") {
                  setBusinessName("");
                  setBio("");
                  setCategories([]);
                  setPaymentMethods([]);
                  setBusinessValues([]);
                }
              }}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="buyer" id="buyer" data-testid="radio-buyer" />
                  <Label htmlFor="buyer" className="cursor-pointer">
                    Buyer - Browse and purchase from local vendors
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="vendor" id="vendor" data-testid="radio-vendor" />
                  <Label htmlFor="vendor" className="cursor-pointer">
                    Vendor - Sell products and manage inventory
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {role === "vendor" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="businessName">Business Name</Label>
                  <Input
                    id="businessName"
                    placeholder="Your Business Name"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    required
                    data-testid="input-business-name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Business Description</Label>
                  <Textarea
                    id="bio"
                    placeholder="Tell customers about your business..."
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    required
                    className="resize-none"
                    rows={3}
                    data-testid="input-bio"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Categories</Label>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORY_OPTIONS.map(category => (
                      <Badge
                        key={category}
                        variant={categories.includes(category) ? "default" : "outline"}
                        className="cursor-pointer hover-elevate"
                        onClick={() => toggleCategory(category)}
                        data-testid={`badge-category-${category.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        {category}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Payment Methods Accepted</Label>
                  <div className="space-y-2">
                    {PAYMENT_OPTIONS.map(method => (
                      <div key={method} className="flex items-center space-x-2">
                        <Checkbox
                          id={method}
                          checked={paymentMethods.includes(method)}
                          onCheckedChange={() => togglePaymentMethod(method)}
                          data-testid={`checkbox-payment-${method.toLowerCase().replace(/\s+/g, '-')}`}
                        />
                        <Label htmlFor={method} className="cursor-pointer">
                          {method}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="space-y-1">
                    <Label>Business Values (Optional)</Label>
                    <p className="text-sm text-muted-foreground">
                      Help customers shop according to their values
                    </p>
                  </div>
                  <div className="space-y-4 max-h-80 overflow-y-auto pr-2">
                    {Object.entries(BUSINESS_VALUES).map(([category, values]) => (
                      <div key={category} className="space-y-2">
                        <h4 className="text-sm font-medium text-foreground">{category}</h4>
                        <div className="flex flex-wrap gap-2">
                          {values.map(value => (
                            <Badge
                              key={value}
                              variant={businessValues.includes(value) ? "default" : "outline"}
                              className="cursor-pointer hover-elevate"
                              onClick={() => toggleBusinessValue(value)}
                              data-testid={`badge-value-${value.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                            >
                              {value}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" data-testid="button-signup">
              Create Account
            </Button>
            <div className="text-sm text-center text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="text-primary hover:underline" data-testid="link-login">
                Sign in
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
