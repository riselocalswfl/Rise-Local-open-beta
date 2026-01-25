import type { Express, Request, Response, NextFunction, RequestHandler } from "express";
import { storage } from "./storage";
import { generateToken, verifyToken, extractBearerToken } from "./jwtAuth";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { z } from "zod";

const SALT_ROUNDS = 10;
const VERIFICATION_TOKEN_EXPIRY_HOURS = 24;
const PASSWORD_RESET_TOKEN_EXPIRY_HOURS = 1;

const registerUserSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters")
    .regex(/[A-Za-z]/, "Password must contain at least one letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().optional(),
  zipCode: z.string().optional(),
  accountType: z.enum(["user", "business"]).default("user"),
});

const registerBusinessSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters")
    .regex(/[A-Za-z]/, "Password must contain at least one letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().optional(),
  businessName: z.string().min(1, "Business name is required"),
  businessType: z.string().optional(),
  accountType: z.literal("business"),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email format"),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  password: z.string().min(8, "Password must be at least 8 characters")
    .regex(/[A-Za-z]/, "Password must contain at least one letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

const verifyEmailSchema = z.object({
  token: z.string().min(1, "Token is required"),
});

function generateSecureToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export async function setupCustomAuth(app: Express) {
  app.post("/api/auth/register/user", async (req: Request, res: Response) => {
    try {
      const validatedData = registerUserSchema.parse(req.body);
      
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        return res.status(400).json({ 
          message: "An account with this email already exists",
          field: "email"
        });
      }

      const passwordHash = await bcrypt.hash(validatedData.password, SALT_ROUNDS);
      
      const user = await storage.upsertUser({
        id: crypto.randomUUID(),
        email: validatedData.email,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
      });

      await storage.updateUser(user.id, {
        password: passwordHash,
        phone: validatedData.phone,
        zipCode: validatedData.zipCode,
        role: "buyer",
        accountType: "user",
        isVendor: false,
        isAdmin: false,
        emailVerified: false,
        onboardingComplete: true,
        welcomeCompleted: false,
      });

      const verificationToken = generateSecureToken();
      const expiresAt = new Date(Date.now() + VERIFICATION_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);
      
      await storage.createVerificationToken({
        userId: user.id,
        token: verificationToken,
        expiresAt,
      });

      // In production, send verification email here instead of logging
      console.log(`[Custom Auth] User registered: ${user.email}`);

      const token = generateToken(user.id);

      res.status(201).json({
        message: "Account created successfully. Please verify your email.",
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: "buyer",
          accountType: "user",
          emailVerified: false,
        },
        // DEV ONLY: In production, token would be sent via email
        ...(process.env.NODE_ENV !== "production" && { _devVerificationToken: verificationToken }),
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error",
          errors: error.errors 
        });
      }
      console.error("[Custom Auth] Register user error:", error);
      res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  app.post("/api/auth/register/business", async (req: Request, res: Response) => {
    try {
      const validatedData = registerBusinessSchema.parse(req.body);
      
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        return res.status(400).json({ 
          message: "An account with this email already exists",
          field: "email"
        });
      }

      const passwordHash = await bcrypt.hash(validatedData.password, SALT_ROUNDS);
      
      const user = await storage.upsertUser({
        id: crypto.randomUUID(),
        email: validatedData.email,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
      });

      await storage.updateUser(user.id, {
        password: passwordHash,
        phone: validatedData.phone,
        role: "vendor",
        accountType: "business",
        isVendor: true,
        isAdmin: false,
        emailVerified: false,
        onboardingComplete: false,
        welcomeCompleted: false,
      });

      const verificationToken = generateSecureToken();
      const expiresAt = new Date(Date.now() + VERIFICATION_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);
      
      await storage.createVerificationToken({
        userId: user.id,
        token: verificationToken,
        expiresAt,
      });

      // In production, send verification email here instead of logging
      console.log(`[Custom Auth] Business user registered: ${user.email}`);

      const token = generateToken(user.id);

      res.status(201).json({
        message: "Business account created successfully. Please verify your email.",
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: "vendor",
          accountType: "business",
          emailVerified: false,
          businessName: validatedData.businessName,
          businessType: validatedData.businessType,
        },
        needsOnboarding: true,
        // DEV ONLY: In production, token would be sent via email
        ...(process.env.NODE_ENV !== "production" && { _devVerificationToken: verificationToken }),
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error",
          errors: error.errors 
        });
      }
      console.error("[Custom Auth] Register business error:", error);
      res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const validatedData = loginSchema.parse(req.body);
      
      const user = await storage.getUserByEmail(validatedData.email);
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Check if user has no password set
      if (!user.password) {
        // Check if this is a migration-required user (OAuth user who needs to set password)
        if (user.migrationRequired) {
          return res.status(200).json({
            requiresMigration: true,
            message: "Please create a password for your account to continue",
            code: "MIGRATION_REQUIRED"
          });
        }
        return res.status(401).json({ 
          message: "This account uses a different sign-in method. Please use the original sign-in method." 
        });
      }

      const isValidPassword = await bcrypt.compare(validatedData.password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      await storage.updateLastLogin(user.id);

      const token = generateToken(user.id);

      // Note: Email verification is encouraged but not required for login
      // Certain features may be restricted for unverified accounts
      const response: any = {
        message: "Login successful",
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          accountType: user.accountType || (user.isVendor ? "business" : "user"),
          isVendor: user.isVendor,
          isAdmin: user.isAdmin,
          emailVerified: user.emailVerified,
          profileImageUrl: user.profileImageUrl,
          onboardingComplete: user.onboardingComplete,
          welcomeCompleted: user.welcomeCompleted,
        }
      };

      // Warn about unverified email
      if (!user.emailVerified) {
        response.warning = "Please verify your email to access all features.";
      }

      res.json(response);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error",
          errors: error.errors 
        });
      }
      console.error("[Custom Auth] Login error:", error);
      res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  app.post("/api/auth/verify-email", async (req: Request, res: Response) => {
    try {
      const validatedData = verifyEmailSchema.parse(req.body);
      
      const verificationToken = await storage.getVerificationToken(validatedData.token);
      if (!verificationToken) {
        return res.status(400).json({ 
          message: "Invalid or expired verification link. Please request a new one." 
        });
      }

      await storage.updateUser(verificationToken.userId, { emailVerified: true });
      await storage.markVerificationTokenUsed(validatedData.token);

      console.log(`[Custom Auth] Email verified for user: ${verificationToken.userId}`);

      res.json({ 
        message: "Email verified successfully. You can now access all features." 
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error",
          errors: error.errors 
        });
      }
      console.error("[Custom Auth] Verify email error:", error);
      res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  app.post("/api/auth/resend-verification", async (req: Request, res: Response) => {
    try {
      const token = extractBearerToken(req);
      if (!token) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const payload = verifyToken(token);
      if (!payload) {
        return res.status(401).json({ message: "Invalid or expired session" });
      }

      const user = await storage.getUser(payload.sub);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.emailVerified) {
        return res.status(400).json({ message: "Email is already verified" });
      }

      const verificationToken = generateSecureToken();
      const expiresAt = new Date(Date.now() + VERIFICATION_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);
      
      await storage.createVerificationToken({
        userId: user.id,
        token: verificationToken,
        expiresAt,
      });

      // In production, send verification email here
      console.log(`[Custom Auth] Resent verification for: ${user.email}`);

      res.json({ 
        message: "Verification email sent. Please check your inbox.",
        // DEV ONLY: In production, token would be sent via email
        ...(process.env.NODE_ENV !== "production" && { _devVerificationToken: verificationToken }),
      });
    } catch (error) {
      console.error("[Custom Auth] Resend verification error:", error);
      res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  app.post("/api/auth/forgot-password", async (req: Request, res: Response) => {
    try {
      const validatedData = forgotPasswordSchema.parse(req.body);
      
      const user = await storage.getUserByEmail(validatedData.email);
      
      if (user && user.password) {
        const resetToken = generateSecureToken();
        const expiresAt = new Date(Date.now() + PASSWORD_RESET_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);
        
        await storage.createPasswordResetToken({
          userId: user.id,
          token: resetToken,
          expiresAt,
        });

        // In production, send password reset email here
        console.log(`[Custom Auth] Password reset requested for: ${user.email}`);
      }

      res.json({ 
        message: "If an account with that email exists, we've sent password reset instructions." 
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error",
          errors: error.errors 
        });
      }
      console.error("[Custom Auth] Forgot password error:", error);
      res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  app.post("/api/auth/reset-password", async (req: Request, res: Response) => {
    try {
      const validatedData = resetPasswordSchema.parse(req.body);
      
      const resetToken = await storage.getPasswordResetToken(validatedData.token);
      if (!resetToken) {
        return res.status(400).json({ 
          message: "Invalid or expired reset link. Please request a new one." 
        });
      }

      const passwordHash = await bcrypt.hash(validatedData.password, SALT_ROUNDS);
      
      await storage.updateUser(resetToken.userId, { password: passwordHash });
      await storage.markPasswordResetTokenUsed(validatedData.token);

      console.log(`[Custom Auth] Password reset for user: ${resetToken.userId}`);

      res.json({ 
        message: "Password reset successfully. You can now log in with your new password." 
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error",
          errors: error.errors 
        });
      }
      console.error("[Custom Auth] Reset password error:", error);
      res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  app.get("/api/auth/me", async (req: Request, res: Response) => {
    try {
      const token = extractBearerToken(req);
      if (!token) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const payload = verifyToken(token);
      if (!payload) {
        return res.status(401).json({ message: "Invalid or expired session" });
      }

      const user = await storage.getUser(payload.sub);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          accountType: user.accountType || (user.isVendor ? "business" : "user"),
          isVendor: user.isVendor,
          isAdmin: user.isAdmin,
          emailVerified: user.emailVerified,
          profileImageUrl: user.profileImageUrl,
          onboardingComplete: user.onboardingComplete,
          welcomeCompleted: user.welcomeCompleted,
          phone: user.phone,
          zipCode: user.zipCode,
        }
      });
    } catch (error) {
      console.error("[Custom Auth] Get me error:", error);
      res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  // Migration Routes - For transitioning OAuth users to email/password
  
  // Validate migration token and return userId (does NOT consume the token)
  app.post("/api/auth/validate-migration-token", async (req: Request, res: Response) => {
    try {
      const { token } = req.body;
      
      if (!token) {
        return res.status(400).json({ message: "Token is required" });
      }

      const userId = await storage.validateTempToken(token, "migration");
      
      if (!userId) {
        await storage.logMigrationAction(null, "token_validation", false, "Invalid or expired token");
        return res.status(400).json({ message: "Invalid or expired token" });
      }

      await storage.logMigrationAction(userId, "token_validation", true, "Token validated successfully");
      res.json({ userId });
    } catch (error) {
      console.error("[Custom Auth] Validate migration token error:", error);
      await storage.logMigrationAction(null, "token_validation", false, `Error: ${error}`);
      res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  // Set password for migrating OAuth user
  app.post("/api/auth/set-password", async (req: Request, res: Response) => {
    try {
      const { password, token } = req.body;
      
      if (!password || !token) {
        return res.status(400).json({ message: "Password and token are required" });
      }

      // Validate password strength
      if (password.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters long" });
      }
      if (!/[A-Za-z]/.test(password)) {
        return res.status(400).json({ message: "Password must contain at least one letter" });
      }
      if (!/[0-9]/.test(password)) {
        return res.status(400).json({ message: "Password must contain at least one number" });
      }

      // Consume the token and get the userId from the server (don't trust client)
      const userId = await storage.consumeTempToken(token, "migration");
      if (!userId) {
        await storage.logMigrationAction(null, "password_set", false, "Invalid or expired token");
        return res.status(400).json({ message: "Invalid or expired token. Please log in again." });
      }

      // Verify user exists and needs migration
      const user = await storage.getUser(userId);
      if (!user) {
        await storage.logMigrationAction(userId, "password_set", false, "User not found");
        return res.status(404).json({ message: "User not found" });
      }

      if (!user.migrationRequired) {
        await storage.logMigrationAction(userId, "password_set", false, "User already migrated");
        return res.status(400).json({ message: "Password already set for this account" });
      }

      // Hash password and update user
      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
      await storage.updateUser(userId, { password: passwordHash });
      await storage.markUserMigrated(userId);

      // Log successful migration
      await storage.logMigrationAction(userId, "password_set", true, "User completed migration");

      console.log(`[Custom Auth] User migrated successfully: ${user.email}`);

      // Generate JWT token for auto-login
      const jwtToken = generateToken(userId);

      res.json({
        success: true,
        message: "Password successfully created",
        token: jwtToken,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          isVendor: user.isVendor,
          isAdmin: user.isAdmin,
        }
      });
    } catch (error) {
      console.error("[Custom Auth] Set password error:", error);
      res.status(500).json({ message: "Failed to set password" });
    }
  });

  // Check if a user needs migration (by email)
  app.post("/api/auth/check-migration", async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const user = await storage.getUserByEmail(email);
      
      if (!user) {
        return res.json({ needsMigration: false });
      }

      res.json({ 
        needsMigration: user.migrationRequired || false,
        hasPassword: !!user.password
      });
    } catch (error) {
      console.error("[Custom Auth] Check migration error:", error);
      res.status(500).json({ message: "Something went wrong" });
    }
  });

  // Account recovery - email lookup and password creation (no token needed)
  app.post("/api/auth/recover-account", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ 
          message: "Email and password are required" 
        });
      }

      // Validate password strength
      if (password.length < 8) {
        return res.status(400).json({ 
          message: "Password must be at least 8 characters" 
        });
      }

      if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
        return res.status(400).json({ 
          message: "Password must contain at least one letter and one number" 
        });
      }

      // Find user by email
      const user = await storage.getUserByEmail(email.trim().toLowerCase());
      if (!user) {
        return res.status(404).json({ 
          message: "No account found with this email address" 
        });
      }

      // Check if user already has a password - they should use forgot password instead
      if (user.password) {
        return res.status(400).json({ 
          message: "This account already has a password. Please use 'Forgot Password' instead.",
          code: "PASSWORD_EXISTS"
        });
      }

      // Hash and set password
      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
      await storage.updateUser(user.id, { password: passwordHash });
      await storage.markUserMigrated(user.id);

      console.log(`[Custom Auth] Account recovered for user: ${user.email}`);

      // Generate JWT for auto-login
      const jwtToken = generateToken(user.id);

      res.json({
        success: true,
        message: `Welcome back, ${user.firstName || 'User'}! Your account has been recovered.`,
        token: jwtToken,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          isVendor: user.isVendor,
          isAdmin: user.isAdmin,
        }
      });
    } catch (error) {
      console.error("[Custom Auth] Account recovery error:", error);
      res.status(500).json({ message: "Account recovery failed. Please try again." });
    }
  });

  // Admin endpoint - Generate recovery tokens for users without passwords
  app.post("/api/admin/generate-recovery-tokens", async (req: Request, res: Response) => {
    try {
      // Get all users who need recovery (no password set)
      const usersNeedingRecovery = await storage.getUsersRequiringMigration();
      
      const recoveryData = [];
      
      for (const user of usersNeedingRecovery) {
        // Generate a recovery token valid for 60 days
        const token = await storage.createTempToken(user.id, 'recovery', 60 * 24 * 60); // 60 days in minutes
        
        recoveryData.push({
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          isVendor: user.isVendor,
          recoveryToken: token,
        });
      }

      console.log(`[Custom Auth] Generated ${recoveryData.length} recovery tokens`);

      res.json({
        success: true,
        count: recoveryData.length,
        users: recoveryData,
      });
    } catch (error) {
      console.error("[Custom Auth] Generate recovery tokens error:", error);
      res.status(500).json({ message: "Failed to generate recovery tokens" });
    }
  });

  // Admin endpoint - Get users needing recovery (for viewing, no token generation)
  app.get("/api/admin/users-needing-recovery", async (req: Request, res: Response) => {
    try {
      const usersNeedingRecovery = await storage.getUsersRequiringMigration();
      
      res.json({
        count: usersNeedingRecovery.length,
        users: usersNeedingRecovery.map(u => ({
          id: u.id,
          email: u.email,
          firstName: u.firstName,
          lastName: u.lastName,
          isVendor: u.isVendor,
          createdAt: u.createdAt,
        })),
      });
    } catch (error) {
      console.error("[Custom Auth] Get users needing recovery error:", error);
      res.status(500).json({ message: "Failed to get users" });
    }
  });

  console.log("[Custom Auth] Custom authentication routes registered");
}

export const isAuthenticatedCustom: RequestHandler = async (req, res, next) => {
  const token = extractBearerToken(req);
  
  if (!token) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ message: "Invalid or expired session" });
  }

  try {
    const user = await storage.getUser(payload.sub);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    (req as any).user = {
      claims: {
        sub: user.id,
        email: user.email,
        first_name: user.firstName,
        last_name: user.lastName,
      },
      id: user.id,
    };
    
    return next();
  } catch (error) {
    console.error("[Custom Auth] Auth middleware error:", error);
    return res.status(500).json({ message: "Authentication error" });
  }
};
