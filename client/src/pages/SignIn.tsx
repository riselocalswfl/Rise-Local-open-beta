import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import BrandLogo from "@/components/BrandLogo";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, Lock, Eye, EyeOff, ArrowLeft, AlertCircle, CheckCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useQueryClient } from "@tanstack/react-query";

type AuthStep = 'email' | 'login' | 'set-password';

interface EmailCheckResponse {
  exists: boolean;
  hasPassword: boolean;
  authProvider: string | null;
  lockedOut?: boolean;
  lockoutRemainingMinutes?: number;
  needsPasswordSetup?: boolean;
  message: string;
}

export default function SignIn() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // UI state
  const [step, setStep] = useState<AuthStep>('email');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lockedOut, setLockedOut] = useState(false);
  const [lockoutMinutes, setLockoutMinutes] = useState(0);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);
  const [emailCheckResult, setEmailCheckResult] = useState<EmailCheckResponse | null>(null);

  // Check email to determine next step
  const handleCheckEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase().trim() }),
      });

      const data: EmailCheckResponse = await response.json();
      setEmailCheckResult(data);

      if (data.lockedOut) {
        setLockedOut(true);
        setLockoutMinutes(data.lockoutRemainingMinutes || 15);
        setError(`Account temporarily locked. Please try again in ${data.lockoutRemainingMinutes || 15} minutes.`);
        return;
      }

      if (!data.exists) {
        // No account - suggest signup
        setError("No account found with this email. Would you like to create one?");
        return;
      }

      if (data.needsPasswordSetup || !data.hasPassword) {
        // Replit user needs to set password
        setStep('set-password');
      } else {
        // User has password - go to login
        setStep('login');
      }
    } catch (err) {
      setError("Failed to check email. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Login with email/password
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setRemainingAttempts(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/native-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.lockedOut) {
          setLockedOut(true);
          setLockoutMinutes(data.lockoutRemainingMinutes || 15);
          setError(data.error);
        } else if (data.remainingAttempts !== undefined) {
          setRemainingAttempts(data.remainingAttempts);
          setError(data.error);
        } else if (data.needsPasswordSetup) {
          setStep('set-password');
          setError(null);
        } else {
          setError(data.error || "Login failed");
        }
        return;
      }

      // Success!
      toast({
        title: "Welcome back!",
        description: "You have successfully signed in.",
      });

      // Invalidate user queries and redirect
      await queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      setLocation('/start');
    } catch (err) {
      setError("Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Set password (account recovery)
  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          password,
          confirmPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          setLockedOut(true);
          setError(data.error);
        } else {
          setError(data.error || "Failed to set password");
        }
        return;
      }

      // Success!
      toast({
        title: "Password set successfully!",
        description: "You can now sign in with your email and password.",
      });

      // Invalidate user queries and redirect
      await queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      setLocation('/start');
    } catch (err) {
      setError("Failed to set password. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Go back to email step
  const handleBack = () => {
    setStep('email');
    setPassword("");
    setConfirmPassword("");
    setError(null);
    setRemainingAttempts(null);
    setLockedOut(false);
  };

  // Continue with Replit Auth instead
  const handleReplitAuth = () => {
    window.location.href = '/api/login';
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-muted/30">
      <header className="px-4 py-3">
        <BrandLogo size="sm" />
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">
              {step === 'email' && "Sign In"}
              {step === 'login' && "Welcome Back"}
              {step === 'set-password' && "Set Your Password"}
            </CardTitle>
            <CardDescription>
              {step === 'email' && "Enter your email to continue"}
              {step === 'login' && "Enter your password to sign in"}
              {step === 'set-password' && "Create a password for email login"}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Lockout Alert */}
            {lockedOut && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Account temporarily locked due to too many failed attempts.
                  Please try again in {lockoutMinutes} minutes.
                </AlertDescription>
              </Alert>
            )}

            {/* Error Alert */}
            {error && !lockedOut && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Remaining Attempts Warning */}
            {remainingAttempts !== null && remainingAttempts <= 2 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Warning: {remainingAttempts} attempt{remainingAttempts !== 1 ? 's' : ''} remaining before lockout.
                </AlertDescription>
              </Alert>
            )}

            {/* Step 1: Email Input */}
            {step === 'email' && (
              <form onSubmit={handleCheckEmail} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                      disabled={isLoading || lockedOut}
                      autoComplete="email"
                      autoFocus
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading || lockedOut || !email}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Checking...
                    </>
                  ) : (
                    "Continue"
                  )}
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Or</span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleReplitAuth}
                  disabled={isLoading}
                >
                  Continue with Replit
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                  Don't have an account?{" "}
                  <Link href="/auth">
                    <span className="text-primary underline underline-offset-2 hover:text-primary/80">
                      Sign up
                    </span>
                  </Link>
                </p>
              </form>
            )}

            {/* Step 2: Password Login */}
            {step === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{email}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="ml-auto h-8 px-2"
                    onClick={handleBack}
                  >
                    Change
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10"
                      required
                      disabled={isLoading || lockedOut}
                      autoComplete="current-password"
                      autoFocus
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading || lockedOut || !password}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>

                <Button
                  type="button"
                  variant="link"
                  className="w-full"
                  onClick={() => setStep('set-password')}
                >
                  Forgot password? Set a new one
                </Button>
              </form>
            )}

            {/* Step 3: Set Password (Account Recovery) */}
            {step === 'set-password' && (
              <form onSubmit={handleSetPassword} className="space-y-4">
                <Alert className="bg-blue-50 border-blue-200">
                  <CheckCircle className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800">
                    {emailCheckResult?.hasPassword
                      ? "Set a new password for your account."
                      : "Your account was created with Replit. Set a password to enable email login."}
                  </AlertDescription>
                </Alert>

                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{email}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="ml-auto h-8 px-2"
                    onClick={handleBack}
                  >
                    Change
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="new-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="At least 8 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10"
                      required
                      minLength={8}
                      disabled={isLoading || lockedOut}
                      autoComplete="new-password"
                      autoFocus
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10 pr-10"
                      required
                      minLength={8}
                      disabled={isLoading || lockedOut}
                      autoComplete="new-password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {password && confirmPassword && password !== confirmPassword && (
                  <p className="text-sm text-destructive">Passwords do not match</p>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={
                    isLoading ||
                    lockedOut ||
                    !password ||
                    !confirmPassword ||
                    password !== confirmPassword ||
                    password.length < 8
                  }
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Setting password...
                    </>
                  ) : (
                    "Set Password & Sign In"
                  )}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={handleBack}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to email
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </main>

      <footer className="px-4 py-4 text-center">
        <div className="flex justify-center gap-4">
          <Link href="/privacy">
            <span className="text-xs text-muted-foreground hover:text-foreground underline">
              Privacy Policy
            </span>
          </Link>
          <Link href="/terms">
            <span className="text-xs text-muted-foreground hover:text-foreground underline">
              Terms of Service
            </span>
          </Link>
        </div>
      </footer>
    </div>
  );
}
