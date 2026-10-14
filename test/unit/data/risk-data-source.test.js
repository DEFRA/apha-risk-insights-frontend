import { listRisks } from '#/data/risk-data-source.js'

describe('#listRisks', () => {
  test('Should return a single page describing all items', async () => {
    const { items, page, pageSize, totalItems, totalPages } = await listRisks()

    expect(page).toBe(1)
    expect(pageSize).toBe(50)
    expect(totalItems).toBe(items.length)
    expect(totalPages).toBe(1)
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
