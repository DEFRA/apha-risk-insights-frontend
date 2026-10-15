# Use Plotly for the risk history chart

## Status

Accepted

## Context

The disease detail page shows a risk level history: a step line over five fixed levels, with a marker and date label per assessment, over a rolling 12-month window. The page must be accessible, and the team has made accessibility a priority.

Options considered:

- Inline SVG rendered on the server, with no chart library. Not chosen; the team preferred Plotly.
- Chart.js. It renders to a `<canvas>` in the browser and has no server-side HTML or SVG output. Its server-side route, `chartjs-node-canvas`, needs the native `canvas` module and produces an image, not markup.

Plotly draws SVG in the browser. Its basic bundle (`plotly.js-basic-dist-min` 4.1.1) includes scatter, which is all this chart needs. It is 1.19 MB minified and about 395 KB gzipped. Version 4.1.2 was rejected because it was under two weeks old on 2026-10-14 (published 2026-10-05); 4.1.1 was published 2026-09-14. It contains no `eval` or `new Function`. It injects one `<style>` element at runtime and adds its rules through the CSSOM. The current CSP (`src/plugins/content-security-policy.js`) allows scripts and styles only from `'self'` plus one hash. The chart script can be bundled by Vite and served from `'self'`. Whether the CSSOM style injection is allowed is unverified and is checked by a spike before implementation.

## Decision

We will draw the risk history chart with Plotly (basic bundle), bundled by Vite as its own entry and loaded only on the disease detail page. The server renders the chart container and its accessible description, and embeds the chart spec as a JSON `<script type="application/json">` element. The chart is configured as static (`staticPlot: true`, no modebar, no hover). The full history is always shown in a table on the same page, which is the complete text alternative.

We will not use Chart.js or any server-side chart renderer.

## Consequences

- Adds one dependency, `plotly.js-basic-dist-min`, pinned to an exact version. About 395 KB gzipped, loaded only on the detail page.
- The chart needs JavaScript. Without it, the container is empty and the table gives the same information.
- The CSP is expected to need no change. If a spike shows a CSS injection violation, the CSP needs a decision (see the plan's WP3). Relaxing `styleSrc` is a security trade-off and needs sign-off.
- Plotly's SVG is not accessible on its own. Accessibility depends on the container description, the table and the static configuration, so these are tested.
- The chart is interactive only if the static setting is changed. That is a choice to make with the accessibility advisor.
