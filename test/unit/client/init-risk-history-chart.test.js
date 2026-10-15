import { initRiskHistoryChart } from '#/client/javascripts/init-risk-history-chart.js'

const embedded = {
  spec: {
    data: [{ type: 'scatter' }],
    layout: { xaxis: { type: 'date', dtick: 'M2' }, hovermode: false },
    config: { staticPlot: true }
  }
}

const createPlotly = () => ({
  newPlot: vi.fn().mockResolvedValue(undefined)
})

const createDocument = ({ withContainer = true, withData = true } = {}) => {
  const plot = { id: 'plot' }
  const container = { querySelector: vi.fn(() => plot) }
  const data = { textContent: JSON.stringify(embedded) }

  return {
    plot,
    document: {
      querySelector: vi.fn((selector) => {
        if (selector === '[data-risk-history-chart]') {
          return withContainer ? container : null
        }

        if (selector === 'script[data-risk-history-chart-data]') {
          return withData ? data : null
        }

        return null
      })
    }
  }
}

describe('#initRiskHistoryChart', () => {
  test('Should do nothing when the chart container is absent', () => {
    const plotly = createPlotly()
    const { document } = createDocument({ withContainer: false })

    initRiskHistoryChart({ document, plotly })

    expect(plotly.newPlot).not.toHaveBeenCalled()
  })

  test('Should do nothing when the embedded data is absent', () => {
    const plotly = createPlotly()
    const { document } = createDocument({ withData: false })

    initRiskHistoryChart({ document, plotly })

    expect(plotly.newPlot).not.toHaveBeenCalled()
  })

  test('Should draw into the plot div with the spec data, layout and config unchanged', () => {
    const plotly = createPlotly()
    const { document, plot } = createDocument()

    initRiskHistoryChart({ document, plotly })

    expect(plotly.newPlot).toHaveBeenCalledTimes(1)
    expect(plotly.newPlot).toHaveBeenCalledWith(
      plot,
      embedded.spec.data,
      embedded.spec.layout,
      embedded.spec.config
    )
  })
})
