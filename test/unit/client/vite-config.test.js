import viteConfig from '../../../vite.config.js'

describe('Vite config', () => {
  test('Should build the risk history chart as its own entry', () => {
    expect(viteConfig.build.rolldownOptions.input.riskHistoryChart).toBe(
      'src/client/javascripts/risk-history-chart.js'
    )
  })
})
