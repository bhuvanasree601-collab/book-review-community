require("dotenv").config();
const path = require("path");
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const authRoutes = require("./routes/auth");
const bookRoutes = require("./routes/books");
const reviewRoutes = require("./routes/reviews");

const app = express();
const port = Number(process.env.PORT) || 3000;
app.disable("x-powered-by");
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.CORS_ORIGIN || false }));
app.use(express.json({ limit: "20kb" }));
app.use("/api", rateLimit({ windowMs: 60 * 1000, limit: 120, standardHeaders: "draft-8", legacyHeaders: false }));

app.get("/api/health", (_req,res) => res.json({ status:"ok", service:"book-review-community", time:new Date().toISOString() }));
app.use("/api/auth", authRoutes);
app.use("/api/books", bookRoutes);
app.use("/api/reviews", reviewRoutes);
app.use(express.static(path.join(__dirname, "..", "frontend")));
app.get(/.*/, (req,res,next) => {
  if (req.path.startsWith("/api/")) return res.status(404).json({ error:"API endpoint not found." });
  res.sendFile(path.join(__dirname, "..", "frontend", "index.html"), err => { if (err) next(err); });
});
app.use((err, _req, res, _next) => {
  console.error("Request failed:", err.message || err);
  const message = process.env.NODE_ENV === "development" ? err.message : "Something went wrong. Check the server configuration and logs.";
  res.status(500).json({ error:message });
});
app.listen(port, () => console.log(`BookNest running at http://localhost:${port}`));
