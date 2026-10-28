const supabase = require("../supabase");

async function requireAuth(req, res, next) {
  const header = req.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return res.status(401).json({ error: "Please log in to continue." });

  try {
    const { data, error } = await supabase.auth.getUser(match[1]);
    if (error || !data.user) return res.status(401).json({ error: "Your session is invalid or expired. Please log in again." });
    req.user = data.user;
    req.accessToken = match[1];
    next();
  } catch {
    return res.status(401).json({ error: "Unable to verify your session." });
  }
}
module.exports = { requireAuth };
