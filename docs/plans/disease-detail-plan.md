# Plan: disease detail page, reusable template and components

> Note: the slug route in this plan is superseded by `docs/plans/disease-code-lookup-plan.md` (`/risk/{diseaseCode}`).

Produced by a 20qs planning session (12 of 20 questions used), revised to use Plotly for the chart. Source design: `docs/plans/assets/disease-detail-mock.png` (copied from `Downloads/A · Cards — Disease detail (single card)@1x.png`). Builds on `docs/plans/risk-card-plan.md` (the `riskCard` component and `/risk` page), which must land first.

**Implementation agent:** use `defra-app-developer` (Defra APP builder). Give it this file and the work package brief. Follow the `tdd` skill (red, green, refactor). Use `defra-accessibility-advisor` for the a11y pass and `defra-code-reviewer` before the PR. Run `npm run security-audit`, `format:check`, `lint` and `test` before pushing (see the `verify-pr-stack-before-push` memory).

## Summary

Build a reusable disease detail page at `/risk/<slug>`. It has a GOV.UK back link, an H1 with the disease name, a latest assessment card and a risk history chart side by side, and an always-visible history table below. The page is a template with named inputs, so any disease renders through the same view model. Diseases differ only in data.

The chart is Plotly, drawn in the browser from data the server embeds in the page. Accessibility does not depend on the chart. The always-visible table is the full data, and the chart container has a text description. The page works with JavaScript off, with the table alone.

Out of scope: strain caption and strain tag (not every disease has a strain), phase banner (the layout change is separate), disclosure or collapsing of the table, the homepage, ordering and grid of `/risk`.

## Design review (mock against the existing card and GOV.UK)

Findings from comparing the mock with the existing `riskCard` (`src/views/components/risk-card/`) and the installed GOV.UK Frontend 6.4.0 (`node_modules/govuk-frontend`).

| #   | Mock                                                                 | Existing or GOV.UK                                                                               | Resolution                                                                                                                                                                       |
| --- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Card title "Latest assessment", not the disease name                 | `riskCard` title is the linked disease name                                                      | Detail variant with fixed title (Q2)                                                                                                                                             |
| 2   | Change is plain text with a coloured arrow                           | `riskCard` renders Change as a `govuk-tag`                                                       | Detail variant renders plain text. The word carries the meaning, and the arrow is decorative (colour is not the only signal, WCAG 1.4.1) (Q2)                                    |
| 3   | Source row present                                                   | `riskCard` has no Source row                                                                     | Detail variant adds Source (value from `risk.source`)                                                                                                                            |
| 4   | "Date reported"                                                      | `riskCard` says "Reported"                                                                       | Detail variant uses "Date reported"                                                                                                                                              |
| 5   | "Previously Medium" under Change                                     | Same in `riskCard`                                                                               | Keep. Omit the line when `previousStatus` is null (assumption, not in mock)                                                                                                      |
| 6   | Back link "Back to overview"                                         | Layout uses breadcrumbs on `/risk`                                                               | `govukBackLink` in `beforeContent` on the detail page only (Q3). `govuk-frontend/dist/govuk/components/back-link` is installed                                                   |
| 7   | "HPAI" caption above H1, "STRAIN H5N1" tag                           | `appHeading` puts the caption below the H1                                                       | Both removed for this iteration (Q4). The H1 is the disease name only. Caption support is not added now                                                                          |
| 8   | "Assessment history as a table" disclosure, open                     | GOV.UK details is closed by default                                                              | No disclosure. The table is always rendered, with an H2 "Assessment history" (Q7). The mock's grey left border came from the details component, so drop it (assumption)          |
| 9   | Chart 12-month window Oct 2025 to Oct 2026                           | No chart in GOV.UK Design System                                                                 | Rolling 12 months ending in the latest assessment's month (Q5)                                                                                                                   |
| 10  | Line runs past the last dot into a stub at the right edge            | n/a                                                                                              | The line ends at the window's right edge, not beyond it                                                                                                                          |
| 11  | Year labels "2025" and "2026" under their months                     | n/a                                                                                              | Year labels centred under the months of that year within the window                                                                                                              |
| 12  | Table tags use light red and light orange backgrounds with dark text | GOV.UK tag default: `tint-80` background, `shade-50` text (`govuk-frontend/.../tag/_mixin.scss`) | Match. Use `govukTag` with the existing colour modifiers, as `riskCard` does                                                                                                     |
| 13  | Phase banner "ALPHA"                                                 | Not in `common/layout.njk`                                                                       | Out of scope (Q12). Flag for a separate change                                                                                                                                   |
| 14  | Two bordered cards, equal height                                     | `govukSummaryList` card (`summary-list` component) is bordered                                   | Use the summary card for both. Equal height via flex on the row (a small SCSS rule, since GOV.UK grid does not do equal height)                                                  |
| 15  | Chart dot colours: red for High, orange for Medium                   | Bars in `riskCard` use the same colours                                                          | Reuse the same level colour map (`LEVELS` in the presenter) so bars, dots and tags agree. Dots also have a dark outline and a date label, so level is not read from colour alone |
| 16  | Previous level shown as a tag                                        | n/a                                                                                              | Previous level is a plain word, with "None" in secondary text. The tag is reserved for the current level, to reduce visual noise, and this follows the Table specification       |

