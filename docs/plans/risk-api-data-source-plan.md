# Ticket B: API-backed risk data source behind a config flag

Produced by a 20qs planning session (16 of 20 questions used), split from the larger "replace static data with the backend API" plan. **Depends on Ticket A** (`docs/plans/disease-code-lookup-plan.md`) having landed: the data source interface must already be `listRisks`, `getRisk` and `getRiskByDiseaseCode`, with the `/risk/{diseaseCode}` route.

**Implementation:** use `defra-app-developer` with the `tdd` skill (red, green, refactor). Use `defra-accessibility-advisor` for the empty-state message and `defra-code-reviewer` before the PR. Run `npm run security-audit`, `format:check`, `lint` and `test` before pushing. Do not commit or open a PR unless asked.

## Summary

Add a data source that reads from `apha-risk-insights-backend` through the existing `httpRequest` client, selected by config. If `RISK_API_ENABLED` is true the API is used. If it is false, null or missing, the static sample data is used. The static source stays the default and is the fixture for all route and view tests. Routes, presenters and views keep their current imports. The change ships dark (flag defaults to `false`), so it has no effect on users until switched on.

## Backend facts (verified against the running backend on `localhost:3001`)

- Contract: `../apha-risk-insights-backend/docs/openapi/v1.yaml` v0.1.0. Read-only, no auth (`security: []`).
- `GET /risks?diseaseCode=HPAI&pageSize=200` returns a `RiskPage` (`items` are `RiskSummary`, no history).
- `GET /risks/{riskId}` returns a `RiskDetail` (`risk` plus `riskHistory`, newest first). The ID must be a UUID.
- Errors are `application/problem+json` (`type`, `title`, `status`, `detail`, `instance`). A bad UUID or bad query gives **400**, an unknown ID gives **404**, and there are also **429** and **500**.
- `pageSize` max is 200, default 50. Dev port is 3001. Both compose stacks use the Docker network `apha-risk`, so the backend is reachable at `http://apha-risk-insights-backend-development:3001` from the frontend container.
- **The backend database is currently empty** (`totalItems: 0`). Seed with `../apha-risk-insights-backend/ingestion/scripts/seed-dev.sh` before testing against it.

## Decisions

| #   | Decision                                                                                                                                                                                                                                                                                                                                                                   |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Two config settings: `RISK_API_ENABLED` (boolean, default `false`) and `RISK_API_BASE_URL` (string, nullable, default `null`). The URL is **required when enabled**: fail at startup with a clear message if it is missing. API is used only when the flag is true.                                                                                                        |
| 2   | `RISK_API_TIMEOUT_MS` (number, default `5000`). `httpRequest` applies it via `AbortSignal.timeout`. A timeout is thrown as `NetworkError` (cause retained) and logged like any network failure. **No retries.**                                                                                                                                                            |
| 3   | `src/data/risk-data-source.js` keeps its exports and checks config on each call, delegating to `static-risk-data-source.js` (current code moved there) or `api-risk-data-source.js` (new).                                                                                                                                                                                 |
| 4   | `listRisks` calls `GET /risks` with `pageSize=200` and passes through supported query params (`diseaseCode`, `status`, `strain`, `levelChange`, `source`, `q`). No pagination UI. If `totalPages > 1`, log a warning.                                                                                                                                                      |
| 5   | `getRisk(riskId)` calls `GET /risks/{riskId}`.                                                                                                                                                                                                                                                                                                                             |
| 6   | `getRiskByDiseaseCode(code)` calls `GET /risks?diseaseCode=<UPPERCASE>`. An empty `items` returns `undefined` (route gives a 404). Otherwise take the **first** item (log a warning if there is more than one) and call `getRisk(id)`.                                                                                                                                     |
| 7   | **Error mapping happens inside the API source**, so routes and `catchAll` stay unchanged. `HttpError` 404 and 400 map to `Boom.notFound`. Anything else (500, 429, other 4xx, `NetworkError`) maps to `Boom.badGateway` (or `Boom.internal`), which `catchAll` renders as the generic error page. The original error is logged. **No fallback to static data on failure.** |
| 8   | `/risk` shows a short message when the list is empty (for example "No disease risk assessments are available at the moment"). Empty is a valid state, not an error. Keep it accessible (plain paragraph, GOV.UK body style).                                                                                                                                               |
| 9   | Not in this ticket: caching, retries, tracing-header propagation (`x-cdp-request-id`), `listDiseases`/`getDisease`, a pagination UI.                                                                                                                                                                                                                                       |

