# Project Scope — Hussnain Dawood Portfolio & Blog

> This document is the build specification for an AI coding assistant (Claude Code).
> Build the project exactly to this spec. Where a choice is not specified, pick the
> simplest, most maintainable option and note it in a code comment.

---

## 1. Goal

Build a fast, SEO-friendly **portfolio + blog website** for Hussnain Dawood, a Full
Stack Developer. The site must include a **content dashboard** so a non-technical
person can write and publish blog posts without editing code or using Git directly.

## 2. Hard Constraints

- **Cost: $0/month, permanently.** No paid services, no credit card required.
- **Client-editable blog.** A non-technical user must be able to create, edit, and
  publish blog posts through a web dashboard.
- **Publicly hosted** with a working URL.
- **Static site** (pre-rendered HTML) for speed and SEO.

## 3. Tech Stack (required — do not substitute)

| Layer            | Choice                                  |
|------------------|-----------------------------------------|
| Framework        | Astro (latest v4+), `output: 'static'`  |
| Language         | TypeScript (strict)                     |
| Content          | Markdown/MDX files in the repo          |
| Content schema   | Astro Content Layer API (`glob` loader) |
| CMS dashboard    | **Sveltia CMS** (NOT Netlify/Decap CMS) |
| Repo host        | GitHub                                  |
| Site host        | Cloudflare Pages                        |
| CMS auth         | Sveltia auth proxy on Cloudflare Workers|
| Styling          | Plain CSS with CSS custom properties    |

> Important: Do NOT use `netlify-cms` or `decap-cms` — both are unmaintained/deprecated.
> Use Sveltia CMS, which reads the same `config.yml` format.

## 4. Architecture / Content Flow

```
Client writes post in Sveltia CMS  ->  commits markdown to GitHub
   ->  Cloudflare Pages auto-rebuilds  ->  live site updates
Cloudflare Worker handles "Login with GitHub" for the CMS.
```

## 5. Pages

| Route          | Purpose                                                      |
|----------------|--------------------------------------------------------------|
| `/`            | Home — hero, featured projects, recent blog posts            |
| `/about`       | Bio, experience, education, skills, certifications           |
| `/projects`    | All projects as cards                                        |
| `/blog`        | List of all published blog posts (newest first)              |
| `/blog/[slug]` | Individual blog post (generated from markdown)               |
| `/contact`     | Contact info + links (no backend form; use mailto: link)     |
| `/admin`       | Sveltia CMS dashboard (static `index.html` + `config.yml`)   |

## 6. Components & Layouts

- `BaseLayout.astro` — html shell, fonts, SEO, header, footer
- `BlogPostLayout.astro` — layout for a single post
- `Header.astro` — sticky nav, active-link state, mobile menu
- `Footer.astro` — brand, social links, copyright
- `SEO.astro` — meta tags, Open Graph, Twitter card, JSON-LD
- `ProjectCard.astro` — single project card
- `BlogCard.astro` — single blog post preview in the list

## 7. Blog System

Blog posts are markdown files in `src/content/blog/`. Each post's frontmatter:

```yaml
title: string            # required
date: date               # required
author: string           # default "Hussnain Dawood"
category: string          # optional
tags: string[]            # optional
featuredImage: string     # optional, path to image
excerpt: string           # optional, short summary
metaTitle: string         # optional, SEO override
metaDescription: string   # optional, SEO override
draft: boolean            # default false; drafts excluded from build
```

Define this in `src/content.config.ts` with the Content Layer API and a Zod schema.
The blog list and home page must exclude posts where `draft: true`.

## 8. SEO Requirements

- Unique `<title>` and meta description per page
- Open Graph + Twitter Card tags
- JSON-LD: `Person` schema sitewide, `Article` schema on blog posts
- `@astrojs/sitemap` integration -> `sitemap-index.xml`
- `public/robots.txt` pointing to the sitemap
- Canonical URL on every page

## 9. CMS Setup (Sveltia)

Create `public/admin/index.html`:
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Content Manager</title>
  </head>
  <body>
    <script src="https://unpkg.com/@sveltia/cms/dist/sveltia-cms.js" type="module"></script>
  </body>
</html>
```

Create `public/admin/config.yml`:
```yaml
backend:
  name: github
  repo: Hussnain-Dawood/hussnain-portfolio   # update if repo name differs
  branch: main
  base_url: https://AUTH-WORKER-URL.workers.dev  # set after deploying the Worker

media_folder: "public/images/uploads"
public_folder: "/images/uploads"

collections:
  - name: "blog"
    label: "Blog Posts"
    folder: "src/content/blog"
    create: true
    slug: "{{slug}}"
    fields:
      - { label: "Title", name: "title", widget: "string" }
      - { label: "Publish Date", name: "date", widget: "datetime" }
      - { label: "Author", name: "author", widget: "string", default: "Hussnain Dawood" }
      - { label: "Category", name: "category", widget: "string", required: false }
      - { label: "Tags", name: "tags", widget: "list", required: false }
      - { label: "Featured Image", name: "featuredImage", widget: "image", required: false }
      - { label: "Excerpt", name: "excerpt", widget: "text", required: false }
      - { label: "Meta Title", name: "metaTitle", widget: "string", required: false }
      - { label: "Meta Description", name: "metaDescription", widget: "text", required: false }
      - { label: "Draft", name: "draft", widget: "boolean", default: false }
      - { label: "Body", name: "body", widget: "markdown" }