Confirmed as-is from the mock: H1 typography, GOV.UK header and service navigation, footer, the five-segment bars, the table columns (Date reported, Risk level, Previous level, Change, Source), and the "None" previous value in grey.

## Decisions from the Q&A

| Q   | Decision                                                                                                                                                                                                                                    |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Chart uses **Plotly** (basic bundle, scatter only), bundled by Vite, drawn in the browser. Revised from inline SVG after the accessibility priority was confirmed. See `adr/use-plotly-for-risk-history-chart.adr.md`.                      |
| 2   | Latest assessment card is a detail variant of `riskCard` (`variant: 'detail'`), not a copy and not the homepage card unchanged.                                                                                                             |
| 3   | Back link (`govukBackLink`) in `beforeContent`, not breadcrumbs, on the detail page only.                                                                                                                                                   |
| 4   | No HPAI caption and no strain tag this iteration. `appHeading` is unchanged.                                                                                                                                                                |
| 5   | Rolling 12-month window ending in the latest assessment's month.                                                                                                                                                                            |
| 6   | Route key is the disease slug, as in `risk-card-plan.md` (`/risk/highly-pathogenic-avian-influenza`). Lookup is by slug, then the record is fetched by `riskId`.                                                                            |
| 7   | Table always visible, not in a disclosure.                                                                                                                                                                                                  |
| 8   | Narrow screens: the chart scales to width and month ticks thin to every other month below the breakpoint. No horizontal scroll.                                                                                                             |
| 9   | One assessment: one marker with its date label, no line. The table shows one row.                                                                                                                                                           |
| 10  | Sample data: **every** disease gets `riskHistory` (2 to 4 assessments each in total, counting the current `risk`; `riskHistory` itself excludes the current one, R2). HPAI includes the three mock assessments (9 Jan, 15 Jun, 1 Oct 2026). |
| 11  | Branch from `main` after the risk-card PR is merged. Do not stack on `feat/update-homepage`.                                                                                                                                                |
| 12  | Phase banner out of scope.                                                                                                                                                                                                                  |

## Graph decision: Plotly, configured for accessibility

Plotly is the chart package, as first suggested. The decision to use it was made on accessibility grounds, with these facts from the installed package:

