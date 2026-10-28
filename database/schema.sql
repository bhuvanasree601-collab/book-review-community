-- BookNest / Book Review Community database
-- Run this entire script in Supabase Dashboard > SQL Editor > New query.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Reader' check (char_length(display_name) between 1 and 60),
  created_at timestamptz not null default now()
);

create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 1 and 120),
  author text not null check (char_length(trim(author)) between 1 and 100),
  genre text not null default 'Other' check (genre in ('Fiction','Fantasy','Science','Self-help','Mystery','Romance','Other')),
  created_at timestamptz not null default now(),
  unique (title, author)
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  body text not null check (char_length(trim(body)) between 10 and 3000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint one_review_per_user_per_book unique (user_id, book_id)
);

create index if not exists books_title_search_idx on public.books using btree (title);
create index if not exists books_author_search_idx on public.books using btree (author);
create index if not exists reviews_created_at_idx on public.reviews (created_at desc);
create index if not exists reviews_book_id_idx on public.reviews (book_id);
create index if not exists reviews_user_id_idx on public.reviews (user_id);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
drop trigger if exists reviews_set_updated_at on public.reviews;
create trigger reviews_set_updated_at before update on public.reviews
for each row execute function public.set_updated_at();

-- Enable RLS as defense in depth. This app accesses data through the server-only
-- service-role key, and the Express backend checks user tokens and ownership.
-- Never expose that key to the browser.
alter table public.profiles enable row level security;
alter table public.books enable row level security;
alter table public.reviews enable row level security;

-- No anon/authenticated direct-table policies are created intentionally.
-- Direct browser access is not used by this app. Server-side service-role
-- access bypasses RLS, so authorization checks in backend routes are mandatory.
-- Optional starter shelf data (safe to delete later):
insert into public.books (title, author, genre) values
 ('The Little Prince', 'Antoine de Saint-Exupéry', 'Fiction'),
 ('Pride and Prejudice', 'Jane Austen', 'Romance'),
 ('The Hobbit', 'J. R. R. Tolkien', 'Fantasy'),
 ('A Brief History of Time', 'Stephen Hawking', 'Science')
on conflict (title, author) do nothing;
