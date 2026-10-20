import { vi } from 'vitest'

import { HttpError, HttpNetworkError, httpClient } from '#/utils/http-client.js'

const mockLogger = vi.hoisted(() => ({ info: vi.fn(), error: vi.fn() }))
vi.mock('#/utils/logger.js', () => ({ createLogger: () => mockLogger }))

const url = 'http://example.test/api'

const respond = (body, { status = 200, statusText, type } = {}) =>
  new Response(body, {
    status,
    statusText,
    headers: type ? { 'content-type': type } : {}
  })

describe('#httpClient', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    mockLogger.info.mockClear()
    mockLogger.error.mockClear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  test('returns parsed JSON for 2xx and passes options to fetch', async () => {
    fetch.mockResolvedValue(
      respond('{"a":1}', { type: 'application/json; charset=utf-8' })
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
    expect(mockLogger.info).toHaveBeenCalledTimes(2)
  })

  test('defaults to GET', async () => {
    fetch.mockResolvedValue(respond('{}', { type: 'application/json' }))
    await httpClient(url)
    expect(fetch.mock.calls[0][1].method).toBe('GET')
  })

  test('returns null for empty response', async () => {
    fetch.mockResolvedValue(new Response(null, { status: 204 }))
    expect(await httpClient(url)).toBeNull()
  })

  test('returns text for non-JSON response', async () => {
    fetch.mockResolvedValue(respond('hello', { type: 'text/plain' }))
    expect(await httpClient(url)).toBe('hello')
  })

  test('returns text for malformed JSON', async () => {
    fetch.mockResolvedValue(respond('{bad', { type: 'application/json' }))
    expect(await httpClient(url)).toBe('{bad')
  })

  test('throws HttpError populated from problem+json', async () => {
    fetch.mockResolvedValue(
      respond(
        JSON.stringify({ title: 'Bad', detail: 'Nope', instance: '/i/1' }),
        { status: 400, type: 'application/problem+json' }
      )
    )
    const err = await httpClient(url, { method: 'PUT' }).catch((e) => e)
    expect(err).toBeInstanceOf(HttpError)
    expect(err).toMatchObject({
      status: 400,
      url,
      method: 'PUT',
      title: 'Bad',
      detail: 'Nope',
      instance: '/i/1'
    })
    expect(mockLogger.error).toHaveBeenCalledTimes(1)
  })

  test('falls back to status text for non-problem error body', async () => {
    fetch.mockResolvedValue(
      respond('{"title":"x"}', {
        status: 500,
        statusText: 'Internal Server Error',
        type: 'application/json'
      })
    )
    const err = await httpClient(url).catch((e) => e)
    expect(err).toBeInstanceOf(HttpError)
    expect(err.status).toBe(500)
    expect(err.title).toBe('Internal Server Error')
    expect(err.detail).toBe('Internal Server Error')
    expect(err.instance).toBeUndefined()
  })

  test('falls back to standard status text when statusText is empty', async () => {
    fetch.mockResolvedValue(respond('', { status: 404 }))
    const err = await httpClient(url).catch((e) => e)
    expect(err.title).toBe('Not Found')
  })

  test('handles malformed problem+json body', async () => {
    fetch.mockResolvedValue(
      respond('nope', { status: 422, type: 'application/problem+json' })
    )
    const err = await httpClient(url).catch((e) => e)
    expect(err).toBeInstanceOf(HttpError)
    expect(err.title).toBe('Unprocessable Entity')
  })

  test('throws HttpNetworkError preserving cause and logs it', async () => {
    const cause = new TypeError('fetch failed')
    fetch.mockRejectedValue(cause)
    const err = await httpClient(url).catch((e) => e)
    expect(err).toBeInstanceOf(HttpNetworkError)
    expect(err.cause).toBe(cause)
    expect(err.url).toBe(url)
    expect(mockLogger.error).toHaveBeenCalledTimes(1)
  })

  test('does not log headers or bodies', async () => {
    fetch.mockResolvedValue(respond('{}', { type: 'application/json' }))
    await httpClient(url, {
      headers: { authorization: 'secret-token' },
      body: 'secret-body'
    })
    const logged = JSON.stringify(mockLogger.info.mock.calls)
    expect(logged).not.toContain('secret')
  })
})
