# SmartRisk Website

This repository documents the redesign of the SmartRisk website, a bilingual (Bahasa Indonesia / English) static site built with Hugo and deployed to GitHub Pages.

## Purpose

- Prepare a multilingual (EN/ID) website
- Redesign safely without impacting the live website

## Structure
```
smartrisk/
├── .github/
│   └── workflows/
│       └── hugo.yaml   ← GitHub Actions workflow for automated build and deploy
├── assets/
│   └── assets/     ← Assets needing processing in assets/assets/
│       ├── css/        ← Stylesheets (style.css, about.css, contact.css, team.css, 404.css)
│       └── js/         ← main.js (nav highlighting, scroll reveal, contact form)
├── content/            ← Page metadata (title, description, CSS) per page and language
│   ├── _index.md       ← Indonesian homepage
│   ├── about/
│   ├── contact/
│   ├── team/
│   └── en/             ← English content (contentDir for EN language)
├── i18n/
│   ├── id.toml         ← Indonesian UI strings
│   └── en.toml         ← English UI strings
├── layouts/
│   ├── _default/
│   │   └── baseof.html ← HTML shell (head, nav, main, footer)
│   ├── about/
│   ├── contact/
│   ├── team/
│   ├── partials/       ← Shared components: nav, footer, head, contact form
│   ├── index.html      ← Homepage layout (uses i18n strings)
│   ├── 404.html        ← Custom 404 error page
│   ├── robots.txt      ← robots.txt with sitemap reference
│   └── sitemap.xml     ← Custom sitemap template with hreflang alternates
├── static/
│   └── assets/     ← Assets not needing processing in static/assets/
│       ├── fonts/      ← Self-hosted Cal Sans and DM Sans woff2 files
│       └── images/     ← Logo and image assets
├── .gitignore
├── hugo.toml           ← Hugo config (baseURL, languages, build settings)
└── README.md
```

## Languages

- **Indonesian** (default): served at `fitrinad.github.io/smartrisk/`
- **English**: served at `fitrinad.github.io/smartrisk/en/`

All translatable strings are in `i18n/id.toml` and `i18n/en.toml`. Page structure is shared via single layout files, no duplicate HTML per language.

## Local development

Requires Hugo Extended. Install via Scoop on Windows:
```bash
scoop install hugo-extended
```

Run local server:
```bash
hugo server
```

Preview at `http://localhost:1313/smartrisk/`

## Deployment

Pushing to `main` triggers the GitHub Actions workflow which builds the site with `hugo` and deploys the `public/` folder to GitHub Pages automatically. The `public/` folder is not committed to the repo.