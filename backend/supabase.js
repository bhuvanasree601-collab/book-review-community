const { createClient } = require("@supabase/supabase-js");

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  throw new Error("Missing Supabase URL or service-role key.");
}

console.log("Supabase URL loaded:", !!url);
console.log("Service-role key loaded:", !!key);
console.log("Key type:", key.startsWith("sb_secret_")
  ? "Secret key format"
  : key.startsWith("sb_publishable_")
    ? "Publishable key format"
    : "Legacy key format — needs verification");

const supabase = createClient(url, key, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false
  }
});

module.exports = supabase;