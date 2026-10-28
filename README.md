# BookNest — Book Review Community

BookNest is a beginner-friendly full-stack application where readers can discover books, search by title or author, publish a rating and written review, and read reviews shared by the community.

## 1. Problem and objectives

Readers often look in several places to find opinions about a book. BookNest brings book details, star ratings, and reader-written reviews into one simple community.

### Intended users
- **Visitors:** browse and search the public book shelf and read reviews.
- **Registered readers:** all visitor features plus publish reviews and delete their own reviews.

There is no separate administrator role in this MVP.

## 2. Features implemented

- Responsive landing page with book cards and recent reviews.
- Search books by title/author and filter by genre.
- Supabase Auth email/password registration and login.
- Create a book entry automatically when a reader reviews a new title.
- One review per user per book; rating from 1–5 and review text from 10–3000 characters.
- Read community reviews and delete your own review.
- Server-side validation, bearer-token verification, ownership checks, rate limiting, Helmet security headers, and database constraints.

**MVP limitations:** review editing, password reset UI, comments, likes, book-cover uploads, moderation/admin dashboard, pagination, and automated integration tests are not included. The starter shelf contains four sample book records; you can remove them in Supabase.

## 3. Technology stack

- HTML5, CSS3, Vanilla JavaScript
- Node.js (20 or newer) and Express.js
- Supabase Auth and Supabase PostgreSQL
- Git and GitHub

No frontend framework or external book API is used. A Google Fonts import is used only for visual typography; the app's core functionality does not depend on it.

## 4. Folder structure

```text
book-review-community/
├── frontend/
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── backend/
│   ├── middleware/auth.js
│   ├── routes/auth.js
│   ├── routes/books.js
│   ├── routes/reviews.js
│   ├── server.js
│   ├── supabase.js
│   ├── package.json
│   ├── .env.example
│   └── .gitignore
├── database/schema.sql
├── .gitignore
└── README.md
```

`backend/.env` is created locally by you and is intentionally not included in this ZIP.

## 5. Prerequisites

Install these on Windows:
- Visual Studio Code: https://code.visualstudio.com/
- Node.js LTS (includes npm): https://nodejs.org/en
- Git: https://git-scm.com/download/win
- Supabase account: https://supabase.com/

Verify installations in a new VS Code terminal:
```bash
node --version
npm --version
git --version
```
Node should be version 20 or newer.

## 6. Create and configure Supabase

1. Sign in at https://supabase.com/ and create a new project.
2. Choose a project name and a strong database password. Save the database password privately; this app does not need it directly.
3. Wait for the project to finish provisioning.
4. Open **SQL Editor**, choose **New query**, paste all of `database/schema.sql`, and click **Run**.
5. Open **Table Editor** and verify that `profiles`, `books`, and `reviews` exist. Four starter books should appear in `books`.
6. Open **Project Settings → API** (the exact menu label can change). Copy the Project URL and the server-side service-role/secret key. Copy the anon/publishable key if shown; it is only used for the optional logout request. Never put a service-role/secret key in frontend files or GitHub.
7. In **Authentication → Providers**, make sure Email is enabled. For easiest local classroom testing, you can temporarily turn off email confirmation in the Supabase Auth settings. If confirmation remains enabled, users must confirm their email before logging in. Re-enable confirmation for a public deployment.

## 7. Environment variables

In VS Code, open `backend/.env.example`, copy its contents into a new file named `backend/.env`, and replace the example values:

```dotenv
PORT=3000
NODE_ENV=development
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=PASTE_YOUR_SERVER_ONLY_SERVICE_ROLE_KEY
SUPABASE_ANON_KEY=PASTE_YOUR_ANON_OR_PUBLISHABLE_KEY
CORS_ORIGIN=
```

- `PORT`: local web server port.
- `NODE_ENV`: `development` while learning; use `production` for deployment.
- `SUPABASE_URL`: project URL from your Supabase dashboard.
- `SUPABASE_SERVICE_ROLE_KEY`: privileged key used only by the backend. Treat it like a password.
- `SUPABASE_ANON_KEY`: public/anon key, used only for the logout helper; do not use it as the service key.
- `CORS_ORIGIN`: leave empty for same-origin local use.

Do not share `.env`, screenshots containing keys, or the database password. If a key is exposed, rotate it in Supabase immediately.

## 8. Install and start the app

1. Extract the ZIP file to a folder you can find, such as `Documents`.
2. In VS Code, choose **File → Open Folder** and open `book-review-community`.
3. Choose **Terminal → New Terminal**. The terminal should be at the project root.
4. Install backend packages:
   ```bash
   cd backend
   npm install
   ```
5. Confirm `backend/.env` is configured.
6. Check JavaScript syntax:
   ```bash
   npm run check
   ```
   A successful check exits without syntax errors.
7. Start the server:
   ```bash
   npm start
   ```
   Expected terminal message: `BookNest running at http://localhost:3000`
8. Open **http://localhost:3000** in your browser. Do not open `index.html` directly from File Explorer; use the server URL.
9. Check **http://localhost:3000/api/health**. Expected JSON contains `"status":"ok"`.
10. If the page shows a database error, inspect the terminal for the real server-side error and verify the Supabase URL/key and that the SQL script ran.

