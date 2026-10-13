# Implementation plan: repo structure (fcp-sfd-frontend layout)

Audience: an agent implementing this in `/Users/simonddefra/repos/apha-risk-insights-frontend`. You have no other context. Everything you need is in this file and the files it names.

## Goal

Move this CDP template service from its current `src/server/` layout to the flat `src/` layout recorded in `adr/adopting-flat-src-layout.adr.md`. Wire the plugin, route, presenter and tooling conventions for the pages that already exist: `/`, `/about`, `/health`, and the error page.

This is a structure change. The app must behave the same afterwards.

## Out of scope

- New pages, features, forms, POST routes, or data sources.
- `@hapi/crumb`. Not added now. Any change that adds a POST route must add Crumb in the same change (ADR 1).
- Authentication (Defra ID, Bell, cookie auth, `auth`, `sso`, `scope`).
- Changing the build tool. Vite stays.
- Config nesting or splitting `src/config/config.js`. Kept as one file, keys unchanged.
- Drift-detection workflow, `.github/copilot-instructions.md`, `.github/skills/`.
- New production dependencies. `git diff package.json` may show only script and `imports` changes.
- Creating `src/services/`, `src/dal/` or `src/schemas/`. Add them when they have content.

## Read first

1. `adr/adopting-flat-src-layout.adr.md`: the layout decision.
2. `adr/accessing-risk-data-through-repository.adr.md`: the data decision. Not built here.
3. This file. It supersedes `docs/sfd-pattern-adoption-plan.md`.
4. Reference only, read-only: `repomix-output-DEFRA-fcp-sfd-frontend.xml` (the sibling service). Grep it, don't load it whole. Copy shapes, not logic. Useful: `src/plugins/index.js`, `src/routes/routes.js`, `src/presenters/`.

## Decisions (do not re-open)

| Topic | Decision |
|---|---|
| Layout | Flat `src/` with domain folders (ADR 1). |
| Presenters | Yes, one per page, including the home and about holding pages and the error page. |
| Logger | `src/utils/logger.js`. Runtime code goes in `utils/`, not `config/`. |
| Config | One file, `src/config/config.js`, kept. Keys flat and unchanged. |
| Crumb | Not added (no POST routes). |
| Build | Keep Vite. |
| Import style | Keep the `#/` alias. No `../` imports under `src/`. |
| Tests | Separate `test/` tree. Nothing under `src/` except production code. |
| Shared engine | None. |
| Dependencies | None added. |

## Ground rules

- Node `>=24` (`.nvmrc`: v24.14.1).
- Create branch `chore/repo-structure` from `main`. Don't commit unless the user asks. Leave changes in the working tree.
- Do the phases in order. Run each phase's checks before starting the next. Don't continue with failing checks.
- Phase 2 changes paths and imports only. No behaviour change, no renames of exports or routes, no copy changes.
- Keep these URLs and status codes: `/`, `/about`, `/health`, and the 404 page. `/health` returns `{ message: 'success' }` with status 200, and its path must not change.
- Match the code style: no semicolons, 2-space indent, single quotes. Keep the `.js` extension on imports. Run `npm run format` on moved or new files.
- No `console.log`, no `describe.only`, no commented-out code.
- Don't change page copy (titles, headings, body text). Move it as it is.
- If a change contradicts an ADR, stop and report it. Don't edit an accepted ADR silently. Use the `create-adr` skill to supersede it.
- Ask the user only if you are blocked.

## Commands

- Install: `npm ci`
- Lint: `npm run lint`
- Format check: `npm run format:check`
- Tests: `npm test` (runs `vitest run --coverage`)
- Dev server: `npm run dev`
- Frontend build: `npm run build:frontend`
- Container build (CI runs this): `docker build .`. Run it if Docker is available. If not, say so in the final report.

## Phase 1: Baseline

1. `git switch -c chore/repo-structure`.
2. `npm ci`.
3. Run `npm run lint`, `npm run format:check`, `npm test`. Record the results, including the coverage summary.
4. `npm run dev`. Record the status code and `<title>` for `/`, `/about`, `/health` and `/nope`.

Done when the branch exists and the baseline is recorded. If the baseline already fails on `main`, report it before changing anything.

## Phase 2: Move, no behaviour change

Use `git mv` for every move so history is kept. Paths are relative to the repo root.

### 2.1 Move map