## Work

1. **Config** (`src/config/config.js`, `.env.example`): add the three settings above under a `riskApi` group (or similar). Validate that `baseUrl` is set when `enabled`. Document all three in `.env.example` with defaults.
2. **HTTP client** (`src/utils/http-client.js`): add a `timeout` option (default from the caller). Use `signal: AbortSignal.timeout(ms)` and convert the abort/timeout error to `NetworkError`. Update JSDoc. Extend `test/unit/utils/http-client.test.js`.
3. **Static source**: move the current `src/data/risk-data-source.js` contents to `src/data/static-risk-data-source.js`. Move or rename its tests to match (`test/unit/data/static-risk-data-source.test.js`), keeping coverage.
4. **API source** (`src/data/api-risk-data-source.js`): implement `listRisks`, `getRisk` and `getRiskByDiseaseCode` as in the decisions. Build URLs with `new URL()` and `URLSearchParams` (never string concatenation of user input). Do not log response bodies.
5. **Facade** (`src/data/risk-data-source.js`): export the three functions, selecting the implementation from `config.get('riskApi.enabled')`.
6. **Empty state** (`src/views/risk/index.njk`, plus the presenter if it should supply the text): show the message when `cards` is empty.
7. **Dev wiring**: in `compose.yaml` add `RISK_API_BASE_URL: http://apha-risk-insights-backend-development:3001` and `RISK_API_ENABLED: false` for the frontend service. Add a README section covering running both stacks, seeding the backend, and flipping the flag. Mention the empty-database caveat.
8. **ADR**: write a new ADR using the `create-adr` skill that **supersedes** `adr/accessing-risk-data-through-repository.adr.md` (mark the old one `Superseded`, cross-link both). It should record: the three-method interface and why `listDiseases`, `getDisease` and `getRiskBySlug` were dropped, `diseaseCode` as the route key, the two-setting config selection, error mapping in the API source with no static fallback, and the follow-ups (caching, retries, tracing, contract tests).

## Tests (mocked, no live backend)

Use a mocked `fetch` (as `http-client.test.js` does) or `vitest-fetch-mock`. Route and view tests keep running on the static source (the flag is false by default in tests). **No contract tests and no live integration tests** (out of scope by decision).

- Config: defaults, and failing when enabled with no base URL.
- `httpRequest`: timeout becomes `NetworkError`, and the signal is passed to `fetch`.
- API source:
  - URL and query building, including `pageSize=200`.
  - A multi-page warning.
  - `getRiskByDiseaseCode`: uppercase, empty result gives `undefined`, multiple records warns and uses the first, and the follow-up `getRisk` call.
  - Error mapping for 400, 404, 429, 500 and network or timeout failures.
  - It never falls back to static.
- Facade: picks static when the flag is false, null or missing, and API when it is true.
- Empty state on `/risk`.

## Acceptance criteria

- With `RISK_API_ENABLED` false, null or unset, behaviour is identical to today.
- With it true and the backend seeded, `/risk` lists the diseases and `/risk/hpai` renders the detail page from API data.
- A backend 404 or 400 gives the "Page not found" page, and a backend 500, 429 or timeout gives the generic error page. Both are logged and neither shows static data.
- Enabling the flag without a base URL fails at startup with a clear message.
- `/risk` shows the empty-state message when the API returns no items.
- No new runtime dependencies.
- `npm test`, `npm run lint` and `npm run format:check` pass.

## Out of scope

- Caching, retries, tracing-header propagation.
- `listDiseases`, `getDisease`, pagination UI and auth.
- Contract tests and live integration tests.
- Seeding or changing the backend. Only documenting how to seed it.
- Any change to the detail page content (done in earlier plans).