For development with automatic server restart, use `npm run dev` instead of `npm start`.

## 9. Architecture

```text
Browser (HTML/CSS/Vanilla JS)
       | fetch() + JSON + bearer token
       v
Express REST API (Node.js)
       | verifies user with Supabase Auth
       | checks ownership before deleting
       v
Supabase PostgreSQL + Supabase Auth
```

The browser never connects with the privileged database key. Express uses the server-side service-role key, so its route authorization checks are essential. RLS is enabled on all application tables as defense in depth; no direct browser policies are created because the app uses the backend API.

## 10. API reference

All responses are JSON. Private endpoints require `Authorization: Bearer <access_token>`.

| Method | Path | Purpose | Access |
|---|---|---|---|
| GET | `/api/health` | Health check | Public |
| POST | `/api/auth/signup` | Create email/password account | Public; rate-limited |
| POST | `/api/auth/login` | Log in | Public; rate-limited |
| GET | `/api/auth/me` | Verify session and return user | Logged-in user |
| POST | `/api/auth/logout` | Sign out/revoke session where supported | Logged-in user |
| GET | `/api/books` | List books with review counts | Public |
| GET | `/api/reviews` | List latest reviews | Public |
| POST | `/api/reviews` | Add a review; creates the book if needed | Logged-in user |
| DELETE | `/api/reviews/:id` | Delete a review | Owner only |

### Example review request
```json
{
  "title": "The Hobbit",
  "author": "J. R. R. Tolkien",
  "genre": "Fantasy",
  "rating": 5,
  "body": "A wonderful adventure with memorable characters."
}
```

Typical errors: `400` invalid data, `401` missing/invalid session, `404` review missing or not owned, `409` duplicate review, `429` too many requests, and `500` server/configuration error.

## 11. Database design

- `profiles`: public display name connected to `auth.users.id`.
- `books`: unique title/author pair and genre.
- `reviews`: authoring user, book, rating, review text, timestamps, and a uniqueness rule preventing duplicate reviews by one user for the same book.

Foreign keys cascade when a user or book is deleted. Check constraints validate ratings, genres, and text lengths. Indexes support common lookups.

## 12. Manual test checklist

- [ ] `/api/health` returns status `ok`.
- [ ] Home page loads books from Supabase.
- [ ] Search by a title and author works; genre filter works.
- [ ] Create an account and log in successfully.
- [ ] Publish a review with valid fields; it appears under Recent reviews.
- [ ] Review a new title; a book entry is created.
- [ ] Rating outside 1–5, blank fields, or a review shorter than 10 characters is rejected.
- [ ] Try reviewing the same book again with the same account; the duplicate is rejected.
- [ ] Log out; attempting to publish a review asks you to log in.
- [ ] Delete your own review after confirmation.
- [ ] Try deleting a review ID belonging to another user using an API client; it must not delete that review.
- [ ] Test on a narrow/mobile browser width.
- [ ] Temporarily use an incorrect Supabase URL in `.env`; confirm the app reports a connection issue, then restore the correct value.

This is a starter project, not a security audit. Before public deployment, add password reset, stricter production CSP/CORS configuration, moderation, and further automated tests.

## 13. Troubleshooting

- **`Missing SUPABASE_URL...`**: confirm the file is named `backend/.env`, not `.env.txt`, and variable names match exactly.
- **`Invalid API key` / `401` from Supabase**: copy credentials from the correct project and restart Node after editing `.env`.
- **Tables missing**: rerun `database/schema.sql` in the correct Supabase project's SQL Editor.
- **Email confirmation prevents login**: confirm the signup email or adjust Supabase Auth email-confirmation settings for local learning.
- **Port already in use**: change `PORT=3001` in `.env` and open `http://localhost:3001`.
- **`npm` not recognized**: install Node.js LTS, close and reopen VS Code, and check `node --version`.
- **No books/reviews**: check the terminal logs, Supabase project URL, key, and SQL setup.

## 14. Upload to GitHub safely

1. Create an empty repository at https://github.com/new. Do not add a README there if you already have this one locally.
2. In the VS Code terminal, go to the project root (use `cd ..` if you are currently inside `backend`).
3. Run:
   ```bash
   git init
   git status
   git add .
   git status
   git commit -m "Build BookNest book review community"
   git branch -M main
   git remote add origin YOUR_GITHUB_REPOSITORY_URL
   git push -u origin main
   ```
4. Replace `YOUR_GITHUB_REPOSITORY_URL` with the HTTPS URL for your repository.
5. Check the GitHub page and confirm all expected project files appear.

Before `git add .`, verify that `backend/.env` and `node_modules/` are not staged. `.gitignore` does not remove a secret that was committed earlier. If you exposed a key, rotate it immediately and remove it from repository history as needed.

## 15. Future improvements

- Edit reviews and add a user profile page.
- Add average ratings and sorting by popularity.
- Add pagination and more robust book de-duplication.
- Add password reset, moderation/reporting, and accessible confirmation dialogs.
- Add automated API tests and a deployment guide.
