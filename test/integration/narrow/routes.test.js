import { createServer } from '#/server.js'
import { listRisks } from '#/data/risk-data-source.js'
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

  test('GET / renders the home page with a link to the risk overview', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/'
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toEqual(
      expect.stringContaining('APHA-risk insights frontend |')
    )
    expect(result).toEqual(
      expect.stringContaining('>APHA-risk insights frontend</h1>')
    )
    expect(result).toEqual(
      expect.stringContaining(
        '<a class="govuk-link" href="/risk">Risk overview</a>'
      )
    )
  })

  test('GET / marks Home as the current navigation item', async () => {
    const { result } = await server.inject({ method: 'GET', url: '/' })

    expect(result).toMatch(
      /govuk-service-navigation__item--active[\s\S]*?aria-current="page"[\s\S]*?Home/
    )
  })

  test('GET /risk marks Risk overview as the current navigation item', async () => {
    const { result } = await server.inject({ method: 'GET', url: '/risk' })

    expect(result).toMatch(
      /href="\/risk"[^>]*aria-current="page"|aria-current="page"[^>]*href="\/risk"/
    )
  })

  test('GET /about is no longer available', async () => {
    const { statusCode } = await server.inject({
      method: 'GET',
      url: '/about'
    })

    expect(statusCode).toBe(statusCodes.notFound)
  })

  test('GET /risk renders a risk card for each disease', async () => {
    const { items } = await listRisks()
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/risk'
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toEqual(expect.stringContaining('Disease risk overview |'))
    expect(result.match(/data-testid="app-risk-card"/g)).toHaveLength(
      items.length
    )
    expect(result).toEqual(
      expect.stringContaining('Highly Pathogenic Avian Influenza')
    )
    expect(result).toEqual(expect.stringContaining('H5N1'))
    expect(result).toEqual(
      expect.stringContaining('href="/risk/highly-pathogenic-avian-influenza"')
    )
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
