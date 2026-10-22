import { describe, test, expect } from 'vitest'

import {
  buildHttpClientErrorLog,
  buildHttpClientRequestLog,
  buildHttpClientResponseLog
} from '#/utils/build-http-client-log.js'

describe('buildHttpClientRequestLog', () => {
  test('returns nested event fields', () => {
    expect(buildHttpClientRequestLog('GET', 'http://x/a')).toEqual({
      event: {
        type: 'http_client_request',
        action: 'GET',
        category: 'http://x/a'
      }
    })
  })
})

describe('buildHttpClientResponseLog', () => {
  test('includes status and duration in nanoseconds', () => {
    expect(buildHttpClientResponseLog('GET', 'http://x/a', 200, 5)).toEqual({
      event: {
        type: 'http_client_response',
        action: 'GET',
        category: 'http://x/a',
        outcome: 'success',
        kind: 200,
        duration: 5_000_000
      }
    })
  })
})

describe('buildHttpClientErrorLog', () => {
  test('includes event and error fields', () => {
    const err = Object.assign(new Error('boom'), { status: 500 })
    const log = buildHttpClientErrorLog('POST', 'http://x/a', err, 2)
    expect(log.event).toEqual({
      type: 'http_client_response',
      action: 'POST',
      category: 'http://x/a',
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

  test('falls back to err.code and omits status for network errors', () => {
    const err = Object.assign(new Error('x'), { code: 'ECONNREFUSED' })
    const log = buildHttpClientErrorLog('GET', 'u', err, 1)
    expect(log.error.code).toBe('ECONNREFUSED')
    expect(log.event.kind).toBeUndefined()
  })
})