| From | To |
|---|---|
| `src/server/server.js` | `src/server.js` |
| `src/server/plugins/router.js` | `src/plugins/router.js` |
| `src/server/plugins/pulse.js` | `src/plugins/pulse.js` |
| `src/server/plugins/request-logger.js` | `src/plugins/request-logger.js` |
| `src/server/plugins/request-tracing.js` | `src/plugins/request-tracing.js` |
| `src/server/plugins/content-security-policy.js` | `src/plugins/content-security-policy.js` |
| `src/server/plugins/serve-static-files.js` | `src/plugins/serve-static-files.js` |
| `src/server/plugins/session-cache.js` | `src/plugins/session-cache.js` (keep the name) |
| `src/server/plugins/logger-options.js` | `src/utils/logger-options.js` |
| `src/config/config.js` | stays at `src/config/config.js` |
| `src/config/nunjucks/nunjucks.js` | `src/plugins/template-renderer/vision.js` |
| `src/config/nunjucks/context/context.js` | `src/plugins/template-renderer/context.js` |
| `src/config/nunjucks/context/build-navigation.js` | `src/plugins/template-renderer/build-navigation.js` |
| `src/config/nunjucks/filters/*.js` | `src/plugins/template-renderer/filters/*.js` |
| `src/config/nunjucks/globals/globals.js` | `src/plugins/template-renderer/globals/globals.js` |
| `src/server/common/helpers/start-server.js` | `src/utils/start-server.js` |
| `src/server/common/helpers/logging/logger.js` | `src/utils/logger.js` |
| `src/server/common/helpers/errors.js` | `src/utils/errors.js` |
| `src/server/common/helpers/redis-client.js` | `src/utils/caching/redis-client.js` |
| `src/server/common/helpers/session-cache/cache-engine.js` | `src/utils/caching/cache-engine.js` |
| `src/server/common/constants/status-codes.js` | `src/constants/status-codes.js` |
| `src/server/common/templates/layouts/page.njk` | `src/views/common/layout.njk` |
| `src/server/common/components/heading/*` | `src/views/components/heading/*` |
| `src/server/routes/home/index.njk` | `src/views/home/index.njk` |
| `src/server/routes/about/index.njk` | `src/views/about/index.njk` |
| `src/server/routes/error/index.njk` | `src/views/errors/index.njk` |
| `test-helpers/component-helpers.js` | `test/helpers/component-helpers.js` |

Delete the empty placeholders with `git rm`: `src/server/common/README.md` and `src/server/common/templates/partials/README.md`.

Move `src/server/routes/*/index.js` and `controller.js` in Phase 3, not here. They are rewritten there.

`src/client/**` is unchanged.

Co-located tests (`*.test.js`) move to `test/unit/` with the same relative path under the new `src/` location. For example `src/server/common/helpers/errors.test.js` becomes `test/unit/utils/errors.test.js`. Controller tests are handled in Phase 3.

Do not create `src/services/`, `src/dal/` or `src/schemas/`.

### 2.2 Reference updates

Update every reference to a moved file. Then check the grep below returns nothing outside `docs/`, `adr/`, `repomix-output-*.xml`, `node_modules`, `package-lock.json`, `.git`:

```
grep -rn "src/server\|server/common\|server/routes\|server/plugins\|test-helpers\|config/nunjucks\|from '\.\./" . --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=docs --exclude-dir=adr --exclude='repomix-output*' --exclude=package-lock.json
```

The grep catches `../` imports too. Rewrite them to `#/` imports. Known places to update:

- `src/index.js`: the `start-server` and `logger` imports.
- `src/server.js`: all imports, and the comment on `router` that names `src/server/router.js`.
- `src/plugins/template-renderer/vision.js`: the loader paths. Change `src/server/common/templates` to `src/views` and `src/server/common/components` to `src/views/components`. Change `path: 'server/routes'` to `path: 'views'`, with `relativeTo` set to `src`. The file currently computes `path.resolve(dirname, '../..')`. Check that the result is `src`.
- `src/plugins/template-renderer/context.js`: the logger import.
- `src/plugins/template-renderer/vision.js`: the `#/config/config.js` import, which stays valid.
- `src/views/common/layout.njk`: the import `"heading/macro.njk"` becomes `"components/heading/macro.njk"`.
- `src/views/home/index.njk`, `src/views/about/index.njk`, `src/views/errors/index.njk`: `{% extends 'layouts/page.njk' %}` becomes `{% extends 'common/layout.njk' %}`.
- `src/utils/errors.js`: the `status-codes` import, and the view name `error/index` becomes `errors/index`.
- `test/helpers/component-helpers.js`: the import of `#/config/nunjucks/filters/filters.js` becomes `#/plugins/template-renderer/filters/filters.js`. Its hard-coded nunjucks search paths become `src/views` and `src/views/components`.
- Every `vi.mock(...)` path and every `#/server/...` or `#/config/nunjucks/...` import in the moved tests.
- `package.json`:
  - `imports`: replace `"#/test-helpers/*": "./test-helpers/*"` with `"#test/*": "./test/*"`.
  - `server:watch` and `server:debug`: remove the `--watch ./src/server --watch ./src/config` flags. `nodemon.json` watches `./src`.
