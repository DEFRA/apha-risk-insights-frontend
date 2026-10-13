# Adopting a flat src layout with domain folders

## Status

Accepted

## Context

This repository was created from the CDP Node frontend template. Its code sits under `src/server/` (`plugins/`, `routes/<name>/` with a `controller.js` per page, `common/helpers/`, `common/templates/`, `common/components/`), its config is one flat convict file, and its tests are co-located beside source files.

The sibling service `fcp-sfd-frontend` uses a flat `src/` layout with domain folders for routes, presenters, services and views. It has a separate `test/` tree with unit and narrow integration tests. It has been in production use for longer than this repository.

This service is a small, read-only dashboard. It has no POST routes yet, no shared library needs and no authentication. It will get its data first from a static JSON file, and later from the `apha-risk-insights-backend` API. The current layout is cheap to change now, because only four routes exist.

## Decision

We will restructure `src/` to a flat layout with domain folders, following `fcp-sfd-frontend`:

- `src/plugins/` holds an ordered `index.js` array of Hapi plugins, plus `router.js`.
- `src/routes/<domain>/` holds route modules that each export an array of route objects. `src/routes/routes.js` aggregates them.
- `src/presenters/<domain>/` holds one pure function per page that turns data into a view model. This applies to the home and about pages and the error page, even though they are static.
- `src/views/` holds Nunjucks templates, with `common/` for the layout and `components/` for reusable macros.
- `src/utils/` holds runtime helpers, including the logger, error handling and caching. Runtime code does not go in `src/config/`.
- `src/constants/` holds status codes.
- `src/config/` holds the convict config. It stays as one file, `config.js`, with flat keys.
- Tests live in a separate `test/` tree. `test/unit/` mirrors `src/`, `test/integration/narrow/` uses `server.inject()`, and `test/helpers/` holds shared support code.

We will not create `src/services/`, `src/dal/` or `src/schemas/` in this change. They are added when they have content. Data access is decided separately in the ADR on accessing risk data through a repository.

We will keep these choices from the current repository:

- Vite stays as the build tool and dev server. We will not move to Webpack.
- The `#/` import alias stays. Imports under `src/` and `test/` do not use `../`. `fcp-sfd-frontend` uses relative imports, and we accept the difference.
- Node `>=24` and the existing lint, format and test scripts stay.

We will not add a shared engine package. The service is small enough to keep its logic local.

We will not add `@hapi/crumb` in this change, because the service has no POST routes. Any change that adds a POST route must add CSRF protection (Crumb with a `crumb` hidden field in each form) in the same change.

The step-by-step work for this change is in `docs/implementation-plan.md`.

## Consequences

Positive:

- Engineers who know `fcp-sfd-frontend` will find the same folders and patterns here.
- Route and presenter code each have a clear home, which makes changes easier to review.
- Tests run in a separate tree. Production source contains no tests, and the production Docker image, which copies only `src/`, does not ship them.

Negative:

- The move touches many files and tests. Imports, Vite SCSS `loadPaths`, the `server:watch` and `server:debug` scripts, `nodemon.json`, `sonar-project.properties`, `.npmignore` and the `README.md` config reference all need updating.
- The `#/` alias and the relative imports in `fcp-sfd-frontend` differ, so code copied from that repository needs its imports rewritten.
- `fcp-sfd-frontend` has patterns that are not safe to copy as they are, such as two `onPreResponse` error handlers and a presenter that reads flash messages. Those are excluded from this decision.

Neutral:

- The Vite build is unchanged, so the production asset pipeline does not change.
- Adding Crumb later is a small, self-contained change. The rule above keeps it from being forgotten.
- Config is not nested or split in this change. That can be revisited when the config grows.
- Future repositories may choose different layouts, and this repository does not need to match `apha-risk-insights-backend`, which keeps its own `common/helpers` layout.
