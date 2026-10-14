import { diseaseDetailPresenter } from '#/presenters/risk/disease-detail-presenter.js'
import {
  assessment,
  hpaiTimeline
} from '#test/helpers/risk-assessment-fixtures.js'

const [current, ...history] = hpaiTimeline

const record = {
  id: 'a-risk-id',
  disease: { code: 'HPAI', name: 'Highly Pathogenic Avian Influenza' },
  risk: current,
  riskHistory: history
}

describe('#diseaseDetailPresenter', () => {
  test('Should use the disease name as page title and heading', () => {
    const { pageTitle, heading } = diseaseDetailPresenter(record)

    expect(pageTitle).toBe('Highly Pathogenic Avian Influenza')
    expect(heading).toBe('Highly Pathogenic Avian Influenza')
  })

  test('Should link back to the risk overview', () => {
    expect(diseaseDetailPresenter(record).backLink).toEqual({
      text: 'Back to overview',
      href: '/risk'
    })
  })

  test('Should present the current assessment as the detail variant card', () => {
    const { latest } = diseaseDetailPresenter(record)

    expect(latest).toEqual(
      expect.objectContaining({
        variant: 'detail',
        title: 'Highly Pathogenic Avian Influenza',
        levelLabel: 'High',
        previousLevel: 'Medium',
        source: current.source,
        dateTime: current.dateReported
      })
    )
  })

  test('Should build table rows from the current assessment then history', () => {
    const { table } = diseaseDetailPresenter(record)

    expect(table.rows.map(({ dateTime }) => dateTime)).toEqual([
      '2026-10-01T00:00:00Z',
      '2026-06-15T00:00:00Z',
      '2026-01-09T00:00:00Z'
    ])
  })

  test('Should use the disease name in the table caption', () => {
    expect(diseaseDetailPresenter(record).table.caption).toBe(
      'Assessment history for Highly Pathogenic Avian Influenza'
    )
  })

  test('Should show one table row when there is no history', () => {
    const { table } = diseaseDetailPresenter({ ...record, riskHistory: [] })

    expect(table.rows).toHaveLength(1)
  })

  test('Should not include a chart yet', () => {
    expect(diseaseDetailPresenter(record)).not.toHaveProperty('chart')
  })

  test('Should throw for an unknown status', () => {
    const bad = { ...record, risk: assessment({ status: 'catastrophic' }) }

    expect(() => diseaseDetailPresenter(bad)).toThrow(
      'Unknown risk status: catastrophic'
    )
  })

  test('Should throw for an invalid date in the history', () => {
    const bad = {
      ...record,
      riskHistory: [assessment({ dateReported: 'not-a-date' })]
    }

    expect(() => diseaseDetailPresenter(bad)).toThrow(
      'Invalid date: not-a-date'
    )
  })
})
