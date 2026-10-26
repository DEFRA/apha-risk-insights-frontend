const EVENT_TYPE = 'http_client_request'
const NANOSECONDS_PER_MILLISECOND = 1_000_000
const OUTCOME_SUCCESS = 'success'
const OUTCOME_FAILURE = 'failure'

/**
 * Remove keys whose value is undefined.
 * @param {Record<string, unknown>} fields
 * @returns {Record<string, unknown>}
 */
const omitUndefined = (fields) =>
  Object.fromEntries(
    Object.entries(fields).filter(([, value]) => value !== undefined)
  )

/**
 * @param {string} method
 * @param {string} url
 * @param {string} outcome
 * @param {number | undefined} status
 * @param {number} durationMs
 * @returns {Record<string, unknown>}
 */
const buildOutcomeEvent = (method, url, outcome, status, durationMs) =>
  omitUndefined({
    type: EVENT_TYPE,
    action: method,
    category: url,
    outcome,
    kind: status,
    duration: durationMs * NANOSECONDS_PER_MILLISECOND
  })

/**
 * Build the ECS log object for the start of an outbound HTTP request.
 * @param {string} method - HTTP method
 * @param {string} url - Request URL
 * @returns {{ event: Record<string, unknown> }}
 */
const buildHttpClientRequestLog = (method, url) => ({
  event: { type: EVENT_TYPE, action: method, category: url }
})

/**
 * Build the ECS log object for a successful outbound HTTP request.
 * @param {string} method - HTTP method
 * @param {string} url - Request URL
 * @param {number | undefined} status - HTTP response status
 * @param {number} durationMs - Elapsed time in milliseconds
 * @returns {{ event: Record<string, unknown> }}
 */
const buildHttpClientSuccessLog = (method, url, status, durationMs) => ({
  event: buildOutcomeEvent(method, url, OUTCOME_SUCCESS, status, durationMs)
})

/**
 * Build the ECS log object for a failed outbound HTTP request.
 * Never includes request or response headers or bodies.
 * @param {string} method - HTTP method
 * @param {string} url - Request URL
 * @param {Error & { code?: string | number }} err - The error that occurred
 * @param {number} durationMs - Elapsed time in milliseconds
 * @param {number} [status] - HTTP response status, if one was received
 * @returns {{ event: Record<string, unknown>, error: Record<string, unknown> }}
 */
const buildHttpClientErrorLog = (method, url, err, durationMs, status) => ({
  event: buildOutcomeEvent(method, url, OUTCOME_FAILURE, status, durationMs),
  error: omitUndefined({
    code: status ?? err.code,
    message: err.message,
    stack_trace: err.stack,
    type: err.constructor.name
  })
})

export {
  buildHttpClientRequestLog,
  buildHttpClientSuccessLog,
  buildHttpClientErrorLog
}
