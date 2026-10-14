import { riskHistoryTablePresenter } from '#/presenters/risk/risk-history-table-presenter.js'
import {
  SOURCE,
  assessment,
  hpaiTimeline
} from '#test/helpers/risk-assessment-fixtures.js'

const presentOne = (overrides) =>
  riskHistoryTablePresenter('Disease', [assessment(overrides)]).rows[0]

describe('#riskHistoryTablePresenter', () => {
  test('Should build the caption from the disease name', () => {
    const { caption } = riskHistoryTablePresenter(
      'Highly Pathogenic Avian Influenza',
      hpaiTimeline
    )

    expect(caption).toBe(
      'Assessment history for Highly Pathogenic Avian Influenza'
    )
  })

  test('Should return no rows for an empty timeline', () => {
    expect(riskHistoryTablePresenter('Disease', [])).toEqual({
      caption: 'Assessment history for Disease',
      rows: []
    })
  })

  test('Should keep the input order, newest first', () => {
    const { rows } = riskHistoryTablePresenter('Disease', hpaiTimeline)

    expect(rows.map(({ dateText }) => dateText)).toEqual([
      '1 October 2026',
      '15 June 2026',
      '9 January 2026'
    ])
  })

  test('Should keep the ISO date for the time element', () => {
    expect(presentOne().dateTime).toBe('2026-10-01T00:00:00Z')
  })

  test('Should format dates in Europe/London', () => {
    expect(presentOne({ dateReported: '2026-06-30T23:30:00Z' }).dateText).toBe(
      '1 July 2026'
    )
  })

  test.each([
    ['negligible', 'Negligible', 'grey'],
    ['very low', 'Very low', 'green'],
    ['low', 'Low', 'yellow'],
    ['medium', 'Medium', 'orange'],
    ['high', 'High', 'red']
  ])('Should map %s to the %s tag in %s', (status, label, modifier) => {
    expect(presentOne({ status }).level).toEqual({ label, modifier })
  })

  test('Should give the previous level as a word', () => {
    expect(presentOne({ previousStatus: 'very low' }).previousLabel).toBe(
      'Very low'
    )
  })

  test('Should give None when there is no previous level', () => {
    expect(presentOne({ previousStatus: null }).previousLabel).toBe('None')
  })

  test('Should flag a missing previous level so it can be styled as secondary', () => {
    expect(presentOne({ previousStatus: null }).previousIsNone).toBe(true)
    expect(presentOne().previousIsNone).toBe(false)
  })

  test.each([
    ['deteriorating', 'Deteriorating', '↑', 'red'],
    ['improving', 'Improving', '↓', 'green'],
    ['no change', 'No change', '→', 'grey']
  ])(
    'Should give the word, arrow and colour for %s',
    (levelChange, text, arrow, modifier) => {
      expect(presentOne({ levelChange }).change).toEqual({
        text,
        arrow,
        modifier
      })
    }
  )

  test('Should give undetermined no arrow', () => {
    const { change } = presentOne({ levelChange: 'undetermined' })

    expect(change).toEqual({ text: 'Undetermined', modifier: 'grey' })
    expect(change).not.toHaveProperty('arrow')
  })

  test('Should pass the source through', () => {
    expect(presentOne({ source: 'Some source' }).source).toBe('Some source')
  })

  test('Should present an HPAI-like timeline as the mock rows', () => {
    const { rows } = riskHistoryTablePresenter('HPAI', hpaiTimeline)

    expect(
      rows.map((row) => [
        row.dateText,
        row.level.label,
        row.previousLabel,
        row.change.text,
        row.source
      ])
    ).toEqual([
      ['1 October 2026', 'High', 'Medium', 'Deteriorating', SOURCE],
      ['15 June 2026', 'Medium', 'High', 'Improving', SOURCE],
      ['9 January 2026', 'High', 'None', 'Undetermined', SOURCE]
    ])
  })

  test('Should throw for an unknown status', () => {
    expect(() =>
      riskHistoryTablePresenter('Disease', [assessment({ status: 'severe' })])
    ).toThrow('Unknown risk status: severe')
  })

  test('Should throw for an unknown previous status', () => {
    expect(() =>
      riskHistoryTablePresenter('Disease', [
        assessment({ previousStatus: 'severe' })
      ])
    ).toThrow('Unknown risk status: severe')
  })

  test('Should throw for an unknown level change', () => {
    expect(() =>
      riskHistoryTablePresenter('Disease', [
        assessment({ levelChange: 'sideways' })
      ])
    ).toThrow('Unknown level change: sideways')
  })
})
