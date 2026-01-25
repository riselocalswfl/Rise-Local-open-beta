import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface PasswordStrength {
  hasMinLength: boolean;
  hasLetter: boolean;
  hasNumber: boolean;
}

export default function SetPassword() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [token, setToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(true);

  const passwordStrength: PasswordStrength = {
    hasMinLength: password.length >= 8,
    hasLetter: /[A-Za-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
  };

  const isPasswordValid = passwordStrength.hasMinLength && passwordStrength.hasLetter && passwordStrength.hasNumber;
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get("token");
    
    if (!tokenParam) {
      setTokenError("No migration token provided. Please log in again.");
      setIsValidating(false);
      return;
    }
    
    setToken(tokenParam);
    
    const validateToken = async () => {
      try {
        const response = await fetch("/api/auth/validate-migration-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: tokenParam }),
        });
        
        if (!response.ok) {
          const data = await response.json();
          setTokenError(data.message || "Invalid or expired token. Please log in again.");
          setIsValidating(false);
          return;
        }
        
        const data = await response.json();
        setUserId(data.userId);
        setIsValidating(false);
      } catch (err) {
        console.error("Token validation error:", err);
        setTokenError("Failed to validate token. Please try again.");
        setIsValidating(false);
      }
    };
    
    validateToken();
  }, []);

  const setPasswordMutation = useMutation({
    mutationFn: async (data: { password: string; token: string }) => {
      const response = await apiRequest("POST", "/api/auth/set-password", data);
      return response.json();
    },
    onSuccess: (data) => {
      if (data.token) {
        localStorage.setItem("auth_token", data.token);
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      
      toast({
        title: "Password created",
        description: "Your account has been upgraded. You can now log in with your email and password.",
      });
      
      setTimeout(() => {
        setLocation("/start");
      }, 1500);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to set password. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isPasswordValid) {
      toast({
        title: "Invalid password",
        description: "Please meet all password requirements.",
        variant: "destructive",
      });
      return;
    }
    
    if (!passwordsMatch) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both passwords are the same.",
        variant: "destructive",
      });
      return;
    }
    
    if (!token) {
      toast({
        title: "Session expired",
        description: "Please log in again to continue.",
        variant: "destructive",
      });
      return;
    }
    
    setPasswordMutation.mutate({ password, token });
  };

  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Validating your session...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (tokenError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <CardTitle>Session Expired</CardTitle>
            <CardDescription>{tokenError}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => setLocation("/auth")} 
              className="w-full"
              data-testid="button-return-login"
            >
              Return to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Lock className="h-12 w-12 text-primary mx-auto mb-4" />
          <CardTitle className="text-2xl">Create Your Password</CardTitle>
          <CardDescription>
            We're upgrading your account security. Please create a password to continue using Rise Local.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your new password"
                  className="pr-10"
                  data-testid="input-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  data-testid="button-toggle-password"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              
              <div className="space-y-1 text-sm mt-2">
                <div className={`flex items-center gap-2 ${passwordStrength.hasMinLength ? "text-green-600" : "text-muted-foreground"}`}>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>At least 8 characters</span>
                </div>
                <div className={`flex items-center gap-2 ${passwordStrength.hasLetter ? "text-green-600" : "text-muted-foreground"}`}>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Contains a letter</span>
                </div>
                <div className={`flex items-center gap-2 ${passwordStrength.hasNumber ? "text-green-600" : "text-muted-foreground"}`}>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Contains a number</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  className="pr-10"
                  data-testid="input-confirm-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  data-testid="button-toggle-confirm-password"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {confirmPassword && !passwordsMatch && (
                <p className="text-sm text-destructive">Passwords do not match</p>
              )}
              {passwordsMatch && (
                <p className="text-sm text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" />
                  Passwords match
                </p>
              )}
            </div>
            
            <Button
              type="submit"
              className="w-full"
              disabled={!isPasswordValid || !passwordsMatch || setPasswordMutation.isPending}
              data-testid="button-submit-password"
            >
              {setPasswordMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Password...
                </>
              ) : (
                "Create Password"
              )}
            </Button>
          </form>
          
          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p>After creating your password, you'll be able to log in with your email address and password.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
