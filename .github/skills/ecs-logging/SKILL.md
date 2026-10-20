---
name: ecs-logging
description: Creates ECS-compliant Pino log builder functions and Vitest tests for services hosted on the CDP platform. Use when asked to add logging to a new route, service, or handler.
---

# ECS Logging Skill

Creates structured log builder functions that comply with the Elastic Common Schema (ECS) conventions used in services hosted on the CDP platform.

> **Why this matters:** This service uses Pino with ECS formatting. Flat top-level log fields are silently dropped by the platform. All structured data **must** be nested under `event:` or `error:`.

See [ECS-FIELDS.md](ECS-FIELDS.md) for the full approved field reference.

---

## When to use `event.*` vs `error.*`

| Scenario                                | Use                   |
| --------------------------------------- | --------------------- |
| Request received / operation started    | `event.*`             |
| Response received / operation completed | `event.*`             |
| Operation failed with an error          | `event.*` + `error.*` |
| Error-only logging (no request context) | `error.*`             |

Only use fields from the approved allowlist. Do not invent new top-level keys.

---

## Workflow

### 1. Identify the logging context

Ask:

- What is being logged? (request in, response out, error, background operation)
- What identifiers are available? (uploadId, fileId, correlationId)
- Is there a duration to measure? (response round-trips only)
- Is there an error object?

### 2. Map context to approved fields

Using [ECS-FIELDS.md](ECS-FIELDS.md), select only the fields that have meaningful values for this context. Do not include fields that would be `undefined` or empty — omit them.

### 3. Create the builder file

Create `src/utils/build-{name}-log.js` where `{name}` describes the operation in kebab-case (e.g. `build-callback-log.js`, `build-outbox-publish-log.js`).

Follow this template:

```js
import { constants as httpConstants } from 'node:http2' // only if using HTTP status codes

/**
 * Builds the structured log context for {description of what is being logged}.
 * Uses approved ECS event.* fields only.
 * @param {object} request - Hapi request object
 * @param {string} referenceId - The {uploadId / fileId / correlationId}
 */
export const build{Name}RequestLog = (request, referenceId) => ({
  event: {
    type: '{event_type}',
    action: request.method,
    category: request.path,
    reference: referenceId,
    reason: request.auth?.artifacts?.decoded?.payload?.client_id
  }
})

/**
 * Builds the structured log context for a successful {operation} response.
 * @param {string} referenceId - The {uploadId / fileId / correlationId}
 * @param {object} responseData - Validated response data
 * @param {number} duration - Round-trip duration in milliseconds (converted to nanoseconds internally)
 */
export const build{Name}ResponseLog = (referenceId, responseData, duration) => ({
  event: {
    type: '{event_type}',
    outcome: 'success',
    duration: duration * 1_000_000,
    reference: referenceId,
    reason: responseData.{statusField},
    kind: httpConstants.HTTP_STATUS_OK
  }
})
```

For error builders:

```js
/**
 * Builds the structured log context for a failed {operation}.
 * @param {string} referenceId - The {uploadId / fileId / correlationId}
 * @param {Error} err - The caught error
 */
export const build{Name}ErrorLog = (referenceId, err) => ({
  event: {
    type: '{event_type}',
    outcome: 'failure',
    reference: referenceId
  },
  error: {
    code: err.statusCode ?? err.code,
    message: err.message,
    stack_trace: err.stack,
    type: err.constructor.name
  }
})
```

### 4. Write Vitest tests

Create `test/unit/utils/build-{name}-log.test.js`. Use this skeleton:

```js
import { constants as httpConstants } from 'node:http2'
import { describe, test, expect } from 'vitest'

import { build{Name}RequestLog, build{Name}ResponseLog } from '../../../src/utils/build-{name}-log.js'

describe('build{Name}RequestLog', () => {
  const referenceId = 'test-id-123'

  test('returns a nested event object with approved ECS fields', () => {
    const request = {
      path: '/api/v1/example',
      method: 'post',
      auth: {
        artifacts: { decoded: { payload: { client_id: 'test-client' } } }
      }
    }

    expect(build{Name}RequestLog(request, referenceId)).toEqual({
      event: {
        type: '{event_type}',
        action: 'post',
        category: '/api/v1/example',
        reference: referenceId,
        reason: 'test-client'
      }
    })
  })

  test('sets event.reason to undefined when auth artifacts are absent', () => {
    const request = { path: '/api/v1/example', method: 'post', auth: null }
    const log = build{Name}RequestLog(request, referenceId)
    expect(log.event.reason).toBeUndefined()
  })
})

describe('build{Name}ResponseLog', () => {
  const referenceId = 'test-id-123'

  test('returns a nested event object with approved ECS fields', () => {
    const log = build{Name}ResponseLog(referenceId, { {statusField}: 'ready' }, 100)
    expect(log).toEqual({
      event: {
        type: '{event_type}',
        outcome: 'success',
        duration: 100_000_000,
        reference: referenceId,
        reason: 'ready',
        kind: httpConstants.HTTP_STATUS_OK
      }
    })
  })

  test('converts duration from milliseconds to nanoseconds', () => {
    const log = build{Name}ResponseLog(referenceId, { {statusField}: 'ready' }, 1)
    expect(log.event.duration).toBe(1_000_000)
  })
})
```

### 5. Run the pre-flight checklist

Before considering the task done, verify every item below.

---

## Pre-flight checklist

- [ ] All fields are nested under `event:` or `error:` — no flat top-level keys
- [ ] Duration is converted to nanoseconds: `duration * 1_000_000`
- [ ] Optional fields (auth, duration) use optional chaining or conditional logic — never throw on missing values
- [ ] File is named `build-{name}-log.js` in kebab-case
- [ ] All exports are **named** (not default)
- [ ] ESM import uses `.js` extension: `from './build-{name}-log.js'`
- [ ] Tests use Vitest (`describe`, `test`, `expect`) — never Jest (`jest.fn()`)
- [ ] Tests cover: happy path, missing/optional auth, nanosecond conversion
- [ ] Error builders tested for: correct `error.type`, `error.message`, `error.stack_trace`
- [ ] No fields invented outside the allowlist in [ECS-FIELDS.md](ECS-FIELDS.md)
