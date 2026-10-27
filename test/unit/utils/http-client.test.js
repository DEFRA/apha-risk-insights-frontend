import { vi } from 'vitest'

import { httpRequest, HttpError, NetworkError } from '#/utils/http-client.js'

const mockLogger = vi.hoisted(() => ({
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn()
}))

vi.mock('#/utils/logger.js', () => ({
  createLogger: () => mockLogger
}))

const url = 'https://example.test/api/items'

const makeResponse = ({
  status = 200,
  statusText = 'OK',
  contentType,
  body = ''
} = {}) => {
  const headers = new Headers()
  if (contentType) {
    headers.set('content-type', contentType)
  }
  return new Response(status === 204 ? null : body, {
    status,
    statusText,
    headers
  })
}

const jsonResponse = (data, init = {}) =>
  makeResponse({
    contentType: 'application/json',
    body: JSON.stringify(data),
    ...init
  })

const problemResponse = (status, statusText, body) =>
  makeResponse({
    status,
    statusText,
    contentType: 'application/problem+json',
    body: typeof body === 'string' ? body : JSON.stringify(body)
  })

describe('#httpRequest', () => {
  let fetchMock

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('request building', () => {
    test('Should default to GET with the given url', async () => {
      fetchMock.mockResolvedValue(jsonResponse({}))

      await httpRequest(url)

      expect(fetchMock).toHaveBeenCalledTimes(1)
      const [calledUrl, init] = fetchMock.mock.calls[0]
      expect(calledUrl).toBe(url)
      expect(init.method).toBe('GET')
      expect(init.body).toBeUndefined()
    })

    test('Should use the supplied method and headers', async () => {
      fetchMock.mockResolvedValue(jsonResponse({}))

      await httpRequest(url, {
        method: 'DELETE',
        headers: { 'x-custom': 'abc' }
      })

      const [, init] = fetchMock.mock.calls[0]
      expect(init.method).toBe('DELETE')
      expect(init.headers).toMatchObject({ 'x-custom': 'abc' })
    })

    test('Should JSON stringify a plain object body and default the content-type to application/json', async () => {
      fetchMock.mockResolvedValue(jsonResponse({}))

      await httpRequest(url, { method: 'POST', body: { name: 'Jane Smith' } })

      const [, init] = fetchMock.mock.calls[0]
      expect(init.body).toBe(JSON.stringify({ name: 'Jane Smith' }))
      expect(new Headers(init.headers).get('content-type')).toBe(
        'application/json'
      )
    })

    test('Should let a caller supplied content-type win over the default', async () => {
      fetchMock.mockResolvedValue(jsonResponse({}))

      await httpRequest(url, {
        method: 'POST',
        headers: { 'content-type': 'application/vnd.test+json' },
        body: { a: 1 }
      })

      const [, init] = fetchMock.mock.calls[0]
      expect(new Headers(init.headers).get('content-type')).toBe(
        'application/vnd.test+json'
      )
      expect(init.body).toBe(JSON.stringify({ a: 1 }))
    })

    test('Should pass a string body through unchanged', async () => {
      fetchMock.mockResolvedValue(jsonResponse({}))

      await httpRequest(url, { method: 'POST', body: 'a=1&b=2' })

      const [, init] = fetchMock.mock.calls[0]
      expect(init.body).toBe('a=1&b=2')
    })

    test('Should not add a JSON content-type for a string body', async () => {
      fetchMock.mockResolvedValue(jsonResponse({}))

      await httpRequest(url, { method: 'POST', body: 'plain text' })

      const [, init] = fetchMock.mock.calls[0]
      expect(new Headers(init.headers).get('content-type')).not.toBe(
        'application/json'
      )
    })

    test('Should not configure timeouts or abort signals', async () => {
      fetchMock.mockResolvedValue(jsonResponse({}))

      await httpRequest(url)

      const [, init] = fetchMock.mock.calls[0]
      expect(init.signal).toBeUndefined()
    })
  })

  describe('successful responses', () => {
    test('Should return parsed data for an application/json response', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ id: 1, name: 'Test' }))

      await expect(httpRequest(url)).resolves.toEqual({ id: 1, name: 'Test' })
    })

    test('Should return parsed data for a json content-type with a charset', async () => {
      fetchMock.mockResolvedValue(
        makeResponse({
          contentType: 'application/json; charset=utf-8',
          body: '{"ok":true}'
        })
      )

      await expect(httpRequest(url)).resolves.toEqual({ ok: true })
    })

    test('Should return parsed data for a +json content-type', async () => {
      fetchMock.mockResolvedValue(
        makeResponse({
          contentType: 'application/vnd.api+json',
          body: '{"ok":true}'
        })
      )

      await expect(httpRequest(url)).resolves.toEqual({ ok: true })
    })

    test('Should return null for a 204 response', async () => {
      fetchMock.mockResolvedValue(
        makeResponse({ status: 204, statusText: 'No Content' })
      )

      await expect(httpRequest(url)).resolves.toBeNull()
    })

    test('Should return null for a 2xx JSON response with an empty body', async () => {
      fetchMock.mockResolvedValue(
        makeResponse({ contentType: 'application/json', body: '' })
      )

      await expect(httpRequest(url)).resolves.toBeNull()
    })

    test('Should return null for a 2xx response with no content-type and an empty body', async () => {
      fetchMock.mockResolvedValue(makeResponse({ body: '' }))

      await expect(httpRequest(url)).resolves.toBeNull()
    })

    test('Should return response text for a non-JSON content-type', async () => {
      fetchMock.mockResolvedValue(
        makeResponse({ contentType: 'text/plain', body: 'hello world' })
      )

      await expect(httpRequest(url)).resolves.toBe('hello world')
    })

    test('Should return response text for a non-JSON 2xx response with no content-type', async () => {
      fetchMock.mockResolvedValue(makeResponse({ body: 'raw body' }))

      await expect(httpRequest(url)).resolves.toBe('raw body')
    })

    test('Should treat any 2xx status as success', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse({ created: true }, { status: 201, statusText: 'Created' })
      )

      await expect(httpRequest(url, { method: 'POST' })).resolves.toEqual({
        created: true
      })
    })
  })

  describe('error responses', () => {
    test.each([
      [400, 'Bad Request'],
      [401, 'Unauthorized'],
      [404, 'Not Found'],
      [500, 'Internal Server Error'],
      [503, 'Service Unavailable']
    ])(
      'Should throw an HttpError with status %i',
      async (status, statusText) => {
        fetchMock.mockResolvedValue(
          makeResponse({
            status,
            statusText,
            contentType: 'text/html',
            body: 'x'
          })
        )

        const error = await httpRequest(url, { method: 'PUT' }).catch((e) => e)

        expect(error).toBeInstanceOf(HttpError)
        expect(error).toBeInstanceOf(Error)
        expect(error.status).toBe(status)
        expect(error.url).toBe(url)
        expect(error.method).toBe('PUT')
      }
    )

    test('Should populate title, detail and instance from an application/problem+json body', async () => {
      fetchMock.mockResolvedValue(
        problemResponse(422, 'Unprocessable Entity', {
          title: 'Validation failed',
          detail: 'name must not be empty',
          instance: '/errors/abc-123'
        })
      )

      const error = await httpRequest(url, { method: 'POST' }).catch((e) => e)

      expect(error).toBeInstanceOf(HttpError)
      expect(error.status).toBe(422)
      expect(error.title).toBe('Validation failed')
      expect(error.detail).toBe('name must not be empty')
      expect(error.instance).toBe('/errors/abc-123')
    })

    test('Should handle problem+json with a content-type charset parameter', async () => {
      fetchMock.mockResolvedValue(
        makeResponse({
          status: 400,
          statusText: 'Bad Request',
          contentType: 'application/problem+json; charset=utf-8',
          body: JSON.stringify({ title: 'Nope', detail: 'Bad', instance: '/i' })
        })
      )

      const error = await httpRequest(url).catch((e) => e)

      expect(error.title).toBe('Nope')
      expect(error.detail).toBe('Bad')
      expect(error.instance).toBe('/i')
    })

    test('Should fall back to statusText for title when problem+json body omits it', async () => {
      fetchMock.mockResolvedValue(
        problemResponse(409, 'Conflict', { detail: 'Already exists' })
      )

      const error = await httpRequest(url).catch((e) => e)

      expect(error.title).toBe('Conflict')
      expect(error.detail).toBe('Already exists')
      expect(error.instance).toBeUndefined()
    })

    test('Should fall back to statusText when problem+json body cannot be parsed', async () => {
      fetchMock.mockResolvedValue(
        problemResponse(500, 'Internal Server Error', '{not valid json')
      )

      const error = await httpRequest(url).catch((e) => e)

      expect(error).toBeInstanceOf(HttpError)
      expect(error.status).toBe(500)
      expect(error.title).toBe('Internal Server Error')
      expect(error.detail).toBeUndefined()
      expect(error.instance).toBeUndefined()
    })

    test('Should fall back to statusText when problem+json body is empty', async () => {
      fetchMock.mockResolvedValue(problemResponse(502, 'Bad Gateway', ''))

      const error = await httpRequest(url).catch((e) => e)

      expect(error).toBeInstanceOf(HttpError)
      expect(error.title).toBe('Bad Gateway')
    })

    test('Should use statusText as title for a plain application/json error body', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse(
          { title: 'Ignored', detail: 'Ignored' },
          { status: 400, statusText: 'Bad Request' }
        )
      )

      const error = await httpRequest(url).catch((e) => e)

      expect(error.title).toBe('Bad Request')
      expect(error.detail).toBeUndefined()
      expect(error.instance).toBeUndefined()
    })

    test('Should use statusText as title for a non-JSON error body', async () => {
      fetchMock.mockResolvedValue(
        makeResponse({
          status: 500,
          statusText: 'Internal Server Error',
          contentType: 'text/html',
          body: '<h1>Oops</h1>'
        })
      )

      const error = await httpRequest(url).catch((e) => e)

      expect(error.title).toBe('Internal Server Error')
      expect(error.detail).toBeUndefined()
      expect(error.instance).toBeUndefined()
    })

    test('Should use statusText as title when the error response has no content-type', async () => {
      fetchMock.mockResolvedValue(
        makeResponse({ status: 404, statusText: 'Not Found' })
      )

      const error = await httpRequest(url).catch((e) => e)

      expect(error.title).toBe('Not Found')
    })
  })

  describe('network failures', () => {
    test('Should throw a NetworkError with the original error as cause', async () => {
      const original = new TypeError('fetch failed')
      fetchMock.mockRejectedValue(original)

      const error = await httpRequest(url, { method: 'POST' }).catch((e) => e)

      expect(error).toBeInstanceOf(NetworkError)
      expect(error).toBeInstanceOf(Error)
      expect(error).not.toBeInstanceOf(HttpError)
      expect(error.cause).toBe(original)
    })

    test('Should include the method and url in the NetworkError message', async () => {
      fetchMock.mockRejectedValue(new TypeError('fetch failed'))

      const error = await httpRequest(url, { method: 'POST' }).catch((e) => e)

      expect(error.message).toContain('POST')
      expect(error.message).toContain(url)
    })

    test('Should not retry after a network failure', async () => {
      fetchMock.mockRejectedValue(new TypeError('fetch failed'))

      await httpRequest(url).catch(() => {})

      expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    test('Should not retry after an HTTP error response', async () => {
      fetchMock.mockResolvedValue(
        makeResponse({ status: 500, statusText: 'Internal Server Error' })
      )

      await httpRequest(url).catch(() => {})

      expect(fetchMock).toHaveBeenCalledTimes(1)
    })
  })

  describe('logging', () => {
    test('Should log the request start at info level with ECS request fields', async () => {
      fetchMock.mockResolvedValue(jsonResponse({}))

      await httpRequest(url, { method: 'POST' })

      expect(mockLogger.info).toHaveBeenCalledWith({
        event: {
          type: 'http_client_request',
          action: 'POST',
          category: url
        }
      })
    })

    test('Should log success at info level with outcome, status and duration', async () => {
      fetchMock.mockResolvedValue(jsonResponse({}))

      await httpRequest(url)

      expect(mockLogger.info).toHaveBeenCalledTimes(2)
      const successLog = mockLogger.info.mock.calls[1][0]
      expect(successLog.event).toMatchObject({
        type: 'http_client_request',
        action: 'GET',
        category: url,
        outcome: 'success',
        kind: 200
      })
      expect(typeof successLog.event.duration).toBe('number')
      expect(successLog.event.duration).toBeGreaterThanOrEqual(0)
      expect(mockLogger.error).not.toHaveBeenCalled()
    })

    test('Should log an HttpError at error level with status as error.code', async () => {
      fetchMock.mockResolvedValue(
        makeResponse({ status: 404, statusText: 'Not Found' })
      )

      await httpRequest(url).catch(() => {})

      expect(mockLogger.error).toHaveBeenCalledTimes(1)
      const errorLog = mockLogger.error.mock.calls[0][0]
      expect(errorLog.event).toMatchObject({
        type: 'http_client_request',
        action: 'GET',
        category: url,
        outcome: 'failure',
        kind: 404
      })
      expect(errorLog.error).toMatchObject({ code: 404, type: 'HttpError' })
      expect(typeof errorLog.error.message).toBe('string')
      expect(typeof errorLog.error.stack_trace).toBe('string')
    })

    test('Should log a NetworkError at error level without an HTTP status', async () => {
      fetchMock.mockRejectedValue(new TypeError('fetch failed'))

      await httpRequest(url).catch(() => {})

      expect(mockLogger.error).toHaveBeenCalledTimes(1)
      const errorLog = mockLogger.error.mock.calls[0][0]
      expect(errorLog.event).toMatchObject({
        outcome: 'failure',
        action: 'GET',
        category: url
      })
      expect(errorLog.event).not.toHaveProperty('kind')
      expect(errorLog.error.type).toBe('NetworkError')
    })

    test('Should not log success when the request fails', async () => {
      fetchMock.mockResolvedValue(
        makeResponse({ status: 500, statusText: 'Internal Server Error' })
      )

      await httpRequest(url).catch(() => {})

      expect(mockLogger.info).toHaveBeenCalledTimes(1)
    })

    test('Should only log keys nested under event or error', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({}))
      fetchMock.mockResolvedValueOnce(
        makeResponse({ status: 500, statusText: 'Internal Server Error' })
      )
      fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'))

      await httpRequest(url)
      await httpRequest(url).catch(() => {})
      await httpRequest(url).catch(() => {})

      const allLogs = [
        ...mockLogger.info.mock.calls,
        ...mockLogger.error.mock.calls
      ].map(([log]) => log)
      expect(allLogs.length).toBeGreaterThan(0)
      for (const log of allLogs) {
        expect(
          Object.keys(log).every((k) => ['event', 'error'].includes(k))
        ).toBe(true)
      }
    })

    test('Should never log request headers or bodies', async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse({ token: 'response-secret' })
      )
      fetchMock.mockResolvedValueOnce(
        problemResponse(400, 'Bad Request', {
          title: 'Bad',
          detail: 'detail text'
        })
      )

      const options = {
        method: 'POST',
        headers: { authorization: 'Bearer header-secret' },
        body: { password: 'body-secret' }
      }
      await httpRequest(url, options)
      await httpRequest(url, options).catch(() => {})

      const logged = JSON.stringify([
        ...mockLogger.info.mock.calls,
        ...mockLogger.error.mock.calls
      ])
      expect(logged).not.toContain('header-secret')
      expect(logged).not.toContain('body-secret')
      expect(logged).not.toContain('response-secret')
      expect(logged).not.toContain('authorization')
    })
  })
})

describe('#HttpError', () => {
  test('Should expose status, url, method, title, detail and instance', () => {
    const error = new HttpError({
      status: 418,
      url,
      method: 'GET',
      title: 'Teapot',
      detail: 'Short and stout',
      instance: '/i/1'
    })

    expect(error).toBeInstanceOf(Error)
    expect(error.name).toBe('HttpError')
    expect(error).toMatchObject({
      status: 418,
      url,
      method: 'GET',
      title: 'Teapot',
      detail: 'Short and stout',
      instance: '/i/1'
    })
  })
})
