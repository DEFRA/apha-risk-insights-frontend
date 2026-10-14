import { readFile } from 'node:fs/promises'

const STYLES =
  '../../../src/views/components/risk-history-chart/_risk-history-chart.scss'

describe('Risk history chart styles', () => {
  let css

  beforeAll(async () => {
    css = await readFile(new URL(STYLES, import.meta.url), 'utf8')
  })

  test('Should keep the chart colours in forced colours mode', () => {
    const [, rule] = css.match(
      /@media \(forced-colors: active\) \{([\s\S]*?\n\})/
    )

    expect(rule).toContain('.app-risk-history-chart__container')
    expect(rule).toContain('forced-color-adjust: none')
    expect(rule).not.toContain('forced-color-adjust: auto')
  })
})
