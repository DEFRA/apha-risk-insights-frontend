import {
  renderComponent,
  renderComponentFromContext
} from '#test/helpers/component-helpers.js'
import { hpaiTimeline } from '#test/helpers/risk-assessment-fixtures.js'

import { riskHistoryChartPresenter } from '#/presenters/risk/risk-history-chart-presenter.js'

const chart = riskHistoryChartPresenter(hpaiTimeline)
const render = (params = chart) =>
  renderComponentFromContext('risk-history-chart', params)
const bodyHtml = ($) => $('body').html().trim()

const DATA_SELECTOR = 'script[data-risk-history-chart-data]'

describe('Risk history chart component', () => {
  describe('Without a chart', () => {
    test.each([
      ['null', null],
      ['undefined', undefined]
    ])('Should render nothing for %s', (_, params) => {
      const $ = renderComponentFromContext('risk-history-chart', params)

      expect(bodyHtml($)).toBe('')
    })

    test('Should render nothing through the inline macro call', () => {
      expect(bodyHtml(renderComponent('risk-history-chart', null))).toBe('')
    })
  })

  describe('Card', () => {
    test('Should render a bordered summary card with a visible title', () => {
      const $ = render()
      const $title = $('.govuk-summary-card .govuk-summary-card__title')

      expect($('.govuk-summary-card')).toHaveLength(1)
      expect($title.text().trim()).toBe('Risk level over time')
      expect($title.prop('tagName')).toBe('H2')
    })

    test('Should show the description as visible text', () => {
      const $ = render()

      expect($('#app-risk-history-chart-description').text().trim()).toBe(
        chart.description
      )
      expect(
        $('#app-risk-history-chart-description').hasClass(
          'govuk-visually-hidden'
        )
      ).toBe(false)
    })

    test('Should expose a hook for equal height', () => {
      expect(render()('.app-risk-history-chart')).toHaveLength(1)
    })
  })

  describe('Chart container', () => {
    test('Should be an image labelled by the title and described by the description', () => {
      const $ = render()
      const $container = $('[data-risk-history-chart]')

      expect($container).toHaveLength(1)
      expect($container.attr('role')).toBe('img')

      const titleId = $container.attr('aria-labelledby')
      const descriptionId = $container.attr('aria-describedby')

      expect($(`#${titleId}`).text().trim()).toBe('Risk level over time')
      expect($(`#${descriptionId}`).text().trim()).toBe(chart.description)
    })

    test('Should hold the empty plot div', () => {
      const $ = render()
      const $plot = $(
        '[data-risk-history-chart] [data-risk-history-chart-plot]'
      )

      expect($plot).toHaveLength(1)
      expect($plot.children()).toHaveLength(0)
    })

    test('Should keep the description outside the image so it stays readable', () => {
      const $ = render()

      expect(
        $('[data-risk-history-chart] #app-risk-history-chart-description')
      ).toHaveLength(0)
    })
  })

  describe('Embedded data', () => {
    test('Should embed the spec as non-executable JSON', () => {
      const $ = render()
      const $data = $(DATA_SELECTOR)

      expect($data).toHaveLength(1)
      expect($data.attr('type')).toBe('application/json')
      expect(JSON.parse($data.text())).toEqual({ spec: chart.spec })
    })

    test('Should contain no executable inline script', () => {
      const $ = render()

      expect($('script')).toHaveLength(1)
      expect($('script:not([type="application/json"])')).toHaveLength(0)
    })

    test('Should not let a closing script tag or comment in any string break out', () => {
      const hostile = '</script><script>alert(1)</script><!-- <script>'
      const $ = render({
        ...chart,
        spec: {
          ...chart.spec,
          layout: { ...chart.spec.layout, title: { text: hostile } }
        }
      })
      const html = $.html()

      expect(html).not.toContain('</script><script>')
      expect(html).not.toContain('<!--')
      expect($('script')).toHaveLength(1)

      const parsed = JSON.parse($(DATA_SELECTOR).text())

      expect(parsed.spec.layout.title.text).toBe(hostile)
    })
  })

  describe('Strict CSP support', () => {
    test('Should render the element that stops Plotly injecting its style element', () => {
      const $ = render()
      const $optOut = $('[id="plotly.js-style-global"]')

      expect($optOut).toHaveLength(1)
      expect($optOut.prop('tagName')).toBe('DIV')
      expect($optOut.hasClass('no-inline-styles')).toBe(true)
      expect($optOut.attr('hidden')).toBeDefined()
    })
  })
})
