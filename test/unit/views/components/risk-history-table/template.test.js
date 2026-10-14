import {
  renderComponent,
  renderComponentFromContext
} from '#test/helpers/component-helpers.js'
import {
  assessment,
  hpaiTimeline as timeline
} from '#test/helpers/risk-assessment-fixtures.js'

import { riskHistoryTablePresenter } from '#/presenters/risk/risk-history-table-presenter.js'

const render = (items = timeline, name = 'Avian Influenza') =>
  renderComponent('risk-history-table', riskHistoryTablePresenter(name, items))

const cell = ($, rowIndex, columnIndex) =>
  $('tbody .govuk-table__row').eq(rowIndex).find('td').eq(columnIndex)

describe('Risk history table component', () => {
  test('Should render the five column headers in order', () => {
    const $table = render()

    expect(
      $table('thead th')
        .map((_, th) => $table(th).text().trim())
        .get()
    ).toEqual([
      'Date reported',
      'Risk level',
      'Previous level',
      'Change',
      'Source'
    ])
  })

  test('Should render a visually hidden caption', () => {
    const $table = render()
    const $caption = $table('caption')

    expect($caption.text().trim()).toBe(
      'Assessment history for Avian Influenza'
    )
    expect($caption.hasClass('govuk-visually-hidden')).toBe(true)
  })

  test('Should render one row per assessment, newest first', () => {
    const $table = render()

    expect($table('tbody .govuk-table__row')).toHaveLength(3)
    expect(
      $table('tbody tr')
        .map((_, tr) => $table(tr).find('td').first().text().trim())
        .get()
    ).toEqual(['1 October 2026', '15 June 2026', '9 January 2026'])
  })

  test('Should mark up the date with a time element', () => {
    const $time = cell(render(), 0, 0).find('time')

    expect($time.attr('datetime')).toBe('2026-10-01T00:00:00Z')
  })

  test('Should render one tag per row with the level colour and word', () => {
    const $table = render()
    const $tags = $table('tbody .govuk-tag')

    expect($tags).toHaveLength(3)
    expect($tags.eq(0).hasClass('govuk-tag--red')).toBe(true)
    expect($tags.eq(0).text().trim()).toBe('High')
    expect($tags.eq(1).hasClass('govuk-tag--orange')).toBe(true)
    expect($tags.eq(1).text().trim()).toBe('Medium')
  })

  test.each([
    ['negligible', 'grey', 'Negligible'],
    ['very low', 'green', 'Very low'],
    ['low', 'yellow', 'Low']
  ])('Should colour %s as %s', (status, modifier, label) => {
    const $tag = cell(render([assessment({ status })]), 0, 1).find('.govuk-tag')

    expect($tag.hasClass(`govuk-tag--${modifier}`)).toBe(true)
    expect($tag.text().trim()).toBe(label)
  })

  test('Should show the previous level as a plain word', () => {
    const $previous = cell(render(), 0, 2)

    expect($previous.text().trim()).toBe('Medium')
    expect($previous.find('.govuk-tag')).toHaveLength(0)
  })

  test('Should show None in secondary text when there is no previous level', () => {
    const $none = cell(render(), 2, 2).find('.app-risk-history-table__none')

    expect($none.text().trim()).toBe('None')
  })

  test.each([
    ['deteriorating', '↑', 'red'],
    ['improving', '↓', 'green'],
    ['no change', '→', 'grey']
  ])(
    'Should show an aria-hidden %s arrow before the change word',
    (levelChange, arrow, modifier) => {
      const $change = cell(render([assessment({ levelChange })]), 0, 3)
      const $arrow = $change.find('.app-change-arrow')

      expect($arrow.text()).toBe(arrow)
      expect($arrow.attr('aria-hidden')).toBe('true')
      expect($arrow.hasClass(`app-change-arrow--${modifier}`)).toBe(true)
    }
  )

  test('Should not show an arrow for undetermined', () => {
    const $change = cell(render(), 2, 3)

    expect($change.find('.app-change-arrow')).toHaveLength(0)
    expect($change.text().trim()).toBe('Undetermined')
  })

  test('Should show the source', () => {
    expect(cell(render(), 0, 4).text().trim()).toBe('APHA risk assessment')
  })

  describe('Scroll region', () => {
    test('Should wrap the table in a focusable, labelled region', () => {
      const $table = render()
      const $region = $table('.app-risk-history-table')

      expect($region.attr('role')).toBe('region')
      expect($region.attr('tabindex')).toBe('0')
      expect($region.attr('aria-label')).toBe(
        'Assessment history for Avian Influenza'
      )
      expect($region.find('table.govuk-table')).toHaveLength(1)
    })

    test('Should escape the disease name in the aria-label', () => {
      const $table = render(timeline, '"><img src=x>')

      expect($table('img')).toHaveLength(0)
      expect($table('.app-risk-history-table').attr('aria-label')).toBe(
        'Assessment history for "><img src=x>'
      )
    })

    test('Should use small text until tablet', () => {
      expect(
        render()('table').hasClass('govuk-table--small-text-until-tablet')
      ).toBe(true)
    })
  })

  describe('Empty timeline', () => {
    test('Should show No assessments instead of an empty table', () => {
      const $table = render([])

      expect($table('table')).toHaveLength(0)
      expect($table('.app-risk-history-table')).toHaveLength(0)
      expect($table('p.govuk-body').text().trim()).toBe('No assessments')
    })
  })

  describe('Escaping', () => {
    test('Should escape HTML in the source', () => {
      const $table = render([
        assessment({ source: '<img src=x onerror=alert(1)>' })
      ])

      expect($table('tbody img')).toHaveLength(0)
      expect(cell($table, 0, 4).text()).toBe('<img src=x onerror=alert(1)>')
    })

    test('Should escape HTML in the disease name', () => {
      const $table = render(timeline, '<script>alert(1)</script>')

      expect($table('script')).toHaveLength(0)
      expect($table('caption').text()).toContain('<script>alert(1)</script>')
    })

    test('Should escape HTML in the date text', () => {
      const $table = renderComponent('risk-history-table', {
        caption: 'c',
        rows: [
          {
            dateTime: '"><b>x</b>',
            dateText: '<b>x</b>',
            level: { label: '<i>l</i>', modifier: 'red' },
            previousLabel: '<u>p</u>',
            change: { text: '<s>c</s>', arrow: '<em>a</em>', modifier: 'red' },
            source: 's'
          }
        ]
      })

      expect(
        $table('tbody b, tbody i, tbody u, tbody s, tbody em')
      ).toHaveLength(0)
    })

    test('Should not inject elements or attributes when params come from the render context', () => {
      const img = '"><img src=x onerror=alert(1)>'
      const script = '<script>alert(1)</script>'
      const $table = renderComponentFromContext('risk-history-table', {
        caption: img,
        rows: [
          {
            dateTime: img,
            dateText: script,
            level: { label: script, modifier: 'red' },
            previousLabel: script,
            previousIsNone: false,
            change: { text: script, arrow: script, modifier: img },
            source: img
          }
        ]
      })

      expect($table('img, script')).toHaveLength(0)
      expect($table('.app-risk-history-table').attr('aria-label')).toBe(img)
      expect($table('time').attr('datetime')).toBe(img)
      expect(cell($table, 0, 4).text()).toBe(img)
    })

    test('Should keep a hostile change modifier inside the class attribute', () => {
      const modifier = 'red" onclick="alert(1)" data-x="'
      const $table = renderComponentFromContext('risk-history-table', {
        caption: 'c',
        rows: [
          {
            dateTime: '2026-10-01T00:00:00Z',
            dateText: '1 October 2026',
            level: { label: 'High', modifier: 'red' },
            previousLabel: 'None',
            previousIsNone: true,
            change: { text: 'Deteriorating', arrow: '↑', modifier },
            source: 's'
          }
        ]
      })
      const $arrow = $table('.app-change-arrow')

      expect($arrow.attr('onclick')).toBeUndefined()
      expect($arrow.attr('data-x')).toBeUndefined()
      expect(Object.keys($arrow.get(0).attribs).sort()).toEqual([
        'aria-hidden',
        'class'
      ])
      expect($table('[onclick]')).toHaveLength(0)
    })
  })
})
