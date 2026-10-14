# Accessing risk data through a repository

## Status

Accepted

## Context

The dashboard will show disease risk assessments and disease reference data. The first version will read that data from a static JSON file supplied by the team. Later it will come from the `apha-risk-insights-backend` API, which is described by `docs/openapi/v1.yaml` (version `0.1.0`).

The backend API is read-only and has four operations: `listRisks` (`GET /risks`), `getRisk` (`GET /risks/{riskId}`), `listDiseases` (`GET /diseases`) and `getDisease` (`GET /diseases/{diseaseCode}`). Filtering, search, sorting and pagination are done by the API, and the rules for them are written in the OpenAPI description.

Pages must not change when the data source changes. Otherwise the switch from the static file to the API becomes a risky change across routes, services and views.

## Decision

We will read all risk and disease data through a data source in `src/data/`, with four methods: `listRisks(query)`, `getRisk(riskId)`, `listDiseases(query)` and `getDisease(diseaseCode)`.

The data source returns objects in the backend's OpenAPI shapes (`RiskPage`, `RiskDetail`, `Disease`). Services and presenters use only this interface and never read the JSON file or call HTTP directly.

The first implementation reads the static JSON file. An `api` implementation that calls the backend will be added later, in its own change, and selected by configuration.

The frontend makes no writes to the backend, so the data source has no write methods.

## Consequences

Positive:

- Switching from the static file to the API means adding one implementation and changing one config value. Routes, services, presenters and views do not change.
- Pages can be built and tested before the backend is ready.
- The interface stays small and read-only, which matches the dashboard.

Negative:

- The static file must match the API contract, and there is a risk that it drifts. Add contract tests that check its output against the OpenAPI shapes when the API data source is introduced; none exists yet.
- A static file cannot show real API behaviour such as authentication failures, `429` rate limits or `500` errors. The `api` implementation will need its own error handling and tests.
- The static file is sample data until real data is supplied. It must not be treated as real assessments.

Neutral:

- The backend API has no authentication today (`security: []`), so the `api` implementation does not need credentials yet. This must be revisited if that changes.
- [[adopting-flat-src-layout]] defines the folder layout. `src/data/` is not created in the structure change. It is added with the first data source implementation.
