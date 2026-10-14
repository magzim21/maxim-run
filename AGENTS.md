# AGENTS.md — maxim.run

Project facts and rules for agents. Read before changing anything.

## Facts
- Personal site of Max Onyx (Maksym Onyshchenko) on https://maxim.run. Public contact: me@maxim.run.
  Never publish a gmail address or a phone number here.
- Lives on Vancouver Island, BC, Canada. Socials and certifications: `config/site.config.json` (the source of truth).
- Facts come from Max's own Notion pages ("Max website", "Resume - DevOps, Platform, SRE, Cloud Engineer") and
  his answers on 2026-10-13. Do not invent numbers (countries visited, subscribers, years): the countries list
  waits on the Notion task "Send the list of countries visited for the maxim.run travel map".
- The travel globe draws an illustrative great-circle loop through Vancouver Island, not a real route log.
- No trackers, analytics or third-party scripts. Adding any (Datadog RUM, Google tag, pixels) first needs the
  consent banner and privacy page from the global "Consent for tracking" rules.
- Hosting: Vercel project `maxim-run` (team codelaw), production branch `prod`, built from `vercel.json`.
  Repo, Vercel project, domains and DNS: Terraform in magzim21/repo-as-a-code (`maxim-run.tf`). Never click in
  the Vercel or Route 53 consoles.
- Local: Caddy serves `dist/` on http://maxim-run.localhost/ (`/opt/homebrew/etc/Caddyfile`, `~/scripts/local-apps`).

## Rules
- Work on `prod` (no customers, no feature branches). Commit only your own files; conventional commits.
- Every change ships with automated tests; `make test` and `make e2e` must be green before pushing.
- Text changes go into all six `i18n/*.json` files in the same commit; Hebrew is right-to-left.
- Keep the SEO baseline green (`tests/seo.test.mjs`): title <= 60, description 50-160, one h1, canonical, JSON-LD
  from config, text >= 10% of HTML, alt on every image, no orphan pages.
- Changing the inline theme script changes its CSP hash: update `vercel.json` (`tests/csp.test.mjs` fails otherwise).

## Manual steps
- None. Vercel domain ownership TXT values are read with the Vercel API and written by Terraform.
