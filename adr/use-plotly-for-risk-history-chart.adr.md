# Use Plotly for the risk history chart

## Status

Accepted

## Context

The disease detail page shows a risk level history: a step line over five fixed levels, with a marker and date label per assessment, over a rolling 12-month window. The page must be accessible, and the team has made accessibility a priority.

Options considered:

- Inline SVG rendered on the server, with no chart library. Not chosen; the team preferred Plotly.
- Chart.js. It renders to a `<canvas>` in the browser and has no server-side HTML or SVG output. Its server-side route, `chartjs-node-canvas`, needs the native `canvas` module and produces an image, not markup.

Plotly draws SVG in the browser. Its basic bundle (`plotly.js-basic-dist-min` 4.1.1) includes scatter, which is all this chart needs. It is 1.19 MB minified and about 395 KB gzipped. Version 4.1.2 was rejected because it was under two weeks old on 2026-10-14 (published 2026-10-05); 4.1.1 was published 2026-09-14. It contains no `eval` or `new Function`. It creates one global `<style>` element at runtime. The current CSP (`src/plugins/content-security-policy.js`) allows scripts and styles only from `'self'` plus one hash. The chart script can be bundled by Vite and served from `'self'`. A spike under the real CSP showed that the runtime `<style>` element is blocked (`style-src-elem`), while CSSOM-set styles are not.

## Decision

We will draw the risk history chart with Plotly (basic bundle), bundled by Vite as its own entry and loaded only on the disease detail page. The server renders the chart container and its accessible description, and embeds the chart spec as a JSON `<script type="application/json">` element. The chart is configured as static (`staticPlot: true`, no modebar, no hover). The full history is always shown in a table on the same page, which is the complete text alternative.

We will not use Chart.js or any server-side chart renderer.

## Consequences

- Adds one dependency, `plotly.js-basic-dist-min`, pinned to an exact version. About 395 KB gzipped, loaded only on the detail page.
- The chart needs JavaScript. Without it, the container is empty and the table gives the same information.
- The CSP is unchanged (user decision A). The chart component renders `<div id="plotly.js-style-global" class="no-inline-styles" hidden>`, which makes Plotly 4.1.1 skip its runtime `<style>` injection.
- Plotly's base CSS is vendored from `plotly.js@4.1.1` (`dist/plotly.css`) into `src/client/stylesheets/vendor/_plotly.scss`. It must be refreshed on every Plotly bump, and a unit test fails if its version differs from `plotly.js-basic-dist-min` in `package.json`.
- **This is an area that needs further investigation.** Open points: whether Plotly ships a supported CSP-safe CSS route in future releases (issue plotly/plotly.js#7332 asks for `plotly.css` in releases); whether other `addRelatedStyleRule` callers in the basic bundle still inject; and long-term ownership of the vendored file.
- Plotly's SVG is not accessible on its own. Accessibility depends on the container description, the table and the static configuration, so these are tested.
- The chart is interactive only if the static setting is changed. That is a choice to make with the accessibility advisor.
