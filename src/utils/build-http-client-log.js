const NANOSECONDS_PER_MILLISECOND = 1_000_000

/**
 * Builds the structured log context for an outgoing HTTP request starting.
 * @param {string} method - HTTP method
 * @param {string} url - Request URL
 */
export const buildHttpClientRequestLog = (method, url) => ({
  event: {
    type: 'http_client_request',
    action: method,
    category: url
  }
})

/**
 * Builds the structured log context for a successful HTTP response.
 * @param {string} method - HTTP method
 * @param {string} url - Request URL
 * @param {number} status - HTTP status code
 * @param {number} duration - Round-trip duration in milliseconds
 */
export const buildHttpClientResponseLog = (method, url, status, duration) => ({
  event: {
    type: 'http_client_response',
    action: method,
    category: url,
    outcome: 'success',
    kind: status,
    duration: duration * NANOSECONDS_PER_MILLISECOND
  }
})

/**
 * Builds the structured log context for a failed HTTP request.
 * @param {string} method - HTTP method
 * @param {string} url - Request URL
 * @param {Error} err - The error thrown
 * @param {number} duration - Duration in milliseconds
 */
export const buildHttpClientErrorLog = (method, url, err, duration) => ({
  event: {
    type: 'http_client_response',
    action: method,
    category: url,
    outcome: 'failure',
    kind: err.status,
    duration: duration * NANOSECONDS_PER_MILLISECOND
  },
  error: {
    code: err.status ?? err.code,
    message: err.message,
    stack_trace: err.stack,
    type: err.constructor.name
  }
})
