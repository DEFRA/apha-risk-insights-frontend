import { vi } from 'vitest'

import { httpClient, HttpError, HttpNetworkError } from '#/utils/http-client.js'

const mockLogger = vi.hoisted(() => ({ info: vi.fn(), error: vi.fn() }))
vi.mock('#/utils/logger.js', () => ({ createLogger: () => mockLogger }))

const url = 'http://api.test/things'

const mockResponse = (body, { status = 200, statusText = '', type } = {}) =>
  new Response(body, {
    status,
    statusText,
    headers: type ? { 'content-type': type } : {}
  })

describe('#httpClient', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  test('returns parsed JSON for 2xx and passes options to fetch', async () => {
    fetch.mockResolvedValue(
      mockResponse('{"a":1}', { type: 'application/json' })
    )

    const result = await httpClient(url, {
      method: 'post',
      headers: { h: 'v' },
      body: '{}'
    })

    expect(result).toEqual({ a: 1 })
    expect(fetch).toHaveBeenCalledWith(url, {
      method: 'POST',
      headers: { h: 'v' },
      body: '{}'
    })
  })

  test('defaults to GET', async () => {
    fetch.mockResolvedValue(mockResponse('{}', { type: 'application/json' }))
    await httpClient(url)
    expect(fetch).toHaveBeenCalledWith(url, {
      method: 'GET',
      headers: undefined,
      body: undefined
    })
  })

  test('returns null for empty 204 response', async () => {
    fetch.mockResolvedValue(new Response(null, { status: 204 }))
    expect(await httpClient(url)).toBeNull()
  })

  test('returns text for non-JSON response', async () => {
    fetch.mockResolvedValue(mockResponse('hello', { type: 'text/plain' }))
    expect(await httpClient(url)).toBe('hello')
  })

  test('returns text when JSON body is malformed', async () => {
    fetch.mockResolvedValue(mockResponse('{bad', { type: 'application/json' }))
    expect(await httpClient(url)).toBe('{bad')
  })

  test('throws HttpError populated from problem+json', async () => {
    fetch.mockResolvedValue(
      mockResponse('{"title":"Bad","detail":"Nope","instance":"/i/1"}', {
        status: 400,
        statusText: 'Bad Request',
        type: 'application/problem+json'
      })
    )

    const error = await httpClient(url).catch((e) => e)

    expect(error).toBeInstanceOf(HttpError)
    expect(error).toMatchObject({
      status: 400,
      url,
      method: 'GET',
      title: 'Bad',
      detail: 'Nope',
      instance: '/i/1'
    })
    expect(mockLogger.error).toHaveBeenCalledTimes(1)
  })

  test('falls back to status text for non-problem error body', async () => {
    fetch.mockResolvedValue(
      mockResponse('{"title":"ignored"}', {
        status: 500,
        statusText: 'Internal Server Error',
        type: 'application/json'
      })
    )

    const error = await httpClient(url).catch((e) => e)

    expect(error).toBeInstanceOf(HttpError)
    expect(error.status).toBe(500)
    expect(error.title).toBe('Internal Server Error')
    expect(error.detail).toBeUndefined()
    expect(error.instance).toBeUndefined()
  })

  test('falls back to status text when problem+json is malformed', async () => {
    fetch.mockResolvedValue(
      mockResponse('nope', {
        status: 404,
        statusText: 'Not Found',
        type: 'application/problem+json'
      })
    )

    const error = await httpClient(url).catch((e) => e)

    expect(error.title).toBe('Not Found')
  })

  test('throws HttpNetworkError preserving cause and logs it', async () => {
    const cause = new TypeError('fetch failed')
    fetch.mockRejectedValue(cause)

    const error = await httpClient(url).catch((e) => e)

    expect(error).toBeInstanceOf(HttpNetworkError)
    expect(error.cause).toBe(cause)
    expect(error.url).toBe(url)
    expect(mockLogger.error).toHaveBeenCalledTimes(1)
  })

  test('logs request start and success without headers or body', async () => {
    fetch.mockResolvedValue(mockResponse('{}', { type: 'application/json' }))

    await httpClient(url, { headers: { secret: 'x' }, body: 'secret-body' })

    expect(mockLogger.info).toHaveBeenCalledTimes(2)
    const logged = JSON.stringify(mockLogger.info.mock.calls)
    expect(logged).not.toContain('secret')
    expect(mockLogger.info.mock.calls[1][0].event).toMatchObject({
      outcome: 'success',
      kind: 200
    })
  })
})
