# Unified project commands:  make <action> [env]
#
#   make start dev     build, then serve dist/ on http://127.0.0.1:4321 (foreground)
#   make start prod    production build into dist/, served by Caddy on http://maxim-run.localhost/
#   make stop dev      stop the dev server on port 4321
#   make stop prod     nothing runs for prod (Caddy serves files); prints the live URL
#   make stop          stop everything this project started
#   make backup        nothing to back up: the site keeps no data (content lives in git)
#   make status        local server, Caddy address and the live site
#   make test          build + unit, SEO, i18n and CSP tests
#   make e2e           end-to-end tests in a phone and a desktop viewport (Playwright)
#
# The Makefile is only a front door: every target delegates to an npm script or a script in scripts/.

.DEFAULT_GOAL := help

ENVS   := dev prod
ENV    := $(word 2,$(MAKECMDGOALS))
PORT   := 4321

.PHONY: help start stop backup status test e2e hooks $(ENVS)

help:
	@echo "Usage: make <action> [env]"
	@echo ""
	@echo "  make start dev    build, then serve on http://127.0.0.1:$(PORT) (default env)"
	@echo "  make start prod   production build, served by Caddy on http://maxim-run.localhost/"
	@echo "  make stop dev     stop the dev server"
	@echo "  make stop prod    nothing runs for prod; prints the live URL"
	@echo "  make stop         stop everything"
	@echo "  make backup       nothing to back up (no stored data)"
	@echo "  make status       what is running right now"
	@echo "  make test         build + unit, SEO, i18n and CSP tests"
	@echo "  make e2e          end-to-end tests (phone + desktop)"

node_modules:
	npm install

hooks:
	@git config core.hooksPath .githooks

start: node_modules hooks
ifeq ($(or $(ENV),dev),dev)
	npm run dev
else ifeq ($(ENV),prod)
	npm run build
	@echo "Served by Caddy on http://maxim-run.localhost/ ; live on https://maxim.run/"
else
	@echo "Unknown env '$(ENV)'. Use: make start dev | make start prod"; exit 1
endif

stop:
ifeq ($(ENV),prod)
	@echo "Nothing runs for prod: Caddy serves dist/ as files. Live: https://maxim.run/"
else ifneq ($(filter $(ENV),dev),)
	-@lsof -ti tcp:$(PORT) -sTCP:LISTEN | xargs kill 2>/dev/null; echo "stopped port $(PORT)"
else ifeq ($(ENV),)
	-@lsof -ti tcp:$(PORT) -sTCP:LISTEN | xargs kill 2>/dev/null; echo "stopped port $(PORT)"
else
	@echo "Unknown env '$(ENV)'. Use: make stop dev | make stop prod | make stop"; exit 1
endif

backup:
	@echo "Nothing to back up: maxim.run keeps no data. The content is config/ and i18n/ in git."

status:
	@lsof -ti tcp:$(PORT) -sTCP:LISTEN >/dev/null && echo "dev server: http://127.0.0.1:$(PORT)/ (running)" || echo "dev server: stopped"
	@echo "caddy:      http://maxim-run.localhost/ -> $$(curl -s -o /dev/null -w '%{http_code}' http://maxim-run.localhost/)"
	@echo "live:       https://maxim.run/ -> $$(curl -s -o /dev/null -w '%{http_code}' https://maxim.run/) ($$(curl -sI https://maxim.run/ | sed -n 's/^server: //Ip' | tr -d '\r'))"

test: node_modules
	npm test

e2e: node_modules
	npm run test:e2e

$(ENVS):
	@:
