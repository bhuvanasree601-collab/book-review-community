
const API = "/api";

const $ = (id) => document.getElementById(id);

let token = localStorage.getItem("booknest_token") || "";
let currentUser = null;
let authMode = "login";
let books = [];
let allReviews = [];
let toastTimer;

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[ch]);
}

async function api(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API}${path}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(
      data.error || `Request failed (${response.status})`
    );
    error.status = response.status;
    throw error;
  }

  return data;
}

function toast(message) {
  const el = $("toast");
  if (!el) return;

  el.textContent = message;
  el.classList.add("show");

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.classList.remove("show");
  }, 3200);
}

function showModal(id) {
  const modal = $(id);
  if (modal) modal.classList.remove("hidden");
}

function hideModal(id) {
  const modal = $(id);
  if (modal) modal.classList.add("hidden");
}

function stars(n) {
  const rating = Math.max(0, Math.min(5, Number(n) || 0));
  return "★".repeat(rating) + "☆".repeat(5 - rating);
}

function initials(text) {
  return String(text || "Book")
    .trim()
    .split(/\s+/)
    .slice(0, 3)
    .map((word) => word[0] || "")
    .join("")
    .toUpperCase();
}

function renderAccount() {
  const area = $("accountArea");
  if (!area) return;

  if (currentUser) {
    area.innerHTML = `
      <span class="muted account-email">
        ${escapeHtml(currentUser.email)}
      </span>
      <button class="btn btn-light" id="logoutBtn">Log out</button>
    `;

    $("logoutBtn").addEventListener("click", logout);
  } else {
    area.innerHTML = `
      <button class="btn btn-light" id="openAuth">
        Log in / Sign up
      </button>
    `;

    $("openAuth").addEventListener("click", () => {
      authMode = "login";
      updateAuthMode();
      showModal("authModal");
    });
  }
}

function renderBooks() {
  const grid = $("booksGrid");
  if (!grid) return;

  // Prevent errors if the API does not return a books array.
  const bookList = Array.isArray(books) ? books : [];

  const query = $("searchInput").value.trim().toLowerCase();
  const genre = $("genreFilter").value;

  const filtered = bookList.filter((book) =>
    (!query ||
      `${book.title || ""} ${book.author || ""}`
        .toLowerCase()
        .includes(query)) &&
    (!genre || book.genre === genre)
  );

  grid.innerHTML = filtered.length
    ? filtered.map((book, i) => `
        <article class="book-card">
          <div class="cover ${["", "c2", "c3", "c4"][i % 4]}">
            ${escapeHtml(initials(book.title))}
          </div>
          <div class="book-info">
            <h3>${escapeHtml(book.title)}</h3>
            <div class="author">
              by ${escapeHtml(book.author)}
            </div>
            <span class="genre">
              ${escapeHtml(book.genre)}
            </span>
            <div class="card-bottom">
              <span>
                ${Number(book.review_count) || 0}
                review${Number(book.review_count) === 1 ? "" : "s"}
              </span>
              <button
                class="small-link"
                data-review-book="${escapeHtml(book.id)}"
              >
                Review ↗
              </button>
            </div>
          </div>
        </article>
      `).join("")
    : `
        <div class="empty-state">
          No books match that search yet.
          Try another title or write the first review.
        </div>
      `;

  document.querySelectorAll("[data-review-book]").forEach((button) => {
    button.addEventListener("click", () => {
      startReview(button.dataset.reviewBook);
    });
  });
}

function renderReviews() {
  const list = $("reviewsList");
  if (!list) return;

  const reviews = Array.isArray(allReviews) ? allReviews : [];
  const recent = reviews.slice(0, 6);

  list.innerHTML = recent.length
    ? recent.map((review) => `
        <article class="review-card">
          <div
            class="rating"
            aria-label="${Number(review.rating) || 0} out of 5 stars"
          >
            ${stars(review.rating)}
          </div>

          <h3>${escapeHtml(review.book_title)}</h3>

          <div class="author">
            by ${escapeHtml(review.book_author)}
            · ${escapeHtml(review.genre || "Other")}
          </div>

          <p class="review-text">
            ${escapeHtml(
              String(review.body || "").length > 260
                ? String(review.body).slice(0, 260) + "…"
                : review.body || ""
            )}
          </p>

          <div class="review-meta">
            <span>
              ${escapeHtml(review.reviewer_name || "Community reader")}
            </span>
            <span>
              ${review.created_at
                ? new Date(review.created_at).toLocaleDateString()
                : ""}
            </span>
          </div>

          ${
            currentUser && review.user_id === currentUser.id
              ? `
                <div class="card-bottom">
                  <button
                    class="small-link"
                    data-delete-review="${escapeHtml(review.id)}"
                  >
                    Delete my review
                  </button>
                </div>
              `
              : ""
          }
        </article>
      `).join("")
    : `
        <div class="empty-state">
          No reviews yet. Be the first reader to share your thoughts.
        </div>
      `;

  document.querySelectorAll("[data-delete-review]").forEach((button) => {
    button.addEventListener("click", async () => {
      if (!confirm("Delete this review? This cannot be undone.")) return;

      try {
        await api(
          `/reviews/${encodeURIComponent(button.dataset.deleteReview)}`,
          { method: "DELETE" }
        );

        toast("Review deleted.");
        await loadData();
      } catch (error) {
        toast(error.message);
      }
    });
  });
}

