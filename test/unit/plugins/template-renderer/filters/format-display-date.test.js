import { formatDisplayDate } from '#/plugins/template-renderer/filters/format-date.js'

describe('#formatDisplayDate', () => {
  test('Should show the date in Europe/London, not UTC (BST)', () => {
    expect(formatDisplayDate('2026-06-30T23:30:00Z')).toBe('1 July 2026')
  })

  test('Should show the UTC date in winter (GMT)', () => {
    expect(formatDisplayDate('2026-12-31T23:30:00Z')).toBe('31 December 2026')
  })

  test('Should accept a Date', () => {
    expect(formatDisplayDate(new Date('2026-10-01T00:00:00Z'))).toBe(
      '1 October 2026'
    )
  })

  test.each([[undefined], [null], ['not a date'], [new Date('nope')]])(
    'Should throw a labelled error for %s',
    (value) => {
      expect(() => formatDisplayDate(value)).toThrow(/^Invalid date: /)
    }
  )
})
