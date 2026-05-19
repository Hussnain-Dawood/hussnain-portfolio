# Hussnain Dawood — Portfolio & Blog

Personal portfolio and blog for **Hussnain Dawood**, Full Stack Developer.

- **Live site:** https://hussnaindawood.pages.dev
- **CMS:** https://hussnaindawood.pages.dev/admin
- **Stack:** Astro 6 · TypeScript · Plain CSS · Sveltia CMS · Cloudflare Pages + Workers

---

## Table of Contents

1. [Local Development](#1-local-development)
2. [Project Structure](#2-project-structure)
3. [Create the GitHub Repository](#3-create-the-github-repository)
4. [Deploy to Cloudflare Pages](#4-deploy-to-cloudflare-pages)
5. [Set Up the GitHub OAuth App](#5-set-up-the-github-oauth-app)
6. [Deploy the Cloudflare Worker (Auth Proxy)](#6-deploy-the-cloudflare-worker-auth-proxy)
7. [Finish the CMS Configuration](#7-finish-the-cms-configuration)
8. [How to Publish a Blog Post](#8-how-to-publish-a-blog-post)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. Local Development

**Prerequisites:** Node.js 18+ and npm.

```bash
# Clone the repo
git clone https://github.com/Hussnain-Dawood/hussnain-portfolio.git
cd hussnain-portfolio

# Install dependencies
npm install

# Start the dev server (http://localhost:4321)
npm run dev

# Build the static site
npm run build

# Preview the build locally
npm run preview
```

### Writing blog posts locally

Add `.md` or `.mdx` files to `src/content/blog/`. Set `draft: true` to keep a
post out of the public build while you work on it.

---

## 2. Project Structure

```
hussnain-portfolio/
├── public/
│   ├── admin/
│   │   ├── index.html          # Sveltia CMS entry point
│   │   └── config.yml          # CMS collection schema
│   ├── images/uploads/         # Media uploaded via the CMS
│   ├── favicon.svg
│   └── robots.txt
├── src/
│   ├── components/
│   │   ├── sections/           # Hero, About, Experience, Skills, Education, Projects, Contact
│   │   ├── BlogCard.astro
│   │   ├── Footer.astro
│   │   ├── Header.astro
│   │   └── SEO.astro
│   ├── content/
│   │   └── blog/               # Markdown blog posts live here
│   ├── layouts/
│   │   ├── BaseLayout.astro
│   │   └── BlogPostLayout.astro
│   ├── pages/
│   │   ├── index.astro         # Single-page homepage (all 7 sections)
│   │   └── blog/
│   │       ├── index.astro     # Blog list
│   │       └── [...slug].astro # Individual posts
│   ├── styles/
│   │   └── global.css          # All design tokens (CSS custom properties)
│   └── content.config.ts       # Blog schema (Astro Content Layer API)
├── cloudflare-worker/
│   ├── worker.js               # GitHub OAuth proxy
│   └── wrangler.toml
├── astro.config.mjs
├── package.json
└── tsconfig.json
```

---

## 3. Create the GitHub Repository

1. Go to https://github.com/new
2. Name the repo `hussnain-portfolio` (must match `repo:` in `config.yml`)
3. Set to **Public** (Sveltia CMS requires public repo access on the free GitHub plan)
4. **Do not** initialise with README (you already have one)
5. Push the project:

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/Hussnain-Dawood/hussnain-portfolio.git
git branch -M main
git push -u origin main
```

---

## 4. Deploy to Cloudflare Pages

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Pages**.
2. Connect your GitHub account and select the `hussnain-portfolio` repository.
3. Set the build settings:
   | Setting | Value |
   |---------|-------|
   | Framework preset | Astro |
   | Build command | `npm run build` |
   | Build output directory | `dist` |
4. Click **Save and Deploy**.
5. Once deployed, your site is live at `hussnain-portfolio.pages.dev`
   (you can add a custom domain later under **Custom domains**).

Every push to `main` triggers an automatic rebuild — no extra CI needed.

---

## 5. Set Up the GitHub OAuth App

The CMS needs a GitHub OAuth App so users can log in.

1. Go to **GitHub → Settings → Developer settings → OAuth Apps → New OAuth App**.
2. Fill in:
   | Field | Value |
   |-------|-------|
   | Application name | `hussnain-portfolio CMS` |
   | Homepage URL | `https://hussnaindawood.pages.dev` |
   | Authorization callback URL | `https://YOUR-AUTH-WORKER.workers.dev/callback` *(fill in after step 6)* |
3. Click **Register application** and note the **Client ID**.
4. Click **Generate a new client secret** and save it — you only see it once.

---

## 6. Deploy the Cloudflare Worker (Auth Proxy)

The worker acts as the OAuth middleman between the CMS and GitHub.

**Install Wrangler (Cloudflare CLI):**

```bash
npm install -g wrangler
wrangler login
```

**Deploy the worker:**

```bash
cd cloudflare-worker
wrangler deploy
```

Note the URL shown in the output, e.g. `https://sveltia-cms-auth.YOUR-SUBDOMAIN.workers.dev`.

**Set the GitHub credentials as secrets** (never committed to the repo):

```bash
wrangler secret put GITHUB_CLIENT_ID
# Paste the Client ID from step 5 when prompted

wrangler secret put GITHUB_CLIENT_SECRET
# Paste the Client Secret from step 5 when prompted
```

**Update the GitHub OAuth App callback URL** (GitHub → Settings → Developer settings → OAuth Apps):
- Set **Authorization callback URL** to `https://sveltia-cms-auth.YOUR-SUBDOMAIN.workers.dev/callback`

---

## 7. Finish the CMS Configuration

Open `public/admin/config.yml` and replace the placeholder:

```yaml
backend:
  base_url: https://sveltia-cms-auth.YOUR-SUBDOMAIN.workers.dev  # ← paste your Worker URL here
```

Commit and push. Cloudflare Pages will redeploy automatically.

---

## 8. How to Publish a Blog Post

1. Go to `https://hussnaindawood.pages.dev/admin`
2. Click **Login with GitHub** — you'll be redirected to GitHub to authorise.
3. Click **Blog Posts** → **New Blog Posts**.
4. Fill in the title, date, content, tags, etc.
5. Set **Draft** to `false` when ready to publish.
6. Click **Save** (top right) — Sveltia CMS commits the markdown file to GitHub.
7. Cloudflare Pages detects the new commit and rebuilds the site in ~1–2 minutes.
8. The new post appears at `https://hussnaindawood.pages.dev/blog`.

### To edit an existing post

Open the CMS → **Blog Posts** → click the post title → edit → **Save**.

### To unpublish / delete a post

Set `draft: true` and save, or delete the file via the CMS file browser.

---

## 9. Troubleshooting

### "Login with GitHub" goes to a blank page or 404

- Confirm the Worker is deployed: `wrangler deploy` from `cloudflare-worker/`.
- Confirm `base_url` in `config.yml` matches the Worker URL exactly (no trailing slash).
- Confirm the GitHub OAuth App callback URL ends in `/callback`.

### The CMS saves a post but the site doesn't update

- Check the **Pages deployments** tab in the Cloudflare Dashboard — if it shows "Failed", click to see the build log.
- Most common cause: a TypeScript error in a newly added page. Run `npm run build` locally to reproduce.

### `npm run build` fails with a content collection error

- Make sure every `.md` file in `src/content/blog/` has all **required** frontmatter fields: `title` and `date`.
- Run `npm run dev` and check the terminal for the specific file and field that is failing Zod validation.

### Images uploaded in the CMS don't appear

- Uploaded images go to `public/images/uploads/` and are committed to the repo.
- Wait for the Cloudflare Pages rebuild to complete (check the deployments tab).
- Make sure `media_folder` and `public_folder` in `config.yml` are correct.

### The sitemap is missing from the build

- The `@astrojs/sitemap` integration only generates a sitemap if `site:` is set in `astro.config.mjs`.
- Confirm `site: 'https://hussnaindawood.pages.dev'` is present.

---

## Adding More Sections / Content

- **New project card:** Edit `src/components/sections/ProjectsSection.astro` — add to the `projects` array.
- **New skill:** Edit `src/components/sections/SkillsSection.astro` — add to the relevant `skills` array.
- **New experience:** Edit `src/components/sections/ExperienceSection.astro` — add to the `experiences` array.
- **New certification:** Edit `src/components/sections/EducationSection.astro` — add to the `certifications` array.

---

*Built with [Astro](https://astro.build) · Deployed on [Cloudflare Pages](https://pages.cloudflare.com) · CMS by [Sveltia CMS](https://github.com/sveltia/sveltia-cms)*
