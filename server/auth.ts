import passport from "passport";
import { IVerifyOptions, Strategy as LocalStrategy } from "passport-local";
import { type Express } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { users } from "@db/schema";
import { db } from "@db";
import { eq } from "drizzle-orm";

const scryptAsync = promisify(scrypt);
const MemoryStore = createMemoryStore(session);

// Define User interface to match our database schema
declare global {
  namespace Express {
    interface User {
      id: number;
      username: string;
      email: string;
      password: string;
      displayName?: string | null;
      isAdmin: boolean;
      hasCompletedOnboarding: boolean;
      hasCompletedQuestionnaire: boolean;
      aotScore: number | null;
      totalScore: number;
      createdAt: Date | null;
    }
  }
}

export function setupAuth(app: Express) {
  // Initialize session store with proper configuration
  const sessionStore = new MemoryStore({
    checkPeriod: 86400000, // prune expired entries every 24h
    ttl: 7 * 24 * 60 * 60 * 1000, // 7 days TTL for better persistence
  });

  // Configure session middleware with improved persistence settings
  const sessionSettings: session.SessionOptions = {
    secret: process.env.REPL_ID || "edugames-secret",
    resave: true, // Changed to true to ensure session is saved on every request
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      secure: false, // Set to false for development
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // Extended to 7 days for longer persistence
      sameSite: "lax",
      path: "/"
    },
    name: 'sid' // Use a generic name instead of default 'connect.sid'
  };

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure passport local strategy with enhanced logging
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        console.log(`[Auth] Login attempt for user: ${username}`);

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.username, username))
          .limit(1);

        if (!user) {
          console.log(`[Auth] Login failed: User ${username} not found`);
          return done(null, false, { message: "Invalid username or password" });
        }

        const isMatch = await crypto.compare(password, user.password);

        if (!isMatch) {
          console.log(`[Auth] Login failed: Invalid password for user ${username}`);
          return done(null, false, { message: "Invalid username or password" });
        }

        console.log(`[Auth] Login successful for user ${username}`);
        return done(null, user);
      } catch (err) {
        console.error('[Auth] Login error:', err);
        return done(err);
      }
    })
  );

  passport.serializeUser((user, done) => {
    console.log('[Auth] Serializing user:', user.id);
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      console.log('[Auth] Deserializing user:', id);
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);

      if (!user) {
        console.log('[Auth] Deserialization failed: User not found');
        return done(new Error('User not found'), null);
      }
      console.log('[Auth] User deserialized successfully:', user.id);
      done(null, user);
    } catch (err) {
      console.error('[Auth] Deserialization error:', err);
      done(err, null);
    }
  });

  // Authentication routes with enhanced logging
  app.get("/api/user", (req, res) => {
    console.log('[Auth] /api/user request:', {
      isAuthenticated: req.isAuthenticated(),
      sessionID: req.sessionID,
      user: req.user?.id
    });

    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not logged in" });
    }
    res.json(req.user);
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      console.log('[Auth] Registration attempt:', {
        username: req.body.username,
        email: req.body.email
      });

      const { username, password, email } = req.body;

      // Check if user already exists
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (existingUser) {
        console.log('[Auth] Registration failed: Username exists:', username);
        return res.status(400).json({ message: "Username already exists" });
      }

      // Hash the password
      const hashedPassword = await crypto.hash(password);

      // Create the new user
      const [newUser] = await db
        .insert(users)
        .values({
          username,
          password: hashedPassword,
          email,
          isAdmin: false,
          hasCompletedOnboarding: false,
          hasCompletedQuestionnaire: false,
          aotScore: null,
          totalScore: 0,
          createdAt: new Date()
        })
        .returning();

      console.log('[Auth] User registered successfully:', username);

      // Log the user in after registration
      req.login(newUser, (err) => {
        if (err) {
          console.error('[Auth] Login after registration failed:', err);
          return next(err);
        }

        console.log('[Auth] Auto-login after registration successful:', {
          userId: newUser.id,
          sessionID: req.sessionID
        });

        return res.json({
          message: "Registration successful",
          user: {
            id: newUser.id,
            username: newUser.username,
            email: newUser.email,
            hasCompletedOnboarding: false,
            hasCompletedQuestionnaire: false,
          },
        });
      });
    } catch (error) {
      console.error('[Auth] Registration error:', error);
      next(error);
    }
  });

  app.post("/api/login", (req, res, next) => {
    console.log('[Auth] Login attempt:', { username: req.body.username });

    passport.authenticate("local", (err: any, user: Express.User, info: IVerifyOptions) => {
      if (err) {
        console.error('[Auth] Login error:', err);
        return next(err);
      }

      if (!user) {
        console.log('[Auth] Login failed:', info.message);
        return res.status(400).json({ message: info.message ?? "Login failed" });
      }

      req.logIn(user, (err) => {
        if (err) {
          console.error('[Auth] Login session error:', err);
          return next(err);
        }

        console.log('[Auth] Login successful:', {
          username: user.username,
          sessionID: req.sessionID
        });

        return res.json({
          message: "Login successful",
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            isAdmin: user.isAdmin,
            hasCompletedOnboarding: user.hasCompletedOnboarding,
            hasCompletedQuestionnaire: user.hasCompletedQuestionnaire,
          },
        });
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not logged in" });
    }

    const username = req.user?.username;
    console.log('[Auth] Logout request:', { username, sessionID: req.sessionID });

    req.logout((err) => {
      if (err) {
        console.error('[Auth] Logout error:', err);
        return res.status(500).json({ message: "Logout failed" });
      }

      console.log('[Auth] Logout successful:', username);
      res.json({ message: "Logout successful" });
    });
  });

  // Crypto utility functions
  const crypto = {
    hash: async (password: string) => {
      try {
        const salt = randomBytes(16).toString("hex");
        const buf = (await scryptAsync(password, salt, 64)) as Buffer;
        return `${buf.toString("hex")}.${salt}`;
      } catch (error) {
        console.error('[Auth] Error hashing password:', error);
        throw error;
      }
    },

    compare: async (supplied: string, stored: string) => {
      try {
        if (!stored || !stored.includes('.')) {
          console.log('[Auth] Invalid password format');
          return false;
        }

        const [hashedPassword, salt] = stored.split(".");
        const hashedBuf = Buffer.from(hashedPassword, "hex");
        const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
        return timingSafeEqual(hashedBuf, suppliedBuf);
      } catch (error) {
        console.error('[Auth] Password comparison error:', error);
        return false;
      }
    },
  };
  // Initialize admin user if it doesn't exist
  const initializeAdmin = async () => {
    try {
      const [adminUser] = await db
        .select()
        .from(users)
        .where(eq(users.username, 'admin'))
        .limit(1);

      if (!adminUser) {
        console.log('Creating new admin user...');
        const hashedPassword = await crypto.hash('admin123');
        await db.insert(users).values({
          username: 'admin',
          password: hashedPassword,
          email: 'admin@education.nsw.gov.au',
          isAdmin: true,
          hasCompletedOnboarding: true,
          hasCompletedQuestionnaire: false,
          totalScore: 0,
          createdAt: new Date()
        });
        console.log('Admin user created successfully');
      }
    } catch (error) {
      console.error('Failed to initialize admin:', error);
    }
  };

  // Call initialize admin
  initializeAdmin().catch(console.error);
}