- `plotly.js-basic-dist-min` 4.1.1 is 1.19 MB minified and about 395 KB gzipped. Version 4.1.2 was rejected because it was under two weeks old on 2026-10-14 (published 2026-10-05); 4.1.1 was published 2026-09-14. The full bundle is larger. Keep the basic bundle, which includes scatter and nothing we don't use.
- It contains no `eval` or `new Function`, so no `'unsafe-eval'` is needed.
- It injects one `<style>` element at runtime but inserts its rules through the CSSOM (`sheet.insertRule`). CSP does not, to my understanding, block CSSOM rule insertion, so `styleSrc: ['self']` should be enough. **This is unverified in a browser.** It is the first step of WP3. If the console shows a CSP violation, the fix is `styleSrc` with `'unsafe-inline'`, which weakens the policy, or a Plotly config option, which needs checking. Please review before choosing the CSP change.
- Plotly's SVG is not accessible by itself. Accessibility comes from the page around it, so the plan relies on the following:
  - The table is the full data. The chart is a visual summary.
  - The chart container has `role="img"` with `aria-labelledby` (the visible title) and `aria-describedby` (a sentence built from the data).
  - Plotly is configured with `staticPlot: true`, `displayModeBar: false` and `hovermode: false`. No hover-only information, no modebar, no focus traps. Every value appears as a text label or in the table. The interactive features are not needed for this page. This is a default that can be changed.
  - Axis, tick and marker text uses GOV.UK body font and at least 16px, so it reads at 200% zoom.
- Bundling: Vite builds Plotly into its own chunk, loaded only on the detail page. It is served from `'self'`, so no CSP change is needed for the script. The data is embedded in a `<script type="application/json">` element, which browsers do not execute, so it needs no CSP allowance.
- No JavaScript: the server renders the title, the description and the table. The chart container stays empty and the table gives the same information.

## Components

| Component                    | Status | Location                                                                                             | Notes                                                                                                                                                                                                                                                                                                          |
| ---------------------------- | ------ | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `appHeading`                 | Reuse  | `src/views/components/heading/`                                                                      | Unchanged. H1 with the disease name                                                                                                                                                                                                                                                                            |
| `govukBackLink`              | Reuse  | GOV.UK Frontend                                                                                      | `beforeContent` block on the detail page                                                                                                                                                                                                                                                                       |
| `appRiskCard`                | Extend | `src/views/components/risk-card/`                                                                    | Add `variant: 'detail'`. Fixed title, plain-text Change with decorative arrow, Source row, "Date reported", optional "Previously" line. Shared bars and level colours. Equal height on the page                                                                                                                |
| `appRiskHistoryChart`        | New    | `src/views/components/risk-history-chart/` (`macro.njk`, `template.njk`, `_risk-history-chart.scss`) | Server-rendered container: `role="img"`, `aria-labelledby`, `aria-describedby`, a div Plotly draws into, and a `<script type="application/json">` with the chart spec. No inline script                                                                                                                        |
| `appRiskHistoryTable`        | New    | `src/views/components/risk-history-table/`                                                           | `govukTable` with `head` and `rows`. Tags via `govukTag`. Visually hidden caption. Newest first, as the API returns it                                                                                                                                                                                         |
| Chart client module          | New    | `src/client/javascripts/risk-history-chart.js`                                                       | Reads the JSON spec from the page, imports Plotly and calls `Plotly.newPlot` with the static config. Its own Vite entry, loaded only by the detail page                                                                                                                                                        |
| Disease detail page          | New    | `src/views/risk/detail.njk`                                                                          | The template. Two-column row (`govuk-grid-column-one-half`) from 641px, stacked below. Card and chart in an equal-height flex row. Table below in a full-width column. Loads the chart entry in `bodyEnd`                                                                                                      |
| Disease detail presenter     | New    | `src/presenters/risk/disease-detail-presenter.js`                                                    | Pure. Maps a `RiskDetail` to the view model. Builds the full timeline as `[risk, ...riskHistory]`, newest first (`riskHistory` excludes the current assessment, R2), and passes that timeline to the chart and table presenters. Calls `riskCardPresenter` (detail variant) and the chart and table presenters |
| Risk history chart presenter | New    | `src/presenters/risk/risk-history-chart-presenter.js`                                                | Pure. Builds the Plotly spec as plain data: window, line and marker traces, y tick mapping, date labels, single-point case and the `aria-describedby` sentence. No DOM, no Plotly import, so it is unit testable                                                                                               |

## Template contract (reuse across diseases)

The page `risk/detail.njk` takes one view model. Any disease fills the same shape from its own data, so a new disease needs no template change.

```
{
  pageTitle, heading,           // disease name
  backLink: { text, href },     // 'Back to overview', '/risk'
  latest: { ...riskCard params, variant: 'detail' },
  chart:  { title, description, spec },  // spec = Plotly data and layout; absent when no assessments
  table:  { rows: [...] }
}
```

