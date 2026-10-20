# ECS Field Reference — CDP Platform Services

This service uses [Pino](https://getpino.io/) with [Elastic Common Schema (ECS)](https://www.elastic.co/guide/en/ecs/current/index.html) formatting.

> **⚠️ Rule:** All structured log fields MUST be nested under `event:` or `error:`. Flat top-level keys are silently dropped by the platform and will never appear in logs.

---

## Approved `event.*` fields

Use for normal request/response flows and operational events.

| Field             | Type | Purpose                                                                 |
| ----------------- | ---- | ----------------------------------------------------------------------- |
| `event.type`      | text | Specific event name (e.g. `status_check`, `callback_received`)          |
| `event.action`    | text | Action taken — use for HTTP method or operation name                    |
| `event.category`  | text | Broad category — use for request path                                   |
| `event.reference` | text | Reference ID tied to the event — use for `uploadId`, `fileId`, etc.     |
| `event.reason`    | text | Reason/explanation — use for `clientId`, `uploadStatus`, or error cause |
| `event.outcome`   | text | Outcome of the event: `success`, `failure`, or `unknown`                |
| `event.kind`      | text | High-level type — use for HTTP status code                              |
| `event.duration`  | long | Round-trip time in **nanoseconds** — convert ms with `ms * 1_000_000`   |
| `event.severity`  | long | Custom severity level (0–10)                                            |
| `event.created`   | date | Time the event was created (ISO 8601)                                   |

---

## Approved `error.*` fields

Use for failure scenarios. Can be combined with `event.*` when logging an error alongside event context.

| Field               | Type | Purpose                                                      |
| ------------------- | ---- | ------------------------------------------------------------ |
| `error.code`        | text | Numeric or symbolic error code (e.g. HTTP status code)       |
| `error.id`          | text | Unique identifier for the error instance                     |
| `error.message`     | text | Descriptive error message                                    |
| `error.stack_trace` | text | Full error stack trace                                       |
| `error.type`        | text | Error class or type (e.g. `ValidationError`, `TimeoutError`) |

---

## Examples

### Event only (request in)

```js
{
  event: {
    type: 'status_check',
    action: request.method,
    category: request.path,
    reference: uploadId,
    reason: request.auth?.artifacts?.decoded?.payload?.client_id
  }
}
```

### Event only (response out)

```js
{
  event: {
    type: 'status_check',
    outcome: 'success',
    duration: duration * 1_000_000,
    reference: uploadId,
    reason: cdpResponse.uploadStatus,
    kind: httpConstants.HTTP_STATUS_OK
  }
}
```

### Error only

```js
{
  error: {
    code: response.statusCode,
    id: errorId,
    message: errorMessage,
    type: 'UpstreamServiceError'
  }
}
```

### Event + error combined (failure with context)

```js
{
  event: {
    type: 'callback_processing',
    outcome: 'failure',
    reference: uploadId
  },
  error: {
    code: err.statusCode,
    message: err.message,
    stack_trace: err.stack,
    type: err.constructor.name
  }
}
```
