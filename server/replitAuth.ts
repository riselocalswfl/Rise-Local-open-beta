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
    // Store the intended role in the session before authentication
    const intendedRole = req.query.intended_role as string;
    if (intendedRole === "buyer" || intendedRole === "vendor" || intendedRole === "restaurant") {
      (req.session as any).intendedRole = intendedRole;
    }
    
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
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

        // After successful authentication, determine redirect based on user role
        const userId = user.claims.sub;
        const intendedRole = (req.session as any).intendedRole;
        let redirectUrl = "/";
        let userRole = null;
        
        try {
          // If an intended role was set during login, update the user's role
          if (intendedRole && (intendedRole === "buyer" || intendedRole === "vendor" || intendedRole === "restaurant")) {
            await storage.updateUser(userId, { role: intendedRole });
            userRole = intendedRole;
            
            // Auto-create business profile for vendors and restaurants
            const existingUser = await storage.getUser(userId);
            const userName = existingUser?.firstName && existingUser?.lastName 
              ? `${existingUser.firstName} ${existingUser.lastName}`
              : existingUser?.email?.split('@')[0] || "Business Owner";
            
            if (intendedRole === "vendor") {
              // Check if vendor profile already exists
              const existingVendor = await storage.getVendorByOwnerId(userId);
              if (!existingVendor) {
                // Create default vendor profile
                await storage.createVendor({
                  ownerId: userId,
                  businessName: `${userName}'s Vendor`,
                  contactName: userName,
                  bio: "Welcome to my vendor profile! I'm excited to share my products with the Fort Myers community.",
                  category: "Other",
                  locationType: "Home-based",
                  city: "Fort Myers",
                  state: "FL",
                  zipCode: "33901",
                  serviceOptions: ["Pickup"],
                  paymentMethod: "Direct to Vendor",
                });
              }
            } else if (intendedRole === "restaurant") {
              // Check if restaurant profile already exists
              const existingRestaurant = await storage.getRestaurantByOwnerId(userId);
              if (!existingRestaurant) {
                // Create default restaurant profile
                await storage.createRestaurant({
                  ownerId: userId,
                  restaurantName: `${userName}'s Restaurant`,
                  contactName: userName,
                  bio: "Welcome to my restaurant! We're passionate about serving fresh, local food to the Fort Myers community.",
                  cuisineType: "American",
                  locationType: "Dine-in",
                  city: "Fort Myers",
                  state: "FL",
                  zipCode: "33901",
                  serviceOptions: ["Dine-in"],
                  paymentMethod: "Direct to Restaurant",
                });
              }
            }
            
            // Clear the intended role from session
            delete (req.session as any).intendedRole;
          } else {
            // Otherwise, fetch the user's existing role from the database
            const existingUser = await storage.getUser(userId);
            userRole = existingUser?.role;
          }
          
          // Redirect based on role
          if (userRole === "buyer") {
            redirectUrl = "/profile";
          } else if (userRole === "vendor" || userRole === "restaurant") {
            redirectUrl = "/dashboard";
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
