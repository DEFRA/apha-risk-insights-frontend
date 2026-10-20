# apha-risk-insights-frontend

[![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=DEFRA_apha-risk-insights-frontend&metric=security_rating)](https://sonarcloud.io/summary/new_code?id=DEFRA_apha-risk-insights-frontend)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=DEFRA_apha-risk-insights-frontend&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=DEFRA_apha-risk-insights-frontend)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=DEFRA_apha-risk-insights-frontend&metric=coverage)](https://sonarcloud.io/summary/new_code?id=DEFRA_apha-risk-insights-frontend)

Server-rendered GOV.UK frontend for APHA Risk Insights. It shows disease risk assessments and, for each disease, a
detail page with its risk level history. Built from the Defra Core Delivery Platform (CDP) Node.js frontend template.

> [!NOTE]
> Risk data is currently read from a static sample file (`src/data/risk-sample-data.json`). It is sample data, not real
> assessments. It is accessed through a repository module so it can later be swapped for the `apha-risk-insights-backend`
> API. See [ADR: accessing risk data through a repository](./adr/accessing-risk-data-through-repository.adr.md).

- [Prerequisites](#prerequisites)
- [Architecture](#architecture)
- [Local development](#local-development)
- [Configuration](#configuration)
- [Testing and quality checks](#testing-and-quality-checks)
- [Docker](#docker)
- [Deployment and CI](#deployment-and-ci)
- [Server-side caching and Redis](#server-side-caching-and-redis)
- [Proxy](#proxy)
- [Troubleshooting](#troubleshooting)
- [Further documentation](#further-documentation)
- [Licence](#licence)

## Prerequisites

- Node.js `>=24`. The exact version is in [.nvmrc](./.nvmrc); use [nvm](https://github.com/nvm-sh/nvm): `nvm use`
- npm (bundled with Node.js)
- Docker and Docker Compose (optional, for the containerised environment and for running tests the way CI does)

## Architecture

A [Hapi](https://hapi.dev) server rendering [Nunjucks](https://mozilla.github.io/nunjucks/) templates with
[govuk-frontend](https://frontend.design-system.service.gov.uk/). Client assets (Sass, JavaScript) are built with
[Vite](https://vite.dev). The history chart uses [Plotly](https://plotly.com/javascript/)
([ADR](./adr/use-plotly-for-risk-history-chart.adr.md)). Configuration uses [convict](https://github.com/mozilla/node-convict).

The code uses a flat `src/` layout with domain folders ([ADR](./adr/adopting-flat-src-layout.adr.md)):

| Path             | Purpose                                                                         |
| ---------------- | ------------------------------------------------------------------------------- |
| `src/index.js`   | Entry point; starts the server                                                  |
| `src/server.js`  | Creates the Hapi server and registers plugins and routes                        |
| `src/config`     | Convict configuration (`config.js`)                                             |
| `src/plugins`    | Hapi plugins: routing, templates, sessions, CSP, logging, tracing, static files |
| `src/routes`     | Route definitions per domain (`health`, `home`, `risk`)                         |
| `src/presenters` | Turn data into view models for templates                                        |
| `src/data`       | Risk data source and sample data                                                |
| `src/views`      | Nunjucks templates and components                                               |
| `src/client`     | Front-end JavaScript and Sass, built by Vite                                    |
| `src/utils`      | Logger, caching, error and server start helpers                                 |
| `test`           | `unit` and `integration` tests, plus shared `helpers`                           |
| `adr`            | Architecture decision records                                                   |

Routes:

| Route          | Description                       |
| -------------- | --------------------------------- |
| `/`            | Home page                         |
| `/risk`        | Risk list                         |
| `/risk/{slug}` | Disease detail with risk history  |
| `/health`      | Health check used by the platform |

## Local development

Install dependencies:

```bash
npm install
```

Optionally copy [.env.example](./.env.example) to `.env` to override defaults (it is loaded automatically by `npm run dev`):

```bash
cp .env.example .env
```

Run in development mode (auto-restarts on changes in `src`, debugger on port 9229):

```bash
npm run dev
```

The app is available at <http://localhost:3000>. To mimic production (builds the frontend first):

```bash
npm start
```

Build the client assets only with `npm run build:frontend`. List all scripts with `npm run`.

### Git hooks

`.npmrc` sets `ignore-scripts=true`, so hooks are not installed automatically. To install the husky pre-commit hook
(runs security audit, format check, lint and tests) run:

```bash
npm run setup:husky
```

### Update dependencies

Use [npm-check-updates](https://github.com/raineorshine/npm-check-updates). Dependencies are pinned to exact versions
and `.npmrc` sets a minimum release age.

```bash
npx npm-check-updates --interactive --format group
```

### Windows line endings

If formatting complains about line breaks on Windows, run `git config --global core.autocrlf false`.

## Configuration

All settings are defined in [src/config/config.js](./src/config/config.js) and set by environment variables. Every
variable, with its development default, is documented in [.env.example](./.env.example). Some defaults differ when
`NODE_ENV=production` (for example Redis session cache, secure cookies and ECS log format).

## Testing and quality checks

```bash
npm test                # vitest with coverage
npm run test:watch      # watch mode
npm run lint            # eslint and stylelint
npm run format:check    # prettier check (npm run format to fix)
npm run security-audit  # npm audit, critical level
npm run docker:test     # run tests in Docker, as CI does
```

## Docker

> [!TIP]
> On Apple Silicon you may need `--platform linux/amd64` on `docker build`/`docker run`.

Development image:

```bash
docker build --target development --no-cache --tag apha-risk-insights-frontend:development .
docker run -p 3000:3000 apha-risk-insights-frontend:development
```

Production image:

```bash
docker build --no-cache --tag apha-risk-insights-frontend .
docker run -p 3000:3000 apha-risk-insights-frontend
```

### Docker Compose

Starts this service with Floci (AWS emulation for S3/SQS), Redis and MongoDB:

```bash
npm run docker:up      # or: docker compose up --build -d
npm run docker:stop    # stop; docker:stop:v also removes volumes
```

## Deployment and CI

- Pull requests run [check-pull-request.yml](./.github/workflows/check-pull-request.yml): security audit, format check,
  lint, tests in Docker and a Docker image build.
- [publish.yml](./.github/workflows/publish.yml) and [publish-hotfix.yml](./.github/workflows/publish-hotfix.yml)
  build and publish the image for deployment on CDP.
- Quality is tracked in SonarCloud (see [sonar-project.properties](./sonar-project.properties)).
- An example Dependabot config is in [.github/example.dependabot.yml](.github/example.dependabot.yml); rename it to
  `.github/dependabot.yml` to enable it.

## Server-side caching and Redis

Catbox is used for server-side sessions. The default is CatboxRedis in production and CatboxMemory locally. Override
with `SESSION_CACHE_ENGINE=redis|memory`. Memory is _not_ suitable for production: it is not shared between instances
and does not persist across restarts.

Redis keys are namespaced by `REDIS_KEY_PREFIX` (default `apha-risk-insights-frontend:`).

## Proxy

Outbound requests go through the CDP forward proxy. Deployed services get `NODE_USE_ENV_PROXY=1`, `HTTPS_PROXY` and
`NO_PROXY` automatically and Node.js 24 uses them; no extra configuration is needed.

## Troubleshooting

- **Wrong Node version / engine errors**: run `nvm use`.
- **Port 3000 in use**: set `PORT` in `.env`.
- **Logger fails on start**: do not set an empty `LOG_REDACT`; leave it unset locally.
- **Session errors in production**: `SESSION_COOKIE_PASSWORD` must be at least 32 characters.
- **Redis connection errors locally**: use `SESSION_CACHE_ENGINE=memory` (default) or start Redis via Docker Compose.
- **Install scripts did not run**: expected, `.npmrc` has `ignore-scripts=true`.
- **Page styles/assets missing under `npm start`**: run `npm run build:frontend`.

## Further documentation

- [Architecture decision records](./adr)
- [Disease detail plan](./docs/plans/disease-detail-plan.md)

## Licence

THIS INFORMATION IS LICENSED UNDER THE CONDITIONS OF THE OPEN GOVERNMENT LICENCE found at:

<http://www.nationalarchives.gov.uk/doc/open-government-licence/version/3>

The following attribution statement MUST be cited in your products and applications when using this information.

> Contains public sector information licensed under the Open Government license v3

### About the licence

The Open Government Licence (OGL) was developed by the Controller of Her Majesty's Stationery Office (HMSO) to enable
information providers in the public sector to license the use and re-use of their information under a common open
licence.

It is designed to encourage use and re-use of information freely and flexibly, with only a few conditions.