- `nodemon.json`: `watch` stays `["./src"]`. `ignore` becomes `["**/*.test.*", "./src/client"]`. Remove the `test-helpers` entry.
- `vite.config.js`: `scss.loadPaths` replaces `src/server`, `src/server/common/components` and `src/server/common/templates/partials` with `src/views` and `src/views/components`. Read the file first, since the exact lines are not listed here.
- `.npmignore`: `test-helpers` becomes `test`. Keep `*.test.*`.
- `.dockerignore`: no change. The dev image copies `test/` so tests can run in the container. The production image copies only `src/`, so tests stay out of it.
- `sonar-project.properties`: `sonar.tests=test/`, `sonar.test.inclusions=test/**/*.test.js`, and remove `src/**/*.test.js` from `sonar.exclusions` and `sonar.cpd.exclusions`. Set `sonar.cpd.exclusions=test/**`. Keep `sonar.sources=src/`.
- `vitest.config.js`: confirm `coverage.include` is still `src/**/*.js`. No other change.
- `Dockerfile`: no change expected. Confirm it still copies `src` and `.public`.

### 2.3 Checks

1. `npm run lint`, `npm run format:check`, `npm test`: pass. The test count may change only by the tests you moved.
2. The grep in 2.2 returns nothing.
3. `npm run build:frontend` produces `.public/`.
4. `npm run dev`: `/`, `/about`, `/health` and `/nope` match the Phase 1 baseline for status code and `<title>`.

Done when all four pass.

Commit rule: do not commit. If the user asks, split this phase into two commits: first the `git mv` moves with no content change, then the reference updates. This keeps history and bisecting usable.

## Phase 3: Plugins, routes and presenters

### 3.1 Plugin assembly

Create `src/plugins/index.js` exporting an ordered array `plugins`. Keep the export names the files already use. Keep the registration order from `src/server.js`:

```js
import { requestLogger } from './request-logger.js'
import { requestTracing } from './request-tracing.js'
import { metrics } from '@defra/cdp-metrics'
import { secureContext } from '@defra/hapi-secure-context'
import { pulse } from './pulse.js'
import { sessionCache } from './session-cache.js'
import { nunjucksConfig } from './template-renderer/vision.js'
import Scooter from '@hapi/scooter'
import { contentSecurityPolicy } from './content-security-policy.js'
import { router } from './router.js'

export const plugins = [
  requestLogger,
  requestTracing,
  metrics,
  secureContext,
  pulse,
  sessionCache,
  nunjucksConfig,
  Scooter,
  contentSecurityPolicy,
  router
]
```

If `vision.js` exports a different name, use the real name. Don't rename exports.

In `src/server.js`:

- Replace the inline `server.register([...])` with `await server.register(plugins)`.
- Keep `hapi.server({...})` options unchanged.
- Keep `server.ext('onPreResponse', catchAll)` after registration. Don't add a second error handler.

`session-cache.js` already uses the `{ plugin: yar, options }` form. Don't change it.

### 3.2 Route modules

Each route module exports an array of route objects. Handlers are inline. There is no `controller.js` and no Hapi plugin wrapper.

`src/routes/home/home-routes.js`:

```js
import { homePresenter } from '#/presenters/home/home-presenter.js'

const getHome = {
  method: 'GET',
  path: '/',
  handler: (_request, h) => h.view('home/index', homePresenter())
}

export const homeRoutes = [getHome]
```

`src/routes/about/about-routes.js`, exporting `aboutRoutes`, with `GET /about` using `aboutPresenter()`.

`src/routes/health-routes.js`, exporting `healthRoutes`, with `GET /health`:

```js
handler: (_request, h) => h.response({ message: 'success' }).code(statusCodes.ok)
```

Keep the explicit `.code(statusCodes.ok)`. The path and response do not change.

`src/routes/routes.js`:

```js
import { healthRoutes } from './health-routes.js'
import { homeRoutes } from './home/home-routes.js'
import { aboutRoutes } from './about/about-routes.js'

export const routes = [...healthRoutes, ...homeRoutes, ...aboutRoutes]
```

Do not add a catch-all route. Unmatched paths already produce a Boom 404, which `catchAll` renders.

`src/plugins/router.js` keeps the static-assets logic (Vite dev middleware and `serveStaticFiles`). Only the route registration changes:

