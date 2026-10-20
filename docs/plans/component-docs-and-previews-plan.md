# Plan: component documentation and development-only previews

## Goal

Make one component easy to understand, preview, and change without finding a
suitable disease record or reading several unrelated files.

Use the existing Nunjucks macros, presenters, GOV.UK styles, and Vite setup.
Start with the risk card. Extend the same pattern to heading, change arrow,
risk history table, and risk history chart.

This document is an implementation plan. It does not enable preview routes.

## Scope and assumptions

- Previews are local developer tools, not public service pages.
- Preview routes require both development mode and an explicit feature toggle.
- Examples use synthetic data and fixed dates. They make no backend requests.
- Existing service pages and component behaviour remain unchanged.
- Do not add Storybook, a documentation framework, or a shared component package.
- Do not redesign card variants or fix unrelated findings from the service review.

## Review concerns and decisions

### Development mode alone is not an explicit opt-in

The initial plan registered previews whenever `isDevelopment` was true. Add a
separate toggle that defaults to false. The toggle must never override the
development-only restriction.

### Hiding navigation does not prevent access

When disabled, do not register preview routes. A hidden link, handler-level UI
check, query parameter, cookie, or browser-side flag is not the access boundary.

### A preview must use the real component

Call the existing macros and component presenters. Do not copy their HTML,
styles, or display rules into preview templates. Keep examples separate from
page layout, and show the actual parameters passed to the macro.

### The chart currently supports one instance per page

The chart template uses fixed IDs, and its initialiser selects only the first
chart. Use one chart per preview page. Document this limitation rather than
expanding this work into a multi-instance chart redesign.

### Documentation can drift from implementation

Keep component documentation beside the macro. Link it to executable examples.
Require documentation and example updates when a component contract changes.
Do not add a documentation generator just to avoid maintaining a small table.

## Feature toggle

Add this entry to `src/config/config.js`, using the existing Convict conventions:

```js
componentPreviewsEnabled: {
  doc: 'Enable component previews in development mode only',
  format: Boolean,
  default: false,
  env: 'ENABLE_COMPONENT_PREVIEWS'
}
```

Evaluate the gate during router registration in `src/plugins/router.js`:

```js
if (config.get('isDevelopment') && config.get('componentPreviewsEnabled')) {
  const { componentPreviewRoutes } =
    await import('#/routes/dev/component-preview-routes.js')

  server.route(componentPreviewRoutes)
}
```

Keep preview routes out of the unconditional array in `src/routes/routes.js`.
The conditional import also keeps preview modules out of normal production
startup. It does not remove their files from the production image.

| NODE_ENV               | Toggle         | Preview routes                        |
| ---------------------- | -------------- | ------------------------------------- |
| development            | true           | Registered                            |
| development            | false or unset | Not registered; return 404            |
| production             | Any value      | Not registered; return 404            |
| test                   | Any value      | Not registered by default; return 404 |
| Unset or another value | Any value      | Not registered; return 404            |

Do not use `!isProduction` as the gate. That would also allow test and unknown
environments. Do not enable previews automatically for tests; explicitly exercise
the permitted configuration in a controlled registration test.

Add `ENABLE_COMPONENT_PREVIEWS=false` to `.env.example`. Document local opt-in:

```sh
ENABLE_COMPONENT_PREVIEWS=true npm run dev
```

For Docker development, explicitly pass the toggle through the service's Compose
`environment` section, with false as the default. A host `.env` value is not
automatically a container environment variable.

Restart the service after changing the toggle. It is a startup setting, not a
per-request switch.

Development mode is not authentication. The current host default is `0.0.0.0`.
Document that an enabled development server must not be exposed publicly.
Deployment configuration must continue to run deployed instances in production
mode. Excluding preview files from release images is outside this plan.

## Implementation steps

### 1. Document the risk-card contract

Add `src/views/components/risk-card/README.md` with:

- Purpose and when to use the component.
- Required and optional parameters, defaults, and supported variants.
- Minimal Nunjucks calls for overview and detail variants.
- Fields used or ignored by each variant.
- Accessibility requirements and styling hooks.
- Links to its presenter, styles, tests, and preview examples.

Add named JSDoc types to the risk-card presenter. Describe the existing output
contract without changing runtime behaviour or introducing a type-checking tool.

Call out the different roles of `previousText` and `previousLevel`, the hidden
strain in the detail variant, and the detail-only source field.

### 2. Create named examples

Keep example factories under `src/presenters/dev/`. Use explicit example names
and return fresh objects. Do not import `test/` fixtures into runtime source.

Pass synthetic API-shaped records through the existing component presenter when
the example represents normal page usage.

