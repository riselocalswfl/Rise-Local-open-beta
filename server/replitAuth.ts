// Replit Auth integration - based on blueprint:javascript_log_in_with_replit
import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

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
      secure: true,
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
    
    if (intendedRole === "buyer" || intendedRole === "vendor" || intendedRole === "restaurant" || intendedRole === "service_provider") {
      (req.session as any).intendedRole = intendedRole;
      // Also store in cookie as backup (expires in 5 minutes)
      res.cookie("intended_role", intendedRole, { 
        maxAge: 5 * 60 * 1000, 
        httpOnly: true,
        secure: true,
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
        secure: true,
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
    passport.authenticate(`replitauth:${req.hostname}`, async (err: any, user: any) => {
      if (err) {
        console.error("Authentication error:", err);
        return res.redirect("/api/login");
      }
      
      if (!user) {
        return res.redirect("/api/login");
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
          // If an intended role was set during login, update the user's role
          if (intendedRole && (intendedRole === "buyer" || intendedRole === "vendor" || intendedRole === "restaurant" || intendedRole === "service_provider")) {
            console.log("[AUTH] Updating user role to:", intendedRole);
            
            // Get existing user info
            const existingUser = await storage.getUser(userId);
            const userName = existingUser?.firstName && existingUser?.lastName 
              ? `${existingUser.firstName} ${existingUser.lastName}`
              : existingUser?.email?.split('@')[0] || "Business Owner";
            
            // Handle vendor-type signups: redirect to onboarding if no profile exists
            if (intendedRole === "vendor" || intendedRole === "restaurant" || intendedRole === "service_provider") {
              // Normalize role to vendorType early for consistency
              const vendorType = intendedRole === "vendor" ? "shop" 
                : intendedRole === "service_provider" ? "service"
                : intendedRole; // restaurant stays as-is
              
              // Check for existing vendor-type profiles
              const existingRestaurant = await storage.getRestaurantByOwnerId(userId);
              const existingProvider = await storage.getServiceProviderByOwnerId(userId);
              const existingVendor = await storage.getVendorByOwnerId(userId);
              
              // Preserve existing vendor type based on profile existence
              if (existingRestaurant) {
                userRole = "restaurant";
                await storage.updateUser(userId, { role: "restaurant" });
                // Flags already cleared at top - profile exists, no onboarding needed
                console.log("[AUTH] User has existing restaurant profile, preserving role as restaurant");
              } else if (existingProvider) {
                userRole = "service_provider";
                await storage.updateUser(userId, { role: "service_provider" });
                // Flags already cleared at top - profile exists, no onboarding needed
                console.log("[AUTH] User has existing service provider profile, preserving role as service_provider");
              } else if (existingVendor) {
                userRole = "vendor";
                await storage.updateUser(userId, { role: "vendor" });
                // Flags already cleared at top - profile exists, no onboarding needed
                console.log("[AUTH] User has existing vendor profile, preserving role as vendor");
              } else {
                // No existing profile - redirect to type-specific onboarding
                console.log("[AUTH] No vendor profile found, redirecting to type-specific onboarding");
                // Set temporary role to track they're a vendor in progress
                userRole = intendedRole;
                await storage.updateUser(userId, { role: intendedRole });
                // Set onboarding flags
                (req.session as any).needsOnboarding = true;
                (req.session as any).vendorType = vendorType;
                console.log("[AUTH] Set vendorType in session:", vendorType);
                // Redirect to type-specific onboarding route
                if (vendorType === "shop") {
                  redirectUrl = "/onboarding/shop";
                } else if (vendorType === "restaurant") {
                  redirectUrl = "/onboarding/dine";
                } else if (vendorType === "service") {
                  redirectUrl = "/onboarding/services";
                } else {
                  redirectUrl = "/onboarding"; // fallback to generic onboarding
                }
                console.log("[AUTH] Redirecting to:", redirectUrl);
              }
            } else if (intendedRole === "buyer") {
              await storage.updateUser(userId, { role: intendedRole });
              userRole = intendedRole;
            }
            
            // Clear the intended role from session and cookie
            delete (req.session as any).intendedRole;
            res.clearCookie("intended_role");
          } else {
            // Otherwise, fetch the user's existing role from the database
            const existingUser = await storage.getUser(userId);
            userRole = existingUser?.role;
            console.log("[AUTH] Retrieved existing user role:", userRole);
          }
          
          // Defensive fallback: ensure userRole is always set
          if (!userRole) {
            const refetchedUser = await storage.getUser(userId);
            userRole = refetchedUser?.role || "buyer"; // Default to buyer if all else fails
            console.log("[AUTH] Fallback: refetched user role:", userRole);
          }
          
          // If returnTo is provided, use it; otherwise redirect based on role
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
            // Redirect based on role for existing users
            if (userRole === "buyer") {
              redirectUrl = "/profile";
            } else if (userRole === "vendor" || userRole === "restaurant") {
              redirectUrl = "/dashboard";
            } else if (userRole === "service_provider") {
              redirectUrl = "/service-provider-dashboard";
            }
            console.log("[AUTH] Redirecting to:", redirectUrl, "for role:", userRole);
          }
        } catch (error) {
          console.error("Failed to process user role:", error);
        }

        // Redirect to appropriate page
        return res.redirect(redirectUrl);
      });
    })(req, res, next);
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
