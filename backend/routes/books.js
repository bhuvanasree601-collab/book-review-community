
const express = require("express");
const supabase = require("../supabase");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// Get all reviews
router.get("/", async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from("reviews")
      .select("id,user_id,book_id,rating,body,created_at,books(title,author,genre)")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw error;

    const reviews = data || [];

    // Load profile names separately because there is no direct
    // foreign-key relationship between reviews and profiles.
    const userIds = [...new Set(reviews.map((r) => r.user_id))];
    let profileNames = {};

    if (userIds.length > 0) {
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("id,display_name")
        .in("id", userIds);

      if (profileError) throw profileError;

      for (const profile of profiles || []) {
        profileNames[profile.id] = profile.display_name;
      }
    }

    return res.json({
      reviews: reviews.map((r) => ({
        id: r.id,
        user_id: r.user_id,
        book_id: r.book_id,
        rating: r.rating,
        body: r.body,
        created_at: r.created_at,
        book_title: r.books?.title || "Unknown book",
        book_author: r.books?.author || "Unknown author",
        genre: r.books?.genre || "Other",
        reviewer_name: profileNames[r.user_id] || "Community reader",
      })),
    });
  } catch (error) {
    next(error);
  }
});

// Publish a review
router.post("/", requireAuth, async (req, res, next) => {
  const { title, author, genre, rating, body } = req.body || {};

  if (typeof title !== "string" || title.trim().length < 1 || title.trim().length > 120)
    return res.status(400).json({ error: "Book title must be 1–120 characters." });

  if (typeof author !== "string" || author.trim().length < 1 || author.trim().length > 100)
    return res.status(400).json({ error: "Author must be 1–100 characters." });

  const genres = ["Fiction", "Fantasy", "Science", "Self-help", "Mystery", "Romance", "Other"];

  if (!genres.includes(genre))
    return res.status(400).json({ error: "Choose a valid genre." });

  if (!Number.isInteger(rating) || rating < 1 || rating > 5)
    return res.status(400).json({ error: "Rating must be an integer from 1 to 5." });

  if (typeof body !== "string" || body.trim().length < 10 || body.trim().length > 3000)
    return res.status(400).json({ error: "Review must contain 10–3000 characters." });

  try {
    const normalizedTitle = title.trim();
    const normalizedAuthor = author.trim();

    let { data: book, error: bookError } = await supabase
      .from("books")
      .select("id")
      .ilike("title", normalizedTitle)
      .ilike("author", normalizedAuthor)
      .limit(1)
      .maybeSingle();

    if (bookError) throw bookError;

    if (!book) {
      const { data: created, error: createError } = await supabase
        .from("books")
        .insert({
          title: normalizedTitle,
          author: normalizedAuthor,
          genre,
        })
        .select("id")
        .single();

      if (createError) {
        console.error("BOOK INSERT FAILED:", createError.message);
        throw createError;
      }

      book = created;
    }

    const displayName = (
      req.user.user_metadata?.display_name ||
      req.user.email?.split("@")[0] ||
      "Reader"
    ).slice(0, 60);

    const { error: profileError } = await supabase
      .from("profiles")
      .upsert(
        { id: req.user.id, display_name: displayName },
        { onConflict: "id", ignoreDuplicates: true }
      );

    if (profileError) throw profileError;

    const { data: review, error: reviewError } = await supabase
      .from("reviews")
      .insert({
        user_id: req.user.id,
        book_id: book.id,
        rating,
        body: body.trim(),
      })
      .select("id,rating,body,created_at")
      .single();

    if (reviewError) {
      if (reviewError.code === "23505")
        return res.status(409).json({
          error: "You have already reviewed this book.",
        });

      throw reviewError;
    }

    return res.status(201).json({ review });
  } catch (error) {
    next(error);
  }
});

// Delete a review owned by the signed-in user
router.delete("/:id", requireAuth, async (req, res, next) => {
  if (!/^[0-9a-f-]{36}$/i.test(req.params.id))
    return res.status(400).json({ error: "Invalid review ID." });

  try {
    const { data, error } = await supabase
      .from("reviews")
      .delete()
      .eq("id", req.params.id)
      .eq("user_id", req.user.id)
      .select("id")
      .maybeSingle();

    if (error) throw error;

    if (!data)
      return res.status(404).json({
        error: "Review not found, or it does not belong to your account.",
      });

    return res.json({ message: "Review deleted." });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
