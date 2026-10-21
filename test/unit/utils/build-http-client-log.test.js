import {
  buildHttpClientErrorLog,
  buildHttpClientRequestLog,
  buildHttpClientResponseLog
} from '#/utils/build-http-client-log.js'

describe('#buildHttpClientRequestLog', () => {
  test('returns nested event with method and url', () => {
    expect(buildHttpClientRequestLog('GET', 'http://x/y')).toEqual({
      event: {
        type: 'http_client_request',
        action: 'GET',
        category: 'http://x/y'
      }
    })
  })
})

describe('#buildHttpClientResponseLog', () => {
  test('returns event with status and duration in nanoseconds', () => {
    expect(buildHttpClientResponseLog('GET', 'http://x/y', 200, 5)).toEqual({
      event: {
        type: 'http_client_response',
        action: 'GET',
        category: 'http://x/y',
        outcome: 'success',
        kind: 200,
        duration: 5_000_000
      }
    })
  })
})

describe('#buildHttpClientErrorLog', () => {
  test('includes event and error details for an HTTP error', () => {
    const err = Object.assign(new Error('boom'), { status: 500 })
    const log = buildHttpClientErrorLog('POST', 'http://x/y', err, 2)

    expect(log.event).toEqual({
      type: 'http_client_response',
      action: 'POST',
      category: 'http://x/y',
      outcome: 'failure',
      kind: 500,
      duration: 2_000_000
    })
    expect(log.error).toEqual({
      code: 500,
      message: 'boom',
      stack_trace: err.stack,
      type: 'Error'
    })
  })

  test('omits status for network errors', () => {
    const err = new TypeError('fetch failed')
    const log = buildHttpClientErrorLog('GET', 'http://x/y', err, 1)

    expect(log.event.kind).toBeUndefined()
    expect(log.error.type).toBe('TypeError')
  })
})
