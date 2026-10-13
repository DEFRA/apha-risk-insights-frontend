import { createServer } from '#/server.js'
import { statusCodes } from '#/constants/status-codes.js'

describe('#routes', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  test('GET / renders the home page', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/'
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toEqual(expect.stringContaining('Home |'))
  })

  test('GET /about renders the about page', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/about'
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toEqual(expect.stringContaining('About |'))
  })

  test('GET /health returns success', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/health'
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toEqual({ message: 'success' })
  })

  test('GET /nope renders the error page', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/nope'
    })

    expect(statusCode).toBe(statusCodes.notFound)
    expect(result).toEqual(expect.stringContaining('Page not found'))
  })

  test('Sets security headers', async () => {
    const { headers } = await server.inject({ method: 'GET', url: '/' })

    expect(headers).toEqual(
      expect.objectContaining({
        'strict-transport-security': 'max-age=31536000; includeSubDomains',
        'x-content-type-options': 'nosniff',
        'x-frame-options': 'DENY'
      })
    )
  })
})
