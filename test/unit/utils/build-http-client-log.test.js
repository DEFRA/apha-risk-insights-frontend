import {
  buildHttpClientRequestLog,
  buildHttpClientSuccessLog,
  buildHttpClientErrorLog
} from '#/utils/build-http-client-log.js'

const method = 'POST'
const url = 'https://example.test/api/items'

describe('buildHttpClientRequestLog', () => {
  test('returns a nested event object with approved ECS fields only', () => {
    expect(buildHttpClientRequestLog(method, url)).toEqual({
      event: {
        type: 'http_client_request',
        action: method,
        category: url
      }
    })
  })

  test('has no top-level keys other than event', () => {
    expect(Object.keys(buildHttpClientRequestLog(method, url))).toEqual([
      'event'
    ])
  })

  test('omits event.duration, outcome and kind for the request-start log', () => {
    const { event } = buildHttpClientRequestLog(method, url)
    expect(event).not.toHaveProperty('duration')
    expect(event).not.toHaveProperty('outcome')
    expect(event).not.toHaveProperty('kind')
  })
})

describe('buildHttpClientSuccessLog', () => {
  test('returns a nested event object with approved ECS fields', () => {
    const log = buildHttpClientSuccessLog(method, url, 200, 25)

    expect(log).toEqual({
      event: {
        type: 'http_client_request',
        action: method,
        category: url,
        outcome: 'success',
        kind: 200,
        duration: 25_000_000
      }
    })
  })

  test('has no top-level keys other than event and no error object', () => {
    expect(Object.keys(buildHttpClientSuccessLog(method, url, 200, 1))).toEqual(
      ['event']
    )
  })

  test('converts duration from milliseconds to nanoseconds', () => {
    expect(buildHttpClientSuccessLog(method, url, 200, 1).event.duration).toBe(
      1_000_000
    )
  })

  test('keeps a zero duration rather than omitting it', () => {
    expect(buildHttpClientSuccessLog(method, url, 200, 0).event.duration).toBe(
      0
    )
  })

  test('omits event.kind when status is undefined', () => {
    const { event } = buildHttpClientSuccessLog(method, url, undefined, 5)
    expect(event).not.toHaveProperty('kind')
  })
})

describe('buildHttpClientErrorLog', () => {
  test('returns event and error objects with approved ECS fields when status is given', () => {
    const err = new TypeError('Something broke')

    expect(buildHttpClientErrorLog(method, url, err, 40, 503)).toEqual({
      event: {
        type: 'http_client_request',
        action: method,
        category: url,
        outcome: 'failure',
        kind: 503,
        duration: 40_000_000
      },
      error: {
        code: 503,
        message: 'Something broke',
        stack_trace: err.stack,
        type: 'TypeError'
      }
    })
  })

  test('has no top-level keys other than event and error', () => {
    const log = buildHttpClientErrorLog(method, url, new Error('x'), 1, 500)
    expect(Object.keys(log).sort()).toEqual(['error', 'event'])
  })

  test('uses err.code for error.code and omits event.kind when status is undefined', () => {
    const err = Object.assign(new Error('connect refused'), {
      code: 'ECONNREFUSED'
    })

    const log = buildHttpClientErrorLog(method, url, err, 10)

    expect(log.error.code).toBe('ECONNREFUSED')
    expect(log.event).not.toHaveProperty('kind')
  })

  test('prefers status over err.code for error.code', () => {
    const err = Object.assign(new Error('bad'), { code: 'SOMETHING' })
    expect(buildHttpClientErrorLog(method, url, err, 10, 404).error.code).toBe(
      404
    )
  })

  test('omits error.code when neither status nor err.code is available', () => {
    const log = buildHttpClientErrorLog(method, url, new Error('x'), 10)
    expect(log.error).not.toHaveProperty('code')
  })

  test('uses the error constructor name for error.type', () => {
    class CustomError extends Error {}
    const log = buildHttpClientErrorLog(method, url, new CustomError('x'), 1)
    expect(log.error.type).toBe('CustomError')
  })

  test('converts duration from milliseconds to nanoseconds', () => {
    const log = buildHttpClientErrorLog(method, url, new Error('x'), 2, 500)
    expect(log.event.duration).toBe(2_000_000)
  })

  test('does not include headers or bodies even when the error carries them', () => {
    const err = Object.assign(new Error('x'), {
      headers: { authorization: 'Bearer secret' },
      body: { password: 'secret' }
    })

    const serialised = JSON.stringify(
      buildHttpClientErrorLog(method, url, err, 1, 500)
    )

    expect(serialised).not.toContain('secret')
    expect(serialised).not.toContain('authorization')
  })
})
