// Replit Auth integration - based on blueprint:javascript_log_in_with_replit
import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
import { extractBearerToken, verifyToken } from "./jwtAuth";

if (!process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const isProduction = process.env.NODE_ENV === "production";
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: isProduction,
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    verified(null, user);
  };

  for (const domain of process.env
    .REPLIT_DOMAINS!.split(",")) {
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `https://${domain}/api/callback`,
      },
      verify,
    );
    passport.use(strategy);
  }

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    // Store the intended role and returnTo URL in both session and cookie for reliability across OIDC redirects
    const intendedRole = req.query.intended_role as string;
    const returnTo = req.query.returnTo as string;
    console.log("[AUTH] /api/login - intended_role query param:", intendedRole);
    console.log("[AUTH] /api/login - returnTo query param:", returnTo);
    
    const isProduction = process.env.NODE_ENV === "production";
    if (intendedRole === "buyer" || intendedRole === "vendor" || intendedRole === "restaurant" || intendedRole === "service_provider") {
      (req.session as any).intendedRole = intendedRole;
      // Also store in cookie as backup (expires in 5 minutes)
      res.cookie("intended_role", intendedRole, { 
        maxAge: 5 * 60 * 1000, 
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax"
      });
      console.log("[AUTH] Stored intended_role in session and cookie:", intendedRole);
    }
    
    // Store returnTo URL if provided
    if (returnTo) {
      (req.session as any).returnTo = returnTo;
      res.cookie("return_to", returnTo, {
        maxAge: 5 * 60 * 1000,
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax"
      });
      console.log("[AUTH] Stored returnTo in session and cookie:", returnTo);
    }
    
    // Save session before redirect to ensure it persists across OIDC flow
    req.session.save((err) => {
      if (err) {
        console.error("[AUTH] Failed to save session:", err);
      }
      console.log("[AUTH] Session saved, initiating OIDC flow");
      passport.authenticate(`replitauth:${req.hostname}`, {
        prompt: "login consent",
        scope: ["openid", "email", "profile", "offline_access"],
      })(req, res, next);
    });
  });

  app.get("/api/callback", (req, res, next) => {
    try {
      const strategyName = `replitauth:${req.hostname}`;
      console.log("[AUTH CALLBACK] Starting callback for hostname:", req.hostname);
      console.log("[AUTH CALLBACK] Using strategy:", strategyName);
      
      passport.authenticate(strategyName, async (err: any, user: any) => {
        if (err) {
          console.error("[AUTH CALLBACK] Authentication error:", err);
          return res.redirect("/auth?error=auth_failed");
        }
        
        if (!user) {
          console.error("[AUTH CALLBACK] No user returned from authentication");
          return res.redirect("/auth?error=no_user");
        }

      // Log the user in
      req.logIn(user, async (loginErr) => {
        if (loginErr) {
          console.error("Login error:", loginErr);
          return res.redirect("/api/login");
        }

        // After successful authentication, determine redirect based on user role or returnTo
        const userId = user.claims.sub;
        
        // Clear any stale onboarding flags from previous sessions (defensive)
        delete (req.session as any).needsOnboarding;
        delete (req.session as any).vendorType;
        
        // Try to get intended role and returnTo from session first, then cookie as fallback
        let intendedRole = (req.session as any).intendedRole || req.cookies.intended_role;
        let returnTo = (req.session as any).returnTo || req.cookies.return_to;
        console.log("[AUTH] /api/callback - userId:", userId);
        console.log("[AUTH] /api/callback - intendedRole from session:", (req.session as any).intendedRole);
        console.log("[AUTH] /api/callback - intendedRole from cookie:", req.cookies.intended_role);
        console.log("[AUTH] /api/callback - using intendedRole:", intendedRole);
        console.log("[AUTH] /api/callback - returnTo from session:", (req.session as any).returnTo);
        console.log("[AUTH] /api/callback - returnTo from cookie:", req.cookies.return_to);
        console.log("[AUTH] /api/callback - using returnTo:", returnTo);
        let redirectUrl = "/";
        let userRole = null;
        
        try {
          // Get existing user info first to check if they already have a vendor role
          const existingUser = await storage.getUser(userId);
          const existingRole = existingUser?.role;
          
          // Check if user has a vendor profile (actual business created)
          const existingVendorProfile = await storage.getVendorByOwnerId(userId);
          const hasVendorProfile = !!existingVendorProfile;
          
          // IMPORTANT: Only consider someone a "committed vendor" if they have BOTH the role AND a vendor profile
          // This allows users who accidentally clicked "Sell With Us" but never created a business to switch to buyer
          const isCommittedVendor = hasVendorProfile && (existingUser?.isVendor === true || existingRole === "vendor" || existingRole === "restaurant" || existingRole === "service_provider");
          
          // Check both isAdmin flag and legacy role for backward compatibility
          const isAdmin = existingUser?.isAdmin === true || existingRole === "admin";
          
          // CRITICAL: Never overwrite admin role - admins are manually set in database
          // Also ensure isAdmin flag is synced if user has role='admin'
          if (isAdmin) {
            console.log("[AUTH] User is ADMIN - preserving admin role, ignoring any intended role");
            userRole = existingRole || "admin";
            // Ensure isAdmin flag is set for users with admin role
            if (existingUser && !existingUser.isAdmin && existingRole === "admin") {
              await storage.updateUser(userId, { isAdmin: true });
            }
            // Clear the intended role since we're ignoring it
            delete (req.session as any).intendedRole;
            res.clearCookie("intended_role");
          // IMPORTANT: Never downgrade a COMMITTED vendor to buyer - once they've created a business, always a business
          // This allows vendors to click "Shop Local" and still access their business dashboard
          // BUT: Users who have role=vendor but NO vendor profile can still switch to buyer
          } else if (isCommittedVendor) {
            console.log("[AUTH] User is a committed vendor (has business profile) - preserving vendor role");
            userRole = existingRole;
            // Ensure isVendor flag is set for vendor users
            if (existingUser && !existingUser.isVendor) {
              await storage.updateUser(userId, { isVendor: true });
            }
            // Clear the intended role since we're ignoring it
            delete (req.session as any).intendedRole;
            res.clearCookie("intended_role");
          } else if (intendedRole && (intendedRole === "buyer" || intendedRole === "vendor" || intendedRole === "restaurant" || intendedRole === "service_provider")) {
            console.log("[AUTH] Updating user role to:", intendedRole);
            
            const userName = existingUser?.firstName && existingUser?.lastName 
              ? `${existingUser.firstName} ${existingUser.lastName}`
              : existingUser?.email?.split('@')[0] || "Business Owner";
            
            // Handle vendor-type signups: redirect to onboarding if no profile exists
            if (intendedRole === "vendor" || intendedRole === "restaurant" || intendedRole === "service_provider") {
              // Check for existing vendor profile (unified system)
              const existingVendor = await storage.getVendorByOwnerId(userId);
              
              if (existingVendor) {
                // Vendor profile exists - use unified "vendor" role
                userRole = "vendor";
                await storage.updateUser(userId, { role: "vendor", isVendor: true });
                console.log("[AUTH] User has existing vendor profile, setting role as vendor");
              } else {
                // No existing profile - redirect to unified onboarding
                console.log("[AUTH] No vendor profile found, redirecting to unified onboarding");
                // Set unified vendor role to track they're a vendor in progress
                userRole = "vendor";
                await storage.updateUser(userId, { role: "vendor", isVendor: true });
                // Set onboarding flag
                (req.session as any).needsOnboarding = true;
                // Redirect to unified onboarding (vendor type selected in onboarding form)
                redirectUrl = "/onboarding";
                console.log("[AUTH] Redirecting to:", redirectUrl);
              }
            } else if (intendedRole === "buyer") {
              // Clear isVendor flag when switching to buyer (for users who accidentally clicked "Sell With Us")
              await storage.updateUser(userId, { role: intendedRole, isVendor: false, onboardingComplete: true });
              userRole = intendedRole;
              console.log("[AUTH] User set as buyer, clearing any vendor flags");
            }
            
            // Clear the intended role from session and cookie
            delete (req.session as any).intendedRole;
            res.clearCookie("intended_role");
          } else {
            // No intended role - use existing role from database
            userRole = existingRole;
            console.log("[AUTH] Retrieved existing user role:", userRole);
          }
          
          // Defensive fallback: ensure userRole is always set
          if (!userRole) {
            const refetchedUser = await storage.getUser(userId);
            userRole = refetchedUser?.role || "buyer"; // Default to buyer if all else fails
            console.log("[AUTH] Fallback: refetched user role:", userRole);
          }
          
          // If returnTo is provided, use it; otherwise redirect based on onboarding status
          // Check if user needs to set a password (migration from OAuth to email/password)
          if (existingUser && existingUser.migrationRequired) {
            console.log("[AUTH] User requires password migration - generating temp token");
            try {
              const migrationToken = await storage.createTempToken(userId, "migration", 60);
              await storage.logMigrationAction(userId, "oauth_login_redirected", true, "Redirecting to password setup");
              console.log("[AUTH] Redirecting to set-password page for migration");
              return res.redirect(`/set-password?token=${migrationToken}`);
            } catch (migrationErr) {
              console.error("[AUTH] Failed to create migration token:", migrationErr);
              // Fall through to normal redirect if token creation fails
            }
          }

          if (returnTo) {
            redirectUrl = returnTo;
            // Clear the returnTo from session and cookie
            delete (req.session as any).returnTo;
            res.clearCookie("return_to");
            console.log("[AUTH] Redirecting to returnTo URL:", redirectUrl);
          } else if ((req.session as any).needsOnboarding) {
            // New vendor needs onboarding - redirectUrl already set to /onboarding
            console.log("[AUTH] New vendor redirecting to onboarding");
          } else {
            // Redirect all users to /start gate which handles:
            // - welcomeCompleted check (routes to /welcome if not completed)
            // - onboardingComplete check (routes to /onboarding for vendors)
            // - Role-based routing (discover for buyers, dashboard for vendors)
            redirectUrl = "/start";
            console.log("[AUTH] Redirecting to /start gate for welcome/onboarding checks");
          }
        } catch (error) {
          console.error("Failed to process user role:", error);
        }

        // Redirect to appropriate page
        return res.redirect(redirectUrl);
      });
      })(req, res, next);
    } catch (outerErr) {
      console.error("[AUTH CALLBACK] Outer error in callback handler:", outerErr);
      return res.redirect("/auth?error=callback_failed");
    }
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};

export const isAuthenticatedJWT: RequestHandler = async (req, res, next) => {
  const token = extractBearerToken(req);
  if (!token) {
    return res.status(401).json({ message: "Unauthorized - No token provided" });
  }
  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ message: "Unauthorized - Invalid token" });
  }
  try {
    const user = await storage.getUser(payload.sub);
    if (!user) {
      return res.status(401).json({ message: "Unauthorized - User not found" });
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
    console.error("[JWT AUTH] Error fetching user:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const requireAuth: RequestHandler = async (req, res, next) => {
  const token = extractBearerToken(req);
  if (token) {
    return isAuthenticatedJWT(req, res, next);
  }
  return isAuthenticated(req, res, next);
};
