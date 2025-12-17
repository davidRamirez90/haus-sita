# AGENTS.md

Quick project context and workflow notes for AI/code assistants working in this repo.

## Project overview
- App: Haus-sita (Angular SPA) with Cloudflare Pages + Pages Functions + D1.
- Frontend source: `src/`
- Backend/API (Pages Functions): `functions/`
- Pages build output: `dist/haus-sita/browser` (from `wrangler.toml`)

## Cloudflare + Wrangler (use npx)
Wrangler is a dev dependency. Use `npx wrangler ...` for all Wrangler commands.

Common flows:
```bash
# Login (once)
npx wrangler login

# Build the Angular app
npm run build

# Hot-reload dev (Angular + Functions/D1)
npm run dev

Note: `npm run dev` relies on `wrangler pages dev --proxy 4200`, so
`wrangler.toml` should not set `pages_build_output_dir` for local HMR.

# Serve Pages locally (after build)
npx wrangler pages dev dist/haus-sita/browser

# Deploy to Pages (after build)
npx wrangler pages deploy dist/haus-sita/browser

# D1 management
npx wrangler d1 list
npx wrangler d1 execute haussita-db --file=./path/to/file.sql
```

Tip: For live rebuilds, run `npm run watch` in one terminal and
`npx wrangler pages dev dist/haus-sita/browser` in another.

## D1 database
- Binding name: `MY_HAUSSITADB` (do not change)
- Database name: `haussita-db`
- Schema and API outline live in `PROJECT_CONTEXT.md`

Functions should access D1 via `env.MY_HAUSSITADB`.

## Angular build behavior
- Default build is production (`ng build`), and source maps are enabled.
- Development build: `ng build --configuration development`

## Repo constraints and best practices
- Keep repo structure with `/functions` and `/src` (do not relocate).
- Preserve the domain model and API contract in `PROJECT_CONTEXT.md`.
- UI should stay minimal with meaningful color semantics (see `DESIGN_CONTEXT.md`).
- Avoid changing the D1 binding name or schema without explicit intent.
