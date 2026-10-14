import { LEVELS, levelFor } from '#/presenters/risk/risk-display.js'

describe('#risk-display level colours', () => {
  test('Should pin the GOV.UK colours used by the risk card bars', () => {
    expect(
      Object.fromEntries(
        Object.entries(LEVELS).map(([status, { colour }]) => [status, colour])
      )
    ).toEqual({
      negligible: '#484949',
      'very low': '#0f7a52',
      low: '#ffdd00',
      medium: '#f47738',
      high: '#ca3535'
    })
  })

  test('Should expose the colour through levelFor', () => {
    expect(levelFor('high').colour).toBe('#ca3535')
  })
})
