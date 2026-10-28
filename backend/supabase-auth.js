
const { createClient } = require("@supabase/supabase-js");

const url = process.env.SUPABASE_URL;
const key =
  process.env.SUPABASE_ANON_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  throw new Error("Missing Supabase URL or public client key.");
}

const supabaseAuth = createClient(url, key, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});

module.exports = supabaseAuth;
