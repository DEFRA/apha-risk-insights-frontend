import {
  buildHttpClientErrorLog,
  buildHttpClientRequestLog,
  buildHttpClientResponseLog
} from '#/utils/build-http-client-log.js'

describe('buildHttpClientRequestLog', () => {
  test('returns nested event fields', () => {
    expect(buildHttpClientRequestLog('GET', 'http://x/y')).toEqual({
      event: {
        type: 'http_client_request',
        action: 'GET',
        category: 'http://x/y'
      }
    })
  })
})

describe('buildHttpClientResponseLog', () => {
  test('returns event with status and duration in nanoseconds', () => {
    expect(buildHttpClientResponseLog('GET', 'http://x/y', 200, 2)).toEqual({
      event: {
        type: 'http_client_response',
        action: 'GET',
        category: 'http://x/y',
        outcome: 'success',
        kind: 200,
        duration: 2_000_000
      }
    })
  })
})

describe('buildHttpClientErrorLog', () => {
  test('includes status for HTTP errors', () => {
    const err = Object.assign(new Error('boom'), { status: 500 })
    const log = buildHttpClientErrorLog('POST', 'http://x/y', err, 1)
    expect(log.event).toMatchObject({
      outcome: 'failure',
      kind: 500,
      duration: 1_000_000
    })
    expect(log.error).toEqual({
      code: 500,
      message: 'boom',
      stack_trace: err.stack,
      type: 'Error'
    })
  })

  test('omits kind for network errors and uses cause code', () => {
    const err = new Error('net', { cause: { code: 'ECONNREFUSED' } })
    const log = buildHttpClientErrorLog('GET', 'http://x/y', err, 1)
    expect(log.event).not.toHaveProperty('kind')
    expect(log.error.code).toBe('ECONNREFUSED')
  })

  test('only uses event and error top-level keys', () => {
    const log = buildHttpClientErrorLog('GET', 'u', new Error('e'), 1)
    expect(Object.keys(log).sort()).toEqual(['error', 'event'])
  })
})
