import { getRisk, getRiskBySlug, listRisks } from '#/data/risk-data-source.js'

describe('#listRisks', () => {
  test('Should return a single page describing all items', async () => {
    const { items, page, pageSize, totalItems, totalPages } = await listRisks()

    expect(page).toBe(1)
    expect(pageSize).toBe(50)
    expect(totalItems).toBe(items.length)
    expect(totalPages).toBe(1)
  })

  test('Should not expose riskHistory on summary items', async () => {
    const { items } = await listRisks()

    expect(items.some((item) => 'riskHistory' in item)).toBe(false)
  })

  test('Should keep a disease code on every item', async () => {
    const { items } = await listRisks()

    expect(items.every(({ disease }) => Boolean(disease.code))).toBe(true)
  })

  test('Should return a fresh copy so callers cannot change the fixture', async () => {
    const first = await listRisks()
    const original = structuredClone(first)
    first.items[0].risk.status = 'negligible'
    first.items.pop()

    const second = await listRisks()

    expect(second).toEqual(original)
  })
})

const RISK_STATUSES = ['negligible', 'very low', 'low', 'medium', 'high']
const LEVEL_CHANGES = [
  'deteriorating',
  'no change',
  'improving',
  'undetermined'
]
const MIN_ASSESSMENTS = 2
const MAX_ASSESSMENTS = 4
const MIN_PAST = 1
const MAX_PAST = 3
const HPAI_SLUG = 'highly-pathogenic-avian-influenza'

const getAll = async () => {
  const { items } = await listRisks()

  return Promise.all(items.map(({ id }) => getRisk(id)))
}

const toTimeline = ({ risk, riskHistory }) => [risk, ...riskHistory]

describe('#getRiskBySlug', () => {
  test('Should find HPAI by its disease slug', async () => {
    const risk = await getRiskBySlug(HPAI_SLUG)

    expect(risk.disease.code).toBe('HPAI')
    expect(risk.risk.status).toBe('high')
  })

  test('Should shape the record as RiskDetail with riskHistory, not history', async () => {
    const record = await getRiskBySlug(HPAI_SLUG)

    expect(Array.isArray(record.riskHistory)).toBe(true)
    expect('history' in record).toBe(false)
  })

  test('Should return undefined for an unknown slug', async () => {
    expect(await getRiskBySlug('not-a-disease')).toBeUndefined()
  })
})

describe('#getRisk', () => {
  test('Should return undefined for an unknown risk id', async () => {
    expect(await getRisk('unknown-id')).toBeUndefined()
  })

  test('Should return the record fetched by its id', async () => {
    const bySlug = await getRiskBySlug(HPAI_SLUG)

    expect(await getRisk(bySlug.id)).toEqual(bySlug)
  })
})

describe('risk history', () => {
  test('Should be ordered newest first for every disease', async () => {
    for (const { riskHistory } of await getAll()) {
      const dates = riskHistory.map(({ dateReported }) =>
        Date.parse(dateReported)
      )

      expect(dates).toEqual([...dates].sort((a, b) => b - a))
    }
  })

  test('Should hold 2 to 4 assessments in total for every disease', async () => {
    for (const record of await getAll()) {
      const { riskHistory } = record
      const total = toTimeline(record).length

      expect(total).toBeGreaterThanOrEqual(MIN_ASSESSMENTS)
      expect(total).toBeLessThanOrEqual(MAX_ASSESSMENTS)
      expect(riskHistory.length).toBeGreaterThanOrEqual(MIN_PAST)
      expect(riskHistory.length).toBeLessThanOrEqual(MAX_PAST)
    }
  })

  test('Should exclude the current assessment', async () => {
    for (const { risk, riskHistory } of await getAll()) {
      expect(Date.parse(riskHistory[0].dateReported)).toBeLessThan(
        Date.parse(risk.dateReported)
      )
      expect(riskHistory).not.toContainEqual(risk)
    }
  })

  test('Should chain previousStatus to the older assessment', async () => {
    for (const { risk, riskHistory } of await getAll()) {
      expect(risk.previousStatus).toBe(riskHistory[0].status)
      riskHistory.slice(0, -1).forEach((entry, index) => {
        expect(entry.previousStatus).toBe(riskHistory[index + 1].status)
      })
      expect(riskHistory.at(-1).previousStatus).toBeNull()
    }
  })

  test('Should hold the three HPAI mock assessments', async () => {
    const timeline = toTimeline(await getRiskBySlug(HPAI_SLUG))

    expect(
      timeline.map(({ dateReported, status, previousStatus, levelChange }) => [
        dateReported.slice(0, 10),
        status,
        previousStatus,
        levelChange
      ])
    ).toEqual([
      ['2026-10-01', 'high', 'medium', 'deteriorating'],
      ['2026-06-15', 'medium', 'high', 'improving'],
      ['2026-01-09', 'high', null, 'undetermined']
    ])
    expect(
      timeline.every(({ source }) => source === 'APHA risk assessment')
    ).toBe(true)
  })

  test('Should match the RiskAssessment contract shape', async () => {
    const assessments = (await getAll()).flatMap(toTimeline)

    for (const assessment of assessments) {
      expect(Object.keys(assessment).sort()).toEqual([
        'dateReported',
        'levelChange',
        'previousStatus',
        'source',
        'status'
      ])
      expect(RISK_STATUSES).toContain(assessment.status)
      expect([...RISK_STATUSES, null]).toContain(assessment.previousStatus)
      expect(LEVEL_CHANGES).toContain(assessment.levelChange)
      expect(assessment.source.length).toBeGreaterThan(0)
      expect(Number.isNaN(Date.parse(assessment.dateReported))).toBe(false)
    }
  })
})
