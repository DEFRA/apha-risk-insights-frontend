import { renderComponent } from '#test/helpers/component-helpers.js'
import { listRisks } from '#/data/risk-data-source.js'
import { riskCardPresenter } from '#/presenters/risk/risk-card-presenter.js'

const baseParams = {
  title: 'Highly Pathogenic Avian Influenza',
  href: '/risk/highly-pathogenic-avian-influenza',
  strain: 'H5N1',
  levelLabel: 'High',
  levelNumber: 5,
  levelMax: 5,
  levelKey: 'high',
  tag: { text: 'Deteriorating', arrow: '↑', modifier: 'red' },
  previousText: 'Medium',
  dateTime: '2026-10-01T00:00:00Z',
  dateText: '1 October 2026'
}

const row = ($, key) =>
  $('.govuk-summary-list__row')
    .filter((_, element) => $(element).find('dt').text().trim() === key)
    .find('dd')

describe('Risk card component', () => {
  describe('Deteriorating card with a strain', () => {
    let $card

    beforeEach(() => {
      $card = renderComponent('risk-card', baseParams)
    })

    test('Should render a GOV.UK summary card', () => {
      expect($card('[data-testid="app-risk-card"]')).toHaveLength(1)
      expect($card('.govuk-summary-card')).toHaveLength(1)
    })

    test('Should not render the disease code even though the data has it', async () => {
      const { items } = await listRisks()

      items.forEach((item) => {
        // Strains such as BTV-3 legitimately contain the code text
        const $item = renderComponent(
          'risk-card',
          riskCardPresenter({ ...item, strain: undefined })
        )

        expect(item.disease.code).toBeTruthy()
        expect($item('[data-testid="app-risk-card"]').text()).not.toContain(
          item.disease.code
        )
        expect(row($item, 'Code')).toHaveLength(0)
      })
    })

    test('Should render the title as a link in an h2', () => {
      const $link = $card('h2.govuk-summary-card__title a.govuk-link')

      expect($link.text().trim()).toBe('Highly Pathogenic Avian Influenza')
      expect($link.attr('href')).toBe('/risk/highly-pathogenic-avian-influenza')
    })

    test('Should render the strain row', () => {
      expect(row($card, 'Strain').text().trim()).toBe('H5N1')
    })

    test('Should read as level word then hidden suffix', () => {
      const $level = row($card, 'Risk level')

      expect($level.find('.govuk-visually-hidden').text()).toBe(', 5 out of 5')
      expect($level.text().replace(/\s+/g, ' ').trim()).toBe('High, 5 out of 5')
    })

    test('Should fill five bars and colour them for the level', () => {
      const $bars = $card('[data-testid="app-risk-card-bars"]')

      expect($bars.attr('aria-hidden')).toBe('true')
      expect($bars.find('.app-risk-card__bar')).toHaveLength(5)
      expect($bars.find('.app-risk-card__bar--filled')).toHaveLength(5)
      expect($bars.hasClass('app-risk-card__bars--high')).toBe(true)
    })

    test('Should render the red GOV.UK tag with an aria-hidden arrow', () => {
      const $tag = row($card, 'Change').find('strong.govuk-tag')

      expect($tag.hasClass('govuk-tag--red')).toBe(true)
      expect($tag.text()).toContain('Deteriorating')
      expect($tag.find('[aria-hidden="true"]').text()).toBe('↑')
    })

    test('Should render the previous level', () => {
      expect(row($card, 'Previous level').text().trim()).toBe('Medium')
    })

    test('Should render the date in a time element', () => {
      const $date = row($card, 'Reported')

      expect($date.find('time').attr('datetime')).toBe('2026-10-01T00:00:00Z')
      expect($date.text().trim()).toBe('1 October 2026')
    })
  })

  describe('Variations', () => {
    test('Should omit the strain row when strain is absent', () => {
      const $card = renderComponent('risk-card', {
        ...baseParams,
        strain: undefined
      })

      expect(row($card, 'Strain')).toHaveLength(0)
      expect(row($card, 'Risk level')).toHaveLength(1)
    })

    test('Should render no previous assessment text', () => {
      const $card = renderComponent('risk-card', {
        ...baseParams,
        previousText: 'No previous assessment'
      })

      expect(row($card, 'Previous level').text().trim()).toBe(
        'No previous assessment'
      )
    })

    test('Should render a tag without an arrow when none is given', () => {
      const $card = renderComponent('risk-card', {
        ...baseParams,
        tag: { text: 'Undetermined', modifier: 'grey' }
      })
      const $tag = row($card, 'Change').find('strong.govuk-tag')

      expect($tag.hasClass('govuk-tag--grey')).toBe(true)
      expect($tag.find('[aria-hidden="true"]')).toHaveLength(0)
      expect($tag.text().trim()).toBe('Undetermined')
    })

    test.each([
      [1, 'negligible'],
      [2, 'very-low'],
      [3, 'low'],
      [4, 'medium'],
      [5, 'high']
    ])('Should fill %i bars for %s', (levelNumber, levelKey) => {
      const $card = renderComponent('risk-card', {
        ...baseParams,
        levelNumber,
        levelKey
      })

      expect($card('.app-risk-card__bar')).toHaveLength(5)
      expect($card('.app-risk-card__bar--filled')).toHaveLength(levelNumber)
      expect($card(`.app-risk-card__bars--${levelKey}`)).toHaveLength(1)
      expect($card('.govuk-visually-hidden').text()).toBe(
        `, ${levelNumber} out of 5`
      )
    })

    test('Should derive the bar count from levelMax', () => {
      const $card = renderComponent('risk-card', {
        ...baseParams,
        levelMax: 6
      })

      expect($card('.app-risk-card__bar')).toHaveLength(6)
      expect($card('.govuk-visually-hidden').text()).toBe(', 5 out of 6')
    })

    test('Should escape the tag arrow', () => {
      const $card = renderComponent('risk-card', {
        ...baseParams,
        tag: { text: 'Odd', arrow: '<b>', modifier: 'grey' }
      })

      expect($card('strong.govuk-tag b')).toHaveLength(0)
    })

    test('Should use the heading level param', () => {
      const $card = renderComponent('risk-card', {
        ...baseParams,
        headingLevel: 3
      })

      expect($card('.govuk-summary-card__title').is('h3')).toBe(true)
    })
  })

  describe('Detail variant', () => {
    const detailParams = {
      ...baseParams,
      variant: 'detail',
      source: 'APHA risk assessment',
      previousLevel: 'Medium'
    }
    const renderDetailChange = (overrides = {}) =>
      row(
        renderComponent('risk-card', { ...detailParams, ...overrides }),
        'Change'
      )

    test('Should use the fixed title as plain text, not a link', () => {
      const $card = renderComponent('risk-card', detailParams)
      const $title = $card('h2.govuk-summary-card__title')

      expect($title.text().trim()).toBe('Latest assessment')
      expect($title.find('a')).toHaveLength(0)
    })

    test('Should label the date row "Date reported"', () => {
      const $card = renderComponent('risk-card', detailParams)
      const $date = row($card, 'Date reported')

      expect($date.find('time').attr('datetime')).toBe('2026-10-01T00:00:00Z')
      expect($date.text().trim()).toBe('1 October 2026')
      expect(row($card, 'Reported')).toHaveLength(0)
    })

    test('Should render Change as plain text, not a tag', () => {
      const $change = renderDetailChange()

      expect($change.find('.govuk-tag')).toHaveLength(0)
      expect($change.text()).toContain('Deteriorating')
    })

    test('Should render a decorative coloured arrow before the word', () => {
      const $change = renderDetailChange()
      const $arrow = $change.find('[aria-hidden="true"]')

      expect($arrow.text()).toBe('↑')
      expect($arrow.hasClass('app-change-arrow--red')).toBe(true)
      expect($change.text().replace(/\s+/g, ' ').trim()).toMatch(
        /^↑ Deteriorating/
      )
    })

    test('Should render no arrow for undetermined', () => {
      const $change = renderDetailChange({
        tag: { text: 'Undetermined', modifier: 'grey' }
      })

      expect($change.find('[aria-hidden="true"]')).toHaveLength(0)
      expect($change.text()).toContain('Undetermined')
    })

    test('Should render the source row', () => {
      const $card = renderComponent('risk-card', detailParams)

      expect(row($card, 'Source').text().trim()).toBe('APHA risk assessment')
    })

    test('Should render "Previously" under Change when there is a previous level', () => {
      const $card = renderComponent('risk-card', detailParams)

      expect(row($card, 'Change').text().replace(/\s+/g, ' ')).toContain(
        'Previously Medium'
      )
      expect(row($card, 'Previous level')).toHaveLength(0)
    })

    test('Should omit the Strain row even when strain is supplied', () => {
      const $card = renderComponent('risk-card', {
        ...detailParams,
        strain: 'H5N1'
      })

      expect(row($card, 'Strain')).toHaveLength(0)
    })

    test('Should put a visually hidden comma before "Previously" so screen readers pause', () => {
      const $change = renderDetailChange()
      const $comma = $change.find('.govuk-visually-hidden')

      expect($comma.text()).toBe(',')
      expect($comma.next().hasClass('app-risk-card__previous')).toBe(true)
    })

    test('Should omit the hidden comma when previousLevel is null', () => {
      const $change = renderDetailChange({ previousLevel: null })

      expect($change.find('.govuk-visually-hidden')).toHaveLength(0)
    })

    test('Should omit "Previously" when previousLevel is null', () => {
      const $change = renderDetailChange({ previousLevel: null })

      expect($change.text()).not.toContain('Previously')
    })

    test('Should still render the shared bars and level word', () => {
      const $card = renderComponent('risk-card', detailParams)
      const $bars = $card('[data-testid="app-risk-card-bars"]')

      expect($bars.find('.app-risk-card__bar--filled')).toHaveLength(5)
      expect($bars.hasClass('app-risk-card__bars--high')).toBe(true)
      expect(row($card, 'Risk level').text()).toContain('High')
    })

    test('Should add a modifier class hook for equal height', () => {
      const $card = renderComponent('risk-card', detailParams)

      expect(
        $card('[data-testid="app-risk-card"]').hasClass('app-risk-card--detail')
      ).toBe(true)
    })

    test('Should not render a Source row or modifier in the default variant', () => {
      const $card = renderComponent('risk-card', baseParams)

      expect(row($card, 'Source')).toHaveLength(0)
      expect($card('.app-risk-card--detail')).toHaveLength(0)
      expect($card('h2.govuk-summary-card__title a')).toHaveLength(1)
    })
  })
})
