# Ticket A: look up diseases by code (`/risk/{diseaseCode}`)

Produced by a 20qs planning session (16 of 20 questions used), split from the larger "replace static data with the backend API" plan. **Ticket B** (`docs/plans/risk-api-data-source-plan.md`) builds on this and must land after it.

**Implementation:** use `defra-app-developer`, following the `tdd` skill (red, green, refactor). Use `defra-code-reviewer` before the PR. Run `npm run security-audit`, `format:check`, `lint` and `test` before pushing. Do not commit or open a PR unless asked.

## Summary

The disease detail page is currently addressed by a slug of the disease name (`/risk/highly-pathogenic-avian-influenza`), resolved by scanning `listRisks()`. The backend has no slug, but it supports `GET /risks?diseaseCode=HPAI`. Change the detail page to be addressed by disease code, lowercase in URLs (`/risk/hpai`), and replace `getRiskBySlug` with `getRiskByDiseaseCode(code)`. This ticket works **on the static data source only**. No API calls and no config changes. It exists so ticket B can add the API source behind an interface that already matches the backend.

## Decisions

| #   | Decision                                                                                                                                                                                           |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Route is `/risk/{diseaseCode}`. Links are **lowercase** (`/risk/hpai`).                                                                                                                            |
| 2   | The route accepts any case. The code is **uppercased** before lookup, so `/risk/HPAI` and `/risk/hpai` both work.                                                                                  |
| 3   | The frontend has **no list or enum of valid codes**. The data source is the authority. An unknown or empty result is a 404 (`Boom.notFound('Disease not found')`).                                 |
| 4   | `getRiskByDiseaseCode(code)` replaces `getRiskBySlug(slug)`. It returns the `RiskDetail` (current `risk` plus `riskHistory`) or `undefined`.                                                       |
| 5   | One record per disease is the expected model (older assessments live in `riskHistory`). If more than one record matches, **use the first and log a warning** so a data-model change is not hidden. |
| 6   | The interface for the whole data source is `listRisks(query)`, `getRisk(riskId)` and `getRiskByDiseaseCode(code)`. `listDiseases` and `getDisease` are **not** added (nothing uses them).          |

## Work

Files to change (from a search of `slug`):

- `src/data/risk-data-source.js`: remove `getRiskBySlug` and the `slugify` import. Add `getRiskByDiseaseCode(code)`: filter the sample items on `disease.code === code.toUpperCase()`, take the first, return `getRisk(id)`. Update the JSDoc.
- `src/routes/risk/risk-routes.js`: path `/risk/{diseaseCode}`, call `getRiskByDiseaseCode(params.diseaseCode)`. Keep the 404.
- `src/presenters/risk/risk-card-presenter.js`: `riskKey` becomes `disease.code.toLowerCase()`. Remove the `slugify` import and the "falls back to the id" behaviour (the code is required by the contract). Update the JSDoc.
- `src/utils/slugify.js` and `test/unit/utils/slugify.test.js`: leave in place unless nothing else uses `slugify` after this change. If unused, remove both (check with a search first).
- Tests to update or add:
  - `test/unit/data/risk-data-source.test.js`: replace the slug tests. Cover: finds HPAI by `HPAI` and `hpai`, returns `undefined` for an unknown code, returns the history of the record, and warns when more than one record matches (use a mocked logger).
  - `test/unit/presenters/risk/risk-card-presenter.test.js`: links use the lowercase disease code. Drop the slug and id fallback test.
  - `test/integration/narrow/routes.test.js`: `GET /risk/hpai` renders (and `/risk/HPAI`), `/risk/zzz` returns the 404 error page, and the card links on `/risk` point to `/risk/<lowercase code>`.
  - `test/unit/views/components/risk-card/template.test.js`: update only if it asserts the old link.
- `docs/plans/disease-detail-plan.md` and `docs/plans/risk-card-plan.md`: these mention the slug route. Add a one-line note pointing to this plan rather than rewriting them.

## Acceptance criteria

- `/risk/hpai` and `/risk/HPAI` render the HPAI detail page.
- `/risk/unknown` returns the 404 page and does not throw.
- Every card on `/risk` links to `/risk/<lowercase disease code>`.
- No reference to `getRiskBySlug` or the name slug remains in `src/` or `test/`.
- `npm test`, `npm run lint` and `npm run format:check` pass.

## Out of scope

- Any API, `fetch`, `httpRequest` or config changes (ticket B).
- The empty state on `/risk` (ticket B).
- Changing the detail page's content, chart or table.
- Strain handling. One record per disease is assumed.
- ADR updates (ticket B writes the ADR that covers the interface change).
