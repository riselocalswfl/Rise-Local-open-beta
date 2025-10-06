import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";

export default function Signup() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [city, setCity] = useState("");
  const [role, setRole] = useState<"buyer" | "vendor">("buyer");

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    
    // todo: replace with real authentication
    console.log("Signup attempt:", { name, email, password, city, role });
    
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
              <RadioGroup value={role} onValueChange={(v) => setRole(v as any)}>
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
