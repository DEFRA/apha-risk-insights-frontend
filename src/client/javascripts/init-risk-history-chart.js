const CONTAINER_SELECTOR = '[data-risk-history-chart]'
const PLOT_SELECTOR = '[data-risk-history-chart-plot]'
const DATA_SELECTOR = 'script[data-risk-history-chart-data]'

/**
 * Draws the risk history chart from the spec embedded in the page. Does
 * nothing when the page has no chart.
 * @param {object} options
 * @param {{newPlot: Function}} options.plotly - the Plotly API
 * @param {Document} [options.document]
 */
export const initRiskHistoryChart = ({
  plotly,
  document = globalThis.document
}) => {
  const container = document.querySelector(CONTAINER_SELECTOR)
  const embedded = document.querySelector(DATA_SELECTOR)

  if (!container || !embedded) {
    return
  }

  const plot = container.querySelector(PLOT_SELECTOR)
  const { spec } = JSON.parse(embedded.textContent)

  plotly.newPlot(plot, spec.data, spec.layout, spec.config)
}
