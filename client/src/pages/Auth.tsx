import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import BrandLogo from "@/components/BrandLogo";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Eye, EyeOff, Store, User, ArrowLeft, Mail, Lock, Phone, MapPin, Check, AlertCircle } from "lucide-react";
import heroImage from "@assets/ChatGPT_Image_Dec_17,_2025,_03_54_36_PM_1766004883576.png";

type AuthMode = "choose" | "user-signup" | "user-login" | "business-signup" | "business-login";

const userSignupSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Za-z]/, "Must contain at least one letter")
    .regex(/[0-9]/, "Must contain at least one number"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().optional(),
  zipCode: z.string().optional(),
});

const businessSignupSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Za-z]/, "Must contain at least one letter")
    .regex(/[0-9]/, "Must contain at least one number"),
  firstName: z.string().min(1, "Your name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().optional(),
  businessName: z.string().min(1, "Business name is required"),
  businessType: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email"),
});

type UserSignupForm = z.infer<typeof userSignupSchema>;
type BusinessSignupForm = z.infer<typeof businessSignupSchema>;
type LoginForm = z.infer<typeof loginSchema>;
type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

function PasswordStrengthIndicator({ password }: { password: string }) {
  const checks = [
    { label: "8+ characters", passed: password.length >= 8 },
    { label: "Contains letter", passed: /[A-Za-z]/.test(password) },
    { label: "Contains number", passed: /[0-9]/.test(password) },
  ];
  
  const passedCount = checks.filter(c => c.passed).length;
  const strength = passedCount === 3 ? "strong" : passedCount >= 2 ? "medium" : "weak";
  
  return (
    <div className="space-y-2 mt-2">
      <div className="flex gap-1">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i <= passedCount
                ? strength === "strong" ? "bg-green-500"
                : strength === "medium" ? "bg-yellow-500"
                : "bg-red-400"
                : "bg-muted"
            }`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {checks.map((check) => (
          <span
            key={check.label}
            className={`text-xs flex items-center gap-1 ${
              check.passed ? "text-green-600" : "text-muted-foreground"
            }`}
          >
            {check.passed ? <Check className="h-3 w-3" /> : <span className="h-3 w-3" />}
            {check.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function PasswordInput({ 
  field, 
  placeholder = "Enter your password",
  showStrength = false 
}: { 
  field: any; 
  placeholder?: string;
  showStrength?: boolean;
}) {
  const [showPassword, setShowPassword] = useState(false);
  
  return (
    <div className="space-y-1">
      <div className="relative">
        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          {...field}
          type={showPassword ? "text" : "password"}
          placeholder={placeholder}
          className="pl-10 pr-10 h-12 text-base"
          data-testid="input-password"
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          data-testid="button-toggle-password"
        >
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {showStrength && field.value && (
        <PasswordStrengthIndicator password={field.value} />
      )}
    </div>
  );
}

export default function Auth() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [mode, setMode] = useState<AuthMode>("choose");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!isLoading && user) {
      setLocation("/start");
    }
  }, [user, isLoading, setLocation]);

  const userSignupForm = useForm<UserSignupForm>({
    resolver: zodResolver(userSignupSchema),
    defaultValues: { email: "", password: "", firstName: "", lastName: "", phone: "", zipCode: "" },
  });

  const businessSignupForm = useForm<BusinessSignupForm>({
    resolver: zodResolver(businessSignupSchema),
    defaultValues: { email: "", password: "", firstName: "", lastName: "", phone: "", businessName: "", businessType: "" },
  });

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const businessLoginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const forgotPasswordForm = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const registerUserMutation = useMutation({
    mutationFn: async (data: UserSignupForm) => {
      const response = await apiRequest("POST", "/api/auth/register/user", { ...data, accountType: "user" });
      return response.json();
    },
    onSuccess: (data) => {
      localStorage.setItem("auth_token", data.token);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: "Account created!", description: "Please check your email to verify your account." });
      setLocation("/start");
    },
    onError: (error: any) => {
      toast({ title: "Sign up failed", description: error.message || "Please try again", variant: "destructive" });
    },
  });

  const registerBusinessMutation = useMutation({
    mutationFn: async (data: BusinessSignupForm) => {
      const response = await apiRequest("POST", "/api/auth/register/business", { ...data, accountType: "business" });
      return response.json();
    },
    onSuccess: (data) => {
      localStorage.setItem("auth_token", data.token);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: "Business account created!", description: "Let's set up your business profile." });
      setLocation("/onboarding");
    },
    onError: (error: any) => {
      toast({ title: "Sign up failed", description: error.message || "Please try again", variant: "destructive" });
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginForm) => {
      const response = await apiRequest("POST", "/api/auth/login", data);
      return response.json();
    },
    onSuccess: (data) => {
      localStorage.setItem("auth_token", data.token);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: "Welcome back!" });
      setLocation("/start");
    },
    onError: (error: any) => {
      toast({ title: "Login failed", description: error.message || "Invalid email or password", variant: "destructive" });
    },
  });

  const forgotPasswordMutation = useMutation({
    mutationFn: async (data: ForgotPasswordForm) => {
      const response = await apiRequest("POST", "/api/auth/forgot-password", data);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Check your email", description: "If an account exists, we've sent reset instructions." });
      setShowForgotPassword(false);
    },
    onError: () => {
      toast({ title: "Check your email", description: "If an account exists, we've sent reset instructions." });
      setShowForgotPassword(false);
    },
  });

  const handleLegacyLogin = () => {
    window.location.href = "/api/login";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (mode === "choose") {
    return (
      <div className="min-h-screen flex flex-col">
        <div 
          className="relative flex-1 flex flex-col"
          style={{
            backgroundImage: `url(${heroImage})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/70" />
          
          <header className="relative z-10 px-4 py-3">
            <BrandLogo size="sm" />
          </header>

          <main className="relative z-10 flex-1 flex flex-col justify-end px-6 pb-12 pt-8">
            <div className="max-w-md mx-auto w-full text-center space-y-6">
              <div className="space-y-2">
                <h1 
                  className="text-3xl md:text-4xl font-bold text-white leading-tight drop-shadow-lg"
                  data-testid="heading-auth-hero"
                >
                  Shop local. Sell local.
                </h1>
                <p className="text-lg text-white/90 drop-shadow" data-testid="text-auth-subheadline">
                  Deals from SWFL businesses
                </p>
              </div>

              <div className="space-y-3 pt-4">
                <Button 
                  size="lg"
                  className="w-full h-14 text-lg font-semibold bg-white text-foreground hover:bg-white/90"
                  onClick={() => setMode("user-signup")}
                  data-testid="button-for-users"
                >
                  <User className="mr-2 h-5 w-5" />
                  For Users
                </Button>
                
                <Button 
                  size="lg"
                  variant="outline"
                  className="w-full h-14 text-lg font-semibold border-2 border-white text-white bg-white/10 backdrop-blur-sm hover:bg-white/20"
                  onClick={() => setMode("business-signup")}
                  data-testid="button-for-businesses"
                >
                  <Store className="mr-2 h-5 w-5" />
                  For Businesses
                </Button>
              </div>

              <div className="pt-6">
                <p className="text-sm text-white/80">
                  Already have an account?{" "}
                  <button
                    onClick={() => setMode("user-login")}
                    className="text-white font-semibold underline underline-offset-2 hover:text-white/90"
                    data-testid="button-sign-in"
                  >
                    Sign in
                  </button>
                </p>
              </div>

              <div className="flex justify-center gap-4 pt-4">
                <Link href="/privacy">
                  <span className="text-xs text-white/60 hover:text-white/90 underline" data-testid="link-privacy">
                    Privacy Policy
                  </span>
                </Link>
                <Link href="/terms">
                  <span className="text-xs text-white/60 hover:text-white/90 underline" data-testid="link-terms">
                    Terms of Service
                  </span>
                </Link>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <header className="px-4 py-3 flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMode("choose")}
          data-testid="button-back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <BrandLogo size="sm" />
      </header>

      <main className="px-4 pb-8 max-w-md mx-auto">
        {showForgotPassword ? (
          <Card className="mt-8">
            <CardHeader className="text-center">
              <CardTitle>Reset Password</CardTitle>
              <CardDescription>
                Enter your email and we'll send you reset instructions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...forgotPasswordForm}>
                <form onSubmit={forgotPasswordForm.handleSubmit((data) => forgotPasswordMutation.mutate(data))} className="space-y-4">
                  <FormField
                    control={forgotPasswordForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input {...field} type="email" placeholder="you@example.com" className="pl-10 h-12 text-base" data-testid="input-forgot-email" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full h-12" disabled={forgotPasswordMutation.isPending} data-testid="button-send-reset">
                    {forgotPasswordMutation.isPending ? "Sending..." : "Send Reset Link"}
                  </Button>
                  <Button type="button" variant="ghost" className="w-full" onClick={() => setShowForgotPassword(false)} data-testid="button-back-to-login">
                    Back to login
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        ) : mode === "user-signup" ? (
          <Card className="mt-4">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                <User className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Create Your Account</CardTitle>
              <CardDescription>
                Start discovering local deals in SWFL
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...userSignupForm}>
                <form onSubmit={userSignupForm.handleSubmit((data) => registerUserMutation.mutate(data))} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={userSignupForm.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="John" className="h-12 text-base" data-testid="input-first-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={userSignupForm.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Doe" className="h-12 text-base" data-testid="input-last-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={userSignupForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input {...field} type="email" placeholder="you@example.com" className="pl-10 h-12 text-base" data-testid="input-email" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={userSignupForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <PasswordInput field={field} placeholder="Create a password" showStrength />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={userSignupForm.control}
                    name="zipCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ZIP Code (for local recommendations)</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input {...field} placeholder="33901" className="pl-10 h-12 text-base" data-testid="input-zip" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full h-12 text-base font-semibold" disabled={registerUserMutation.isPending} data-testid="button-create-account">
                    {registerUserMutation.isPending ? "Creating Account..." : "Create Account"}
                  </Button>
                </form>
              </Form>

              <div className="mt-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <button onClick={() => setMode("user-login")} className="text-primary font-semibold hover:underline" data-testid="link-to-login">
                    Sign in
                  </button>
                </p>
              </div>

              <div className="mt-4 pt-4 border-t text-center">
                <button onClick={handleLegacyLogin} className="text-xs text-muted-foreground hover:text-foreground underline" data-testid="link-social-login">
                  Sign in with Replit Account
                </button>
              </div>
            </CardContent>
          </Card>
        ) : mode === "user-login" ? (
          <Card className="mt-8">
            <CardHeader className="text-center pb-4">
              <CardTitle>Welcome Back</CardTitle>
              <CardDescription>Sign in to your account</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="user" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="user" data-testid="tab-user-login">User</TabsTrigger>
                  <TabsTrigger value="business" onClick={() => setMode("business-login")} data-testid="tab-business-login">Business</TabsTrigger>
                </TabsList>
                <TabsContent value="user">
                  <Form {...loginForm}>
                    <form onSubmit={loginForm.handleSubmit((data) => loginMutation.mutate(data))} className="space-y-4">
                      <FormField
                        control={loginForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input {...field} type="email" placeholder="you@example.com" className="pl-10 h-12 text-base" data-testid="input-login-email" />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={loginForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex justify-between items-center">
                              <FormLabel>Password</FormLabel>
                              <button type="button" onClick={() => setShowForgotPassword(true)} className="text-xs text-primary hover:underline" data-testid="link-forgot-password">
                                Forgot password?
                              </button>
                            </div>
                            <FormControl>
                              <PasswordInput field={field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" className="w-full h-12 text-base font-semibold" disabled={loginMutation.isPending} data-testid="button-login">
                        {loginMutation.isPending ? "Signing in..." : "Sign In"}
                      </Button>
                    </form>
                  </Form>
                </TabsContent>
              </Tabs>

              <div className="mt-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Don't have an account?{" "}
                  <button onClick={() => setMode("user-signup")} className="text-primary font-semibold hover:underline" data-testid="link-to-signup">
                    Sign up
                  </button>
                </p>
              </div>

              <div className="mt-4 pt-4 border-t text-center">
                <button onClick={handleLegacyLogin} className="text-xs text-muted-foreground hover:text-foreground underline" data-testid="link-replit-login">
                  Sign in with Replit Account
                </button>
              </div>
            </CardContent>
          </Card>
        ) : mode === "business-signup" ? (
          <Card className="mt-4">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                <Store className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>List Your Business</CardTitle>
              <CardDescription>
                Reach local customers with exclusive deals
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...businessSignupForm}>
                <form onSubmit={businessSignupForm.handleSubmit((data) => registerBusinessMutation.mutate(data))} className="space-y-4">
                  <FormField
                    control={businessSignupForm.control}
                    name="businessName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Business Name</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Store className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input {...field} placeholder="Your Business Name" className="pl-10 h-12 text-base" data-testid="input-business-name" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={businessSignupForm.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Your First Name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="John" className="h-12 text-base" data-testid="input-biz-first-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={businessSignupForm.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Doe" className="h-12 text-base" data-testid="input-biz-last-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={businessSignupForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Business Email</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input {...field} type="email" placeholder="you@business.com" className="pl-10 h-12 text-base" data-testid="input-biz-email" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={businessSignupForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone (optional)</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input {...field} type="tel" placeholder="(239) 555-0123" className="pl-10 h-12 text-base" data-testid="input-biz-phone" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={businessSignupForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <PasswordInput field={field} placeholder="Create a password" showStrength />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full h-12 text-base font-semibold" disabled={registerBusinessMutation.isPending} data-testid="button-create-business">
                    {registerBusinessMutation.isPending ? "Creating Account..." : "Create Business Account"}
                  </Button>
                </form>
              </Form>

              <div className="mt-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Already have a business account?{" "}
                  <button onClick={() => setMode("business-login")} className="text-primary font-semibold hover:underline" data-testid="link-to-biz-login">
                    Sign in
                  </button>
                </p>
              </div>

              <div className="mt-4 pt-4 border-t text-center">
                <button onClick={handleLegacyLogin} className="text-xs text-muted-foreground hover:text-foreground underline">
                  Sign in with Replit Account
                </button>
              </div>
            </CardContent>
          </Card>
        ) : mode === "business-login" ? (
          <Card className="mt-8">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                <Store className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Business Sign In</CardTitle>
              <CardDescription>Access your business dashboard</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...businessLoginForm}>
                <form onSubmit={businessLoginForm.handleSubmit((data) => loginMutation.mutate(data))} className="space-y-4">
                  <FormField
                    control={businessLoginForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Business Email</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input {...field} type="email" placeholder="you@business.com" className="pl-10 h-12 text-base" data-testid="input-biz-login-email" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={businessLoginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex justify-between items-center">
                          <FormLabel>Password</FormLabel>
                          <button type="button" onClick={() => setShowForgotPassword(true)} className="text-xs text-primary hover:underline" data-testid="link-biz-forgot-password">
                            Forgot password?
                          </button>
                        </div>
                        <FormControl>
                          <PasswordInput field={field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full h-12 text-base font-semibold" disabled={loginMutation.isPending} data-testid="button-biz-login">
                    {loginMutation.isPending ? "Signing in..." : "Sign In"}
                  </Button>
                </form>
              </Form>

              <div className="mt-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Don't have a business account?{" "}
                  <button onClick={() => setMode("business-signup")} className="text-primary font-semibold hover:underline" data-testid="link-to-biz-signup">
                    Sign up
                  </button>
                </p>
              </div>

              <div className="mt-4 text-center">
                <button onClick={() => setMode("user-login")} className="text-sm text-muted-foreground hover:text-foreground" data-testid="link-user-login">
                  Looking for user login?
                </button>
              </div>

              <div className="mt-4 pt-4 border-t text-center">
                <button onClick={handleLegacyLogin} className="text-xs text-muted-foreground hover:text-foreground underline">
                  Sign in with Replit Account
                </button>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </main>
    </div>
  );
}