## Data

- Source of truth: `GET /risks/{riskId}` in `apha-risk-insights-backend/docs/openapi/v1.yaml`. It returns the current assessment and its `riskHistory`, ordered by `dateReported` newest first. The contract is cited by path, not copied. **Decision (R2):** `riskHistory` holds past assessments only and excludes the current assessment (`risk`), per the user's decision and the contract wording "Past assessments". Action for the user: ask the backend team to make the `RiskDetail.riskHistory` description in `v1.yaml` explicit that it excludes the current assessment.
- Sample fixture: extend `src/data/risk-sample-data.json` so each item has its current `risk` and a `riskHistory` array of `RiskAssessment` objects (newest first). Keep the "SAMPLE DATA ONLY" comment. Every disease gets 2 to 4 assessments in total (Q10): the current `risk` plus 1 to 3 past entries in `riskHistory`, which excludes the current assessment (R2). HPAI has the three mock assessments.
- Data source: add `getRiskBySlug(slug)` in `src/data/risk-data-source.js`, alongside `listRisks()`. Slug is computed with `slugify(disease.name)`, the same rule as `riskKey` in the card presenter, so the two cannot drift. Return `undefined` when not found, and the route responds 404 via `src/utils/errors.js` and the error page.
- Keep `ADR accessing-risk-data-through-repository` in mind: the route calls the data source, never the file directly.

## Chart specification (Plotly)

- Trace 1, line: scatter, `mode: 'lines'`, `line.shape: 'hv'` so the line runs horizontally to the next assessment and then steps vertically. Points are the assessments in the window, plus the last assessment before the window clamped to the window's left edge. The line ends at the window's right edge.
- Trace 2, markers: scatter, `mode: 'markers'`, one per assessment in the window. Fill colour is the level colour (the same map as the bars). Marker outline is dark, 2px, so level is not read from hue alone.
- Date labels: `text` on the markers, shown with `textposition` below for a step down and beside otherwise, to avoid overlap. The presenter sets these, and the template test checks them.
- Y axis: numeric 1 to 5, `tickvals` 1 to 5 and `ticktext` High, Medium, Low, Very low, Negligible from top to bottom (High at 5). Light gridlines. `range: [0.5, 5.5]`.
- X axis: `type: 'date'`, `range` from the first month of the 12-month window to the end of the latest assessment's month. Tick labels are three-letter months every month, and every other month below the breakpoint (set by the presenter as two `dtick` values, or by a layout change in the client module on resize). Year labels are a second row of annotations centred under each year's months.
- Single assessment: markers only, no line trace (Q9).
- No assessments: no chart. The table shows "No assessments".
- Config: `staticPlot: true`, `displayModeBar: false`, `responsive: true`. Layout: `hovermode: false`, `showlegend: false`, `margin` sized for labels, font family GOV.UK (Arial, sans-serif) at 16px minimum, `paper_bgcolor` and `plot_bgcolor` white.
- Accessibility text: `aria-describedby` points to a sentence from the presenter, for example "Risk level changed from High to Medium on 15 June 2026 and back to High on 1 October 2026. The full history is in the table below."
- Forced colours: Plotly's SVG takes forced colours poorly. Add a `@media (forced-colors: active)` rule that sets the chart container to `forced-color-adjust: auto`. The table is the fallback there.
- Reduced motion: no animation (`transition: { duration: 0 }`).

## Table specification

- `govukTable`: columns Date reported, Risk level, Previous level, Change, Source. Newest first.
- Risk level: `govukTag` with the level's colour modifier (red for High, orange for Medium, yellow for Low, green for Very low, grey for Negligible). Text is the level word, so colour is not the only signal.
- Previous level: level word, or grey "None" when `previousStatus` is null.
- Change: arrow (aria-hidden) plus word, in plain text, matching the card. Undetermined has no arrow.
- Caption: visually hidden "Assessment history for <disease name>".
- Responsive: `govuk-table` does not scroll by itself in GOV.UK Frontend 6.4.0 (no wrapper, no overflow rule), so the table sits in a focusable, labelled scroll region (`role="region"`, `tabindex="0"`, `aria-label` equal to the caption, `overflow-x: auto`) with small text until tablet (`govuk-table--small-text-until-tablet`). Without it the HPAI table is about 540px wide and the whole page scrolls sideways at 320px.

