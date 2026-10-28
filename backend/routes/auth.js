
const express = require("express");
const rateLimit = require("express-rate-limit");
const supabaseAuth = require("../supabase-auth");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 12,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    error: "Too many login attempts. Please wait a little and try again.",
  },
});

function validCredentials(body) {
  const email =
    typeof body.email === "string"
      ? body.email.trim().toLowerCase()
      : "";

  const password =
    typeof body.password === "string" ? body.password : "";

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Enter a valid email address." };
  }

  if (password.length < 6 || password.length > 128) {
    return {
      error: "Password must contain 6–128 characters.",
    };
  }

  return { email, password };
}

// Sign up
router.post("/signup", authLimiter, async (req, res, next) => {
  const input = validCredentials(req.body || {});

  if (input.error) {
    return res.status(400).json({ error: input.error });
  }

  try {
    const { data, error } = await supabaseAuth.auth.signUp({
      email: input.email,
      password: input.password,
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(201).json({
      user: data.user
        ? { id: data.user.id, email: data.user.email }
        : null,
      session: data.session,
    });
  } catch (error) {
    next(error);
  }
});

// Log in
router.post("/login", authLimiter, async (req, res, next) => {
  const input = validCredentials(req.body || {});

  if (input.error) {
    return res.status(400).json({ error: input.error });
  }

  try {
    const { data, error } =
      await supabaseAuth.auth.signInWithPassword({
        email: input.email,
        password: input.password,
      });

    if (error) {
      return res.status(401).json({
        error: "Email or password is incorrect.",
      });
    }

    return res.json({
      user: {
        id: data.user.id,
        email: data.user.email,
      },
      session: data.session,
    });
  } catch (error) {
    next(error);
  }
});

// Get current user
router.get("/me", requireAuth, (req, res) => {
  return res.json({
    user: {
      id: req.user.id,
      email: req.user.email,
    },
  });
});

// Log out
router.post("/logout", requireAuth, async (req, res) => {
  try {
    const { createClient } = require("@supabase/supabase-js");

    const publicKey =
      process.env.SUPABASE_ANON_KEY ||
      process.env.SUPABASE_PUBLISHABLE_KEY;

    if (publicKey) {
      const userClient = createClient(
        process.env.SUPABASE_URL,
        publicKey,
        {
          global: {
            headers: {
              Authorization: `Bearer ${req.accessToken}`,
            },
          },
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
          },
        }
      );

      await userClient.auth.signOut();
    }
  } catch (error) {
    console.error("Logout session revocation failed:", error.message);
  }

  return res.json({ message: "Logged out." });
});

module.exports = router;