async function loadData() {
  let connected = true;

  // Load books separately so a reviews error does not break the book list.
  try {
    const result = await api("/books");
    books = Array.isArray(result.books) ? result.books : [];
    renderBooks();
  } catch (error) {
    connected = false;
    books = [];
    renderBooks();

    $("booksGrid").innerHTML = `
      <div class="empty-state">
        Could not load books: ${escapeHtml(error.message)}
      </div>
    `;
  }

  try {
    const result = await api("/reviews");
    allReviews = Array.isArray(result.reviews) ? result.reviews : [];
    renderReviews();
  } catch (error) {
    connected = false;
    allReviews = [];

    $("reviewsList").innerHTML = `
      <div class="empty-state">
        Could not load reviews: ${escapeHtml(error.message)}
      </div>
    `;
  }

  const status = $("apiStatus");
  if (status) {
    status.textContent = connected
      ? "Database API connected"
      : "Connection needs setup";
  }
}

async function refreshUser() {
  if (!token) {
    currentUser = null;
    renderAccount();
    return;
  }

  try {
    const result = await api("/auth/me");
    currentUser = result.user || null;
  } catch (error) {
    // Clear an expired or invalid saved session.
    token = "";
    currentUser = null;
    localStorage.removeItem("booknest_token");
  }

  renderAccount();
  renderReviews();
}

function updateAuthMode() {
  $("authTitle").textContent =
    authMode === "login" ? "Welcome back" : "Create your account";

  $("authHint").textContent =
    authMode === "login"
      ? "Log in to share reviews with the community."
      : "Join readers sharing thoughtful recommendations.";

  $("authSubmit").textContent =
    authMode === "login" ? "Log in" : "Create account";

  $("switchText").textContent =
    authMode === "login" ? "New here?" : "Already have an account?";

  $("switchAuth").textContent =
    authMode === "login" ? "Create an account" : "Log in";

  $("authPassword").autocomplete =
    authMode === "login" ? "current-password" : "new-password";

  $("authMessage").textContent = "";
}

async function logout() {
  try {
    await api("/auth/logout", { method: "POST" });
  } catch {
    // Clear the local session even if the logout request fails.
  }

  token = "";
  currentUser = null;
  localStorage.removeItem("booknest_token");

  renderAccount();
  renderReviews();
  toast("You have logged out.");
}

function startReview(bookId) {
  if (!currentUser) {
    authMode = "login";
    updateAuthMode();
    showModal("authModal");
    toast("Log in first to publish a review.");
    return;
  }

  // Never call .find() on an undefined value.
  const bookList = Array.isArray(books) ? books : [];
  const book = bookList.find(
    (item) => String(item.id) === String(bookId)
  );

  $("bookTitle").value = book?.title || "";
  $("bookAuthor").value = book?.author || "";
  $("bookGenre").value = book?.genre || "Fiction";
  $("reviewBody").value = "";
  $("reviewMessage").textContent = "";

  showModal("reviewModal");
}

$("switchAuth").addEventListener("click", () => {
  authMode = authMode === "login" ? "signup" : "login";
  updateAuthMode();
});

document.querySelectorAll("[data-close]").forEach((button) => {
  button.addEventListener("click", () => {
    hideModal(button.dataset.close);
  });
});

document.querySelectorAll(".modal-backdrop").forEach((backdrop) => {
  backdrop.addEventListener("click", (event) => {
    if (event.target === backdrop) hideModal(backdrop.id);
  });
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    document.querySelectorAll(".modal-backdrop").forEach((modal) => {
      modal.classList.add("hidden");
    });
  }
});

$("searchInput").addEventListener("input", renderBooks);
$("genreFilter").addEventListener("change", renderBooks);

$("writeReview").addEventListener("click", () => {
  startReview("");
});

$("authForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  const message = $("authMessage");
  message.textContent = "Please wait…";
  $("authSubmit").disabled = true;

  try {
    const result = await api(`/auth/${authMode}`, {
      method: "POST",
      body: JSON.stringify({
        email: $("authEmail").value.trim(),
        password: $("authPassword").value,
      }),
    });

    if (result.session?.access_token) {
      token = result.session.access_token;
      localStorage.setItem("booknest_token", token);
    }

    if (!result.session && authMode === "signup") {
      message.textContent =
        "Account created. If email confirmation is enabled in Supabase, " +
        "verify your email, then log in.";
      return;
    }

    await refreshUser();

    if (!currentUser) {
      message.textContent =
        "Login could not be verified. Please try logging in again.";
      return;
    }

    hideModal("authModal");
    toast(authMode === "login"
      ? "Welcome back!"
      : "Account created successfully!");

    await loadData();
  } catch (error) {
    message.textContent = error.message;
  } finally {
    $("authSubmit").disabled = false;
  }
});

$("reviewForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  const message = $("reviewMessage");
  message.textContent = "Publishing…";

  try {
    await api("/reviews", {
      method: "POST",
      body: JSON.stringify({
        title: $("bookTitle").value.trim(),
        author: $("bookAuthor").value.trim(),
        genre: $("bookGenre").value,
        rating: Number($("reviewRating").value),
        body: $("reviewBody").value.trim(),
      }),
    });

    hideModal("reviewModal");
    toast("Your review has been published.");
    await loadData();
  } catch (error) {
    message.textContent = error.message;

    if (error.status === 401) {
      token = "";
      currentUser = null;
      localStorage.removeItem("booknest_token");

      renderAccount();
      renderReviews();

      hideModal("reviewModal");
      authMode = "login";
      updateAuthMode();
      showModal("authModal");
      toast("Your session expired. Please log in again.");
    }
  }
});

(async () => {
  try {
    await api("/health");
  } catch {
    // The page will show connection errors if the backend is unavailable.
  }

  await refreshUser();
  await loadData();
})();
