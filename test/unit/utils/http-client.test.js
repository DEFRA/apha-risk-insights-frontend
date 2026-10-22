import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'

import { httpClient, HttpError, HttpNetworkError } from '#/utils/http-client.js'

const logger = vi.hoisted(() => ({ info: vi.fn(), error: vi.fn() }))
vi.mock('#/utils/logger.js', () => ({ createLogger: () => logger }))

const url = 'http://api.test/things'

describe('httpClient', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    logger.info.mockClear()
    logger.error.mockClear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  test('returns parsed JSON for 2xx and logs start and success', async () => {
    fetch.mockResolvedValue(
      new Response(JSON.stringify({ a: 1 }), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      })
    )
    const data = await httpClient(url, {
      method: 'post',
      headers: { authorization: 'secret' },
      body: '{"x":1}'
    })
    expect(data).toEqual({ a: 1 })
    expect(fetch).toHaveBeenCalledWith(url, {
      method: 'POST',
      headers: { authorization: 'secret' },
      body: '{"x":1}'
    })
    expect(logger.info).toHaveBeenCalledTimes(2)
    expect(JSON.stringify(logger.info.mock.calls)).not.toContain('secret')
  })

  test('defaults to GET', async () => {
    fetch.mockResolvedValue(new Response('ok'))
    await httpClient(url)
    expect(fetch.mock.calls[0][1].method).toBe('GET')
  })

  test('handles empty 204 response', async () => {
    fetch.mockResolvedValue(new Response(null, { status: 204 }))
    expect(await httpClient(url)).toBeUndefined()
  })

  test('returns text for non-JSON response', async () => {
    fetch.mockResolvedValue(
      new Response('hello', { headers: { 'content-type': 'text/plain' } })
    )
    expect(await httpClient(url)).toBe('hello')
  })

  test('returns text when JSON content type has invalid body', async () => {
    fetch.mockResolvedValue(
      new Response('nope', { headers: { 'content-type': 'application/json' } })
    )
    expect(await httpClient(url)).toBe('nope')
  })

  test('throws HttpError populated from problem+json', async () => {
    fetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          title: 'Bad',
          detail: 'Missing id',
          instance: '/i/1'
        }),
        {
          status: 400,
          headers: { 'content-type': 'application/problem+json' }
        }
      )
    )
    const error = await httpClient(url).catch((e) => e)
    expect(error).toBeInstanceOf(HttpError)
    expect(error).toMatchObject({
      status: 400,
      url,
      method: 'GET',
      title: 'Bad',
      detail: 'Missing id',
      instance: '/i/1'
    })
    expect(logger.error).toHaveBeenCalledTimes(1)
  })

  test('falls back to status text for non-problem errors', async () => {
    fetch.mockResolvedValue(
      new Response('<html>', {
        status: 500,
        statusText: 'Internal Server Error'
      })
    )
    const error = await httpClient(url).catch((e) => e)
    expect(error).toBeInstanceOf(HttpError)
    expect(error).toMatchObject({
      status: 500,
      title: 'Internal Server Error',
      detail: 'Internal Server Error',
      instance: undefined
    })
  })

  test('throws typed network error with cause and logs it', async () => {
    const cause = new TypeError('fetch failed')
    fetch.mockRejectedValue(cause)
    const error = await httpClient(url).catch((e) => e)
    expect(error).toBeInstanceOf(HttpNetworkError)
    expect(error.cause).toBe(cause)
    expect(logger.error).toHaveBeenCalledTimes(1)
  })
})