## Work packages (for agents)

Run WP1 first. WP2, WP3 and WP4 can run in parallel. WP5 needs WP2 to WP4. WP6 is last.

**Reordered (user decision):** WP5 is built before WP3. WP5 ships without the chart, with the right-hand column of the two-column row left empty (an empty `govuk-grid-column-one-half`, no placeholder text) so the layout does not move when the chart arrives. WP3 then adds the chart presenter, component, client module, Vite entry, the `bodyEnd` script and the `chart` view model key, and places the chart in that right column.

**WP0. Prerequisite.** The risk-card PR (`risk-card-plan.md`) is merged to `main`. Branch `feat/disease-detail` from `main`. Add `plotly.js-basic-dist-min` as a dependency at version 4.1.1 (pinned, not a range). 4.1.2 was rejected: under two weeks old on 2026-10-14.

**WP1. Data.** TDD. Extend the fixture with `riskHistory` for each disease (Q10). Add `getRiskBySlug`. Tests: slug lookup, not-found returns `undefined`, `riskHistory` excludes the current assessment and is newest first (R2), contract-shape check of `RiskAssessment` fields (`status`, `previousStatus`, `levelChange`, `source`, `dateReported`). Files: `src/data/risk-sample-data.json`, `src/data/risk-data-source.js`, `test/unit/data/risk-data-source.test.js`.

**WP2. Card detail variant.** TDD. Add `variant: 'detail'` to `riskCard`: fixed title "Latest assessment", plain-text Change with decorative arrow, Source row, "Date reported", optional "Previously" line. Keep the default variant unchanged (existing tests must still pass). Files: `src/views/components/risk-card/*`, `test/unit/views/components/risk-card/template.test.js`.

**WP3. Chart.** Runs after WP5 (reordered). It also adds the `chart` key to the disease detail presenter, the `bodyEnd` script block to `risk/detail.njk`, and places the chart component in the empty right-hand column. TDD, plus a browser spike first.

- Spike, before tests: build a throwaway page that loads Plotly from a Vite entry under the app's CSP, draws the sample HPAI spec, and checks the console for CSP violations. Record the result in the PR description. If there is a violation, stop and report it for a CSP decision. Do not change the CSP without that decision.
- Presenter (`risk-history-chart-presenter.js`): pure data. Tests for: 12-month window, single point, two points, clamped start, step trace, y tick mapping, date labels, year annotations, and the `aria-describedby` sentence.
- Macro (`appRiskHistoryChart`) and SCSS, tested with `renderComponent`: `role="img"`, labelled and described, the JSON spec script present with the correct `type`, the chart container present, no inline script, no spec emitted when there are no assessments.
- Client module (`src/client/javascripts/risk-history-chart.js`): reads the JSON, calls `Plotly.newPlot` with the static config. Add it as a Vite entry. Tests: the module calls `newPlot` with the spec and config (mock Plotly), and does nothing when the container is absent.
- Files: `src/presenters/risk/risk-history-chart-presenter.js`, `src/views/components/risk-history-chart/*`, `src/client/javascripts/risk-history-chart.js`, `vite.config.js` (new input), `test/unit/presenters/risk/...`, `test/unit/views/components/risk-history-chart/template.test.js`.

**WP4. Table.** TDD. `appRiskHistoryTable` with `govukTable` and tags, the "None" previous value, undetermined without arrow, visually hidden caption. Files: `src/views/components/risk-history-table/*`, `test/unit/views/components/risk-history-table/template.test.js`.

