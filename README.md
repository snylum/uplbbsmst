# BS Mathematics and Science Teaching — Program Website

An open-source, accessible, mobile-friendly website for a BS Mathematics and
Science Teaching program, inspired by the design language of
[uplb.edu.ph](https://uplb.edu.ph), [up.edu.ph](https://up.edu.ph), and
[cas.uplb.edu.ph](https://cas.uplb.edu.ph).

Every page pulls its editable text from a small content store, so the whole
site can be updated from a built-in **Admin** page — no code edits required —
restricted to a single authorized email address.

Built as a static site (plain HTML/CSS/JS, no build step) with
**Cloudflare Pages Functions** powering the admin login and content API, so
it deploys directly from GitHub to Cloudflare Pages for free.

---

## 1. What's inside

```
public/                 → the entire static site (this is your Pages "output directory")
  index.html, about.html, curriculum.html, faculty.html,
  admissions.html, news.html, contact.html
  admin/                → admin login + content editor (restricted access)
  partials/             → shared header/footer, injected via JS
  assets/               → css, js, images
  content.json           → default/fallback text content
  manifest.json          → describes which fields appear in the admin editor
functions/              → Cloudflare Pages Functions (serverless API)
  api/login.js            → admin sign-in (issues a signed session cookie)
  api/logout.js
  api/session.js          → checks if the current visitor is signed in
  api/content.js          → GET (public) / PUT (admin-only) site content
  api/contact.js          → stores contact form submissions
  _lib/auth.js             → password hashing + JWT session helpers
scripts/generate-password-hash.js → run locally to create your admin password
```

## 2. How the admin access control works

- There is **no username/password database** and no third-party auth
  provider — just one hard-coded authorized email, set by you as an
  environment variable (`ADMIN_EMAIL`).
- The password is never stored in plain text. You generate a salted
  SHA-256 hash locally (see step 4 below) and only the hash + salt are
  stored as environment variables.
- Signing in issues a signed, `HttpOnly`, `Secure` session cookie (HMAC
  signed with `JWT_SECRET`) valid for 8 hours. Only requests carrying a
  valid cookie **and** matching `ADMIN_EMAIL` can save content changes.
- The `/admin/` page is excluded from search engines via `robots.txt` and
  an `X-Robots-Tag` header, but note that **this does not make it secret**
  — the real protection is the login check on the server (`functions/api/*`).

## 3. Deploying — step by step

### A. Push to GitHub
1. Unzip this project.
2. Create a new **public or private** GitHub repository.
3. Push the contents of this folder (including `functions/` and `public/`)
   to that repository.

### B. Create the Cloudflare Pages project
1. In the Cloudflare dashboard, go to **Workers & Pages → Create → Pages →
   Connect to Git**, and select your repository.
2. Build settings:
   - **Framework preset:** None
   - **Build command:** *(leave empty)*
   - **Build output directory:** `public`
3. Cloudflare automatically detects the `functions/` folder and deploys it
   as Pages Functions — no extra configuration needed for that part.

### C. Create a KV namespace (for saving content + contact messages)
1. In the Cloudflare dashboard: **Workers & Pages → KV → Create namespace**.
   Name it e.g. `bsmst_content`.
2. Go to your Pages project → **Settings → Functions → KV namespace
   bindings** → add a binding:
   - **Variable name:** `CONTENT_KV`
   - **KV namespace:** the one you just created
3. Do this for both the **Production** and **Preview** environments.

> Without this KV binding, the site still works and displays the default
> content from `content.json`, but the admin **Save** button and the
> contact form's message log won't persist changes.

### D. Generate your admin password
You need Node.js installed locally for this one-time step:

```bash
node scripts/generate-password-hash.js "YourChosenPassword"
```

This prints `ADMIN_PASSWORD_SALT`, `ADMIN_PASSWORD_HASH`, and a random
`JWT_SECRET`. Keep the plain-text password somewhere safe (a password
manager) — it is not recoverable from the hash.

### E. Set environment variables
In your Pages project → **Settings → Environment variables**, add (for
both Production and Preview):

| Variable | Value |
|---|---|
| `ADMIN_EMAIL` | `snylumagbas@gmail.com` |
| `ADMIN_PASSWORD_SALT` | *(from step D)* |
| `ADMIN_PASSWORD_HASH` | *(from step D)* |
| `JWT_SECRET` | *(from step D, or any long random string)* |

Redeploy (or trigger a new deployment) after saving environment variables
and the KV binding — Cloudflare Pages Functions pick these up on the next
build.

### F. Sign in
Visit `https://your-site.pages.dev/admin/`, sign in with
`snylumagbas@gmail.com` and the password you chose, and start editing.
Every text field on the public pages that can be edited is listed there,
grouped by page.

## 4. Local preview (optional)

Since this uses Cloudflare-specific Functions, the most accurate local
preview uses Wrangler:

```bash
npm install -g wrangler
wrangler pages dev public --kv CONTENT_KV
```

Opening `public/index.html` directly in a browser also works for a quick
look at layout and styling, but the admin login and save features require
either `wrangler pages dev` or a real Cloudflare Pages deployment.

## 5. Accessibility & mobile notes

- Semantic landmarks (`header`, `nav`, `main`, `footer`), skip-to-content
  link, visible focus outlines, and `aria-current` on the active nav item.
- Color palette meets WCAG AA contrast for body text and buttons.
- Fully responsive from ~320px phones up through desktop, with a
  collapsible mobile navigation menu (keyboard- and screen-reader-friendly,
  `aria-expanded` state).
- Respects `prefers-reduced-motion`.
- All interactive elements (menu toggle, accordion, forms, buttons) are
  reachable and operable by keyboard alone.

## 6. Customizing further

- **Text content:** edit via `/admin/`, or edit `public/content.json`
  directly before your first deploy to change the defaults.
- **Colors/fonts:** edit the CSS variables at the top of
  `public/assets/css/styles.css`.
- **Pages/navigation:** edit `public/partials/header.html` and add new
  `.html` files following the existing page structure.
- **Add more editable fields:** add a `data-content="page.key"` attribute
  to any element in the HTML, add a default value under that key in
  `public/content.json`, and add a matching entry to `public/manifest.json`
  so it appears in the admin editor.

## License

Released under the MIT License — see `LICENSE`. Free to fork, adapt, and
reuse for your own program or institution.