```js
await server.register([inert])
server.route(routes)
```

Delete `src/server/routes/*/index.js` and `controller.js` once their content has moved.

### 3.3 Presenters

Presenters are pure functions. They take no request, session or config arguments, and they return the view model. Every presenter returns the same keys every time.

`src/presenters/home/home-presenter.js`:

```js
/**
 * Formats data ready for presenting in the `/` page
 * @module homePresenter
 */
export const homePresenter = () => ({
  pageTitle: 'Home',
  heading: 'Home'
})
```

`src/presenters/about/about-presenter.js` returns `pageTitle: 'About'`, `heading: 'About'` and the existing `breadcrumbs` array, copied exactly from `src/server/routes/about/controller.js`.

`src/presenters/errors/error-presenter.js`, exporting `errorPresenter({ statusCode, message })`, returns `{ pageTitle: message, heading: statusCode, message }`. `catchAll` in `src/utils/errors.js` calls it. `catchAll` still returns `.code(statusCode)` and still logs 5xx errors.

Copy the page copy exactly from the current controllers and templates. Don't add a `metaDescription` or any other new text.

### 3.4 Tests

- Presenter unit tests: `test/unit/presenters/home/home-presenter.test.js`, `about/about-presenter.test.js`, `errors/error-presenter.test.js`. Each uses `toEqual` on the full returned object.
- Integration test: `test/integration/narrow/routes.test.js`. Uses `createServer()` and `server.inject()` to check:
  - `/` returns 200 and the page title `Home`.
  - `/about` returns 200 and the page title `About`.
  - `/health` returns 200 and body `{ message: 'success' }`.
  - `/nope` returns 404 and renders the error page.
  - Security headers are present on `/`: `strict-transport-security`, `x-content-type-options`, `x-frame-options`. Values come from `src/server.js` `routes.security`.
- Existing controller tests (`src/server/routes/*/controller.test.js`) test handler internals. Replace them with the presenter tests and the integration test above. Don't carry them over unchanged.
- Keep the other moved unit tests passing.

Checks: `npm run lint`, `npm run format:check`, `npm test` pass. The four URLs match the Phase 1 baseline.

Commit rule: do not commit. If the user asks: `refactor: route and presenter structure`.

## Phase 4: Config example and final checks

1. Create `.env.example` listing every environment variable in `src/config/config.js`. For each, give the default and a one-line comment. Don't include real secrets. Check that `.env` is in `.gitignore`.
2. Don't change `src/config/config.js`. Verify the app starts with no env vars and with `.env.example` values copied to `.env`.
3. Run every check:
   - `npm run lint`, `npm run format:check`, `npm test`
   - `npm run build:frontend`
   - `npm run dev`: the four URLs match the baseline
   - `docker build .` if Docker is available. If not, say so.
4. Coverage: record the coverage summary. Don't add a threshold in this change. Report the number in the final message.

Done when every check passes.

## Acceptance criteria

- `npm run lint`, `npm run format:check`, `npm test` and `npm run build:frontend` pass.
- `/`, `/about`, `/health` and `/nope` respond as at baseline. `/health` returns `{ message: 'success' }`.
- `src/` has no `server/` folder, and no `test` or `test-helpers` folder.
- `test/` holds all tests, with `test/unit/`, `test/integration/narrow/` and `test/helpers/`.
- No `../` imports under `src/` or `test/`.
- `src/utils/logger.js` exists. `src/config/config.js` is unchanged except for any import-path fixes.
- Presenters exist for home, about and errors, with unit tests.
- `git diff package.json` shows only the `imports` and script changes.
- No `@hapi/crumb`, no `method="post"` in views, no new pages or routes.
- `docs/sfd-pattern-adoption-plan.md` is replaced with a superseded pointer.
- Nothing is committed unless the user asked.

## Open items to report, not decide

1. The backend's risk endpoints are not implemented. `apha-risk-insights-backend/src/routes/` has only `health.js` and `documentation.js`. This does not block the change.
2. Coverage threshold. Defra expects at least 90% global. This change doesn't add one. Report the current figure.
3. ADR 1 lists `services/` and `dal/` in its decision, and its view folder names differ from this plan. Flag the wording so the ADR can be updated with a note, not silently edited.
4. If anything in the repo contradicts an ADR, flag it rather than changing the ADR silently.

## Final report

Report to the user:

- The result of each check in Phase 1 and Phase 4, with the output for any failure.
- Any step that was skipped (for example `docker build`) and why.
- The coverage figure.
- Any ADR contradiction found.
- The open items above.
