
const express = require("express");
const supabase = require("../supabase");

const router = express.Router();

// Get all books with their review counts
router.get("/", async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from("books")
      .select("id,title,author,genre,reviews(count)")
      .order("title", { ascending: true });

    if (error) throw error;

    const bookList = (data || []).map((book) => ({
      id: book.id,
      title: book.title,
      author: book.author,
      genre: book.genre,
      review_count: book.reviews?.[0]?.count || 0,
    }));

    return res.json({ books: bookList });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