```

## 10. Cloudflare Worker — Auth Proxy

The CMS needs a GitHub OAuth proxy. Use the open-source **Sveltia CMS Authenticator**
Worker. In a `cloudflare-worker/` folder, include the Worker code and a `wrangler.toml`.
Document in the README:
1. Create a GitHub OAuth App (callback URL = the Worker URL).
2. Deploy the Worker, set `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` as secrets.
3. Put the deployed Worker URL into `config.yml` `base_url`.

## 11. Design

- **Style:** modern, clean, professional. Blue & white palette.
- **Light theme.** Define all colors as CSS custom properties in one file.
- Distinctive but readable fonts (a display font + a clean body font; not Arial/Roboto).
- Fully responsive: mobile, tablet, desktop. Mobile nav menu.
- Subtle, tasteful animation only (page-load fades, hover states). No clutter.
- Accessible: semantic HTML, alt text, visible focus states, good contrast.

## 12. Personal Content

```
Name:      Hussnain Dawood
Title:     Full Stack Developer | App Developer
Location:  Lahore, Pakistan
Email:     hussnaindawood2@gmail.com
GitHub:    https://github.com/Hussnain-Dawood
LinkedIn:  https://www.linkedin.com/in/hussnaindawood
Site URL:  https://hussnaindawood.pages.dev
```

**Bio (About page):** Software Engineering student at COMSATS University Islamabad
(2023–2027). MERN stack developer with internship experience. Comfortable in
JavaScript/TypeScript, C++, Python, SQL. Strong DSA foundation. Seeking internship
and entry-level roles.

**Experience:**
- MERN Stack Intern — Octalogicx Pvt. Ltd (Jul–Aug 2025)
- Digital Marketing Intern — Greenfuel Energy (Jan–Feb 2025)

**Projects (feature all 4, leave room to add more):**
1. Online Appointment System — full-stack booking system, automated scheduling,
   secure auth; improved booking efficiency ~40%. (MERN)
2. Car Rental System — database-driven rental management, user registration,
   inventory, admin panel. (PHP, MySQL)
3. Car Parking System — C++ parking-lot simulation, vehicle tracking, fee
   calculation. (C++, OOP, DSA)
4. Freelancing Platform — full-stack freelancing marketplace; 1,000+ users in
   first month. (HTML, CSS, JavaScript)

**Skills:** JavaScript, TypeScript, Python, C++, SQL, React.js, Node.js, Express.js,
MongoDB, Flutter, Git & GitHub, Postman, JIRA, Selenium, DSA, OOP, REST APIs, SEO.

**Certifications:** Python Programming (U. of Michigan/Coursera), Web Developers
(Johns Hopkins), Web Scraping (ParseHub Academy), SEO & Freelancing (DigiSkills.pk),
Ethical Hacking Essentials (EC-Council), Product Ambassador (Insite).

## 13. Deliverables

1. Complete, runnable Astro project (`npm install` then `npm run dev` works).
2. At least one sample blog post in `src/content/blog/` so the blog renders.
3. `public/admin/` with Sveltia CMS configured.
4. `cloudflare-worker/` with the auth proxy code.
5. `README.md` covering: local setup, GitHub repo creation, Cloudflare Pages deploy,
   GitHub OAuth App + Worker deploy, how to invite the client, how the client
   publishes a post, and a troubleshooting section.
6. `.gitignore`, `tsconfig.json`, `astro.config.mjs` (with `site` set to the URL).

## 14. Acceptance Criteria

- [ ] `npm run build` completes with no errors.
- [ ] All 6 main pages render and are linked in the nav.
- [ ] Blog posts generate from markdown; `draft: true` posts are excluded.
- [ ] `/admin` loads the Sveltia CMS interface.
- [ ] `sitemap-index.xml` and `robots.txt` are present in the build output.
- [ ] Every page has unique title + meta description + canonical URL.
- [ ] Site is responsive with a working mobile menu.
- [ ] No console errors in the browser.

## 15. Out of Scope

- Custom domain (use the free `.pages.dev` subdomain).
- Writing real blog content (one sample post only).
- A server-side contact form (use a `mailto:` link).
- Dark mode.

---

## Suggested Build Order

1. Scaffold Astro project + config + `tsconfig` + `.gitignore`.
2. Global CSS (design tokens) + `BaseLayout` + `Header` + `Footer` + `SEO`.
3. Home, About, Projects, Contact pages.
4. Content schema + `BlogPostLayout` + `/blog` list + `/blog/[slug]` + sample post.
5. `robots.txt` + verify sitemap.
6. Sveltia CMS (`/admin`) + Cloudflare Worker auth proxy.
7. `README.md`.
8. Run `npm run build` and fix anything that fails the acceptance criteria.
