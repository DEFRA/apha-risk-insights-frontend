import * as cheerio from 'cheerio'
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

  describe('GET /risk/{slug}', () => {
    const HPAI_URL = '/risk/highly-pathogenic-avian-influenza'
    const HPAI_NAME = 'Highly Pathogenic Avian Influenza'

    const COLUMN_SELECTOR =
      '.app-disease-detail__row > .govuk-grid-column-one-half'

    const get = (url) => server.inject({ method: 'GET', url })
    const getPage = async (url) => {
      const { result, statusCode } = await get(url)

      return { $: cheerio.load(result), result, statusCode }
    }
    const getHpaiPage = () => getPage(HPAI_URL)

    test('renders the disease detail page', async () => {
      const { $, result, statusCode } = await getHpaiPage()

      expect(statusCode).toBe(statusCodes.ok)
      expect($('h1').text().trim()).toBe(HPAI_NAME)
      expect(result).toContain('Latest assessment')
      expect($('h2.govuk-heading-m').text()).toContain('Assessment history')
    })

    test('has a back link to the risk overview', async () => {
      const { $ } = await getHpaiPage()
      const backLink = $('.govuk-back-link')

      expect(backLink.attr('href')).toBe('/risk')
      expect(backLink.text().trim()).toBe('Back to overview')
    })

    test('lists the three assessments newest first', async () => {
      const { $ } = await getHpaiPage()
      const rows = $('.app-risk-history-table tbody tr')
      const firstCells = rows
        .map((_, row) => $(row).find('th, td').first().text().trim())
        .get()

      expect(rows).toHaveLength(3)
      expect(firstCells).toEqual([
        '1 October 2026',
        '15 June 2026',
        '9 January 2026'
      ])
    })

    test('puts the card in a left column with no margin override', async () => {
      const { $ } = await getHpaiPage()
      const left = $(COLUMN_SELECTOR).first()

      expect(left.attr('class')).toBe('govuk-grid-column-one-half')
      expect(left.find('.app-risk-card--detail').length).toBeGreaterThan(0)
    })

    test('leaves the right column empty and loads no chart script', async () => {
      const { $, result } = await getHpaiPage()
      const right = $(COLUMN_SELECTOR).last()

      expect(right.children()).toHaveLength(0)
      expect(right.text().trim()).toBe('')
      expect(result).not.toMatch(/risk-history-chart/)
      expect($('script[src*="chart"], script[src*="plotly"]')).toHaveLength(0)
    })

    test('returns the error page for an unknown slug', async () => {
      const { result, statusCode } = await get('/risk/not-a-disease')

      expect(statusCode).toBe(statusCodes.notFound)
      expect(result).toContain('Page not found')
    })

    test('resolves every card link on the risk overview', async () => {
      const { $ } = await getPage('/risk')
      const hrefs = $('a[href^="/risk/"]')
        .map((_, a) => $(a).attr('href'))
        .get()

      expect(hrefs.length).toBeGreaterThan(0)

      for (const url of hrefs) {
        const { statusCode } = await get(url)

        expect({ url, statusCode }).toEqual({ url, statusCode: statusCodes.ok })
      }
    })
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
