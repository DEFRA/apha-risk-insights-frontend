# apha-risk-insights-frontend

[![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=DEFRA_apha-risk-insights-frontend&metric=security_rating)](https://sonarcloud.io/summary/new_code?id=DEFRA_apha-risk-insights-frontend)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=DEFRA_apha-risk-insights-frontend&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=DEFRA_apha-risk-insights-frontend)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=DEFRA_apha-risk-insights-frontend&metric=coverage)](https://sonarcloud.io/summary/new_code?id=DEFRA_apha-risk-insights-frontend)

Node.js frontend for APHA Risk Insights, a [Hapi](https://hapi.dev) server-rendered service built on the
[GOV.UK Design System](https://design-system.service.gov.uk) for the Defra core delivery platform (CDP).

- [Overview](#overview)
- [Architecture](#architecture)
- [Requirements](#requirements)
  - [Node.js](#nodejs)
- [Configuration](#configuration)
- [Server-side Caching](#server-side-caching)
- [Redis](#redis)
- [Proxy](#proxy)
- [Local Development](#local-development)
  - [Setup](#setup)
  - [Git hooks](#git-hooks)
  - [Development](#development)
  - [Production](#production)
  - [Testing and linting](#testing-and-linting)
  - [Npm scripts](#npm-scripts)
  - [Update dependencies](#update-dependencies)
  - [Formatting](#formatting)
    - [Windows prettier issue](#windows-prettier-issue)
- [Docker](#docker)
  - [Development image](#development-image)
  - [Production image](#production-image)
  - [Docker Compose](#docker-compose)
  - [Dependabot](#dependabot)
  - [SonarCloud](#sonarcloud)
- [Troubleshooting](#troubleshooting)
- [Further documentation](#further-documentation)
- [Licence](#licence)
  - [About the licence](#about-the-licence)

## Overview

The service lists diseases with risk assessments and shows a detail page for each, including a risk history chart and
table. Risk data currently comes from static sample data (`src/data/risk-sample-data.json`), not real assessments.

| Route          | Purpose                           |
| -------------- | --------------------------------- |
| `/`            | Home page                         |
| `/risk`        | Risk list                         |
| `/risk/{slug}` | Disease risk detail               |
| `/health`      | Health check used by the platform |

## Architecture

The code uses a flat `src` layout organised by domain (see [ADR](./adr/adopting-flat-src-layout.adr.md)):

| Path             | Responsibility                                                                       |
| ---------------- | ------------------------------------------------------------------------------------ |
| `src/index.js`   | Entry point: starts the server and handles unhandled errors                          |
| `src/server.js`  | Creates the Hapi server and registers plugins and routes                             |
| `src/config`     | [convict](https://github.com/mozilla/node-convict) configuration, driven by env vars |
| `src/plugins`    | Hapi plugins: router, templating, sessions, CSP, logging, tracing, static files      |
| `src/routes`     | Route definitions and handlers (`home`, `risk`, health)                              |
| `src/presenters` | Turn data into view models for templates                                             |
| `src/data`       | Risk data source (repository pattern, swappable for a backend API)                   |
| `src/views`      | Nunjucks templates                                                                   |
| `src/client`     | Frontend JavaScript and SCSS, built with Vite into `.public`                         |
| `src/utils`      | Logging, caching, errors and helpers                                                 |
| `test`           | Shared test helpers (imported as `#test/*`)                                          |

Request flow: route handler -> data source (`src/data`) -> presenter -> Nunjucks view. Key dependencies: Hapi, Nunjucks,
govuk-frontend, Plotly (risk history chart), convict, pino, Catbox (memory/Redis), Vite and Vitest.

## Configuration

All configuration is read from environment variables in [src/config/config.js](./src/config/config.js). Copy
[.env.example](./.env.example) to `.env` for local development; `npm run dev` loads it automatically if present.

```bash
cp .env.example .env
```

## Server-side Caching

We use Catbox for server-side caching. By default the service will use CatboxRedis when deployed and CatboxMemory for
local development.
You can override the default behaviour by setting the `SESSION_CACHE_ENGINE` environment variable to either `redis` or
`memory`.

Please note: CatboxMemory (`memory`) is _not_ suitable for production use! The cache will not be shared between each
instance of the service and it will not persist between restarts.

## Redis

Redis is an in-memory key-value store. Every instance of a service has access to the same Redis key-value store similar
to how services might have a database (or MongoDB). All frontend services are given access to a namespaced prefixed that
matches the service name. e.g. `my-service` will have access to everything in Redis that is prefixed with `my-service`.

If your service does not require a session cache to be shared between instances or if you don't require Redis, you can
disable setting `SESSION_CACHE_ENGINE=false` or changing the default value in `src/config/index.js`.

## Proxy

We are using forward-proxy which is set up by default. Services are automatically configured with the proxy environment variables when deployed.

Node.js 24 uses these variables to route outbound HTTP(S) requests through the proxy:

NODE_USE_ENV_PROXY=1
HTTPS_PROXY=...
NO_PROXY=...

No additional proxy configuration is required in the service.

## Local Development

### Setup

Install application dependencies:

```bash
npm install
```

### Git hooks

Install git hooks (optional)

```bash
npm run git:hooks
```

### Development

To run the application in `development` mode run:

```bash
npm run dev
```

### Production

To mimic the application running in `production` mode locally run:

```bash
npm start
```

### Testing and linting

```bash
npm test          # vitest with coverage
npm run test:watch
npm run lint      # eslint and stylelint
npm run format:check
```

### Npm scripts

All available Npm scripts can be seen in [package.json](./package.json)
To view them in your command line run:

```bash
npm run
```

### Update dependencies

To update dependencies use [npm-check-updates](https://github.com/raineorshine/npm-check-updates):

> The following script is a good start. Check out all the options on
> the [npm-check-updates](https://github.com/raineorshine/npm-check-updates)

```bash
ncu --interactive --format group
```

### Formatting

#### Windows prettier issue

If you are having issues with formatting of line breaks on Windows update your global git config by running:

```bash
git config --global core.autocrlf false
```

## Docker

### Development image

> [!TIP]
> For Apple Silicon users, you may need to add `--platform linux/amd64` to the `docker run` command to ensure
> compatibility fEx: `docker build --platform=linux/arm64 --no-cache --tag apha-risk-insights-frontend`

Build:

```bash
docker build --target development --no-cache --tag apha-risk-insights-frontend:development .
```

Run:

```bash
docker run -p 3000:3000 apha-risk-insights-frontend:development
```

### Production image

Build:

```bash
docker build --no-cache --tag apha-risk-insights-frontend .
```

Run:

```bash
docker run -p 3000:3000 apha-risk-insights-frontend
```

### Docker Compose

A local environment with:

- Floci (replacing Localstack) for AWS services (S3, SQS)
- Redis
- MongoDB
- This service.

```bash
docker compose up --build -d
```

### Dependabot

We have added an example dependabot configuration file to the repository. You can enable it by renaming
the [.github/example.dependabot.yml](.github/example.dependabot.yml) to `.github/dependabot.yml`

### SonarCloud

Instructions for setting up SonarCloud can be found in [sonar-project.properties](./sonar-project.properties).

## Troubleshooting

- **Wrong Node.js version**: run `nvm use` in the repository root. The service requires Node.js 24 or later.
- **Port 3000 already in use**: set `PORT` in `.env` or stop the other process.
- **Logger errors on start**: leave `LOG_REDACT` unset locally; an empty value breaks the logger.
- **Redis connection errors**: locally use `SESSION_CACHE_ENGINE=memory`, or start Redis with `docker compose up redis`.
- **Missing styles or scripts**: assets are built by Vite; `npm start` builds them automatically via `prestart`, or run
  `npm run build:frontend`.
- **Apple Silicon Docker issues**: add `--platform linux/amd64` to the build or run command.

## Further documentation

- [Architecture decision records](./adr)
- [Disease detail plan](./docs/plans/disease-detail-plan.md)
- [Defra CDP documentation](https://portal.cdp-int.defra.cloud/documentation)

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
