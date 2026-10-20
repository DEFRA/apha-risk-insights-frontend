# Plan: risk card component, with a minimal `/risk` host page

Produced by a 20qs planning session (11 of 20 questions used). Source design: `~/Downloads/A · Cards — Overview@1x.png` (the "Disease risk overview" page with five cards).

## Summary

Build one reusable `riskCard` Nunjucks component that matches the card in the mock-up. It has a linked title, a strain row, the risk level word with five bars, a status tag with the previous level, and a reported date. It takes flat, display-ready params, and a presenter maps the OpenAPI `RiskSummary` onto them. To see it in a browser, add a minimal `/risk` host page that reads a static JSON data source, as `adr/accessing-risk-data-through-repository.adr.md` prescribes.

Out of scope (separate "risk overview page" plan): grid layout, ordering by risk, intro text, last-assessment date, disease detail page.

## Sources

- API contract: `/Users/simonddefra/repos/apha-risk-insights-backend/docs/openapi/v1.yaml` (not copied into this repo). Relevant schemas: `RiskSummary`, `RiskAssessment`, `RiskStatus`, `LevelChange`, `Disease`.
  - `RiskStatus`: `negligible | very low | low | medium | high`
  - `LevelChange`: `deteriorating | no change | improving | undetermined`
  - `strain` is optional; `previousStatus` is `null` when there is no prior assessment; `dateReported` is an ISO date-time.
- GOV.UK Tag guidance: https://design-system.service.gov.uk/components/tag/ (colour must not be the only signal; keep colours consistent; modifiers `govuk-tag--red|green|grey|...`).
- Existing component pattern: `src/views/components/heading/` (`macro.njk`, `template.njk`, `_heading.scss`), test helper `test/helpers/component-helpers.js` (`renderComponent('risk-card', params)` resolves macro `appRiskCard`).
- Layout ADR: `adr/adopting-flat-src-layout.adr.md`.

## Decisions from the Q&A

| #   | Decision                                                                                                                                                  |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | The component takes presenter-shaped params and contains no data logic.                                                                                   |
| 2   | Bars use even steps: negligible 1, very low 2, low 3, medium 4, high 5. The API enums are the source of truth; the mock-up's 1/3/4/5 is treated as wrong. |
| 3   | "Previously …" always sits below the tag (the Improving card in the mock-up is a slip).                                                                   |
| 4   | The caller passes `href`; the component knows nothing about routes.                                                                                       |
| 5   | The bars carry a visually hidden "Risk level N out of 5" text.                                                                                            |
| 6   | The `very low` bars are green.                                                                                                                            |
| 7-8 | A minimal `/risk` host page: h1 plus five cards in a simple stack, no grid, sort or intro.                                                                |
| 9   | Data comes from a static JSON data source in `src/data/` (`listRisks()`), shaped as `RiskSummary`.                                                        |
| 10  | A lightweight contract test checks the fixture against the spec, with no new dependency.                                                                  |
| 11  | Branch from `main` (stack-3 / PR #3 is already merged into `origin/main`).                                                                                |

## Component anatomy

Location: `src/views/components/risk-card/` with `macro.njk` (exporting `appRiskCard`), `template.njk` and `_risk-card.scss`. Register the SCSS in `src/client/stylesheets/components/_index.scss`.

| Part           | Rendering                                                                                                     | Notes                                                                                                            |
| -------------- | ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Title          | `<h2 class="govuk-heading-m">` wrapping a `govuk-link`                                                        | Heading level is a param, default 2.                                                                             |
| Strain         | Summary list row `Strain H5N1`                                                                                | Row omitted when `strain` is absent. The disease code is not shown.                                              |
| Risk level     | "Risk level" label and the level word in bold, large type                                                     | Labels: `High`, `Very low`, etc.                                                                                 |
| Risk bars      | 5 segments, N filled, colour per level (negligible grey, very low green, low yellow, medium orange, high red) | Decorative `aria-hidden`, plus visually hidden "Risk level N out of 5". Colours must meet 3:1 non-text contrast. |
| Status tag     | `govuk-tag` with `--red` (deteriorating), `--grey` (no change, undetermined), `--green` (improving)           | Arrow (↑ → ↓) plus uppercase text. Arrow is `aria-hidden`; undetermined has no arrow.                            |
| Previous level | `Previously Medium`, or `No previous assessment` when `previousStatus` is null                                | Below the tag.                                                                                                   |
| Date           | `Reported 1 October 2026` in a `<time datetime>` element, above a divider                                     | Formatted by `formatDisplayDate` in `filters/format-date.js` (Europe/London).                                    |

Each part gets a `data-testid` with an `app-risk-card-*` prefix. The card is a bordered block; the host layout controls its width.

## Plan steps (red-green TDD, use the `tdd` skill)

1. **Branch.** The local checkout may be a stale `main`. Run `git pull`, then create `feat/risk-card` from `main`.
2. **Display mapping.** Write a small pure module (the `riskCardPresenter` mapping) with tests first. It turns a `RiskSummary` into card params: status to label, bar count and colour class; `levelChange` to tag text, arrow and modifier; `dateReported` to a formatted date; `href`.
3. **Component tests.** Add `test/unit/views/components/risk-card/template.test.js` using `renderComponent('risk-card', ...)`. Cover all five mock-up states, plus: strain absent, null `previousStatus`, correct number of filled bars per level, the visually hidden text, the heading level param.
4. **Template and styles.** Build `template.njk` and `macro.njk` until the tests pass, then the SCSS. Use GOV.UK Frontend variables and `govuk-spacing`, `app-` prefixed classes, and tokens in `variables/_colours.scss`. stylelint must pass.
5. **Static data source.** Create `src/data/` with `listRisks(query)` and a JSON fixture of the five mock-up diseases in `RiskSummary` shape (HPAI H5N1, ASF, FMD, BTV-3, AHS). Fix values the mock-up gets wrong. Label the fixture as sample data, per the ADR.
6. **Contract test.** Dropped (see decision 10).
7. **`/risk` host page.** Add `src/routes/risk/risk-routes.js`, `src/presenters/risk/risk-presenter.js` (maps `listRisks()` output through the card mapping), `src/views/risk/index.njk` using `appHeading` and a stack of `appRiskCard`, and register it in `src/routes/routes.js`. Add a narrow integration test alongside `test/integration/narrow/routes.test.js`.
8. **Visual check.** Run `npm run docker:dev`, open `/risk` and compare it against the screenshot. Check 320px width and 400% zoom, and do a keyboard and screen reader pass (optionally via the `defra-accessibility-advisor` agent).
9. **Pre-push checks.** Run `security-audit`, `format:check`, `lint` and `test` locally before pushing.

## ADR check

No new ADR needed. The data approach is covered by `accessing-risk-data-through-repository`, and this plan adds its first implementation (creating `src/data/`). The card, mapping and colours are reversible UI choices following the existing `heading` convention.

## Assumptions

- `/risk` is a placeholder route; the overview plan may replace it or move the overview to `/`.
- Card title heading is `<h2>`.
- Arrows are decorative because the status word is always present.
- The disease detail URL is not yet defined. The placeholder `href` is `/risk/<key>`, where the key is the slug of the disease name only (for example `/risk/highly-pathogenic-avian-influenza`), falling back to the risk `id` if the slug is empty. All strains are grouped under one disease for this iteration. Revisit the key if strains get separate detail pages, or when the detail route exists (the id may become the key).
- The OpenAPI spec stays in the backend repo and is cited by path, not copied.

## Open questions

- Which URL should the card title link to? Only a placeholder is used for now.
