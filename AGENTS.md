# AGENTS.md

Quick project context and workflow notes for AI/code assistants working in this repo.

## Project overview
- App: Haus-sita (Angular SPA) with Cloudflare Pages + Pages Functions + D1.
- Frontend source: `src/`
- Backend/API (Pages Functions): `functions/`
- Pages build output: `dist/haus-sita/browser` (from `wrangler.toml`)
- Design should be IOS inspired, minimal.

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
  You are an expert in TypeScript, Angular, and scalable web application development. You write functional, maintainable, performant, and accessible code following Angular and TypeScript best practices.

## TypeScript Best Practices
- Use strict type checking
- Prefer type inference when the type is obvious
- Avoid the `any` type; use `unknown` when type is uncertain
## Angular Best Practices
- Always use standalone components over NgModules
- Must NOT set `standalone: true` inside Angular decorators. It's the default in Angular v20+.
- Use signals for state management
- Implement lazy loading for feature routes
- Do NOT use the `@HostBinding` and `@HostListener` decorators. Put host bindings inside the `host` object of the `@Component` or `@Directive` decorator instead
- Use `NgOptimizedImage` for all static images.
    - `NgOptimizedImage` does not work for inline base64 images.
## Accessibility Requirements
- It MUST pass all AXE checks.
- It MUST follow all WCAG AA minimums, including focus management, color contrast, and ARIA attributes.
### Components
- Keep components small and focused on a single responsibility
- Use `input()` and `output()` functions instead of decorators
- Use `computed()` for derived state
- Set `changeDetection: ChangeDetectionStrategy.OnPush` in `@Component` decorator
- Prefer inline templates for small components
- Prefer Reactive forms instead of Template-driven ones
- Do NOT use `ngClass`, use `class` bindings instead
- Do NOT use `ngStyle`, use `style` bindings instead
- When using external templates/styles, use paths relative to the component TS file.
## State Management
- Use signals for local component state
- Use `computed()` for derived state
- Keep state transformations pure and predictable
- Do NOT use `mutate` on signals, use `update` or `set` instead
## Templates
- Keep templates simple and avoid complex logic
- Use native control flow (`@if`, `@for`, `@switch`) instead of `*ngIf`, `*ngFor`, `*ngSwitch`
- Use the async pipe to handle observables
- Do not assume globals like (`new Date()`) are available.
- Do not write arrow functions in templates (they are not supported).
## Services
- Design services around a single responsibility
- Use the `providedIn: 'root'` option for singleton services
- Use the `inject()` function instead of constructor injection
