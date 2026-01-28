import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Eye, EyeOff, Mail, Lock, User, Store, Check, ArrowLeft, Loader2 } from "lucide-react";

type AuthView = "login" | "signup" | "forgot-password" | "account-type";

interface AuthModalProps {
  defaultView?: AuthView;
  onSuccess?: () => void;
  onNavigate?: (path: string) => void;
}

const signupSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Za-z]/, "Must contain at least one letter")
    .regex(/[0-9]/, "Must contain at least one number"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  zipCode: z.string().optional(),
  businessName: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email"),
});

type SignupForm = z.infer<typeof signupSchema>;
type LoginForm = z.infer<typeof loginSchema>;
type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

function PasswordStrengthIndicator({ password }: { password: string }) {
  const checks = [
    { label: "8+ chars", passed: password.length >= 8 },
    { label: "Letter", passed: /[A-Za-z]/.test(password) },
    { label: "Number", passed: /[0-9]/.test(password) },
  ];
  
  const passedCount = checks.filter(c => c.passed).length;
  const strength = passedCount === 3 ? "strong" : passedCount >= 2 ? "medium" : "weak";
  
  return (
    <div className="space-y-1.5 mt-2">
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
      <div className="flex gap-3">
        {checks.map((check) => (
          <span
            key={check.label}
            className={`text-xs flex items-center gap-0.5 ${
              check.passed ? "text-green-600" : "text-muted-foreground"
            }`}
          >
            {check.passed && <Check className="h-3 w-3" />}
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
  showStrength = false,
  testId = "input-password"
}: { 
  field: any; 
  placeholder?: string;
  showStrength?: boolean;
  testId?: string;
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
          data-testid={testId}
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

export default function AuthModal({ 
  defaultView = "login", 
  onSuccess,
  onNavigate 
}: AuthModalProps) {
  const [view, setView] = useState<AuthView>(defaultView);
  const [accountType, setAccountType] = useState<"user" | "business">("user");
  const { toast } = useToast();

  const signupForm = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    defaultValues: { 
      email: "", 
      password: "", 
      firstName: "", 
      lastName: "", 
      zipCode: "",
      businessName: "",
    },
  });

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const forgotPasswordForm = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: SignupForm) => {
      const endpoint = accountType === "business" 
        ? "/api/auth/register/business" 
        : "/api/auth/register/user";
      
      const payload = accountType === "business"
        ? { ...data, accountType: "business" }
        : { ...data, accountType: "user" };
      
      const response = await apiRequest("POST", endpoint, payload);
      return response.json();
    },
    onSuccess: (data) => {
      // Auth token is now set via httpOnly cookie by the server
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      
      if (accountType === "business") {
        toast({ 
          title: "Business account created!", 
          description: "Let's set up your business profile." 
        });
        onNavigate?.("/onboarding");
      } else {
        toast({ 
          title: "Account created!", 
          description: "Please check your email to verify your account." 
        });
        onNavigate?.("/start");
      }
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({ 
        title: "Sign up failed", 
        description: error.message || "Please try again", 
        variant: "destructive" 
      });
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginForm) => {
      const response = await apiRequest("POST", "/api/auth/login", data);
      return response.json();
    },
    onSuccess: (data) => {
      if (data.needsRecovery) {
        toast({ 
          title: "Set Up Your Password", 
          description: `Welcome back${data.firstName ? `, ${data.firstName}` : ''}! Please create a password for your account.`,
          duration: 5000,
        });
        onNavigate?.(`/recover-account?email=${encodeURIComponent(data.email)}`);
        return;
      }
      
      // Auth token is now set via httpOnly cookie by the server
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: "Welcome back!" });
      onNavigate?.("/start");
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({ 
        title: "Login failed", 
        description: error.message || "Invalid email or password", 
        variant: "destructive" 
      });
    },
  });

  const forgotPasswordMutation = useMutation({
    mutationFn: async (data: ForgotPasswordForm) => {
      const response = await apiRequest("POST", "/api/auth/forgot-password", data);
      return response.json();
    },
    onSuccess: () => {
      toast({ 
        title: "Check your email", 
        description: "We've sent you a link to reset your password." 
      });
      setView("login");
    },
    onError: () => {
      toast({ 
        title: "Check your email", 
        description: "If an account exists, we've sent reset instructions." 
      });
      setView("login");
    },
  });

  const handleSignup = (data: SignupForm) => {
    if (accountType === "business" && !data.businessName) {
      signupForm.setError("businessName", { message: "Business name is required" });
      return;
    }
    registerMutation.mutate(data);
  };

  const switchToSignup = () => {
    setView("account-type");
    signupForm.reset();
  };

  const switchToLogin = () => {
    setView("login");
    loginForm.reset();
  };

  if (view === "account-type") {
    return (
      <Card className="w-full max-w-md mx-auto border-0 shadow-lg">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-xl">Join Rise Local</CardTitle>
          <CardDescription>
            How would you like to use Rise Local?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            variant="outline"
            className="w-full h-16 justify-start gap-4 text-left"
            onClick={() => {
              setAccountType("user");
              setView("signup");
            }}
            data-testid="button-signup-user"
          >
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="font-semibold">I'm a Customer</div>
              <div className="text-sm text-muted-foreground">Find deals from local businesses</div>
            </div>
          </Button>
          
          <Button
            variant="outline"
            className="w-full h-16 justify-start gap-4 text-left"
            onClick={() => {
              setAccountType("business");
              setView("signup");
            }}
            data-testid="button-signup-business"
          >
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Store className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="font-semibold">I'm a Business</div>
              <div className="text-sm text-muted-foreground">List deals and reach local customers</div>
            </div>
          </Button>

          <div className="pt-4 text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <button 
                onClick={switchToLogin} 
                className="text-primary font-semibold hover:underline"
                data-testid="link-to-login"
              >
                Sign in
              </button>
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (view === "forgot-password") {
    return (
      <Card className="w-full max-w-md mx-auto border-0 shadow-lg">
        <CardHeader className="text-center">
          <Button
            variant="ghost"
            size="sm"
            className="absolute left-2 top-2"
            onClick={() => setView("login")}
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <CardTitle className="text-xl pt-4">Reset Password</CardTitle>
          <CardDescription>
            Enter your email and we'll send you reset instructions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...forgotPasswordForm}>
            <form 
              onSubmit={forgotPasswordForm.handleSubmit((data) => forgotPasswordMutation.mutate(data))} 
              className="space-y-4"
            >
              <FormField
                control={forgotPasswordForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                          {...field} 
                          type="email" 
                          placeholder="you@example.com" 
                          className="pl-10 h-12 text-base" 
                          data-testid="input-forgot-email" 
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button 
                type="submit" 
                className="w-full h-12" 
                disabled={forgotPasswordMutation.isPending}
                data-testid="button-send-reset"
              >
                {forgotPasswordMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send Reset Link"
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    );
  }

  if (view === "signup") {
    return (
      <Card className="w-full max-w-md mx-auto border-0 shadow-lg">
        <CardHeader className="text-center pb-2 relative">
          <Button
            variant="ghost"
            size="sm"
            className="absolute left-2 top-2"
            onClick={() => setView("account-type")}
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2 mt-6">
            {accountType === "business" ? (
              <Store className="h-6 w-6 text-primary" />
            ) : (
              <User className="h-6 w-6 text-primary" />
            )}
          </div>
          <CardTitle className="text-xl">
            {accountType === "business" ? "Create Business Account" : "Create Account"}
          </CardTitle>
          <CardDescription>
            {accountType === "business" 
              ? "List your business and reach local customers" 
              : "Start discovering local deals in SWFL"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...signupForm}>
            <form onSubmit={signupForm.handleSubmit(handleSignup)} className="space-y-4">
              {accountType === "business" && (
                <FormField
                  control={signupForm.control}
                  name="businessName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business Name</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Store className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input 
                            {...field} 
                            placeholder="Your Business Name" 
                            className="pl-10 h-12 text-base" 
                            data-testid="input-business-name" 
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={signupForm.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="John" 
                          className="h-12 text-base" 
                          data-testid="input-first-name" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={signupForm.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="Doe" 
                          className="h-12 text-base" 
                          data-testid="input-last-name" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={signupForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                          {...field} 
                          type="email" 
                          placeholder="you@example.com" 
                          className="pl-10 h-12 text-base" 
                          data-testid="input-email" 
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={signupForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <PasswordInput 
                        field={field} 
                        placeholder="Create a password" 
                        showStrength 
                        testId="input-password"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {accountType === "user" && (
                <FormField
                  control={signupForm.control}
                  name="zipCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ZIP Code (optional)</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="33901" 
                          className="h-12 text-base" 
                          data-testid="input-zip" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <Button 
                type="submit" 
                className="w-full h-12 text-base font-semibold" 
                disabled={registerMutation.isPending}
                data-testid="button-create-account"
              >
                {registerMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  "Create Account"
                )}
              </Button>
            </form>
          </Form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <button 
                onClick={switchToLogin} 
                className="text-primary font-semibold hover:underline"
                data-testid="link-to-login"
              >
                Sign in
              </button>
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto border-0 shadow-lg">
      <CardHeader className="text-center pb-2">
        <CardTitle className="text-xl">Welcome Back</CardTitle>
        <CardDescription>Sign in to your account</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...loginForm}>
          <form 
            onSubmit={loginForm.handleSubmit((data) => loginMutation.mutate(data))} 
            className="space-y-4"
          >
            <FormField
              control={loginForm.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        {...field} 
                        type="email" 
                        placeholder="you@example.com" 
                        className="pl-10 h-12 text-base" 
                        data-testid="input-login-email" 
                      />
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
                    <button 
                      type="button" 
                      onClick={() => setView("forgot-password")} 
                      className="text-xs text-primary hover:underline"
                      data-testid="link-forgot-password"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <FormControl>
                    <PasswordInput field={field} testId="input-login-password" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button 
              type="submit" 
              className="w-full h-12 text-base font-semibold" 
              disabled={loginMutation.isPending}
              data-testid="button-login"
            >
              {loginMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
        </Form>

        <div className="mt-6 text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            Don't have an account?{" "}
            <button 
              onClick={switchToSignup} 
              className="text-primary font-semibold hover:underline"
              data-testid="link-to-signup"
            >
              Sign up
            </button>
          </p>
          <p className="text-sm text-muted-foreground">
            Had an old account?{" "}
            <button 
              onClick={() => onNavigate?.("/recover-account")} 
              className="text-primary hover:underline"
              data-testid="link-recover-account"
            >
              Recover it
            </button>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