**WP5. Page, presenter, route.** TDD. `disease-detail-presenter.js` (pure), `src/views/risk/detail.njk` with `govukBackLink` in `beforeContent`, two-column row from 641px with equal-height columns, table below. Shipped without the chart: no `chart` key, no `bodyEnd` script, and the right-hand column is empty (WP3 fills it). Route `GET /risk/{slug}` in `src/routes/risk/risk-routes.js`, registered via `src/routes/routes.js`. Narrow integration test in `test/integration/narrow/routes.test.js` for 200 on a known slug and 404 on an unknown one. Add SCSS to `src/client/stylesheets/components/_index.scss`. Stylelint must pass.

**WP6. Verification.** `npm run dev`, open `/risk/highly-pathogenic-avian-influenza` and compare to the mock. Check 320px width, 400% zoom, keyboard only, and a screen reader pass (announce the chart description and the table). Check with JavaScript disabled that the table gives the full information. Ask `defra-accessibility-advisor` to review against WCAG 2.2 AA and the GOV.UK patterns above. Then `defra-code-reviewer`. Run the pre-push checks.

## Accessibility checklist (WCAG 2.2 AA, GOV.UK)

- Colour is never the only signal: level word in table and card, arrow with word, date labels on markers, dark marker outline.
- Non-text contrast 3:1 for the line, markers and bars against white. Check each level colour and the line colour explicitly.
- The chart has a text alternative (`aria-describedby`), and the table is the full data.
- Plotly is static: no hover-only information, no modebar, no keyboard traps.
- Back link is a link, keyboard reachable, and has visible text.
- Reflow at 320px with no horizontal page scroll (WCAG 1.4.10). The table is the only element allowed to scroll, inside a keyboard-focusable region with an accessible name and a visible focus style.
- Works with JavaScript disabled: the table carries the full information.

## GOV.UK grounding

Checked against the installed `govuk-frontend` 6.4.0 source (`node_modules/govuk-frontend/dist/govuk/components/`): `back-link`, `table`, `summary-list`, `tag` macros exist. Tag colours are `tint-80` background and `shade-50` text (`tag/_mixin.scss`).

Pages to read before the design review (not fetched in this session, verify when implementing): https://design-system.service.gov.uk/components/back-link/ , https://design-system.service.gov.uk/components/table/ , https://design-system.service.gov.uk/components/summary-list/ , https://design-system.service.gov.uk/components/tag/ , https://design-system.service.gov.uk/styles/colour/ . GOV.UK has no chart component, so the chart uses GOV.UK colours and the table as its text alternative.

Plotly facts checked in `plotly.js-basic-dist-min` 4.1.1 (now installed and pinned at 4.1.1; originally inspected with `npm pack plotly.js-basic-dist-min@4.1.1`): size, `eval` count, and the runtime style injection described under the graph decision.

## ADR check

The chart library choice is a dependency decision, so it is ADR-worthy under the 20qs rule. The decision is recorded in `adr/use-plotly-for-risk-history-chart.adr.md`, with server-rendered SVG listed there as an option considered. The data approach follows `accessing-risk-data-through-repository`.

## Assumptions

- Chart colours: blue line and dark-outlined markers use the GOV.UK palette, same as the bars.
- Previous-level line in the card is omitted when `previousStatus` is null.
- The grey left border from the mock is dropped with the disclosure.
- The table heading is H2 "Assessment history" (the mock's disclosure label was removed in Q7).
- Dates are formatted with `formatDisplayDate` (Europe/London).
- The breakpoint for thinning month ticks is the GOV.UK tablet breakpoint (641px), to match the two-column layout.
- `staticPlot: true` (no hover, no modebar) is the accessibility default. Change it only with a reason, because it removes interactivity.
- Plotly does not need a CSP change. This is unverified until the WP3 spike.

## Decisions

- Unknown status, previous status or level change values, and invalid dates, throw in the presenters. The page returns 500 rather than showing partial or incorrect risk data. This is deliberate for a risk service, and is to be revisited when the API data source lands.
- The change arrow uses a shared, component-neutral `.app-change-arrow` class (with `--red`, `--green`, `--grey`) used by both the risk card detail variant and the history table.

## Open questions

- None blocking. The phase banner (Q12) and the strain caption and tag (Q4) are deferred to later iterations.
- If the WP3 spike shows a CSP violation, the CSP decision (`'unsafe-inline'` for styles, or another approach) needs your sign-off.
