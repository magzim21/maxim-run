# maxim.run

Max Onyx's personal site: DevOps and automation, talents, round-the-world travel, Vancouver Island.
Six languages (en, ru, uk, es, zh, he), three themes (Terminal, Nebula, Blueprint), no third-party code.

- Live: https://maxim.run (www.maxim.run redirects there)
- Project: [My Apps row](https://app.notion.com/p/3f9b399fe9c28166a358d5f810abfec8); roadmap and tasks: [Notion goal](https://app.notion.com/p/2c6b399fe9c280e5a967f233208231d0)
- Hosting, DNS and the GitHub repository are Terraform in
  [magzim21/repo-as-a-code](https://github.com/magzim21/repo-as-a-code) (`maxim-run.tf`, entry `maxim-run` in `main.tf`).

## Quick start

```bash
make start dev     # build, then serve on http://127.0.0.1:4321
make start prod    # production build, served by Caddy on http://maxim-run.localhost/
make stop          # stop the dev server
make status        # dev server, local Caddy address and the live site
make test          # build + unit, SEO, i18n and CSP tests
make e2e           # Playwright, phone and desktop viewports
make backup        # nothing to back up: the site keeps no data
```

`make start` also runs `git config core.hooksPath .githooks` (commitlint, gitleaks, tests before every commit).

## How it is built

| Path | What it is |
| --- | --- |
| `config/site.config.json` | The facts: name, email, socials, location, certifications, stack, languages, themes. JSON-LD comes from here. |
| `i18n/<lang>.json` | Every sentence, one file per language. The build fails when a language does not mirror `en.json`. |
| `src/template.mjs` | Renders one page per language (canonical, hreflang, Open Graph, JSON-LD). |
| `src/site.css`, `src/site.js` | Styles and behaviour, bundled and minified by esbuild into `/assets/site.<hash>.*`. |
| `src/shell.js` | The "Talk to my shell" commands (pure, unit-tested). |
| `scripts/build.mjs` | Writes `dist/`: pages, `404.html`, `sitemap.xml`, `robots.txt`, `llms.txt`, land dots for the globe. |
| `static/` | Portrait, certification badges, favicon, Open Graph image. |

Vercel runs `npm test` as its build command (`vercel.json`), so a failing SEO, i18n or CSP test stops the deploy.
GitHub Actions runs the same tests plus the end-to-end suite and gitleaks on every push.

## Adding or changing content

- A fact (a link, a certification, the email): `config/site.config.json`.
- Text: `i18n/en.json` first, then the same key in the other five files. `npm test` lists any key that is missing.
- A new theme: tokens in `src/site.css` under `[data-theme='<id>']`, an entry in `themes` in the config,
  a background scene in `src/site.js`, and a name under `nav.themes` in every language.