| Risk-card example      | Purpose                                         |
| ---------------------- | ----------------------------------------------- |
| Overview               | Normal linked card                              |
| Detail                 | Latest-assessment composition, including source |
| No previous assessment | Missing previous level and undetermined change  |
| Long overview content  | Long disease name and strain                    |
| Long detail content    | Long source text                                |
| Risk levels            | The five levels and their visual indicators     |

Use descriptions that match the chosen variant. For example, a long disease
name does not exercise the detail card's fixed "Latest assessment" title.

### 3. Add routes and preview pages

Use the existing route, presenter, and view boundaries:

```text
src/routes/dev/component-preview-routes.js
src/presenters/dev/component-examples.js
src/presenters/dev/component-preview-presenter.js
src/views/dev/components/index.njk
src/views/dev/components/preview.njk
```

Provide an index and named examples:

```text
/dev/components
/dev/components/risk-card/overview
/dev/components/risk-card/detail
```

The index lists available components and examples. Each preview page shows an
example heading, the rendered component, escaped parameter JSON, and a short
explanation. Label the gallery as development-only with synthetic data.

Resolve component and example names through explicit allowlists. Unknown names
return 404. Do not turn URL parameters directly into template paths. Keep macro
imports explicit and use the real application styles.

Use appropriate heading levels so the preview wrapper does not create an
incorrect document outline. Do not add links to the public service navigation.

### 4. Extend documentation and examples

Apply the same documentation structure to the remaining custom components:

| Component     | Examples                                            |
| ------------- | --------------------------------------------------- |
| Heading       | With and without caption; long heading              |
| Change arrow  | Improving, deteriorating, no change, and no arrow   |
| History table | Several rows, one row, empty state, and long source |
| History chart | Several assessments, one assessment, and no chart   |

Load the existing chart entry script only on chart preview pages. Keep the
current CSP and Plotly integration. Do not add another Plotly initialiser or
duplicate the vendored styles.

For the no-chart case, show the explanatory preview text while confirming that
the component itself renders nothing.

### 5. Verify behaviour and production exclusion

Add focused tests using the existing Vitest, Nunjucks, Cheerio, and Hapi tools:

- Named example factories return independent data and valid presenter inputs.
- Preview pages render the selected real macro with the expected values.
- Unknown component or example names return 404.
- Development with the toggle on registers the routes.
- Development with the toggle off or unset does not register them.
- Production with the toggle true still returns 404 for preview URLs.
- Test and unknown environments do not register preview routes by default.
- Disabled registration does not load the preview route module.
- Rendered parameter text cannot inject HTML.

Exercise the actual registration path through Hapi, not just a standalone
Boolean expression. Restore configuration and environment state after each case.
Keep tests scoped to this repository's `test/` tree so nested worktrees are not
included accidentally.

Retain existing component tests for detailed markup behaviour. Do not duplicate
every assertion in route tests.

Manually check the gallery at 320px and desktop width, with keyboard navigation,
200% zoom, and JavaScript disabled where applicable. Confirm chart rendering
under the existing CSP. Verify that previews make no backend requests.

### 6. Document the iteration workflow

Add a "Component development" section to the root README. Explain how to:

- Enable previews locally and in Docker, and restart after toggle changes.
- Find a component's contract and named examples.
- Edit its template, presenter, or styles and inspect the result.
- Add an example and run the relevant tests.
- Check narrow layouts using browser developer tools.
- Recognise the single-chart-per-page limitation.

Link the component READMEs from the gallery rather than creating duplicate
descriptions of their full contracts.

## Delivery order

1. Risk-card documentation, examples, development-only routing, toggle, and tests.
2. Documentation and examples for the remaining components.

The second change depends on the first. Each change must leave the existing
service pages working.

## Acceptance criteria

- Every custom component has a documented contract and a working named preview.
- Both risk-card variants can be inspected without loading disease records.
- The gallery calls real macros and presenters, not copied implementations.
- Previews require development mode and an explicit toggle.
- Production preview URLs return 404 even when the toggle is true.
- Developers can identify which file to edit and how to inspect its effect.
- No new dependencies or changes to public service behaviour are required.

## Architecture references

This plan follows the [accepted folder-layout decision](../../adr/adopting-flat-src-layout.adr.md)
and retains the [existing chart integration](../../adr/use-plotly-for-risk-history-chart.adr.md).
The existing [router](../../src/plugins/router.js) owns route registration, and
the existing [configuration](../../src/config/config.js) derives development mode
from `NODE_ENV`.

No new ADR is proposed. This is a small, reversible extension within the current
architecture, not a new component framework or a change to production access.
