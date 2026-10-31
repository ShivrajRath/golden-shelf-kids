# Golden Shelf Kids

**A free, curated online library of 8,750+ age-appropriate books for children and teens.**

Browse by age, search by title, author, or topic, filter by fiction/non-fiction, and explore categories — then jump to a book's own page for a summary, rating, and one-click links to your local library.

**Website:** https://novicelab.org/golden-shelf-kids/

---

## What's inside

- **8,750 curated titles** across five age bands: **Ages 0–3**, **3–5**, **5–8**, **8–12**, and **Teens**.
- Every book is rated **4.0+ on Goodreads** with **500+ ratings**, so you're starting from books families already love.
- Fiction and non-fiction, tagged with categories like Animals, Fantasy & Magic, Science, History, Mystery, Poetry, and more.
- A dedicated page for every book with a cover, summary, key takeaways, publication year, page count, and Goodreads link.
- **"Find it at your library"** panel linking to six library systems, with live availability where the catalog allows it.

## How to use the site

1. **Pick an age group** at the top of the page. Each age band has its own color theme.
2. **Search** by title, author, or category using the search box.
3. **Filter** by Fiction / Non-fiction, or pick one or more **category pills**.
4. **Sort** by highest rated, most reviewed, or title A–Z.
5. **Load more** to see additional books (24 at a time).
6. **Click a book card** to open its detail page.
7. Use the **back/forward buttons** in your browser — your filters are saved in the URL, so you can share a filtered view (for example, `?age=5-8&category=Animals&type=fiction`).

## Age bands

| Band | Who it's for |
| --- | --- |
| Ages 0–3 | Babies and toddlers — board books, bedtime, first words |
| Ages 3–5 | Preschoolers — picture books, play, imagination |
| Ages 5–8 | Newly independent readers — chapter books, adventure |
| Ages 8–12 | Middle grade — novels, mysteries, non-fiction |
| Teens | Young adult fiction and non-fiction |

## Book detail pages

Each book has its own page with:

- Cover image and title/author
- Age group, fiction/non-fiction badge, and categories
- Publication year and page count
- Goodreads rating and a link to read more reviews
- A short summary and key takeaways
- A **"Find it at your library"** panel

## Library availability ("Find it at your library")

Every book page links to six library systems so you can borrow, place a hold, view a digital copy, or just check the catalog:

- Frisco Public Library
- The Colony Public Library
- Little Elm Public Library
- Plano Public Library System
- Harris County Public Library
- Houston Public Library

For three of these (Frisco, Harris County, Plano) the site can show **live availability** — how many copies are available and how many holds exist. For the other three, a **Check** button opens that library's catalog search for the book.

- **On the live website (GitHub Pages)** availability is shown as **Check** buttons only — no stale numbers are ever displayed.
- **Running locally** with `python3 serve.py` enables live lookups for the three catalogs that allow automated access.

The site never stores library cards or PINs; checkout and holds happen on the library's own website after you sign in.

## Frequently asked questions

**Is it free?** Yes. The site is free to use and has no ads or accounts.

**Where do the ratings come from?** Goodreads (rating and number of ratings).

**Where do covers come from?** Open Library cover images; a title-based fallback is used if a cover is missing.

**Can I suggest a book or report an error?** Please open an issue on the GitHub repository, or contact the maintainer.

**Does it work on mobile?** Yes — the layout is fully responsive.

**Why are some books missing covers?** Cover images come from Open Library and may not exist for every title; a placeholder is shown instead.

## Credits

- Curated and maintained by **Shivraj Rath**.
- Book data: Open Library and Goodreads.
- Library catalogs: Frisco, Harris County, Plano, The Colony, Little Elm, and Houston public libraries.

---

*Golden Shelf Kids is an independent, non-commercial project and is not affiliated with any library system or publisher.*
